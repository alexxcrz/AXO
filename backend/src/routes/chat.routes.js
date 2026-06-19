import { Router } from "express";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { requireAuth } from "../middleware/auth.middleware.js";
import { getIO, getUsuariosActivos, getSocketsByNickname } from "../config/socket.js";
import {
  storeSubscriptionForUser,
  getVapidPublicKey,
  sendPushToNick,
  getPushStatusSnapshot,
} from "../services/push.service.js";
import { prismaChat as prisma } from "../config/prisma-chat.js";
import { getWarehouseState, updateUserUiPreferences } from "../services/warehouse.store.js";
import { normalizeNick, enqueueCallSignal, drainCallSignals, nextSignalId } from "../utils/callSignalQueue.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const chatRouter = Router();
export const chatReunionPublicRouter = Router();

// ── Configuración de multer para archivos de chat ─────────────────────────────
const dataDirectory = process.env.RENDER ? "/var/data" : path.resolve(__dirname, "../../data");
const chatUploadsDir = path.join(dataDirectory, "uploads", "chat");
const gruposUploadsDir = path.join(dataDirectory, "uploads", "grupos");
[chatUploadsDir, gruposUploadsDir].forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const chatStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, chatUploadsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});
const grupoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, gruposUploadsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({ storage: chatStorage, limits: { fileSize: 50 * 1024 * 1024 } });
const uploadGrupo = multer({ storage: grupoStorage, limits: { fileSize: 10 * 1024 * 1024 } });

// ── Helpers ───────────────────────────────────────────────────────────────────
function getNombre(req) {
  return req.auth?.user?.name || req.auth?.user?.nickname || null;
}

function findAuthUser(req) {
  const auth = req.auth?.user;
  if (!auth) return null;
  const users = getAllUsers();
  if (auth.id != null) {
    const byId = users.find((u) => String(u.id) === String(auth.id));
    if (byId) return byId;
  }
  const authAliases = buildUserAliases(auth);
  const authNorm = new Set(authAliases.map((a) => normalizeNick(a)).filter(Boolean));
  return users.find((u) => {
    const aliases = buildUserAliases(u);
    return aliases.some((a) => authNorm.has(normalizeNick(a)));
  }) || users.find((u) => u.name === auth.name) || null;
}

function getAllUsers() {
  return getWarehouseState().users || [];
}

function buildUserAliases(userLike) {
  const aliases = [
    userLike?.id,
    userLike?.name,
    userLike?.nickname,
    userLike?.email,
    userLike?.login,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  return Array.from(new Set(aliases));
}

function resolveTargetAliases(targetNickname) {
  const raw = String(targetNickname || "").trim();
  if (!raw) return [];

  const targetKey = normalizeNick(raw);
  const userMatch = getAllUsers().find((user) => {
    const aliases = buildUserAliases(user);
    return aliases.some((alias) => normalizeNick(alias) === targetKey);
  });

  return Array.from(new Set([raw, ...buildUserAliases(userMatch)]));
}

// callSignalQueue helpers imported from ../utils/callSignalQueue.js

function emitChatsActivosActualizados() {
  try {
    getIO().emit("chats_activos_actualizados", { ts: Date.now() });
  } catch (_) {}
}

// ── Push notification endpoints ────────────────────────────────────────────────
chatRouter.get("/push-status", (_req, res) => {
  res.json(getPushStatusSnapshot());
});

chatRouter.get("/push-key", (_req, res) => {
  const key = getVapidPublicKey();
  if (!key) return res.status(503).json({ error: "Push not configured" });
  res.json({ publicKey: key });
});

chatRouter.post("/push-subscribe", (req, res) => {
  const nombre = getNombre(req);
  if (!nombre) return res.status(400).json({ error: "Usuario sin nombre" });
  const { subscription } = req.body;
  if (!subscription?.endpoint) return res.status(400).json({ error: "Subscription invalida" });
  const warehouseUser = getAllUsers().find((u) => u.id === req.auth?.userId || u.name === nombre);
  storeSubscriptionForUser(warehouseUser || { name: nombre }, subscription);
  res.json({ ok: true });
});

function resolveSenderPhotoUrl(userLike) {
  const raw = String(userLike?.photoThumbnailUrl || userLike?.photo || "").trim();
  if (!raw || raw === "null") return null;
  if (raw.startsWith("http") || raw.startsWith("data:") || raw.startsWith("/")) return raw;
  return `/uploads/perfiles/${raw}`;
}

function buildMessagePushPayload(sender, targetNickname, text) {
  return {
    type: "message",
    fromNickname: sender?.name || targetNickname,
    text: text || "",
    senderPhoto: resolveSenderPhotoUrl(sender),
    soundUrl: "/sounds/notification-alert.wav",
    url: "/",
  };
}

async function esAdminDeGrupo(grupoId, nombre) {
  const grupo = await prisma.chatGrupo.findUnique({ where: { id: grupoId } });
  if (!grupo) return false;
  if (grupo.creadoPor === nombre) return true;
  const admin = await prisma.chatGrupoAdmin.findFirst({
    where: { grupoId, usuarioNickname: nombre },
  });
  return !!admin;
}

// ═════════════════════════════════════════════════════════════════════════════
// USUARIOS
// ═════════════════════════════════════════════════════════════════════════════

chatRouter.get("/usuarios", requireAuth, (_req, res) => {
  try {
    const users = getAllUsers().map((u) => ({
      id: u.id,
      name: u.name,
      nickname: u.name,
      email: u.email || null,
      photo: u.photo || null,
      photoThumbnailUrl: u.photoThumbnailUrl || null,
      photoTimestamp: u.photoUpdatedAt || u.updatedAt || null,
      active: u.isActive ? 1 : 0,
    }));
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: "Error obteniendo usuarios" });
  }
});

chatRouter.get("/usuarios/estados", requireAuth, (req, res) => {
  try {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    const activosArr = getUsuariosActivos();
    const activosMap = {};
    activosArr.forEach((u) => {
      const nick = String(u?.nickname || "").trim();
      if (!nick) return;
      activosMap[nick] = u;
      activosMap[normalizeNick(nick)] = u;
    });
    const estados = {};
    getAllUsers().forEach((u) => {
      if (u.isActive) {
        const info = activosMap[u.name] || activosMap[normalizeNick(u.name)];
        if (!info) {
          estados[u.name] = "offline";
        } else if (info.inCall) {
          estados[u.name] = "en-llamada";
        } else if (Date.now() - (info.lastActivity || 0) > 3600000) {
          estados[u.name] = "ausente";
        } else {
          estados[u.name] = "activo";
        }
      }
    });
    const activos = Object.entries(estados).filter(([, status]) => status === "activo" || status === "en-llamada").length;
    res.json(estados);
  } catch (e) {
    res.status(500).json({ error: "Error obteniendo estados" });
  }
});

chatRouter.get("/calls/pending", requireAuth, (req, res) => {
  try {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    const authUser = req.auth?.user;
    const aliases = buildUserAliases(authUser);
    if (!aliases.length) return res.json({ signals: [] });

    const merged = [];
    const seenIds = new Set();
    aliases.forEach((alias) => {
      const bucket = drainCallSignals(alias);
      bucket.forEach((signal) => {
        const id = String(signal?.id || "");
        if (id && seenIds.has(id)) return;
        if (id) seenIds.add(id);
        merged.push(signal);
      });
    });

    if (merged.length > 0) {
      console.log(`[calls/pending] user=${authUser?.name || authUser?.id || "unknown"} aliases=${aliases.join("|")} drained=${merged.length}`);
    }
    res.json({ signals: merged });
  } catch (e) {
    res.status(500).json({ error: "Error obteniendo señales de llamada" });
  }
});

chatRouter.post("/calls/signal", requireAuth, async (req, res) => {
  try {
    const senderName = getNombre(req);
    if (!senderName) {
      return res.status(400).json({ ok: false, message: "Usuario sin nombre configurado" });
    }

    const {
      type,
      room,
      toNickname,
      toNicknames,
      sdp,
      candidate,
      fromPeerId,
      nickname,
    } = req.body || {};

    const requestedNicknames = Array.from(
      new Set(
        [
          ...((Array.isArray(toNicknames) ? toNicknames : []).map((item) => String(item || "").trim())),
          String(toNickname || "").trim(),
        ].filter(Boolean),
      ),
    );

    if (!type || !room || requestedNicknames.length === 0) {
      return res.status(400).json({
        ok: false,
        message: "Señal de llamada incompleta",
        reason: {
          hasType: Boolean(type),
          hasRoom: Boolean(room),
          hasTargets: requestedNicknames.length > 0,
          senderName,
          requestedNicknames,
        },
      });
    }

    // ── Registro automático de historial de llamadas (fire-and-forget, nunca bloquea) ─
    try {
      if (type === "invite") {
        prisma.chatLlamada?.create({
          data: {
            room,
            iniciador: senderName,
            receptores: JSON.stringify(requestedNicknames),
            tipo: requestedNicknames.length > 1 ? "grupal" : "privado",
            estado: "pendiente",
          },
        }).catch(() => {});
      } else if (type === "join") {
        prisma.chatLlamada?.updateMany({
          where: { room, estado: { in: ["pendiente", "perdida", "activa"] } },
          data: { estado: "activa", aceptadaEn: new Date() },
        }).catch(() => {});
      } else if (type === "reject") {
        prisma.chatLlamada?.updateMany({
          where: { room, estado: { in: ["pendiente", "activa"] } },
          data: { estado: "rechazada", finalizadaEn: new Date() },
        }).catch(() => {});
      } else if (type === "leave") {
        prisma.chatLlamada?.findFirst({
          where: { room, estado: "activa" },
          orderBy: { iniciadaEn: "desc" },
        }).then((record) => {
          if (!record) return;
          const fin = new Date();
          const duracion = record.aceptadaEn
            ? Math.round((fin.getTime() - new Date(record.aceptadaEn).getTime()) / 1000)
            : null;
          return prisma.chatLlamada.update({
            where: { id: record.id },
            data: { estado: "finalizada", finalizadaEn: fin, duracionSegundos: duracion },
          });
        }).catch(() => {});
      }
    } catch (_) { /* historial no bloquea la señal */ }

    const signal = {
      id: nextSignalId(),
      type,
      room,
      fromNickname: senderName,
      from: fromPeerId || `rest:${normalizeNick(senderName)}`,
      nickname: nickname || senderName,
      createdAt: Date.now(),
    };

    if (sdp) signal.sdp = sdp;
    if (candidate) signal.candidate = candidate;

    requestedNicknames.forEach((target) => {
      const aliases = resolveTargetAliases(target);
      aliases.forEach((alias) => enqueueCallSignal(alias, signal));
      console.log(`[calls/signal] type=${type} room=${room} target=${target} aliases=${aliases.join("|")}`);
    });

    res.json({
      ok: true,
      delivered: requestedNicknames.length,
      requestedNicknames,
      reachedNicknames: requestedNicknames,
    });
  } catch (e) {
    res.status(500).json({ ok: false, message: "No fue posible enviar la señal de llamada" });
  }
});

// Historial de llamadas del usuario autenticado
chatRouter.get("/calls/historial", requireAuth, async (req, res) => {
  try {
    const nombre = getNombre(req);
    if (!nombre) return res.status(401).json({ error: "No autenticado" });
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    if (!prisma.chatLlamada) {
      console.warn("[historial] chatLlamada no disponible en prisma chat");
      return res.json([]);
    }

    const currentUser = findAuthUser(req);
    const userAliases = Array.from(new Set([
      nombre,
      ...(currentUser ? buildUserAliases(currentUser) : []),
      ...buildUserAliases(req.auth?.user || {}),
    ]));
    const userAliasNorm = new Set(userAliases.map((alias) => normalizeNick(alias)).filter(Boolean));
    userAliasNorm.add(normalizeNick(nombre));

    // Buscar llamadas donde el usuario fue iniciador o receptor
    const todas = await prisma.chatLlamada.findMany({
      orderBy: { iniciadaEn: "desc" },
      take: Math.min(limit * 20, 1000),
    });

    // Filtrar por iniciador o receptor (con flexibilidad de aliases)
    const mias = [];
    for (const ll of todas) {
      let receptoresArr = [];
      try {
        receptoresArr = Array.isArray(ll.receptores)
          ? ll.receptores
          : JSON.parse(ll.receptores || "[]");
      } catch (_) {}

      const iniciadorNorm = normalizeNick(ll.iniciador);
      const esIniciador = iniciadorNorm && userAliasNorm.has(iniciadorNorm);

      // Verificar si es iniciador
      if (esIniciador) {
        mias.push({
          id: ll.id,
          room: ll.room,
          iniciador: ll.iniciador,
          receptores: receptoresArr,
          tipo: ll.tipo,
          estado: ll.estado,
          iniciadaEn: ll.iniciadaEn,
          aceptadaEn: ll.aceptadaEn,
          finalizadaEn: ll.finalizadaEn,
          duracionSegundos: ll.duracionSegundos,
          fueIniciador: true,
        });
        continue;
      }

      // Verificar si es receptor
      // Buscar si algún alias del usuario está en los receptores
      const esReceptor = receptoresArr.some((r) => userAliasNorm.has(normalizeNick(r)));

      if (esReceptor) {
        mias.push({
          id: ll.id,
          room: ll.room,
          iniciador: ll.iniciador,
          receptores: receptoresArr,
          tipo: ll.tipo,
          estado: ll.estado,
          iniciadaEn: ll.iniciadaEn,
          aceptadaEn: ll.aceptadaEn,
          finalizadaEn: ll.finalizadaEn,
          duracionSegundos: ll.duracionSegundos,
          fueIniciador: false,
        });
      }
    }

    res.json(mias.slice(0, limit));
  } catch (e) {
    console.error("[historial] Error:", e?.message);
    // Si la tabla no existe aún en producción, devolver array vacío
    res.json([]);
  }
});

