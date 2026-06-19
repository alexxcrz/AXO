import { Server } from "socket.io";
import { corsOriginValidator } from "./env.js";
import { normalizeNick, enqueueCallSignal, nextSignalId } from "../utils/callSignalQueue.js";
import { getWarehouseState } from "../services/warehouse.store.js";
import { prismaChat as prisma } from "./prisma-chat.js";
import { sendPushToNick } from "../services/push.service.js";

let io;

// Usuarios activos en chat: { nombre: { sockets: [socketId, ...], photo, lastActivity, inCall } }
const usuariosActivos = {};

function resolveActiveNickKey(nickname) {
  const target = normalizeNick(nickname);
  if (!target) return null;
  return Object.keys(usuariosActivos).find((key) => normalizeNick(key) === target) || null;
}

function getUserRoomKey(nickname) {
  const key = normalizeNick(nickname);
  return key ? `user:${key}` : null;
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
  const email = String(userLike?.email || userLike?.login || "").trim();
  if (email.includes("@")) {
    const localPart = email.split("@")[0]?.trim();
    if (localPart) aliases.push(localPart);
  }
  return Array.from(new Set(aliases));
}

function collectSocketIdsForTarget(rawNick) {
  if (!io) return [];
  const socketIds = new Set();
  const aliases = resolveTargetAliases(rawNick);
  aliases.forEach((alias) => {
    const roomKey = getUserRoomKey(alias);
    const roomSet = roomKey ? io.sockets.adapter.rooms.get(roomKey) : null;
    if (roomSet) {
      roomSet.forEach((socketId) => socketIds.add(socketId));
    }
  });
  const activeKey = resolveActiveNickKey(rawNick);
  if (activeKey && usuariosActivos[activeKey]?.sockets?.length) {
    usuariosActivos[activeKey].sockets.forEach((socketId) => socketIds.add(socketId));
  }
  return Array.from(socketIds);
}

function resolveTargetAliases(targetNickname) {
  const raw = String(targetNickname || "").trim();
  if (!raw) return [];

  const users = getWarehouseState().users || [];
  const targetKey = normalizeNick(raw);
  const userMatch = users.find((user) => {
    const aliases = buildUserAliases(user);
    return aliases.some((alias) => normalizeNick(alias) === targetKey);
  });

  return Array.from(new Set([raw, ...buildUserAliases(userMatch)]));
}

