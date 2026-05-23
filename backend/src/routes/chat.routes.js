import { Router } from "express";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { requireAuth } from "../middleware/auth.middleware.js";
import { getIO, getUsuariosActivos } from "../config/socket.js";
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
  return req.auth?.user?.name || null;
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
            estado: "perdida",
          },
        }).catch(() => {});
      } else if (type === "join") {
        prisma.chatLlamada?.updateMany({
          where: { room, estado: { in: ["perdida", "activa"] } },
          data: { estado: "activa", aceptadaEn: new Date() },
        }).catch(() => {});
      } else if (type === "reject") {
        prisma.chatLlamada?.updateMany({
          where: { room, estado: "perdida" },
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

    if (!prisma.chatLlamada) return res.json([]);

    // Obtener aliases del usuario autenticado para búsqueda flexible
    const users = getAllUsers();
    const currentUser = users.find((u) => u.name === nombre);
    const userAliases = Array.from(new Set(currentUser ? buildUserAliases(currentUser) : [nombre]));
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

// ═════════════════════════════════════════════════════════════════════════════
// GRUPOS
// ═════════════════════════════════════════════════════════════════════════════

chatRouter.get("/grupos", requireAuth, async (req, res) => {
  try {
    const nombre = getNombre(req);
    const grupos = await prisma.chatGrupo.findMany({
      include: {
        miembros: { select: { usuarioNickname: true } },
      },
      orderBy: { fechaCreacion: "desc" },
    });

    res.json(grupos.map((g) => ({
      ...serializarGrupo(g),
      miembros: g.miembros.map((m) => m.usuarioNickname),
      es_miembro: g.miembros.some((m) => m.usuarioNickname === nombre),
    })));
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
    const user = getAllUsers().find((u) => u.name === nombre);
    if (!user || user.role !== "Lead") {
      return res.status(403).json({ error: "Solo administradores pueden borrar grupos" });
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

chatRouter.post("/grupos/:id/miembros", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_nickname } = req.body;
    if (!usuario_nickname) return res.status(400).json({ error: "Nickname requerido" });

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