function obtenerAliasUsuarioLlamadas(req) {
  const nombre = getNombre(req);
  if (!nombre) return null;
  const currentUser = findAuthUser(req);
  const userAliases = Array.from(new Set([
    nombre,
    ...(currentUser ? buildUserAliases(currentUser) : []),
    ...buildUserAliases(req.auth?.user || {}),
  ]));
  const userAliasNorm = new Set(userAliases.map((alias) => normalizeNick(alias)).filter(Boolean));
  userAliasNorm.add(normalizeNick(nombre));
  return { nombre, userAliasNorm };
}

function usuarioParticipaEnLlamada(ll, userAliasNorm) {
  let receptoresArr = [];
  try {
    receptoresArr = Array.isArray(ll.receptores)
      ? ll.receptores
      : JSON.parse(ll.receptores || "[]");
  } catch (_) {}

  const iniciadorNorm = normalizeNick(ll.iniciador);
  if (iniciadorNorm && userAliasNorm.has(iniciadorNorm)) return true;
  return receptoresArr.some((r) => userAliasNorm.has(normalizeNick(r)));
}

chatRouter.delete("/calls/historial/:id", requireAuth, async (req, res) => {
  try {
    const aliasInfo = obtenerAliasUsuarioLlamadas(req);
    if (!aliasInfo) return res.status(401).json({ error: "No autenticado" });
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: "ID inválido" });
    if (!prisma.chatLlamada) return res.json({ ok: true });

    const ll = await prisma.chatLlamada.findUnique({ where: { id } });
    if (!ll) return res.status(404).json({ error: "Registro no encontrado" });
    if (!usuarioParticipaEnLlamada(ll, aliasInfo.userAliasNorm)) {
      return res.status(403).json({ error: "No autorizado" });
    }

    await prisma.chatLlamada.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    console.error("[historial] Error al eliminar:", e?.message);
    res.status(500).json({ error: "Error al eliminar el registro" });
  }
});

chatRouter.delete("/calls/historial", requireAuth, async (req, res) => {
  try {
    const aliasInfo = obtenerAliasUsuarioLlamadas(req);
    if (!aliasInfo) return res.status(401).json({ error: "No autenticado" });
    if (!prisma.chatLlamada) return res.json({ ok: true, eliminados: 0 });

    const todas = await prisma.chatLlamada.findMany({
      orderBy: { iniciadaEn: "desc" },
      take: 2000,
    });
    const ids = todas
      .filter((ll) => usuarioParticipaEnLlamada(ll, aliasInfo.userAliasNorm))
      .map((ll) => ll.id);

    if (ids.length === 0) return res.json({ ok: true, eliminados: 0 });

    await prisma.chatLlamada.deleteMany({ where: { id: { in: ids } } });
    res.json({ ok: true, eliminados: ids.length });
  } catch (e) {
    console.error("[historial] Error al limpiar:", e?.message);
    res.status(500).json({ error: "Error al limpiar el historial" });
  }
});

