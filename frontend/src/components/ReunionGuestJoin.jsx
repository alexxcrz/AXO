import React, { useEffect, useRef, useState } from "react";
import { createAppSocket } from "../utils/socketClient.js";
import "./ReunionGuestJoin.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

function apiUrl(path) {
  if (path.startsWith("http")) return path;
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

export default function ReunionGuestJoin({ token }) {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState(null);
  const [nombreInvitado, setNombreInvitado] = useState("");
  const [enLlamada, setEnLlamada] = useState(false);
  const [estado, setEstado] = useState("");

  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const remoteStreamsRef = useRef({});
  const roomRef = useRef(null);
  const iceServersRef = useRef([{ urls: "stun:stun.l.google.com:19302" }]);
  const localVideoRef = useRef(null);
  const [remoteStreams, setRemoteStreams] = useState({});

  const actualizarRemotos = () => {
    setRemoteStreams({ ...remoteStreamsRef.current });
  };

  const cargarInvitacion = async () => {
    setCargando(true);
    setError("");
    try {
      const r = await fetch(apiUrl(`/api/chat/reuniones/invitacion/${token}`));
      let data = {};
      try {
        data = await r.json();
      } catch {
        data = {};
      }
      if (!r.ok) {
        const msg = data?.error
          || data?.message
          || (r.status === 404 ? "Invitacion no encontrada. Verifica que el enlace sea el correcto." : null)
          || `No se pudo cargar la invitacion (${r.status})`;
        throw new Error(msg);
      }
      setInfo(data);
      try {
        const rtc = await fetch(apiUrl(`/api/chat/reuniones/invitacion/${token}/rtc-config`));
        if (rtc.ok) {
          const rtcData = await rtc.json();
          if (Array.isArray(rtcData?.iceServers)) iceServersRef.current = rtcData.iceServers;
        }
      } catch {
        /* noop */
      }
    } catch (err) {
      setError(err?.message || "No se pudo cargar la invitacion");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarInvitacion();
    const interval = setInterval(() => {
      if (!info || info.puedeUnirse) return;
      cargarInvitacion();
    }, 12000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => () => {
    Object.values(peerConnectionsRef.current).forEach(({ pc }) => {
      try { pc?.close(); } catch { /* noop */ }
    });
    peerConnectionsRef.current = {};
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (socketRef.current) {
      const room = roomRef.current;
      if (room) socketRef.current.emit("call_leave", { room });
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      localVideoRef.current.play?.().catch(() => {});
    }
  }, [enLlamada]);

  const crearPeer = (socketId, nickname) => {
    if (peerConnectionsRef.current[socketId]?.pc) {
      return peerConnectionsRef.current[socketId].pc;
    }
    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });
    const local = localStreamRef.current;
    if (local) local.getTracks().forEach((track) => pc.addTrack(track, local));

    pc.onicecandidate = (event) => {
      if (event.candidate && roomRef.current && socketRef.current?.connected) {
        socketRef.current.emit("call_ice", {
          to: socketId,
          room: roomRef.current,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      if (!remoteStreamsRef.current[socketId]) {
        remoteStreamsRef.current[socketId] = new MediaStream();
      }
      const stream = remoteStreamsRef.current[socketId];
      const add = (track) => {
        if (!track || stream.getTracks().some((t) => t.id === track.id)) return;
        stream.addTrack(track);
      };
      if (event.streams?.length) event.streams.forEach((s) => s.getTracks().forEach(add));
      else add(event.track);
      actualizarRemotos();
    };

    peerConnectionsRef.current[socketId] = { pc, nickname };
    return pc;
  };

  const configurarSocket = (socket, guestName) => {
    socket.on("call_users", (payload) => {
      if (!payload?.room || payload.room !== roomRef.current) return;
      (payload.users || []).forEach((u) => {
        if (u.socketId && u.socketId !== socket.id) {
          peerConnectionsRef.current[u.socketId] = peerConnectionsRef.current[u.socketId] || { pc: null, nickname: u.nickname };
        }
      });
    });

    socket.on("call_user_joined", async (payload) => {
      if (!payload?.room || payload.room !== roomRef.current) return;
      if (payload.socketId === socket.id) return;
      const pc = crearPeer(payload.socketId, payload.nickname || "Participante");
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("call_offer", {
        to: payload.socketId,
        room: payload.room,
        sdp: offer,
        nickname: guestName,
      });
    });

    socket.on("call_offer", async (payload) => {
      if (!payload?.room || payload.room !== roomRef.current || !payload.from || !payload.sdp) return;
      const pc = crearPeer(payload.from, payload.nickname || "Participante");
      await pc.setRemoteDescription(payload.sdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("call_answer", {
        to: payload.from,
        room: payload.room,
        sdp: answer,
      });
    });

    socket.on("call_answer", async (payload) => {
      if (!payload?.from || !payload.sdp) return;
      const pc = peerConnectionsRef.current[payload.from]?.pc;
      if (!pc) return;
      await pc.setRemoteDescription(payload.sdp);
    });

    socket.on("call_ice", async (payload) => {
      if (!payload?.from || !payload.candidate) return;
      const pc = peerConnectionsRef.current[payload.from]?.pc;
      if (!pc) return;
      try {
        await pc.addIceCandidate(payload.candidate);
      } catch {
        /* noop */
      }
    });

    socket.on("call_user_left", (payload) => {
      const id = payload?.socketId;
      if (!id) return;
      const pc = peerConnectionsRef.current[id]?.pc;
      if (pc) try { pc.close(); } catch { /* noop */ }
      delete peerConnectionsRef.current[id];
      delete remoteStreamsRef.current[id];
      actualizarRemotos();
    });
  };

  const unirseComoInvitado = async () => {
    const nombre = nombreInvitado.trim();
    if (!nombre) {
      setError("Escribe tu nombre para continuar");
      return;
    }
    if (!info?.puedeUnirse || !info?.room) {
      setError("La videollamada aun no esta activa. Vuelve cuando el organizador la inicie.");
      return;
    }

    setError("");
    setEstado("Conectando...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        await localVideoRef.current.play?.().catch(() => {});
      }

      const guestName = `Invitado: ${nombre}`;
      const socket = createAppSocket(window.location.origin);
      socketRef.current = socket;
      roomRef.current = info.room;

      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("No se pudo conectar al servidor")), 15000);
        socket.on("connect", () => {
          clearTimeout(timer);
          resolve();
        });
        socket.on("connect_error", () => {});
      });

      configurarSocket(socket, guestName);
      socket.emit("login_chat", { nickname: guestName });
      socket.emit("set_in_call", { inCall: true });
      socket.emit("call_join", { room: info.room, nickname: guestName });

      setEnLlamada(true);
      setEstado("Conectado a la reunion");
    } catch (err) {
      setError(err?.message || "No se pudo unir a la videollamada");
      setEstado("");
    }
  };

  const salir = () => {
    const room = roomRef.current;
    if (socketRef.current && room) socketRef.current.emit("call_leave", { room });
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setEnLlamada(false);
    setEstado("");
  };

  if (cargando) {
    return (
      <div className="rgj-page">
        <div className="rgj-card">Cargando invitacion...</div>
      </div>
    );
  }

  if (error && !info) {
    return (
      <div className="rgj-page">
        <div className="rgj-card rgj-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="rgj-page">
      <div className="rgj-card">
        <header className="rgj-header">
          <h1>{info?.titulo || "Reunion"}</h1>
          <p>
            {info?.fecha} - {info?.hora}
            {info?.creador ? ` - Organiza: ${info.creador}` : ""}
          </p>
          {info?.descripcion ? <p className="rgj-desc">{info.descripcion}</p> : null}
        </header>

        {!enLlamada ? (
          <div className="rgj-form">
            {!info?.esVideollamada ? (
              <p className="rgj-hint">Esta reunion no es videollamada. Contacta al organizador.</p>
            ) : !info?.puedeUnirse ? (
              <p className="rgj-hint">
                La reunion esta programada. El enlace es valido, pero la videollamada solo se habilita
                cuando el organizador pulse <strong>Iniciar</strong> en el chat. Esta pagina se actualiza sola.
              </p>
            ) : (
              <p className="rgj-hint">Puedes unirte como invitado sin cuenta del sistema.</p>
            )}

            {info?.esVideollamada && info?.puedeUnirse ? (
              <>
                <label htmlFor="rgj-name">Tu nombre</label>
                <input
                  id="rgj-name"
                  className="rgj-input"
                  value={nombreInvitado}
                  onChange={(e) => setNombreInvitado(e.target.value)}
                  placeholder="Ej: Maria Lopez"
                  maxLength={60}
                />
                {error ? <p className="rgj-error-inline">{error}</p> : null}
                <button type="button" className="rgj-btn-primary" onClick={unirseComoInvitado}>
                  Entrar a la videollamada
                </button>
              </>
            ) : null}
          </div>
        ) : (
          <div className="rgj-call">
            <p className="rgj-status">{estado}</p>
            <div className="rgj-videos">
              <div className="rgj-video-wrap local">
                <video ref={localVideoRef} autoPlay playsInline muted className="rgj-video" />
                <span>Tu</span>
              </div>
              {Object.entries(remoteStreams).map(([socketId, stream]) => (
                <div key={socketId} className="rgj-video-wrap">
                  <video
                    autoPlay
                    playsInline
                    className="rgj-video"
                    ref={(el) => {
                      if (el && stream && el.srcObject !== stream) {
                        el.srcObject = stream;
                        el.play?.().catch(() => {});
                      }
                    }}
                  />
                  <span>{peerConnectionsRef.current[socketId]?.nickname || "Participante"}</span>
                </div>
              ))}
            </div>
            <button type="button" className="rgj-btn-danger" onClick={salir}>Salir</button>
          </div>
        )}
      </div>
    </div>
  );
}