// Intervalo que marca usuarios como ausentes tras 1 hora de inactividad
setInterval(() => {
  let changed = false;
  Object.keys(usuariosActivos).forEach((nick) => {
    const u = usuariosActivos[nick];
    const away = Date.now() - (u.lastActivity || 0) > 3600000;
    if (away !== u._wasAway) {
      u._wasAway = away;
      changed = true;
    }
  });
  if (changed && io) emitirUsuariosActivos();
}, 5 * 60 * 1000);

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: corsOriginValidator,
      methods: ["GET", "POST"],
      credentials: true,
    },
    // Preferir WebSocket y dejar polling como respaldo para handshakes inestables.
    transports: ["websocket", "polling"],
    allowUpgrades: true,
    allowEIO3: true,
    // Mantener por debajo del timeout de 55s del proxy de Render
    pingInterval: 20000,
    pingTimeout: 25000,
    connectTimeout: 45000,
    // Evitar que las sesiones queden colgadas
    maxHttpBufferSize: 1e6,
  });

  io.engine.on("connection_error", (err) => {
    // Muy común en deploy/restart o pestañas con sid viejo; no indica falla real del chat.
    if (err?.message === "Session ID unknown" || err?.code === 1) {
      console.log("Socket.IO stale sid discarded");
      return;
    }
    console.error("Socket.IO connection error:", err?.message || err);
  });

  io.on("connection", (socket) => {
    let usuarioNombre = null;
    let usuarioRoomKey = null;

    // ── LOGIN CHAT ──────────────────────────────────────────
    socket.on("login_chat", ({ nickname, photo }) => {
      const safeNickname = String(nickname || "").trim();
      if (!safeNickname) return;
      usuarioNombre = safeNickname;
      socket.data.nickname = safeNickname;

      const joinAliases = resolveTargetAliases(safeNickname);
      const joinRooms = Array.from(new Set(
        joinAliases.map((alias) => getUserRoomKey(alias)).filter(Boolean),
      ));
      if (usuarioRoomKey && !joinRooms.includes(usuarioRoomKey)) {
        socket.leave(usuarioRoomKey);
      }
      joinRooms.forEach((roomKey) => socket.join(roomKey));
      usuarioRoomKey = getUserRoomKey(safeNickname) || joinRooms[0] || null;

      if (!usuariosActivos[safeNickname]) {
        usuariosActivos[safeNickname] = { sockets: [], photo: photo || null, lastActivity: Date.now(), inCall: false, _wasAway: false };
      } else {
        // El login periódico mantiene la sesión/socket, pero no cuenta como actividad real.
        if (!usuariosActivos[safeNickname].lastActivity) {
          usuariosActivos[safeNickname].lastActivity = Date.now();
        }
        usuariosActivos[safeNickname]._wasAway = false;
      }
      if (!usuariosActivos[safeNickname].sockets.includes(socket.id)) {
        usuariosActivos[safeNickname].sockets.push(socket.id);
      }
      if (photo) usuariosActivos[safeNickname].photo = photo;

      emitirUsuariosActivos();
    });

    // ── ACTIVIDAD DE USUARIO ────────────────────────────────
    socket.on("user_activity", () => {
      const nick = socket.data.nickname || usuarioNombre;
      if (!nick || !usuariosActivos[nick]) return;
      const wasAway = usuariosActivos[nick]._wasAway;
      usuariosActivos[nick].lastActivity = Date.now();
      usuariosActivos[nick]._wasAway = false;
      // Solo re-emitir si el estado cambió (ausente → activo)
      if (wasAway) emitirUsuariosActivos();
    });

    // ── ESTADO EN LLAMADA ───────────────────────────────────
    socket.on("set_in_call", ({ inCall }) => {
      const nick = socket.data.nickname || usuarioNombre;
      if (!nick || !usuariosActivos[nick]) return;
      usuariosActivos[nick].inCall = !!inCall;
      emitirUsuariosActivos();
    });

    // ── VIDEOLLAMADAS (WebRTC) ──────────────────────────────
    socket.on("call_invite", ({ room, fromNickname, toNicknames }) => {
      if (!room || !Array.isArray(toNicknames)) return;
      const requested = Array.from(new Set(toNicknames.map((nick) => String(nick || "").trim()).filter(Boolean)));
      let delivered = 0;
      const reachedNicknames = [];
      
      console.log(`📞 call_invite: from=${fromNickname}, targets=${requested.join(", ")}, active=${Object.keys(usuariosActivos).join(", ")}`);

      // Registrar llamada en historial con estado "pendiente" (no "perdida")
      try { prisma.chatLlamada?.create({
        data: {
          room,
          iniciador: fromNickname || socket.data.nickname || "Usuario",
          receptores: JSON.stringify(requested),
          tipo: requested.length > 1 ? "grupal" : "privado",
          estado: "pendiente",
          iniciadaEn: new Date(),
        },
      }).catch(() => {}); } catch (_) {}

      requested.forEach((nick) => {
        const targets = collectSocketIdsForTarget(nick);
        const aliasRooms = resolveTargetAliases(nick).map((alias) => getUserRoomKey(alias)).filter(Boolean);

        if (targets.length === 0) {
          console.log(`   ⚠️  "${nick}" not in rooms ${aliasRooms.join(", ") || getUserRoomKey(nick) || "?"}`);
        } else {
          console.log(`   ✓ "${nick}" → ${targets.length} sockets (${aliasRooms.join(", ") || getUserRoomKey(nick) || "?"})`);
        }

        if (targets.length > 0) {
          reachedNicknames.push(nick);
        }

        targets.forEach((socketId) => {
          delivered += 1;
          io.to(socketId).emit("call_invite", {
            room,
            fromNickname: fromNickname || socket.data.nickname || "Usuario",
            fromSocketId: socket.id,
          });
        });

        // Web Push for call target (works when app is backgrounded or phone is locked)
        sendPushToNick(
          nick,
          {
            type: "call_invite",
            room,
            caller: fromNickname || socket.data.nickname || "Usuario",
            callerName: fromNickname || socket.data.nickname || "Usuario",
            soundUrl: "/sounds/notification-call.wav",
            url: "/",
          },
          { skipIfOnline: false },
        ).catch(() => {});

        // REST fallback: if this target had no active sockets, enqueue for HTTP polling
        if (targets.length === 0) {
          const signal = {
            id: nextSignalId(),
            type: "invite",
            room,
            fromNickname: fromNickname || socket.data.nickname || "Usuario",
            from: `rest:${normalizeNick(fromNickname || socket.data.nickname || "")}`,
            nickname: fromNickname || socket.data.nickname || "Usuario",
            createdAt: Date.now(),
          };
          const aliases = resolveTargetAliases(nick);
          aliases.forEach((alias) => enqueueCallSignal(alias, signal));
          console.log(`   ↪ enqueued REST fallback invite for "${nick}"`);
        }
      });

        console.log(`   Result: delivered=${delivered}`);
      socket.emit("call_invite_status", {
        room,
        requestedNicknames: requested,
        reachedNicknames,
        delivered,
      });
    });

    socket.on("call_reject", ({ to, room, nickname }) => {
      if (!to || !room) return;
      io.to(to).emit("call_rejected", {
        room,
        fromSocketId: socket.id,
        nickname: nickname || socket.data.nickname || "Usuario",
      });
      
      // Actualizar historial: marcar como "rechazada"
      try {
        prisma.chatLlamada?.updateMany({
          where: { room, estado: "pendiente" },
          data: { estado: "rechazada", finalizadaEn: new Date() },
        }).catch(() => {});
      } catch (_) {}
    });

    // ── ACEPTAR LLAMADA: Cancelar en otros dispositivos del usuario ─────────
    socket.on("call_accepted", ({ room, fromNickname }) => {
      if (!room) return;
      const nickAceptador = socket.data.nickname;
      console.log(`✅ call_accepted: room=${room}, aceptador=${nickAceptador}, from=${fromNickname}`);
      
      // Obtener todos los sockets del usuario que está aceptando
      const userObj = usuariosActivos[nickAceptador];
      if (userObj && userObj.sockets.length > 1) {
        // Enviar "call_cancelled" a todos los otros sockets del mismo usuario
        userObj.sockets.forEach((sid) => {
          if (sid !== socket.id) {
            io.to(sid).emit("call_cancelled", {
              room,
              reason: "accepted_on_another_device",
            });
            console.log(`   ↪ Cancelada invitación en dispositivo ${sid}`);
          }
        });
      }

      // Actualizar historial: registrar aceptación
      try {
        prisma.chatLlamada?.updateMany({
          where: { room, estado: { in: ["pendiente", "perdida", "activa"] } },
          data: { estado: "activa", aceptadaEn: new Date() },
        }).catch(() => {});
      } catch (_) {}
    });

    socket.on("call_join", ({ room, nickname }) => {
      if (!room) return;
      socket.data.nickname = socket.data.nickname || nickname;
      socket.join(room);

      // Actualizar historial: marcar como activa (cambiar de "pendiente" o mantener "activa")
      try { prisma.chatLlamada?.updateMany({
        where: { room, estado: { in: ["pendiente", "activa"] } },
        data: { estado: "activa", aceptadaEn: new Date() },
      }).catch(() => {}); } catch (_) {}

      const roomSet = io.sockets.adapter.rooms.get(room) || new Set();
      const users = Array.from(roomSet).map((id) => {
        const s = io.sockets.sockets.get(id);
        return { socketId: id, nickname: s?.data?.nickname || "Usuario" };
      });

      socket.emit("call_users", { room, users });
      socket.to(room).emit("call_user_joined", {
        room,
        socketId: socket.id,
        nickname: socket.data.nickname || "Usuario",
      });
    });

    socket.on("call_leave", ({ room }) => {
      if (!room) return;
      socket.leave(room);
      socket.to(room).emit("call_user_left", { room, socketId: socket.id });

      // Actualizar historial: si es "pendiente", marcar como "perdida" (no respondida)
      try { prisma.chatLlamada?.findFirst({
        where: { room, estado: { in: ["pendiente", "activa"] } },
        orderBy: { iniciadaEn: "desc" },
      }).then((record) => {
        if (!record) return;
        const fin = new Date();
        const duracion = record.aceptadaEn
          ? Math.round((fin.getTime() - new Date(record.aceptadaEn).getTime()) / 1000)
          : null;
        // Si es pendiente → perdida; si es activa → finalizada
        const nuevoEstado = record.estado === "pendiente" ? "perdida" : "finalizada";
        return prisma.chatLlamada.update({
          where: { id: record.id },
          data: { estado: nuevoEstado, finalizadaEn: fin, duracionSegundos: duracion },
        });
      }).catch(() => {}); } catch (_) {}
    });

    socket.on("call_offer", ({ to, room, sdp, nickname }) => {
      if (!to || !room || !sdp) return;
      io.to(to).emit("call_offer", {
        from: socket.id,
        room,
        sdp,
        nickname: nickname || socket.data.nickname || "Usuario",
      });
    });

    socket.on("call_answer", ({ to, room, sdp }) => {
      if (!to || !room || !sdp) return;
      io.to(to).emit("call_answer", { from: socket.id, room, sdp });
    });

    socket.on("call_ice", ({ to, room, candidate }) => {
      if (!to || !room || !candidate) return;
      io.to(to).emit("call_ice", { from: socket.id, room, candidate });
    });

    // ── INDICADOR DE ESCRITURA (chat privado) ───────────────
    socket.on("chat_typing", ({ para_nickname, typing }) => {
      const fromNickname = String(socket.data.nickname || usuarioNombre || "").trim();
      const targetNickname = String(para_nickname || "").trim();
      if (!fromNickname || !targetNickname || fromNickname === targetNickname) return;

      const payload = {
        de_nickname: fromNickname,
        para_nickname: targetNickname,
        typing: !!typing,
        ts: Date.now(),
      };

      resolveTargetAliases(targetNickname).forEach((alias) => {
        const roomKey = getUserRoomKey(alias);
        if (!roomKey) return;
        socket.to(roomKey).emit("chat_typing", payload);
      });
    });

    // ── DESCONEXIÓN ─────────────────────────────────────────
    socket.on("disconnect", () => {
      try {
        socket.rooms.forEach((room) => {
          if (room !== socket.id) {
            socket.to(room).emit("call_user_left", { room, socketId: socket.id });
          }
        });
      } catch (_) {}

      if (usuarioNombre && usuariosActivos[usuarioNombre]) {
        usuariosActivos[usuarioNombre].sockets = usuariosActivos[usuarioNombre].sockets.filter(
          (id) => id !== socket.id
        );
        if (usuariosActivos[usuarioNombre].sockets.length === 0) {
          delete usuariosActivos[usuarioNombre];
        }
        emitirUsuariosActivos();
      }
    });
  });

  return io;
}