chatRouter.get("/usuario/:nickname/perfil", requireAuth, (req, res) => {
  try {
    const { nickname } = req.params;
    const targetKey = normalizeNick(nickname);
    const user = getAllUsers().find((u) => {
      const aliases = buildUserAliases(u);
      return aliases.some((alias) => normalizeNick(alias) === targetKey);
    });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json({
      id: user.id,
      name: user.name,
      nickname: user.name,
      photo: user.photo || null,
      photoThumbnailUrl: user.photoThumbnailUrl || null,
      photoTimestamp: user.photoUpdatedAt || user.updatedAt || null,
      puesto: user.role || null,
      cargo: user.jobTitle || null,
      area: user.area || null,
      department: user.department || null,
      playerAcceso: user.email || null,
      correo: user.correoElectronico || null,
      telefono: user.telefono || null,
      telefono_visible: user.telefono_visible || false,
      birthday: user.birthday || null,
      fechaIngreso: user.fechaIngreso || null,
      active: user.isActive,
    });
  } catch (e) {
    res.status(500).json({ error: "Error obteniendo perfil" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// CHAT GENERAL
// ═════════════════════════════════════════════════════════════════════════════

chatRouter.get("/general", requireAuth, async (_req, res) => {
  try {
    const mensajes = await prisma.chatGeneral.findMany({
      orderBy: { fecha: "asc" },
      take: 100,
    });
    res.json(mensajes.map(serializarMensaje));
  } catch (e) {
    res.status(500).json({ error: "Error obteniendo mensajes generales" });
  }
});

chatRouter.post("/general", requireAuth, async (req, res) => {
  try {
    const nombre = getNombre(req);
    if (!nombre) return res.status(400).json({ error: "Usuario sin nombre configurado" });

    const {
      mensaje, tipo_mensaje, archivo_id, archivo_url, archivo_nombre,
      archivo_tipo, archivo_tamaño, menciona, enlace_compartido,
      reply_to_id, reply_to_user, reply_to_text,
      reenviado_de_usuario, reenviado_de_chat, reenviado_de_tipo,
    } = req.body;

    if (!mensaje?.trim()) return res.status(400).json({ error: "Mensaje vacío" });

    let archivoUrl = archivo_url || null;
    let archivoNombre = archivo_nombre || null;
    let archivoTipo = archivo_tipo || null;
    let archivoTamaño = archivo_tamaño ? archivo_tamaño ? Number(archivo_tamaño) : null : null;

    if (archivo_id) {
      const arch = await prisma.chatArchivo.findUnique({ where: { id: Number(archivo_id) } });
      if (arch) {
        archivoUrl = `/api/chat/archivo/${arch.id}`;
        archivoNombre = arch.nombreOriginal;
        archivoTipo = arch.tipoMime;
        archivoTamaño = arch.tamaño;
      }
    }

    const nuevo = await prisma.chatGeneral.create({
      data: {
        usuarioNickname: nombre,
        mensaje: mensaje.trim(),
        tipoMensaje: tipo_mensaje || "texto",
        archivoUrl,
        archivoNombre,
        archivoTipo,
        archivoTamaño,
        menciona: menciona || null,
        enlaceCompartido: enlace_compartido || null,
        replyToId: reply_to_id ? Number(reply_to_id) : null,
        replyToUser: reply_to_user || null,
        replyToText: reply_to_text || null,
        reenviadoDeUsuario: reenviado_de_usuario || null,
        reenviadoDeChat: reenviado_de_chat || null,
        reenviadoDeTipo: reenviado_de_tipo || null,
      },
    });

    const out = serializarMensaje(nuevo);

    // Si el mensaje es a uno mismo, marcarlo como leído automáticamente
    if (nombre === para_nickname) {
      try {
        const leidoRecord = await prisma.chatPrivadoLeido.create({
          data: { mensajeId: nuevo.id, usuarioNickname: nombre },
        });
        out.fecha_leido_otro = leidoRecord.fechaLeido.toISOString();
        getIO().emit("chat_privado_leidos", {
          de_nickname: nombre,
          para_nickname: nombre,
          mensajes: [{ mensaje_id: nuevo.id, fecha_leido: leidoRecord.fechaLeido.toISOString() }],
        });
      } catch (_) {}
    }

    getIO().emit("chat_general_nuevo", out);
    res.json({ ok: true, mensaje: out });
  } catch (e) {
    console.error("Error enviando mensaje general:", e);
    res.status(500).json({ error: "Error enviando mensaje general" });
  }
});

chatRouter.delete("/general", requireAuth, async (req, res) => {
  try {
    const nombre = getNombre(req);
    const user = getAllUsers().find((u) => u.name === nombre);
    if (!user || user.role !== "Lead") {
      return res.status(403).json({ error: "Solo administradores pueden vaciar el chat" });
    }
    await prisma.chatGeneral.deleteMany();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Error vaciando historial general" });
  }
});

chatRouter.post("/general/leer", requireAuth, async (req, res) => {
  try {
    const nombre = getNombre(req);
    if (!nombre) return res.status(400).json({ error: "Usuario sin nombre" });

    const mensajes = await prisma.chatGeneral.findMany({
      where: {
        leidos: { none: { usuarioNickname: nombre } },
      },
      select: { id: true },
    });

    if (mensajes.length > 0) {
      const existentes = await prisma.chatGeneralLeido.findMany({
        where: { usuarioNickname: nombre, mensajeId: { in: mensajes.map((m) => m.id) } },
        select: { mensajeId: true },
      });
      const existentesSet = new Set(existentes.map((e) => e.mensajeId));
      const nuevos = mensajes.filter((m) => !existentesSet.has(m.id));
      if (nuevos.length > 0) {
        await prisma.chatGeneralLeido.createMany({
          data: nuevos.map((m) => ({ mensajeId: m.id, usuarioNickname: nombre })),
        });
      }
    }

    res.json({ ok: true, mensajes_marcados: mensajes.length });
  } catch (e) {
    res.status(500).json({ error: "Error marcando mensajes como leídos" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// CHAT PRIVADO
// ═════════════════════════════════════════════════════════════════════════════

chatRouter.get("/privado/:nickname", requireAuth, async (req, res) => {
  try {
    const { nickname } = req.params;
    const nombre = getNombre(req);
    if (!nombre) return res.status(400).json({ error: "Usuario sin nombre" });

    const borrado = await prisma.chatPrivadoBorrado.findUnique({
      where: { usuarioNickname_otroNickname: { usuarioNickname: nombre, otroNickname: nickname } },
    });

    const mensajes = await prisma.chatPrivado.findMany({
      where: {
        OR: [
          { deNickname: nombre, paraNickname: nickname },
          { deNickname: nickname, paraNickname: nombre },
        ],
        ...(borrado ? { fecha: { gt: borrado.borradoEn } } : {}),
      },
      include: {
        leidos: { where: { usuarioNickname: nickname }, select: { fechaLeido: true } },
      },
      orderBy: { fecha: "asc" },
    });

    res.json(mensajes.map((m) => ({
      ...serializarMensaje(m),
      fecha_leido_otro: m.leidos[0]?.fechaLeido?.toISOString() || null,
    })));
  } catch (e) {
    console.error("Error obteniendo mensajes privados:", e);
    res.json([]);
  }
});

chatRouter.post("/privado", requireAuth, async (req, res) => {
  try {
    const nombre = getNombre(req);
    if (!nombre) return res.status(400).json({ error: "Usuario sin nombre" });

    const {
      para_nickname, mensaje, tipo_mensaje, archivo_id, archivo_url,
      archivo_nombre, archivo_tipo, archivo_tamaño, menciona, enlace_compartido,
      reply_to_id, reply_to_user, reply_to_text,
      reenviado_de_usuario, reenviado_de_chat, reenviado_de_tipo,
    } = req.body;

    if (!mensaje?.trim() || !para_nickname) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    let archivoUrl = archivo_url || null;
    let archivoNombre = archivo_nombre || null;
    let archivoTipo = archivo_tipo || null;
    let archivoTamaño = archivo_tamaño ? archivo_tamaño ? Number(archivo_tamaño) : null : null;

    if (archivo_id) {
      const arch = await prisma.chatArchivo.findUnique({ where: { id: Number(archivo_id) } });
      if (arch) {
        archivoUrl = `/api/chat/archivo/${arch.id}`;
        archivoNombre = arch.nombreOriginal;
        archivoTipo = arch.tipoMime;
        archivoTamaño = arch.tamaño;
      }
    }

    const nuevo = await prisma.chatPrivado.create({
      data: {
        deNickname: nombre,
        paraNickname: para_nickname,
        mensaje: mensaje.trim(),
        tipoMensaje: tipo_mensaje || "texto",
        archivoUrl,
        archivoNombre,
        archivoTipo,
        archivoTamaño,
        menciona: menciona || null,
        enlaceCompartido: enlace_compartido || null,
        replyToId: reply_to_id ? Number(reply_to_id) : null,
        replyToUser: reply_to_user || null,
        replyToText: reply_to_text || null,
        reenviadoDeUsuario: reenviado_de_usuario || null,
        reenviadoDeChat: reenviado_de_chat || null,
        reenviadoDeTipo: reenviado_de_tipo || null,
      },
    });

    const out = serializarMensaje(nuevo);

    // Si el mensaje es a uno mismo, marcarlo como leído automáticamente
    if (nombre === para_nickname) {
      try {
        const leidoRecord = await prisma.chatPrivadoLeido.create({
          data: { mensajeId: nuevo.id, usuarioNickname: nombre },
        });
        out.fecha_leido_otro = leidoRecord.fechaLeido.toISOString();
        getIO().emit("chat_privado_leidos", {
          de_nickname: nombre,
          para_nickname: nombre,
          mensajes: [{ mensaje_id: nuevo.id, fecha_leido: leidoRecord.fechaLeido.toISOString() }],
        });
      } catch (_) {}
    }

    getIO().emit("chat_privado_nuevo", out);
    emitChatsActivosActualizados();

    // Push al destinatario (si la app no tiene socket activo)
    if (para_nickname !== nombre) {
      const sender = getAllUsers().find((u) => u.name === nombre);
      sendPushToNick(
        para_nickname,
        buildMessagePushPayload(sender, para_nickname, nuevo.mensaje),
        { skipIfOnline: true },
      ).catch(() => {});
    }

    res.json({ ok: true, mensaje: out });
  } catch (e) {
    console.error("Error enviando mensaje privado:", e);
    res.status(500).json({ error: "No se pudo enviar el mensaje" });
  }
});

chatRouter.post("/privado/:nickname/leer", requireAuth, async (req, res) => {
  try {
    const { nickname } = req.params;
    const nombre = getNombre(req);
    if (!nombre) return res.status(400).json({ error: "Usuario sin nombre" });

    const borrado = await prisma.chatPrivadoBorrado.findUnique({
      where: { usuarioNickname_otroNickname: { usuarioNickname: nombre, otroNickname: nickname } },
    });

    const noLeidos = await prisma.chatPrivado.findMany({
      where: {
        deNickname: nickname,
        paraNickname: nombre,
        ...(borrado ? { fecha: { gt: borrado.borradoEn } } : {}),
        leidos: { none: { usuarioNickname: nombre } },
      },
      select: { id: true },
    });

    if (noLeidos.length > 0) {
      const existentes = await prisma.chatPrivadoLeido.findMany({
        where: { usuarioNickname: nombre, mensajeId: { in: noLeidos.map((m) => m.id) } },
        select: { mensajeId: true },
      });
      const existentesSet = new Set(existentes.map((e) => e.mensajeId));
      const nuevos = noLeidos.filter((m) => !existentesSet.has(m.id));
      if (nuevos.length > 0) {
        await prisma.chatPrivadoLeido.createMany({
          data: nuevos.map((m) => ({ mensajeId: m.id, usuarioNickname: nombre })),
        });
      }

      const marcados = await prisma.chatPrivadoLeido.findMany({
        where: { usuarioNickname: nombre, mensajeId: { in: noLeidos.map((m) => m.id) } },
        select: { mensajeId: true, fechaLeido: true },
      });

      getIO().emit("chat_privado_leidos", {
        de_nickname: nickname,
        para_nickname: nombre,
        mensajes: marcados.map((m) => ({
          mensaje_id: m.mensajeId,
          fecha_leido: m.fechaLeido.toISOString(),
        })),
      });
      emitChatsActivosActualizados();
    }

    res.json({ ok: true, mensajes_marcados: noLeidos.length });
  } catch (e) {
    console.error("Error marcando leídos:", e);
    res.json({ ok: true, mensajes_marcados: 0 });
  }
});

chatRouter.delete("/privado/:nickname", requireAuth, async (req, res) => {
  try {
    const { nickname } = req.params;
    const nombre = getNombre(req);
    if (!nombre) return res.status(400).json({ error: "Usuario sin nombre" });

    await prisma.chatPrivadoBorrado.upsert({
      where: { usuarioNickname_otroNickname: { usuarioNickname: nombre, otroNickname: nickname } },
      update: { borradoEn: new Date() },
      create: { usuarioNickname: nombre, otroNickname: nickname },
    });

    emitChatsActivosActualizados();

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Error borrando conversación" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// CHATS ACTIVOS
// ═════════════════════════════════════════════════════════════════════════════

chatRouter.get("/activos", requireAuth, async (req, res) => {
  try {
    const nombre = getNombre(req);
    if (!nombre) return res.status(400).json({ error: "Usuario sin nombre" });

    // Obtener conversaciones privadas únicas
    let privados;
    try {
      privados = await prisma.$queryRaw`
        SELECT otro_usuario, MAX(ultima_fecha) AS ultima_fecha
        FROM (
          SELECT
            CASE WHEN cp."deNickname" = ${nombre} THEN cp."paraNickname" ELSE cp."deNickname" END AS otro_usuario,
            cp.fecha AS ultima_fecha
          FROM chat_privado cp
          WHERE cp."deNickname" = ${nombre} OR cp."paraNickname" = ${nombre}
        ) sub
        GROUP BY otro_usuario
        ORDER BY ultima_fecha DESC
      `;
    } catch {
      // Tabla aún no creada o error de BD — devolver lista vacía
      return res.json([]);
    }

    const conversaciones = await Promise.all(
      privados.map(async (conv) => {
        try {
          const borrado = await prisma.chatPrivadoBorrado.findUnique({
            where: {
              usuarioNickname_otroNickname: { usuarioNickname: nombre, otroNickname: conv.otro_usuario },
            },
          });

          const ultimo = await prisma.chatPrivado.findFirst({
            where: {
              OR: [
                { deNickname: nombre, paraNickname: conv.otro_usuario },
                { deNickname: conv.otro_usuario, paraNickname: nombre },
              ],
              ...(borrado ? { fecha: { gt: borrado.borradoEn } } : {}),
            },
            orderBy: { fecha: "desc" },
          });

          if (!ultimo) return null;

          const noLeidos = conv.otro_usuario === nombre
            ? 0  // Auto-mensajes: siempre leídos
            : await prisma.chatPrivado.count({
            where: {
              deNickname: conv.otro_usuario,
              paraNickname: nombre,
              ...(borrado ? { fecha: { gt: borrado.borradoEn } } : {}),
              leidos: { none: { usuarioNickname: nombre } },
            },
          });

          return {
            otro_usuario: conv.otro_usuario,
            ultima_fecha: ultimo.fecha.toISOString(),
            ultimo_mensaje: ultimo.mensaje,
            ultimo_remitente: ultimo.deNickname,
            mensajes_no_leidos: noLeidos,
          };
        } catch {
          return null;
        }
      })
    );

    res.json(conversaciones.filter(Boolean));
  } catch (e) {
    console.error("Error obteniendo chats activos:", e?.message);
    res.json([]); // nunca devolver 500 en este endpoint
  }
});

chatRouter.get("/sin-leer", requireAuth, async (req, res) => {
  try {
    const nombre = getNombre(req);
    if (!nombre) return res.status(401).json({ error: "No autenticado" });
    const limitPorConversacion = Math.min(Number(req.query.limit) || 25, 50);
    const conversaciones = [];

    const privados = await prisma.$queryRaw`
      SELECT DISTINCT
        CASE WHEN cp."deNickname" = ${nombre} THEN cp."paraNickname" ELSE cp."deNickname" END AS otro_usuario
      FROM chat_privado cp
      WHERE cp."paraNickname" = ${nombre}
        AND cp."deNickname" <> ${nombre}
        AND NOT EXISTS (
          SELECT 1 FROM chat_privado_leidos cpl
          WHERE cpl."mensajeId" = cp.id AND cpl."usuarioNickname" = ${nombre}
        )
    `.catch(() => []);

    for (const row of privados || []) {
      const otro = row?.otro_usuario;
      if (!otro) continue;

      const borrado = await prisma.chatPrivadoBorrado.findUnique({
        where: {
          usuarioNickname_otroNickname: { usuarioNickname: nombre, otroNickname: otro },
        },
      }).catch(() => null);

      const mensajes = await prisma.chatPrivado.findMany({
        where: {
          deNickname: otro,
          paraNickname: nombre,
          ...(borrado ? { fecha: { gt: borrado.borradoEn } } : {}),
          leidos: { none: { usuarioNickname: nombre } },
        },
        orderBy: { fecha: "asc" },
        take: limitPorConversacion,
      });

      if (!mensajes.length) continue;

      conversaciones.push({
        tipo: "privado",
        conversacion_id: otro,
        conversacion_nombre: otro,
        mensajes_no_leidos: mensajes.length,
        ultima_fecha: mensajes[mensajes.length - 1].fecha?.toISOString?.() || null,
        mensajes: mensajes.map((m) => serializarMensaje(m)),
      });
    }

    const membresias = await prisma.chatGrupoMiembro.findMany({
      where: { usuarioNickname: nombre },
      select: { grupoId: true },
    }).catch(() => []);

    for (const { grupoId } of membresias) {
      const grupo = await prisma.chatGrupo.findUnique({
        where: { id: grupoId },
        select: { id: true, nombre: true },
      });
      if (!grupo) continue;

      const mensajes = await prisma.chatGrupal.findMany({
        where: {
          grupoId,
          leidos: { none: { usuarioNickname: nombre } },
        },
        orderBy: { fecha: "asc" },
        take: limitPorConversacion,
      });

      if (!mensajes.length) continue;

      conversaciones.push({
        tipo: "grupal",
        conversacion_id: grupo.id,
        conversacion_nombre: grupo.nombre,
        mensajes_no_leidos: mensajes.length,
        ultima_fecha: mensajes[mensajes.length - 1].fecha?.toISOString?.() || null,
        mensajes: mensajes.map((m) => serializarMensaje(m)),
      });
    }

    conversaciones.sort((a, b) => {
      const fa = a.ultima_fecha ? new Date(a.ultima_fecha).getTime() : 0;
      const fb = b.ultima_fecha ? new Date(b.ultima_fecha).getTime() : 0;
      return fb - fa;
    });

    res.json(conversaciones);
  } catch (e) {
    console.error("Error obteniendo sin-leer:", e?.message);
    res.json([]);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// GRUPOS
// ═════════════════════════════════════════════════════════════════════════════

chatRouter.get("/grupos", requireAuth, async (req, res) => {
  try {
    const nombre = getNombre(req);
    const grupos = await prisma.chatGrupo.findMany({
      include: {
        miembros: { select: { usuarioNickname: true } },
        admins: { select: { usuarioNickname: true } },
      },
      orderBy: { fechaCreacion: "desc" },
    });

    res.json(grupos.map((g) => {
      const esAdmin = g.creadoPor === nombre || g.admins.some((a) => a.usuarioNickname === nombre);
      return {
        ...serializarGrupo(g),
        miembros: g.miembros.map((m) => m.usuarioNickname),
        es_miembro: g.miembros.some((m) => m.usuarioNickname === nombre),
        es_admin: esAdmin,
      };
    }));
  } catch (e) {
    console.error("Error obteniendo grupos:", e);
    res.json([]);
  }
});

chatRouter.post("/grupos", requireAuth, async (req, res) => {
  try {
    const nombre = getNombre(req);
    if (!nombre) return res.status(400).json({ error: "Usuario sin nombre" });

    const { nombre: grupoNombre, descripcion, es_publico } = req.body;
    if (!grupoNombre?.trim()) return res.status(400).json({ error: "Nombre requerido" });

    const grupo = await prisma.chatGrupo.create({
      data: {
        nombre: grupoNombre.trim(),
        descripcion: descripcion || null,
        creadoPor: nombre,
        esPublico: es_publico !== undefined ? Boolean(es_publico) : true,
        miembros: { create: { usuarioNickname: nombre } },
      },
    });

    const out = serializarGrupo(grupo);
    getIO().emit("chat_grupo_creado", out);
    res.json({ ok: true, grupo: out });
  } catch (e) {
    console.error("Error creando grupo:", e);
    res.status(500).json({ error: "Error creando grupo" });
  }
});

chatRouter.get("/grupos/:id/mensajes", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const nombre = getNombre(req);
    if (!nombre) return res.status(400).json({ error: "Usuario sin nombre" });

    const esMiembro = await prisma.chatGrupoMiembro.findUnique({
      where: { grupoId_usuarioNickname: { grupoId: Number(id), usuarioNickname: nombre } },
    });
    if (!esMiembro) return res.status(403).json({ error: "No eres miembro de este grupo" });

    const mensajes = await prisma.chatGrupal.findMany({
      where: { grupoId: Number(id) },
      orderBy: { fecha: "asc" },
    });

    res.json(mensajes.map(serializarMensaje));
  } catch (e) {
    res.status(500).json({ error: "Error obteniendo mensajes del grupo" });
  }
});

chatRouter.post("/grupos/:id/mensajes", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const nombre = getNombre(req);
    if (!nombre) return res.status(400).json({ error: "Usuario sin nombre" });

    const esMiembro = await prisma.chatGrupoMiembro.findUnique({
      where: { grupoId_usuarioNickname: { grupoId: Number(id), usuarioNickname: nombre } },
    });
    if (!esMiembro) return res.status(403).json({ error: "No eres miembro de este grupo" });

    // Verificar restricción
    const restriccion = await prisma.chatGrupoRestriccion.findFirst({
      where: { grupoId: Number(id), usuarioNickname: nombre, activa: true },
      orderBy: { fecha: "desc" },
    });
    if (restriccion) {
      if (restriccion.fechaFin && new Date() > restriccion.fechaFin) {
        await prisma.chatGrupoRestriccion.update({ where: { id: restriccion.id }, data: { activa: false } });
      } else {
        return res.status(403).json({ error: "No puedes enviar mensajes en este grupo", restriccion: true });
      }
    }

    const {
      mensaje, tipo_mensaje, archivo_id, archivo_url, archivo_nombre,
      archivo_tipo, archivo_tamaño, menciona, enlace_compartido,
      reply_to_id, reply_to_user, reply_to_text,
      reenviado_de_usuario, reenviado_de_chat, reenviado_de_tipo,
    } = req.body;

    if (!mensaje?.trim()) return res.status(400).json({ error: "Mensaje vacío" });

    let archivoUrl = archivo_url || null;
    let archivoNombre = archivo_nombre || null;
    let archivoTipo = archivo_tipo || null;
    let archivoTamaño = archivo_tamaño ? archivo_tamaño ? Number(archivo_tamaño) : null : null;

    if (archivo_id) {
      const arch = await prisma.chatArchivo.findUnique({ where: { id: Number(archivo_id) } });
      if (arch) {
        archivoUrl = `/api/chat/archivo/${arch.id}`;
        archivoNombre = arch.nombreOriginal;
        archivoTipo = arch.tipoMime;
        archivoTamaño = arch.tamaño;
      }
    }

    const nuevo = await prisma.chatGrupal.create({
      data: {
        grupoId: Number(id),
        usuarioNickname: nombre,
        mensaje: mensaje.trim(),
        tipoMensaje: tipo_mensaje || "texto",
        archivoUrl,
        archivoNombre,
        archivoTipo,
        archivoTamaño,
        menciona: menciona || null,
        enlaceCompartido: enlace_compartido || null,
        replyToId: reply_to_id ? Number(reply_to_id) : null,
        replyToUser: reply_to_user || null,
        replyToText: reply_to_text || null,
        reenviadoDeUsuario: reenviado_de_usuario || null,
        reenviadoDeChat: reenviado_de_chat || null,
        reenviadoDeTipo: reenviado_de_tipo || null,
      },
    });

    const out = serializarMensaje(nuevo);
    getIO().emit("chat_grupal_nuevo", out);

    // Push notification to offline group members
    try {
      const miembros = await prisma.chatGrupoMiembro.findMany({
        where: { grupoId: Number(id) },
        select: { usuarioNickname: true },
      });
      const grupoNombre = (await prisma.chatGrupo.findUnique({ where: { id: Number(id) }, select: { nombre: true } }))?.nombre || 'Grupo';
      miembros.forEach(({ usuarioNickname }) => {
        if (usuarioNickname !== nombre) {
          sendPushToNick(
            usuarioNickname,
            {
              type: "group_message",
              groupId: Number(id),
              groupName: grupoNombre,
              fromNickname: nombre,
              text: nuevo.mensaje,
              soundUrl: "/sounds/notification-alert.wav",
              url: "/",
            },
            { skipIfOnline: true },
          ).catch(() => {});
        }
      });
    } catch (_) {}

    res.json({ ok: true, mensaje: out });
  } catch (e) {
    console.error("Error enviando mensaje grupal:", e);
    res.status(500).json({ error: "Error enviando mensaje grupal" });
  }
});

chatRouter.post("/grupos/:id/leer", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const nombre = getNombre(req);
    if (!nombre) return res.status(400).json({ error: "Usuario sin nombre" });

    const noLeidos = await prisma.chatGrupal.findMany({
      where: {
        grupoId: Number(id),
        leidos: { none: { usuarioNickname: nombre } },
      },
      select: { id: true },
    });

    if (noLeidos.length > 0) {
      const existentes = await prisma.chatGrupalLeido.findMany({
        where: { usuarioNickname: nombre, mensajeId: { in: noLeidos.map((m) => m.id) } },
        select: { mensajeId: true },
      });
      const existentesSet = new Set(existentes.map((e) => e.mensajeId));
      const nuevos = noLeidos.filter((m) => !existentesSet.has(m.id));
      if (nuevos.length > 0) {
        await prisma.chatGrupalLeido.createMany({
          data: nuevos.map((m) => ({
            mensajeId: m.id,
            grupoId: Number(id),
            usuarioNickname: nombre,
          })),
        });
      }
    }

    res.json({ ok: true, mensajes_marcados: noLeidos.length });
  } catch (e) {
    res.status(500).json({ error: "Error marcando mensajes grupales como leídos" });
  }
});

chatRouter.delete("/grupos/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const nombre = getNombre(req);
    if (!nombre) return res.status(400).json({ error: "Usuario sin nombre" });

    const grupo = await prisma.chatGrupo.findUnique({ where: { id: Number(id) } });
    if (!grupo) return res.status(404).json({ error: "Grupo no encontrado" });

    const user = getAllUsers().find((u) => u.name === nombre);
    const esLead = user?.role === "Lead";
    const esCreador = grupo.creadoPor === nombre;
    if (!esLead && !esCreador) {
      return res.status(403).json({ error: "Solo el creador del grupo puede eliminarlo" });
    }

    if (grupo.foto?.startsWith("/api/chat/grupo-foto/")) {
      const filename = grupo.foto.replace("/api/chat/grupo-foto/", "");
      const filePath = path.join(gruposUploadsDir, filename);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch { /* ignore */ }
      }
    }

    await prisma.chatGrupo.delete({ where: { id: Number(id) } });
    getIO().emit("chat_grupo_borrado", { grupo_id: Number(id) });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Error borrando grupo" });
  }
});

chatRouter.get("/grupos/:id/perfil", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const nombre = getNombre(req);
    if (!nombre) return res.status(400).json({ error: "Usuario sin nombre" });

    const esMiembro = await prisma.chatGrupoMiembro.findUnique({
      where: { grupoId_usuarioNickname: { grupoId: Number(id), usuarioNickname: nombre } },
    });
    if (!esMiembro) return res.status(403).json({ error: "No eres miembro de este grupo" });

    const grupo = await prisma.chatGrupo.findUnique({
      where: { id: Number(id) },
      include: {
        miembros: { select: { usuarioNickname: true, unidoEn: true } },
        admins: { select: { usuarioNickname: true } },
        restricciones: { where: { activa: true } },
      },
    });
    if (!grupo) return res.status(404).json({ error: "Grupo no encontrado" });

    const restriccionesPorUsuario = {};
    grupo.restricciones.forEach((r) => {
      if (r.fechaFin && new Date() > r.fechaFin) return;
      restriccionesPorUsuario[r.usuarioNickname] = {
        tipo: r.restriccionTipo,
        fecha_fin: r.fechaFin?.toISOString() || null,
        indefinida: !r.fechaFin,
      };
    });

    const esAdmin = await esAdminDeGrupo(Number(id), nombre);

    res.json({
      ...serializarGrupo(grupo),
      miembros: grupo.miembros.map((m) => m.usuarioNickname),
      administradores: grupo.admins.map((a) => a.usuarioNickname),
      restricciones: restriccionesPorUsuario,
      es_admin: esAdmin,
      es_creador: grupo.creadoPor === nombre,
    });
  } catch (e) {
    res.status(500).json({ error: "Error obteniendo perfil de grupo" });
  }
});

chatRouter.put("/grupos/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const nombre = getNombre(req);
    if (!nombre) return res.status(400).json({ error: "Usuario sin nombre" });

    const esAdmin = await esAdminDeGrupo(Number(id), nombre);
    if (!esAdmin) return res.status(403).json({ error: "Solo los administradores pueden actualizar el grupo" });

    const { nombre: grupoNombre, descripcion, es_publico } = req.body;
    const data = {};
    if (grupoNombre !== undefined) data.nombre = grupoNombre;
    if (descripcion !== undefined) data.descripcion = descripcion;
    if (es_publico !== undefined) data.esPublico = Boolean(es_publico);
    if (Object.keys(data).length === 0) return res.status(400).json({ error: "No hay campos" });

    const grupo = await prisma.chatGrupo.update({ where: { id: Number(id) }, data });
    const out = serializarGrupo(grupo);
    getIO().emit("chat_grupo_actualizado", out);
    res.json({ ok: true, grupo: out });
  } catch (e) {
    res.status(500).json({ error: "Error actualizando grupo" });
  }
});

chatRouter.post("/grupos/:id/foto", requireAuth, uploadGrupo.single("foto"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No se proporcionó imagen" });

    const { id } = req.params;
    const nombre = getNombre(req);
    if (!nombre) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Usuario sin nombre" });
    }

    const grupoId = Number(id);
    const esAdmin = await esAdminDeGrupo(grupoId, nombre);
    if (!esAdmin) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: "Solo los administradores pueden cambiar la foto" });
    }

    if (!req.file.mimetype.startsWith("image/")) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Solo se permiten imágenes" });
    }

    const grupo = await prisma.chatGrupo.findUnique({ where: { id: grupoId } });
    if (!grupo) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: "Grupo no encontrado" });
    }

    if (grupo.foto?.startsWith("/api/chat/grupo-foto/")) {
      const oldFilename = grupo.foto.replace("/api/chat/grupo-foto/", "");
      const oldPath = path.join(gruposUploadsDir, oldFilename);
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch { /* ignore */ }
      }
    }

    const fotoUrl = `/api/chat/grupo-foto/${req.file.filename}`;
    const updated = await prisma.chatGrupo.update({
      where: { id: grupoId },
      data: { foto: fotoUrl },
    });
    const out = serializarGrupo(updated);
    getIO().emit("chat_grupo_actualizado", out);
    res.json({ ok: true, foto: fotoUrl, grupo: out });
  } catch (e) {
    console.error("Error subiendo foto de grupo:", e);
    if (req.file?.path) {
      try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
    }
    res.status(500).json({ error: "Error subiendo foto de grupo" });
  }
});

chatRouter.delete("/grupos/:id/foto", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const nombre = getNombre(req);
    if (!nombre) return res.status(400).json({ error: "Usuario sin nombre" });

    const grupoId = Number(id);
    const esAdmin = await esAdminDeGrupo(grupoId, nombre);
    if (!esAdmin) return res.status(403).json({ error: "Solo los administradores pueden quitar la foto" });

    const grupo = await prisma.chatGrupo.findUnique({ where: { id: grupoId } });
    if (!grupo) return res.status(404).json({ error: "Grupo no encontrado" });

    if (grupo.foto?.startsWith("/api/chat/grupo-foto/")) {
      const filename = grupo.foto.replace("/api/chat/grupo-foto/", "");
      const filePath = path.join(gruposUploadsDir, filename);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch { /* ignore */ }
      }
    }

    const updated = await prisma.chatGrupo.update({
      where: { id: grupoId },
      data: { foto: null },
    });
    const out = serializarGrupo(updated);
    getIO().emit("chat_grupo_actualizado", out);
    res.json({ ok: true, grupo: out });
  } catch (e) {
    res.status(500).json({ error: "Error quitando foto de grupo" });
  }
});

chatRouter.post("/grupos/:id/miembros", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_nickname } = req.body;
    const nombre = getNombre(req);
    if (!nombre) return res.status(400).json({ error: "Usuario sin nombre" });
    if (!usuario_nickname) return res.status(400).json({ error: "Nickname requerido" });

    const esAdmin = await esAdminDeGrupo(Number(id), nombre);
    if (!esAdmin) return res.status(403).json({ error: "Solo los administradores pueden agregar miembros" });

    await prisma.chatGrupoMiembro.upsert({
      where: { grupoId_usuarioNickname: { grupoId: Number(id), usuarioNickname: usuario_nickname } },
      update: {},
      create: { grupoId: Number(id), usuarioNickname: usuario_nickname },
    });

    getIO().emit("chat_grupo_actualizado", { id: Number(id) });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Error agregando miembro" });
  }
});

chatRouter.delete("/grupos/:id/miembros/:nickname", requireAuth, async (req, res) => {
  try {
    const { id, nickname } = req.params;
    const nombre = getNombre(req);
    if (!nombre) return res.status(400).json({ error: "Usuario sin nombre" });

    const puedeEliminar = await esAdminDeGrupo(Number(id), nombre) || nombre === nickname;
    if (!puedeEliminar) return res.status(403).json({ error: "Sin permiso para eliminar este miembro" });

    await prisma.chatGrupoMiembro.delete({
      where: { grupoId_usuarioNickname: { grupoId: Number(id), usuarioNickname: nickname } },
    });
    await prisma.chatGrupoAdmin.deleteMany({ where: { grupoId: Number(id), usuarioNickname: nickname } });
    await prisma.chatGrupoRestriccion.deleteMany({ where: { grupoId: Number(id), usuarioNickname: nickname } });

    getIO().emit("chat_grupo_actualizado", { id: Number(id) });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Error eliminando miembro" });
  }
});

chatRouter.post("/grupos/:id/miembros/:nickname/admin", requireAuth, async (req, res) => {
  try {
    const { id, nickname } = req.params;
    const { es_admin } = req.body;
    const nombre = getNombre(req);
    if (!nombre) return res.status(400).json({ error: "Usuario sin nombre" });

    const esAdmin = await esAdminDeGrupo(Number(id), nombre);
    if (!esAdmin) return res.status(403).json({ error: "Solo los administradores pueden gestionar admins" });

    const grupo = await prisma.chatGrupo.findUnique({ where: { id: Number(id) } });
    if (!grupo) return res.status(404).json({ error: "Grupo no encontrado" });
    if (grupo.creadoPor === nickname) {
      return res.status(400).json({ error: "El creador siempre es administrador" });
    }

    if (es_admin) {
      await prisma.chatGrupoAdmin.upsert({
        where: { grupoId_usuarioNickname: { grupoId: Number(id), usuarioNickname: nickname } },
        update: {},
        create: { grupoId: Number(id), usuarioNickname: nickname },
      });
    } else {
      await prisma.chatGrupoAdmin.deleteMany({ where: { grupoId: Number(id), usuarioNickname: nickname } });
    }

    getIO().emit("chat_grupo_actualizado", { id: Number(id) });
    res.json({ ok: true, es_admin: Boolean(es_admin) });
  } catch (e) {
    res.status(500).json({ error: "Error gestionando administrador" });
  }
});

chatRouter.post("/grupos/:id/miembros/:nickname/restringir", requireAuth, async (req, res) => {
  try {
    const { id, nickname } = req.params;
    const { duracion_minutos, remover } = req.body;
    const nombre = getNombre(req);
    if (!nombre) return res.status(400).json({ error: "Usuario sin nombre" });

    const esAdmin = await esAdminDeGrupo(Number(id), nombre);
    if (!esAdmin) return res.status(403).json({ error: "Solo los administradores pueden restringir" });

    await prisma.chatGrupoRestriccion.updateMany({
      where: { grupoId: Number(id), usuarioNickname: nickname },
      data: { activa: false },
    });

    if (remover) {
      getIO().emit("chat_grupo_actualizado", { id: Number(id) });
      return res.json({ ok: true, removida: true });
    }

    let fechaFin = null;
    if (duracion_minutos != null) {
      fechaFin = new Date(Date.now() + duracion_minutos * 60 * 1000);
    }

    await prisma.chatGrupoRestriccion.create({
      data: {
        grupoId: Number(id),
        usuarioNickname: nickname,
        duracionMinutos: duracion_minutos || null,
        fechaFin,
        activa: true,
      },
    });

    getIO().emit("chat_grupo_actualizado", { id: Number(id) });
    res.json({ ok: true, fecha_fin: fechaFin?.toISOString() || null });
  } catch (e) {
    res.status(500).json({ error: "Error restringiendo mensajes" });
  }
});