function emitirUsuariosActivos() {
  const lista = Object.keys(usuariosActivos).map((nickname) => {
    const u = usuariosActivos[nickname];
    let status = "activo";
    if (u.inCall) {
      status = "en-llamada";
    } else if (Date.now() - (u.lastActivity || 0) > 3600000) {
      status = "ausente";
    }
    return { nickname, photo: u.photo || null, status, inCall: u.inCall || false };
  });
  io.emit("usuarios_activos", lista);
  io.emit("estados_actualizados");
}

export function getIO() {
  if (!io) throw new Error("Socket.io no está inicializado");
  return io;
}

export function getUsuariosActivos() {
  return Object.keys(usuariosActivos).map((nickname) => {
    const u = usuariosActivos[nickname];
    let status = "activo";
    if (u.inCall) {
      status = "en-llamada";
    } else if (Date.now() - (u.lastActivity || 0) > 3600000) {
      status = "ausente";
    }
    return {
      nickname,
      photo: u.photo || null,
      sockets: u.sockets.length,
      status,
      inCall: u.inCall || false,
      lastActivity: u.lastActivity || 0,
    };
  });
}

export function getSocketsByNickname(nickname) {
  const key = resolveActiveNickKey(nickname);
  return key ? usuariosActivos[key]?.sockets || [] : [];
}