chatRouter.post("/grupos/:id/solicitar-acceso", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const nombre = getNombre(req);
    if (!nombre) return res.status(400).json({ error: "Usuario sin nombre" });

    const grupo = await prisma.chatGrupo.findUnique({ where: { id: Number(id) } });
    if (!grupo) return res.status(404).json({ error: "Grupo no encontrado" });
    if (grupo.esPublico) return res.status(400).json({ error: "El grupo es público; puedes unirte directamente" });

    const esMiembro = await prisma.chatGrupoMiembro.findUnique({
      where: { grupoId_usuarioNickname: { grupoId: Number(id), usuarioNickname: nombre } },
    });
    if (esMiembro) return res.status(400).json({ error: "Ya eres miembro" });

    const existente = await prisma.chatGrupoSolicitud.findFirst({
      where: { grupoId: Number(id), usuarioNickname: nombre, estado: "pendiente" },
    });
    if (existente) return res.status(400).json({ error: "Ya has solicitado acceso. Espera la respuesta." });

    const sol = await prisma.chatGrupoSolicitud.create({
      data: { grupoId: Number(id), usuarioNickname: nombre },
    });

    getIO().emit("chat_grupo_solicitud_nueva", { grupo_id: Number(id), solicitud_id: sol.id });
    res.json({ ok: true, solicitud_id: sol.id });
  } catch (e) {
    res.status(500).json({ error: "Error solicitando acceso" });
  }
});

chatRouter.get("/grupos/:id/solicitudes", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const nombre = getNombre(req);
    if (!nombre) return res.status(400).json({ error: "Usuario sin nombre" });

    const esAdmin = await esAdminDeGrupo(Number(id), nombre);
    if (!esAdmin) return res.status(403).json({ error: "Solo admins pueden ver solicitudes" });

    const solicitudes = await prisma.chatGrupoSolicitud.findMany({
      where: { grupoId: Number(id), estado: "pendiente" },
      orderBy: { fecha: "asc" },
    });
    res.json(solicitudes);
  } catch (e) {
    res.status(500).json({ error: "Error obteniendo solicitudes" });
  }
});

chatRouter.post("/grupos/:id/solicitudes/:sid/responder", requireAuth, async (req, res) => {
  try {
    const { id, sid } = req.params;
    const { aceptar } = req.body;
    const nombre = getNombre(req);
    if (!nombre) return res.status(400).json({ error: "Usuario sin nombre" });

    const esAdmin = await esAdminDeGrupo(Number(id), nombre);
    if (!esAdmin) return res.status(403).json({ error: "Solo admins pueden responder" });

    const sol = await prisma.chatGrupoSolicitud.findFirst({
      where: { id: Number(sid), grupoId: Number(id), estado: "pendiente" },
    });
    if (!sol) return res.status(404).json({ error: "Solicitud no encontrada" });

    if (aceptar) {
      await prisma.chatGrupoMiembro.upsert({
        where: { grupoId_usuarioNickname: { grupoId: Number(id), usuarioNickname: sol.usuarioNickname } },
        update: {},
        create: { grupoId: Number(id), usuarioNickname: sol.usuarioNickname },
      });
      await prisma.chatGrupoSolicitud.update({ where: { id: Number(sid) }, data: { estado: "aceptada" } });
    } else {
      await prisma.chatGrupoSolicitud.update({ where: { id: Number(sid) }, data: { estado: "rechazada" } });
    }

    getIO().emit("chat_grupo_solicitud_respondida", {
      grupo_id: Number(id),
      solicitud_id: Number(sid),
      aceptada: Boolean(aceptar),
      usuario_nickname: sol.usuarioNickname,
    });
    res.json({ ok: true, aceptada: Boolean(aceptar) });
  } catch (e) {
    res.status(500).json({ error: "Error respondiendo solicitud" });
  }
});

chatRouter.post("/grupos/:id/transferir", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { nuevo_creador } = req.body;
    const nombre = getNombre(req);
    if (!nombre) return res.status(400).json({ error: "Usuario sin nombre" });

    const grupo = await prisma.chatGrupo.findUnique({ where: { id: Number(id) } });
    if (!grupo) return res.status(404).json({ error: "Grupo no encontrado" });
    if (grupo.creadoPor !== nombre) return res.status(403).json({ error: "Solo el creador puede transferir" });

    await prisma.chatGrupo.update({ where: { id: Number(id) }, data: { creadoPor: nuevo_creador } });
    await prisma.chatGrupoAdmin.deleteMany({ where: { grupoId: Number(id), usuarioNickname: nuevo_creador } });

    getIO().emit("chat_grupo_actualizado", { id: Number(id), creado_por: nuevo_creador });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Error transfiriendo propiedad" });
  }
});

// Compartidos en chat privado
chatRouter.get("/privado/:nickname/compartidos", requireAuth, async (req, res) => {
  try {
    const { nickname } = req.params;
    const nombre = getNombre(req);
    const { tipo } = req.query;

    const mediaConditions = [];
    if (!tipo || tipo === "imagenes") mediaConditions.push({ archivoTipo: { startsWith: "image/" } });
    if (!tipo || tipo === "videos") mediaConditions.push({ archivoTipo: { startsWith: "video/" } });
    if (!tipo || tipo === "archivos") mediaConditions.push({ AND: [{ archivoUrl: { not: null } }, { archivoTipo: { not: { startsWith: "image/" } } }, { archivoTipo: { not: { startsWith: "video/" } } }] });
    if (!tipo || tipo === "links") mediaConditions.push({ enlaceCompartido: { not: null } });

    const compartidos = await prisma.chatPrivado.findMany({
      where: {
        AND: [
          {
            OR: [
              { usuarioNickname: nombre, destinatarioNickname: nickname },
              { usuarioNickname: nickname, destinatarioNickname: nombre },
            ],
          },
          ...(mediaConditions.length > 0 ? [{ OR: mediaConditions }] : []),
        ],
      },
      orderBy: { fecha: "desc" },
    });
    res.json(compartidos.map(serializarMensaje));
  } catch (e) {
    res.json([]);
  }
});

chatRouter.get("/grupos/:id/compartidos", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const nombre = getNombre(req);
    const { tipo } = req.query;

    const esMiembro = await prisma.chatGrupoMiembro.findUnique({
      where: { grupoId_usuarioNickname: { grupoId: Number(id), usuarioNickname: nombre } },
    });
    if (!esMiembro) return res.status(403).json({ error: "No eres miembro" });

    const conditions = [];
    if (!tipo || tipo === "imagenes") conditions.push({ archivoTipo: { startsWith: "image/" } });
    if (!tipo || tipo === "videos") conditions.push({ archivoTipo: { startsWith: "video/" } });
    if (!tipo || tipo === "archivos") conditions.push({ AND: [{ archivoUrl: { not: null } }, { archivoTipo: { not: { startsWith: "image/" } } }, { archivoTipo: { not: { startsWith: "video/" } } }] });
    if (!tipo || tipo === "links") conditions.push({ enlaceCompartido: { not: null } });

    const compartidos = await prisma.chatGrupal.findMany({
      where: { grupoId: Number(id), OR: conditions },
      orderBy: { fecha: "desc" },
    });
    res.json(compartidos.map(serializarMensaje));
  } catch (e) {
    res.status(500).json({ error: "Error obteniendo compartidos" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// ARCHIVOS
// ═════════════════════════════════════════════════════════════════════════════

chatRouter.post("/archivo", requireAuth, upload.single("archivo"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No se proporcionó archivo" });
    const nombre = getNombre(req);
    if (!nombre) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Usuario sin nombre" });
    }

    const archivo = await prisma.chatArchivo.create({
      data: {
        nombreOriginal: req.file.originalname,
        tipoMime: req.file.mimetype,
        tamaño: req.file.size,
        url: `/api/chat/archivo-local/${req.file.filename}`,
        subidoPor: nombre,
      },
    });

    res.json({
      ok: true,
      archivo: {
        id: archivo.id,
        nombre_original: archivo.nombreOriginal,
        tipo_mime: archivo.tipoMime,
        tamaño: Number(archivo.tamaño),
        url: archivo.url,
      },
    });
  } catch (e) {
    console.error("Error subiendo archivo:", e);
    if (req.file?.path) { try { fs.unlinkSync(req.file.path); } catch {} }
    res.status(500).json({ error: "Error subiendo archivo" });
  }
});

chatRouter.get("/archivo/:id", requireAuth, async (req, res) => {
  try {
    const archivo = await prisma.chatArchivo.findUnique({ where: { id: Number(req.params.id) } });
    if (!archivo) return res.status(404).json({ error: "Archivo no encontrado" });

    // For files uploaded via Cloudinary url, redirect to that URL
    if (archivo.url && !archivo.url.startsWith("/api/chat/archivo-local/")) {
      return res.redirect(archivo.url);
    }

    const filename = archivo.url.replace("/api/chat/archivo-local/", "");
    const filePath = path.join(chatUploadsDir, filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Archivo físico no encontrado" });

    const mimeType = archivo.tipoMime || "application/octet-stream";
    // Para audio y video, servir con soporte de range requests para que el navegador pueda hacer seeking
    const isMedia = mimeType.startsWith("audio/") || mimeType.startsWith("video/");
    if (isMedia) {
      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;
        const fileStream = fs.createReadStream(filePath, { start, end });
        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize,
          "Content-Type": mimeType,
        });
        return fileStream.pipe(res);
      } else {
        res.writeHead(200, {
          "Content-Length": fileSize,
          "Content-Type": mimeType,
          "Accept-Ranges": "bytes",
        });
        return fs.createReadStream(filePath).pipe(res);
      }
    }

    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(archivo.nombreOriginal)}"`);
    res.sendFile(path.resolve(filePath));
  } catch (e) {
    res.status(500).json({ error: "Error sirviendo archivo" });
  }
});

chatRouter.get("/archivo-local/:filename", requireAuth, (req, res) => {
  const { filename } = req.params;
  if (/[/\\]/.test(filename)) return res.status(400).json({ error: "Nombre inválido" });
  const filePath = path.join(chatUploadsDir, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Archivo no encontrado" });
  res.sendFile(path.resolve(filePath));
});

chatRouter.get("/grupo-foto/:filename", requireAuth, (req, res) => {
  const { filename } = req.params;
  if (/[/\\]/.test(filename)) return res.status(400).json({ error: "Nombre inválido" });
  const filePath = path.join(gruposUploadsDir, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Foto no encontrada" });
  res.sendFile(path.resolve(filePath));
});

// ═════════════════════════════════════════════════════════════════════════════
// MENSAJES: EDITAR / ELIMINAR
// ═════════════════════════════════════════════════════════════════════════════

chatRouter.put("/mensaje/:tipo/:id", requireAuth, async (req, res) => {
  try {
    const { tipo, id } = req.params;
    const { mensaje } = req.body;
    const nombre = getNombre(req);
    if (!nombre) return res.status(400).json({ error: "Usuario sin nombre" });
    if (!mensaje?.trim()) return res.status(400).json({ error: "Mensaje vacío" });

    const { modelo, campoDe } = getModeloMensaje(tipo);
    if (!modelo) return res.status(400).json({ error: "Tipo de chat inválido" });

    const actual = await prisma[modelo].findUnique({ where: { id: Number(id) } });
    if (!actual) return res.status(404).json({ error: "Mensaje no encontrado" });
    if (actual[campoDe] !== nombre) return res.status(403).json({ error: "Solo puedes editar tus propios mensajes" });

    const editado = await prisma[modelo].update({
      where: { id: Number(id) },
      data: { mensaje: mensaje.trim(), mensajeEditado: true, fechaEdicion: new Date() },
    });

    const out = serializarMensaje(editado);
    if (tipo === "general") getIO().emit("chat_general_editado", out);
    else if (tipo === "privado") {
      getIO().emit("chat_privado_editado", out);
      // Compatibilidad con clientes que ya escuchan *_actualizado
      getIO().emit("chat_privado_actualizado", out);
      emitChatsActivosActualizados();
    }
    else getIO().emit("chat_grupal_editado", out);

    res.json({ ok: true, mensaje: out });
  } catch (e) {
    res.status(500).json({ error: "Error editando mensaje" });
  }
});

chatRouter.delete("/mensaje/:tipo/:id", requireAuth, async (req, res) => {
  try {
    const { tipo, id } = req.params;
    const nombre = getNombre(req);
    if (!nombre) return res.status(400).json({ error: "Usuario sin nombre" });

    const { modelo, campoDe } = getModeloMensaje(tipo);
    if (!modelo) return res.status(400).json({ error: "Tipo de chat inválido" });

    const actual = await prisma[modelo].findUnique({ where: { id: Number(id) } });
    if (!actual) return res.status(404).json({ error: "Mensaje no encontrado" });

    // Check admin role for general chat, or own message
    const user = getAllUsers().find((u) => u.name === nombre);
    const esAdmin = user?.role === "Lead";
    if (actual[campoDe].toLowerCase() !== nombre.toLowerCase() && !esAdmin) {
      return res.status(403).json({ error: "Solo puedes eliminar tus propios mensajes" });
    }

    await prisma[modelo].delete({ where: { id: Number(id) } });

    if (tipo === "general") getIO().emit("chat_general_borrado", { id: actual.id, usuario_nickname: actual.usuarioNickname });
    else if (tipo === "privado") {
      getIO().emit("chat_privado_borrado", { id: actual.id, de_nickname: actual.deNickname, para_nickname: actual.paraNickname });
      emitChatsActivosActualizados();
    }
    else getIO().emit("chat_grupal_borrado", { id: actual.id, grupo_id: actual.grupoId, usuario_nickname: actual.usuarioNickname });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Error eliminando mensaje" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// PRIORIDAD DE MENSAJES
// ═════════════════════════════════════════════════════════════════════════════

chatRouter.post("/mensaje/:tipo/:id/prioridad", requireAuth, async (req, res) => {
  try {
    const { tipo, id } = req.params;
    const { prioridad } = req.body;
    const { modelo } = getModeloMensaje(tipo);
    if (!modelo) return res.status(400).json({ error: "Tipo de chat inválido" });

    const actual = await prisma[modelo].findUnique({ where: { id: Number(id) } });
    if (!actual) return res.status(404).json({ error: "Mensaje no encontrado" });

    const nuevaPrioridad = prioridad === 1 ? 1 : 0;
    const actualizado = await prisma[modelo].update({
      where: { id: Number(id) },
      data: { prioridad: nuevaPrioridad },
    });

    const out = serializarMensaje(actualizado);
    if (tipo === "general") getIO().emit("chat_general_actualizado", out);
    else if (tipo === "privado") {
      getIO().emit("chat_privado_actualizado", out);
      emitChatsActivosActualizados();
    }
    else getIO().emit("chat_grupal_actualizado", out);

    res.json({ ok: true, success: true, mensaje: out });
  } catch (e) {
    res.status(500).json({ error: "Error marcando prioridad" });
  }
});

chatRouter.get("/mensaje/:tipo/:id/info", requireAuth, async (req, res) => {
  try {
    const { tipo, id } = req.params;
    const nombre = getNombre(req);
    const { modelo } = getModeloMensaje(tipo);
    if (!modelo) return res.status(400).json({ error: "Tipo de chat inválido" });

    const actual = await prisma[modelo].findUnique({ where: { id: Number(id) } });
    if (!actual) return res.status(404).json({ error: "Mensaje no encontrado" });

    let fechaLeido = null;
    if (tipo === "privado") {
      const leidoPor = actual.deNickname === nombre ? actual.paraNickname : nombre;
      const leido = await prisma.chatPrivadoLeido.findUnique({
        where: { mensajeId_usuarioNickname: { mensajeId: Number(id), usuarioNickname: leidoPor } },
      });
      fechaLeido = leido?.fechaLeido?.toISOString() || null;
    }

    res.json({ ok: true, fecha_envio: actual.fecha, fecha_leido: fechaLeido });
  } catch (e) {
    res.status(500).json({ error: "Error obteniendo info" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// PINS Y DESTACADOS
// ═════════════════════════════════════════════════════════════════════════════

chatRouter.get("/pin/:tipo/:chatId", requireAuth, async (req, res) => {
  try {
    const { tipo, chatId } = req.params;
    const nombre = getNombre(req);
    if (!nombre) return res.status(400).json({ error: "Usuario sin nombre" });

    const pin = await prisma.chatPin.findFirst({
      where: { usuarioNickname: nombre, tipoChat: tipo, chatId: String(chatId) },
    });
    if (!pin) return res.json({ ok: true, pin: null });

    const { modelo } = getModeloMensaje(tipo);
    if (!modelo) return res.json({ ok: true, pin: null });

    const mensaje = await prisma[modelo].findUnique({ where: { id: pin.mensajeId } });
    res.json({ ok: true, pin: mensaje ? serializarMensaje(mensaje) : null });
  } catch (e) {
    res.json({ ok: true, pin: null });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// UI PREFERENCES (THEME, FONT, FONT SIZE)
// ═════════════════════════════════════════════════════════════════════════════

chatRouter.get("/ui-preferences", requireAuth, (req, res) => {
  try {
    const user = getAllUsers().find((u) => u.id === req.auth?.userId);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    const prefs = user.uiPreferences || {};
    res.json({
      theme: prefs.theme || "copmec-bosque",
      font: prefs.font || "bahnschrift",
      fontSize: prefs.fontSize || "normal",
    });
  } catch (e) {
    res.status(500).json({ error: "Error obteniendo preferencias UI" });
  }
});

chatRouter.post("/ui-preferences", requireAuth, (req, res) => {
  try {
    const { theme, font, fontSize } = req.body;

    const result = updateUserUiPreferences(req.auth, { theme, font, fontSize });
    if (!result.ok) {
      return res.status(result.reason === "auth_required" ? 401 : 500).json({ error: result.reason });
    }

    const savedPrefs = result.state.users.find((u) => u.id === result.userId)?.uiPreferences || {};
    res.json({ ok: true, preferences: savedPrefs });
  } catch (e) {
    res.status(500).json({ error: "Error guardando preferencias UI" });
  }
});

chatRouter.post("/pin", requireAuth, async (req, res) => {
  try {
    const { tipo_chat, chat_id, mensaje_id } = req.body || {};
    const nombre = getNombre(req);
    if (!nombre || !tipo_chat || !chat_id || !mensaje_id) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    await prisma.chatPin.deleteMany({
      where: { usuarioNickname: nombre, tipoChat: tipo_chat, chatId: String(chat_id) },
    });
    await prisma.chatPin.create({
      data: {
        usuarioNickname: nombre,
        tipoChat: tipo_chat,
        chatId: String(chat_id),
        mensajeId: Number(mensaje_id),
        grupoId: tipo_chat === "grupal" ? Number(chat_id) : null,
      },
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Error fijando mensaje" });
  }
});

chatRouter.delete("/pin", requireAuth, async (req, res) => {
  try {
    const { tipo_chat, chat_id } = req.body || {};
    const nombre = getNombre(req);
    if (!nombre || !tipo_chat || !chat_id) return res.status(400).json({ error: "Datos incompletos" });

    await prisma.chatPin.deleteMany({
      where: { usuarioNickname: nombre, tipoChat: tipo_chat, chatId: String(chat_id) },
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Error desfijando mensaje" });
  }
});

chatRouter.get("/destacados/:tipo/:chatId", requireAuth, async (req, res) => {
  try {
    const { tipo, chatId } = req.params;
    const nombre = getNombre(req);
    if (!nombre) return res.status(400).json({ error: "Usuario sin nombre" });

    const rows = await prisma.chatDestacado.findMany({
      where: { usuarioNickname: nombre, tipoChat: tipo, chatId: String(chatId) },
      select: { mensajeId: true },
    });
    res.json({ ok: true, destacados: rows.map((r) => r.mensajeId) });
  } catch (e) {
    res.json({ ok: true, destacados: [] });
  }
});

chatRouter.post("/destacados", requireAuth, async (req, res) => {
  try {
    const { tipo_chat, chat_id, mensaje_id } = req.body || {};
    const nombre = getNombre(req);
    if (!nombre || !tipo_chat || !chat_id || !mensaje_id) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const existente = await prisma.chatDestacado.findUnique({
      where: {
        usuarioNickname_tipoChat_chatId_mensajeId: {
          usuarioNickname: nombre,
          tipoChat: tipo_chat,
          chatId: String(chat_id),
          mensajeId: Number(mensaje_id),
        },
      },
    });

    if (existente) {
      await prisma.chatDestacado.delete({ where: { id: existente.id } });
      return res.json({ ok: true, destacado: false });
    }

    await prisma.chatDestacado.create({
      data: {
        usuarioNickname: nombre,
        tipoChat: tipo_chat,
        chatId: String(chat_id),
        mensajeId: Number(mensaje_id),
        grupoId: tipo_chat === "grupal" ? Number(chat_id) : null,
      },
    });
    res.json({ ok: true, destacado: true });
  } catch (e) {
    res.status(500).json({ error: "Error destacando mensaje" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// NOTIFICACIONES CONFIG
// ═════════════════════════════════════════════════════════════════════════════

chatRouter.get("/notificaciones/config", requireAuth, async (req, res) => {
  const defaults = {
    notificaciones_activas: 1,
    sonido_activo: 1,
    grupos_activos: 1,
    privados_activos: 1,
    general_activo: 1,
  };
  try {
    const nombre = getNombre(req);
    if (!nombre) return res.json(defaults);

    let config = await prisma.chatNotificacionConfig.findUnique({ where: { usuarioNickname: nombre } });
    if (!config) {
      config = await prisma.chatNotificacionConfig.create({ data: { usuarioNickname: nombre } });
    }

    res.json({
      ...defaults,
      notificaciones_activas: config.notificacionesActivas,
      sonido_activo: config.sonidoActivo,
      grupos_activos: config.gruposActivos,
      privados_activos: config.privadosActivos,
      general_activo: config.generalActivo,
    });
  } catch (e) {
    // Si la tabla no existe (migración pendiente), devolver defaults silenciosamente
    res.json(defaults);
  }
});

chatRouter.put("/notificaciones/config", requireAuth, async (req, res) => {
  try {
    const nombre = getNombre(req);
    if (!nombre) return res.status(400).json({ error: "Usuario sin nombre" });

    const { notificaciones_activas, sonido_activo, grupos_activos, privados_activos, general_activo } = req.body;

    const config = await prisma.chatNotificacionConfig.upsert({
      where: { usuarioNickname: nombre },
      update: {
        ...(notificaciones_activas !== undefined && { notificacionesActivas: Number(notificaciones_activas) }),
        ...(sonido_activo !== undefined && { sonidoActivo: Number(sonido_activo) }),
        ...(grupos_activos !== undefined && { gruposActivos: Number(grupos_activos) }),
        ...(privados_activos !== undefined && { privadosActivos: Number(privados_activos) }),
        ...(general_activo !== undefined && { generalActivo: Number(general_activo) }),
      },
      create: { usuarioNickname: nombre },
    });

    res.json({ ok: true, config });
  } catch (e) {
    res.status(500).json({ error: "Error actualizando configuración" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// REUNIONES
// ═════════════════════════════════════════════════════════════════════════════

function parseReunionParticipantes(raw) {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.map((p) => String(p || "").trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function serializeReunion(row, { includeToken = true } = {}) {
  if (!row) return null;
  return {
    id: row.id,
    titulo: row.titulo,
    descripcion: row.descripcion || "",
    fecha: row.fecha,
    hora: row.hora,
    lugar: row.lugar || "",
    esVideollamada: Boolean(row.esVideollamada),
    duracionMinutos: Number(row.duracionMinutos) > 0 ? Number(row.duracionMinutos) : 60,
    invitacionToken: includeToken ? (row.invitacionToken || null) : null,
    room: row.room || null,
    creador: row.creador,
    participantes: parseReunionParticipantes(row.participantes),
    chat_tipo: row.chatTipo,
    chat_id: row.chatId,
    estado: row.estado || "programada",
    creada: row.creadaEn?.toISOString?.() || row.creadaEn,
    activadaEn: row.activadaEn?.toISOString?.() || null,
  };
}

function reunionInvolucraUsuario(row, nombre, userAliasNorm) {
  if (!row || !nombre) return false;
  const creadorNorm = normalizeNick(row.creador);
  if (creadorNorm && userAliasNorm.has(creadorNorm)) return true;
  const participantes = parseReunionParticipantes(row.participantes);
  return participantes.some((p) => userAliasNorm.has(normalizeNick(p)));
}

function emitReunionActualizada(reunion, targetNicknames = []) {
  try {
    const io = getIO();
    const payload = { reunion };
    const targets = Array.from(new Set(targetNicknames.map((n) => String(n || "").trim()).filter(Boolean)));
    targets.forEach((nick) => {
      getSocketsByNickname(nick).forEach((socketId) => {
        io.to(socketId).emit("reunion_actualizada", payload);
      });
    });
  } catch {
    /* noop */
  }
}

function parseReunionDateTime(fecha, hora) {
  const datePart = String(fecha || "").trim();
  const timePart = String(hora || "00:00").trim();
  const [hh, mm] = timePart.split(":").map((v) => Number(v));
  const base = new Date(`${datePart}T00:00:00`);
  if (Number.isNaN(base.getTime())) return null;
  base.setHours(Number.isFinite(hh) ? hh : 0, Number.isFinite(mm) ? mm : 0, 0, 0);
  return base;
}

function getReunionDurationMinutes(row) {
  const raw = Number(row?.duracionMinutos);
  if (Number.isFinite(raw) && raw > 0) return Math.min(raw, 480);
  return 60;
}

function reunionesSeSolapan(inicioNueva, duracionNuevaMin, inicioExistente, duracionExistenteMin) {
  if (!inicioNueva || !inicioExistente) return false;
  const durNueva = duracionNuevaMin > 0 ? duracionNuevaMin : 60;
  const finNueva = new Date(inicioNueva.getTime() + durNueva * 60000);
  if (inicioNueva.getTime() < inicioExistente.getTime()) {
    return finNueva.getTime() > inicioExistente.getTime();
  }
  return false;
}

async function obtenerReunionesActivasMismaFecha(fecha, excluirId = null) {
  if (!prisma.chatReunion) return [];
  const rows = await prisma.chatReunion.findMany({
    where: {
      fecha: String(fecha),
      estado: { in: ["programada", "activa"] },
      ...(excluirId != null ? { NOT: { id: Number(excluirId) } } : {}),
    },
    take: 500,
  });
  return rows;
}

function detectarConflictosReunion({
  fecha,
  hora,
  duracionMinutos = 60,
  participantes = [],
  creador = "",
  reunionesRows = [],
}) {
  const inicioNueva = parseReunionDateTime(fecha, hora);
  if (!inicioNueva) return [];

  const personas = Array.from(new Set(
    [creador, ...participantes].map((p) => String(p || "").trim()).filter(Boolean),
  ));

  const conflictos = [];
  const vistos = new Set();

  reunionesRows.forEach((row) => {
    const reunion = serializeReunion(row);
    if (!reunion) return;
    const inicioExistente = parseReunionDateTime(reunion.fecha, reunion.hora);
    if (!inicioExistente) return;
    const durExist = getReunionDurationMinutes(row);
    if (!reunionesSeSolapan(inicioNueva, duracionMinutos, inicioExistente, durExist)) return;

    const involucrados = Array.from(new Set([
      reunion.creador,
      ...(Array.isArray(reunion.participantes) ? reunion.participantes : []),
    ].map((p) => String(p || "").trim()).filter(Boolean)));

    personas.forEach((persona) => {
      if (!involucrados.includes(persona)) return;
      const key = `${persona}::${reunion.id}`;
      if (vistos.has(key)) return;
      vistos.add(key);
      conflictos.push({
        nickname: persona,
        reunionId: reunion.id,
        titulo: reunion.titulo,
        fecha: reunion.fecha,
        hora: reunion.hora,
        duracionMinutos: durExist,
        creador: reunion.creador,
      });
    });
  });

  return conflictos;
}

function emitReunionSolicitudCambio(payload) {
  try {
    const io = getIO();
    const creador = payload?.creador;
    if (!creador) return;
    getSocketsByNickname(creador).forEach((socketId) => {
      io.to(socketId).emit("reunion_solicitud_cambio", payload);
    });
  } catch {
    /* noop */
  }
}

function generarTokenInvitacionReunion() {
  return crypto.randomBytes(18).toString("hex");
}

async function asegurarTokenInvitacionReunion(row) {
  if (!row || row.invitacionToken) return row;
  const token = generarTokenInvitacionReunion();
  const updated = await prisma.chatReunion.update({
    where: { id: row.id },
    data: { invitacionToken: token },
  });
  return updated;
}

function buildReunionInviteUrlFromReq(req, token) {
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.get("host") || "localhost";
  return `${proto}://${host}/reunion/join/${token}`;
}

function formatMensajeInvitacionReunion(reunion, url) {
  const lineas = [
    `📅 Invitación a reunión: ${reunion.titulo}`,
    `📆 Fecha: ${reunion.fecha} a las ${reunion.hora}`,
  ];
  if (reunion.duracionMinutos) lineas.push(`⏱ Duración estimada: ${reunion.duracionMinutos} min`);
  if (reunion.lugar) lineas.push(`📍 Lugar: ${reunion.lugar}`);
  if (reunion.esVideollamada) lineas.push("📹 Videollamada");
  lineas.push(`\n🔗 Enlace para unirse: ${url}`);
  lineas.push("\nPuedes entrar como invitado sin cuenta del sistema usando ese enlace cuando la reunión esté activa.");
  return lineas.join("\n");
}

chatRouter.get("/reuniones/proximas", requireAuth, async (req, res) => {
  try {
    if (!prisma.chatReunion) return res.json([]);
    const aliasInfo = obtenerAliasUsuarioLlamadas(req);
    if (!aliasInfo) return res.status(401).json({ error: "No autenticado" });

    const rows = await prisma.chatReunion.findMany({
      where: { estado: { in: ["programada", "activa"] } },
      orderBy: [{ fecha: "asc" }, { hora: "asc" }],
      take: 200,
    });

    const mias = rows
      .filter((row) => reunionInvolucraUsuario(row, aliasInfo.nombre, aliasInfo.userAliasNorm))
      .map(serializeReunion);

    res.json(mias);
  } catch (e) {
    console.error("[reuniones/proximas]", e?.message);
    res.json([]);
  }
});

chatRouter.get("/reuniones/chat/:tipo/:chatId", requireAuth, async (req, res) => {
  try {
    if (!prisma.chatReunion) return res.json([]);
    const { tipo, chatId } = req.params;
    const rows = await prisma.chatReunion.findMany({
      where: {
        chatTipo: String(tipo || ""),
        chatId: String(chatId || ""),
        estado: { in: ["programada", "activa"] },
      },
      orderBy: [{ fecha: "asc" }, { hora: "asc" }],
      take: 50,
    });
    res.json(rows.map(serializeReunion));
  } catch {
    res.json([]);
  }
});

chatRouter.post("/reuniones/verificar-conflictos", requireAuth, async (req, res) => {
  try {
    if (!prisma.chatReunion) return res.json({ conflictos: [] });
    const nombre = getNombre(req);
    if (!nombre) return res.status(401).json({ error: "No autenticado" });

    const {
      fecha, hora, duracionMinutos, participantes, excluirReunionId,
    } = req.body || {};

    if (!fecha || !hora) {
      return res.status(400).json({ error: "Fecha y hora requeridas" });
    }

    const participantesArr = Array.from(new Set(
      (Array.isArray(participantes) ? participantes : [])
        .map((p) => String(p || "").trim())
        .filter(Boolean),
    ));

    const rows = await obtenerReunionesActivasMismaFecha(fecha, excluirReunionId);
    const conflictos = detectarConflictosReunion({
      fecha,
      hora,
      duracionMinutos: Number(duracionMinutos) > 0 ? Number(duracionMinutos) : 60,
      participantes: participantesArr,
      creador: nombre,
      reunionesRows: rows,
    });

    res.json({ conflictos });
  } catch (e) {
    console.error("[reuniones/verificar-conflictos]", e?.message);
    res.json({ conflictos: [] });
  }
});

chatRouter.post("/reuniones", requireAuth, async (req, res) => {
  try {
    if (!prisma.chatReunion) return res.status(503).json({ error: "Reuniones no disponibles" });
    const nombre = getNombre(req);
    if (!nombre) return res.status(401).json({ error: "No autenticado" });

    const {
      titulo, descripcion, fecha, hora, lugar,
      esVideollamada, participantes, chat_tipo, chat_id, duracionMinutos,
    } = req.body || {};

    if (!titulo?.trim() || !fecha || !hora || !chat_tipo || !chat_id) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const participantesArr = Array.from(new Set(
      (Array.isArray(participantes) ? participantes : [])
        .map((p) => String(p || "").trim())
        .filter(Boolean),
    ));

    const duracion = Number(duracionMinutos) > 0 ? Math.min(Number(duracionMinutos), 480) : 60;
    const rowsMismaFecha = await obtenerReunionesActivasMismaFecha(fecha);
    const conflictos = detectarConflictosReunion({
      fecha,
      hora,
      duracionMinutos: duracion,
      participantes: participantesArr,
      creador: nombre,
      reunionesRows: rowsMismaFecha,
    });

    if (conflictos.length) {
      return res.status(409).json({
        error: "Conflicto de horario con otra reunion",
        conflictos,
      });
    }

    const created = await prisma.chatReunion.create({
      data: {
        titulo: titulo.trim(),
        descripcion: descripcion?.trim() || null,
        fecha: String(fecha),
        hora: String(hora),
        lugar: lugar?.trim() || null,
        esVideollamada: esVideollamada ? 1 : 0,
        duracionMinutos: duracion,
        invitacionToken: generarTokenInvitacionReunion(),
        room: null,
        creador: nombre,
        participantes: JSON.stringify(participantesArr),
        chatTipo: String(chat_tipo),
        chatId: String(chat_id),
        estado: "programada",
      },
    });

    const reunion = serializeReunion(created);
    const notifyTargets = Array.from(new Set([nombre, ...participantesArr]));
    emitReunionActualizada(reunion, notifyTargets);

    notifyTargets.forEach((nick) => {
      if (nick === nombre) return;
      sendPushToNick(
        nick,
        {
          type: "reunion_invite",
          reunionId: reunion.id,
          titulo: reunion.titulo,
          fecha: reunion.fecha,
          hora: reunion.hora,
          chatTipo: reunion.chat_tipo,
          chatId: reunion.chat_id,
          title: "Nueva reunión programada",
          body: `${nombre} te invitó a "${reunion.titulo}" el ${reunion.fecha} a las ${reunion.hora}`,
          url: "/",
        },
        { skipIfOnline: false },
      ).catch(() => {});
    });

    res.json(reunion);
  } catch (e) {
    console.error("[reuniones POST]", e?.message);
    res.status(500).json({ error: "No se pudo crear la reunión" });
  }
});

chatRouter.patch("/reuniones/:id", requireAuth, async (req, res) => {
  try {
    if (!prisma.chatReunion) return res.status(503).json({ error: "Reuniones no disponibles" });
    const nombre = getNombre(req);
    if (!nombre) return res.status(401).json({ error: "No autenticado" });
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "ID inválido" });

    const existing = await prisma.chatReunion.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Reunión no encontrada" });
    if (existing.creador !== nombre) return res.status(403).json({ error: "Solo el creador puede modificar la reunión" });

    const data = {};
    const body = req.body || {};
    if (body.titulo?.trim()) data.titulo = body.titulo.trim();
    if (body.descripcion != null) data.descripcion = String(body.descripcion || "").trim() || null;
    if (body.fecha) data.fecha = String(body.fecha);
    if (body.hora) data.hora = String(body.hora);
    if (body.lugar != null) data.lugar = String(body.lugar || "").trim() || null;
    if (typeof body.esVideollamada === "boolean") data.esVideollamada = body.esVideollamada ? 1 : 0;
    if (Number(body.duracionMinutos) > 0) data.duracionMinutos = Math.min(Number(body.duracionMinutos), 480);
    if (Array.isArray(body.participantes)) data.participantes = JSON.stringify(body.participantes);
    if (body.estado) data.estado = String(body.estado);
    if (body.room) data.room = String(body.room);
    if (body.estado === "activa") data.activadaEn = new Date();

    const fechaFinal = data.fecha || existing.fecha;
    const horaFinal = data.hora || existing.hora;
    const duracionFinal = data.duracionMinutos || getReunionDurationMinutes(existing);
    const participantesFinal = data.participantes
      ? parseReunionParticipantes(data.participantes)
      : parseReunionParticipantes(existing.participantes);

    const rowsMismaFecha = await obtenerReunionesActivasMismaFecha(fechaFinal, id);
    const conflictos = detectarConflictosReunion({
      fecha: fechaFinal,
      hora: horaFinal,
      duracionMinutos: duracionFinal,
      participantes: participantesFinal,
      creador: nombre,
      reunionesRows: rowsMismaFecha,
    });
    if (conflictos.length) {
      return res.status(409).json({
        error: "Conflicto de horario con otra reunion",
        conflictos,
      });
    }

    const updated = await prisma.chatReunion.update({ where: { id }, data });
    const reunion = serializeReunion(updated);
    const targets = Array.from(new Set([nombre, ...parseReunionParticipantes(updated.participantes)]));
    emitReunionActualizada(reunion, targets);
    res.json(reunion);
  } catch (e) {
    console.error("[reuniones PATCH]", e?.message);
    res.status(500).json({ error: "No se pudo actualizar la reunión" });
  }
});

chatRouter.delete("/reuniones/:id", requireAuth, async (req, res) => {
  try {
    if (!prisma.chatReunion) return res.json({ ok: true });
    const nombre = getNombre(req);
    if (!nombre) return res.status(401).json({ error: "No autenticado" });
    const id = Number(req.params.id);
    const existing = await prisma.chatReunion.findUnique({ where: { id } });
    if (!existing) return res.json({ ok: true });
    if (existing.creador !== nombre) return res.status(403).json({ error: "Solo el creador puede eliminar la reunión" });
    await prisma.chatReunion.update({
      where: { id },
      data: { estado: "cancelada" },
    });
    const reunion = serializeReunion({ ...existing, estado: "cancelada" });
    const targets = Array.from(new Set([nombre, ...parseReunionParticipantes(existing.participantes)]));
    emitReunionActualizada(reunion, targets);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "No se pudo eliminar la reunión" });
  }
});

chatRouter.post("/reuniones/:id/solicitar-cambio", requireAuth, async (req, res) => {
  try {
    if (!prisma.chatReunion) return res.status(503).json({ error: "Reuniones no disponibles" });
    const nombre = getNombre(req);
    if (!nombre) return res.status(401).json({ error: "No autenticado" });
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "ID invalido" });

    const reunionRow = await prisma.chatReunion.findUnique({ where: { id } });
    if (!reunionRow) return res.status(404).json({ error: "Reunion no encontrada" });
    const reunion = serializeReunion(reunionRow);

    const { mensaje, motivo, duracionEstimadaMinutos } = req.body || {};
    const motivoLabel = motivo === "duracion_extendida"
      ? "durara mas de 1 hora"
      : "conflicto de horario";

    const textoSolicitud = [
      `Solicitud de cambio de reunion: "${reunion.titulo}"`,
      `Motivo: ${motivoLabel}`,
      `Fecha propuesta: ${reunion.fecha} a las ${reunion.hora}`,
      duracionEstimadaMinutos ? `Duracion estimada: ${duracionEstimadaMinutos} min` : null,
      mensaje?.trim() ? `Mensaje: ${mensaje.trim()}` : null,
      `Solicitado por: ${nombre}`,
    ].filter(Boolean).join("\n");

    const creador = reunion.creador;
    if (!creador) return res.status(400).json({ error: "Reunion sin creador" });

    await prisma.chatPrivado.create({
      data: {
        deNickname: nombre,
        paraNickname: creador,
        mensaje: textoSolicitud,
        tipoMensaje: "texto",
      },
    });

    const payload = {
      reunionId: reunion.id,
      reunion,
      creador,
      solicitante: nombre,
      motivo: motivo || "conflicto",
      mensaje: mensaje?.trim() || "",
      duracionEstimadaMinutos: Number(duracionEstimadaMinutos) || null,
    };

    emitReunionSolicitudCambio(payload);
    sendPushToNick(
      creador,
      {
        type: "reunion_solicitud_cambio",
        title: "Solicitud de cambio de reunion",
        body: `${nombre} pide revisar "${reunion.titulo}" (${motivoLabel})`,
        url: "/",
      },
      { skipIfOnline: false },
    ).catch(() => {});

    res.json({ ok: true });
  } catch (e) {
    console.error("[reuniones solicitar-cambio]", e?.message);
    res.status(500).json({ error: "No se pudo enviar la solicitud" });
  }
});

async function getReunionInvitacionPublica(req, res) {
  try {
    if (!prisma.chatReunion) return res.status(503).json({ error: "Reuniones no disponibles" });
    const token = String(req.params.token || "").trim();
    if (!token) return res.status(400).json({ error: "Token invalido" });

    const row = await prisma.chatReunion.findUnique({ where: { invitacionToken: token } });
    if (!row) return res.status(404).json({ error: "Invitacion no encontrada" });

    const reunion = serializeReunion(row, { includeToken: false });
    const room = reunion.estado === "activa"
      ? (reunion.room || `copmec-reunion-${reunion.id}`)
      : null;

    res.json({
      titulo: reunion.titulo,
      descripcion: reunion.descripcion,
      fecha: reunion.fecha,
      hora: reunion.hora,
      lugar: reunion.lugar,
      esVideollamada: reunion.esVideollamada,
      duracionMinutos: reunion.duracionMinutos,
      estado: reunion.estado,
      creador: reunion.creador,
      room,
      puedeUnirse: Boolean(reunion.esVideollamada && reunion.estado === "activa" && room),
    });
  } catch (e) {
    console.error("[reuniones invitacion GET]", e?.message);
    res.status(500).json({ error: "No se pudo cargar la invitacion" });
  }
}

async function getReunionInvitacionRtcPublica(req, res) {
  try {
    if (!prisma.chatReunion) return res.status(503).json({ error: "Reuniones no disponibles" });
    const token = String(req.params.token || "").trim();
    const row = await prisma.chatReunion.findUnique({ where: { invitacionToken: token } });
    if (!row) return res.status(404).json({ error: "Invitacion no encontrada" });
    const iceServers = [{ urls: process.env.STUN_URL || "stun:stun.l.google.com:19302" }];
    if (process.env.TURN_URL && process.env.TURN_USER && process.env.TURN_PASS) {
      iceServers.push({ urls: process.env.TURN_URL, username: process.env.TURN_USER, credential: process.env.TURN_PASS });
    }
    res.json({ iceServers });
  } catch {
    res.status(500).json({ error: "RTC no disponible" });
  }
}

chatReunionPublicRouter.get("/:token", getReunionInvitacionPublica);
chatReunionPublicRouter.get("/:token/rtc-config", getReunionInvitacionRtcPublica);

chatRouter.get("/reuniones/:id/enlace", requireAuth, async (req, res) => {
  try {
    if (!prisma.chatReunion) return res.status(503).json({ error: "Reuniones no disponibles" });
    const nombre = getNombre(req);
    if (!nombre) return res.status(401).json({ error: "No autenticado" });
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "ID invalido" });

    const row = await prisma.chatReunion.findUnique({ where: { id } });
    if (!row) return res.status(404).json({ error: "Reunion no encontrada" });
    if (row.creador !== nombre) return res.status(403).json({ error: "Solo el creador puede obtener el enlace" });

    const withToken = await asegurarTokenInvitacionReunion(row);
    const reunion = serializeReunion(withToken);
    const url = buildReunionInviteUrlFromReq(req, reunion.invitacionToken);
    res.json({ url, token: reunion.invitacionToken, reunion });
  } catch (e) {
    console.error("[reuniones enlace]", e?.message);
    res.status(500).json({ error: "No se pudo generar el enlace" });
  }
});

chatRouter.post("/reuniones/:id/agregar-participantes", requireAuth, async (req, res) => {
  try {
    if (!prisma.chatReunion) return res.status(503).json({ error: "Reuniones no disponibles" });
    const nombre = getNombre(req);
    if (!nombre) return res.status(401).json({ error: "No autenticado" });
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "ID invalido" });

    const row = await prisma.chatReunion.findUnique({ where: { id } });
    if (!row) return res.status(404).json({ error: "Reunion no encontrada" });
    if (row.creador !== nombre) return res.status(403).json({ error: "Solo el creador puede agregar participantes" });

    const nuevos = Array.from(new Set(
      (Array.isArray(req.body?.participantes) ? req.body.participantes : [])
        .map((p) => String(p || "").trim())
        .filter(Boolean),
    ));
    if (!nuevos.length) return res.status(400).json({ error: "Sin participantes nuevos" });

    const actuales = parseReunionParticipantes(row.participantes);
    const merged = Array.from(new Set([...actuales, ...nuevos]));
    const agregados = nuevos.filter((p) => !actuales.includes(p));
    if (!agregados.length) return res.json({ reunion: serializeReunion(row), agregados: [] });

    const fechaFinal = row.fecha;
    const horaFinal = row.hora;
    const duracionFinal = getReunionDurationMinutes(row);
    const rowsMismaFecha = await obtenerReunionesActivasMismaFecha(fechaFinal, id);
    const conflictos = detectarConflictosReunion({
      fecha: fechaFinal,
      hora: horaFinal,
      duracionMinutos: duracionFinal,
      participantes: agregados,
      creador: nombre,
      reunionesRows: rowsMismaFecha,
    });
    if (conflictos.length) {
      return res.status(409).json({
        error: "Conflicto de horario con otra reunion",
        conflictos,
      });
    }

    const withToken = await asegurarTokenInvitacionReunion(row);
    const updated = await prisma.chatReunion.update({
      where: { id },
      data: { participantes: JSON.stringify(merged) },
    });
    const reunion = serializeReunion(updated.invitacionToken ? updated : withToken);
    const url = buildReunionInviteUrlFromReq(req, reunion.invitacionToken);
    const texto = formatMensajeInvitacionReunion(reunion, url);

    await Promise.all(agregados.map(async (nick) => {
      await prisma.chatPrivado.create({
        data: {
          deNickname: nombre,
          paraNickname: nick,
          mensaje: texto,
          tipoMensaje: "texto",
        },
      });
      sendPushToNick(
        nick,
        {
          type: "reunion_invite",
          reunionId: reunion.id,
          titulo: reunion.titulo,
          fecha: reunion.fecha,
          hora: reunion.hora,
          chatTipo: reunion.chat_tipo,
          chatId: reunion.chat_id,
          title: "Invitación a reunión",
          body: `${nombre} te agregó a "${reunion.titulo}"`,
          url: `/reunion/join/${reunion.invitacionToken}`,
        },
        { skipIfOnline: false },
      ).catch(() => {});
    }));

    const notifyTargets = Array.from(new Set([nombre, ...merged]));
    emitReunionActualizada(reunion, notifyTargets);
    res.json({ reunion, agregados, url });
  } catch (e) {
    console.error("[reuniones agregar-participantes]", e?.message);
    res.status(500).json({ error: "No se pudieron agregar participantes" });
  }
});

chatRouter.post("/reuniones/:id/solicitar-unirse", requireAuth, async (req, res) => {
  try {
    if (!prisma.chatReunion) return res.status(503).json({ error: "Reuniones no disponibles" });
    const nombre = getNombre(req);
    if (!nombre) return res.status(401).json({ error: "No autenticado" });
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "ID invalido" });

    const row = await prisma.chatReunion.findUnique({ where: { id } });
    if (!row) return res.status(404).json({ error: "Reunion no encontrada" });
    const reunion = serializeReunion(row);
    const participantes = parseReunionParticipantes(row.participantes);
    if (row.creador === nombre || participantes.includes(nombre)) {
      return res.status(400).json({ error: "Ya formas parte de la reunion" });
    }

    const { mensaje } = req.body || {};
    const withToken = await asegurarTokenInvitacionReunion(row);
    const url = buildReunionInviteUrlFromReq(req, withToken.invitacionToken);
    const texto = [
      `Solicitud para unirse a la reunión "${reunion.titulo}"`,
      `Fecha: ${reunion.fecha} a las ${reunion.hora}`,
      `Solicitante: ${nombre}`,
      mensaje?.trim() ? `Mensaje: ${mensaje.trim()}` : null,
      `Enlace de la reunión: ${url}`,
    ].filter(Boolean).join("\n");

    await prisma.chatPrivado.create({
      data: {
        deNickname: nombre,
        paraNickname: row.creador,
        mensaje: texto,
        tipoMensaje: "texto",
      },
    });

    try {
      const io = getIO();
      getSocketsByNickname(row.creador).forEach((socketId) => {
        io.to(socketId).emit("reunion_solicitud_unirse", {
          reunionId: reunion.id,
          reunion: serializeReunion(withToken),
          creador: row.creador,
          solicitante: nombre,
          mensaje: mensaje?.trim() || "",
          url,
        });
      });
    } catch { /* noop */ }

    sendPushToNick(
      row.creador,
      {
        type: "reunion_solicitud_unirse",
        title: "Solicitud para unirse a reunión",
        body: `${nombre} quiere unirse a "${reunion.titulo}"`,
        url: `/reunion/join/${withToken.invitacionToken}`,
      },
      { skipIfOnline: false },
    ).catch(() => {});

    res.json({ ok: true, url });
  } catch (e) {
    console.error("[reuniones solicitar-unirse]", e?.message);
    res.status(500).json({ error: "No se pudo enviar la solicitud" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// RTC CONFIG
// ═════════════════════════════════════════════════════════════════════════════

chatRouter.get("/rtc-config", requireAuth, (_req, res) => {
  const iceServers = [{ urls: process.env.STUN_URL || "stun:stun.l.google.com:19302" }];
  if (process.env.TURN_URL && process.env.TURN_USER && process.env.TURN_PASS) {
    iceServers.push({ urls: process.env.TURN_URL, username: process.env.TURN_USER, credential: process.env.TURN_PASS });
  }
  res.json({ iceServers });
});

// ═════════════════════════════════════════════════════════════════════════════
// HELPERS DE SERIALIZACIÓN
// ═════════════════════════════════════════════════════════════════════════════

function serializarMensaje(m) {
  const obj = { ...m };
  // Convertir BigInt a Number
  if (typeof obj.archivoTamaño === "bigint") obj.archivoTamaño = Number(obj.archivoTamaño);
  // Convertir camelCase a snake_case para compatibilidad con ChatPro.jsx
  return {
    id: obj.id,
    // Chat general / grupal
    usuario_nickname: obj.usuarioNickname ?? undefined,
    usuario_photo: obj.usuarioPhoto ?? undefined,
    // Chat privado
    de_nickname: obj.deNickname ?? undefined,
    para_nickname: obj.paraNickname ?? undefined,
    de_photo: obj.dePhoto ?? undefined,
    // Común
    grupo_id: obj.grupoId ?? undefined,
    mensaje: obj.mensaje,
    tipo_mensaje: obj.tipoMensaje,
    archivo_url: obj.archivoUrl ?? null,
    archivo_nombre: obj.archivoNombre ?? null,
    archivo_tipo: obj.archivoTipo ?? null,
    archivo_tamaño: obj.archivoTamaño ?? null,
    menciona: obj.menciona ?? null,
    enlace_compartido: obj.enlaceCompartido ?? null,
    reply_to_id: obj.replyToId ?? null,
    reply_to_user: obj.replyToUser ?? null,
    reply_to_text: obj.replyToText ?? null,
    reenviado_de_usuario: obj.reenviadoDeUsuario ?? null,
    reenviado_de_chat: obj.reenviadoDeChat ?? null,
    reenviado_de_tipo: obj.reenviadoDeTipo ?? null,
    mensaje_editado: obj.mensajeEditado ? 1 : 0,
    fecha_edicion: obj.fechaEdicion?.toISOString() ?? null,
    prioridad: obj.prioridad ?? 0,
    fecha: obj.fecha?.toISOString ? obj.fecha.toISOString() : obj.fecha,
  };
}

function serializarGrupo(g) {
  return {
    id: g.id,
    nombre: g.nombre,
    descripcion: g.descripcion ?? null,
    creado_por: g.creadoPor,
    es_publico: g.esPublico ? 1 : 0,
    foto: g.foto ?? null,
    fecha_creacion: g.fechaCreacion?.toISOString ? g.fechaCreacion.toISOString() : g.fechaCreacion,
  };
}

function getModeloMensaje(tipo) {
  if (tipo === "general") return { modelo: "chatGeneral", campoDe: "usuarioNickname" };
  if (tipo === "privado") return { modelo: "chatPrivado", campoDe: "deNickname" };
  if (tipo === "grupal") return { modelo: "chatGrupal", campoDe: "usuarioNickname" };
  return { modelo: null, campoDe: null };
}
