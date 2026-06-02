import React, { useState, useEffect, useRef } from "react";
// COPMEC: removed authFetch/useAuth
import "./ChatPro.css";
// -- COPMEC stubs --
function ReunionesPerfilUsuario() { return null; }

import { useAlert } from "./AlertModal";
import { SpanishDateInput } from "./SpanishDateInput";
import { NOTIFICATION_SOUNDS, playNotificationSound, ensureAudioGestureUnlock } from "../utils/notificationSounds";
import { syncNotificationPrefsToServiceWorker } from "../utils/pushBridge.js";
// COPMEC: removed getServerUrl
// COPMEC: removed ReunionesPerfilUsuario

// Componente estable para cada video remoto — evita parpadeo al reasignar srcObject
const VideoTile = React.memo(function VideoTile({ stream, nickname }) {
  const videoRef = useRef(null);
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream || null;
    }
  }, [stream]);
  return (
    <div className="call-video-box">
      <video className="call-video" autoPlay playsInline ref={videoRef} />
      <span className="call-label">{nickname || "Usuario"}</span>
    </div>
  );
});

export default function ChatPro({ socket, user, onClose, solicitudPending, onSolicitudConsumida, mensajePrioritarioPending, onMensajePrioritarioConsumido, connectCount }) {

  const AUDIO_PREF_KEYS = {
    msgSound: "copmec_chat_msg_sound",
    callIncomingSound: "copmec_chat_call_incoming_sound",
    callOutgoingSound: "copmec_chat_call_outgoing_sound",
    msgVolume: "copmec_chat_msg_volume",
    callVolume: "copmec_chat_call_volume",
  };
  const CALL_SOUND_OPTIONS = [
    { id: "ringIncoming", label: "Ring entrante" },
    { id: "ringOutgoing", label: "Ring saliente" },
    { id: "campana", label: "Campana" },
    { id: "ping", label: "Ping" },
    { id: "digital", label: "Digital" },
    { id: "marimba", label: "Marimba" },
    { id: "chime", label: "Chime" },
    { id: "cristal", label: "Cristal" },
    { id: "pulso", label: "Pulso" },
  ];
  const getStoredVolume = (key, fallback) => {
    const raw = Number(localStorage.getItem(key));
    if (Number.isNaN(raw)) return fallback;
    return Math.min(1, Math.max(0, raw));
  };

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
  const rateLimitedUntilRef = useRef(0);
  const chatBackendDownUntilRef = useRef(0);
  const lastEstadosFetchAtRef = useRef(0);
  const estadosFetchInFlightRef = useRef(false);

  const pauseChatBackend = (ms = 90000) => {
    chatBackendDownUntilRef.current = Math.max(chatBackendDownUntilRef.current, Date.now() + ms);
  };
  const isChatBackendPaused = () => Date.now() < chatBackendDownUntilRef.current;
  const isNetworkFetchError = (err) => {
    if (!err || err.status) return false;
    const msg = String(err.message || "").toLowerCase();
    return msg.includes("failed to fetch")
      || msg.includes("network")
      || msg.includes("load failed")
      || msg.includes("aborted")
      || msg.includes("reset");
  };

  const authFetch = async (url, opts = {}) => {
    const method = String(opts?.method || "GET").toUpperCase();
    const fullUrl = url.startsWith('http') ? url : (API_BASE_URL + (url.startsWith('/') ? url : '/' + url));
    const isChatGet = method === "GET" && fullUrl.includes("/api/chat/");
    const isUserProfileFetch = fullUrl.includes("/api/chat/usuario/") && fullUrl.includes("/perfil");
    const isCriticalChatSync =
      fullUrl.includes("/api/chat/calls/pending") ||
      fullUrl.includes("/api/chat/calls/historial");
    if (isChatGet && isChatBackendPaused()) {
      const err = new Error("Backend temporalmente no disponible");
      err.isBackendPaused = true;
      throw err;
    }
    if (isChatGet && !isCriticalChatSync && !isUserProfileFetch && Date.now() < rateLimitedUntilRef.current) {
      const err = new Error("Rate limit de chat activo");
      err.status = 429;
      err.isRateLimited = true;
      throw err;
    }
    let r;
    try {
      r = await fetch(fullUrl, {
        ...opts,
        credentials: 'include',
        ...(isCriticalChatSync && method === "GET" ? { cache: "no-store" } : {}),
      });
    } catch (networkErr) {
      if (isChatGet) pauseChatBackend(isCriticalChatSync ? 45000 : 90000);
      throw networkErr;
    }
    if (!r.ok) {
      if (r.status === 429 && isChatGet && !isCriticalChatSync) {
        const retryAfterHeader = Number.parseInt(r.headers.get("retry-after") || "", 10);
        const waitMs = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
          ? retryAfterHeader * 1000
          : 15000;
        rateLimitedUntilRef.current = Date.now() + waitMs;
      }
      let backendMessage = "";
      try {
        const payload = await r.clone().json();
        backendMessage = payload?.message || payload?.error || "";
      } catch (_) {
        try {
          backendMessage = await r.clone().text();
        } catch (_) { /* noop */ }
      }
      const err = new Error(backendMessage || r.statusText || 'Request failed');
      err.status = r.status;
      throw err;
    }
    try { return await r.json(); } catch { return null; }
  };
  const mensajePrioritarioProcessedRef = useRef(null);
  const abriendoPerfilDesdeSidebarRef = useRef(false);
  

  
  const SERVER_URL = API_BASE_URL;
  const { showAlert, showConfirm } = useAlert();
  const esAdmin = user?.role === 'Lead';
  const [audioSettings, setAudioSettings] = useState(() => ({
    msgSound: localStorage.getItem(AUDIO_PREF_KEYS.msgSound) || "campana",
    callIncomingSound:
      localStorage.getItem(AUDIO_PREF_KEYS.callIncomingSound)
      || localStorage.getItem("copmec_chat_call_sound")
      || "ringIncoming",
    callOutgoingSound:
      localStorage.getItem(AUDIO_PREF_KEYS.callOutgoingSound)
      || localStorage.getItem("copmec_chat_call_sound")
      || "ringOutgoing",
    msgVolume: getStoredVolume(AUDIO_PREF_KEYS.msgVolume, 0.85),
    callVolume: getStoredVolume(AUDIO_PREF_KEYS.callVolume, 0.9),
  }));
  const [open, setOpen] = useState(onClose ? true : false); // Si viene del menú, abrir automáticamente
  
  // Si viene del menú, abrir automáticamente
  useEffect(() => {
    if (onClose) {
      setOpen(true);
    }
  }, [onClose]);

  useEffect(() => {
    if (!open || abriendoPerfilDesdeSidebarRef.current) return;
    setTabPrincipal("chats");
  }, [open]);
  
  // Resetear estado del chat cuando se cierra
  useEffect(() => {
    if (!open) {
      // Si estamos abriendo el perfil desde el sidebar, NO resetear nada
      if (abriendoPerfilDesdeSidebarRef.current) {
        return; // Salir completamente sin resetear nada
      }
      
      setTabPrincipal("chats");
      setTipoChat(null);
      setChatActual(null);
      setMensajeInput("");
      setArchivoAdjunto(null);
      setEditandoMensaje(null);
      setRespondiendoMensaje(null);
      setMensajeResaltadoId(null);
      setPerfilAbierto(false);
      setPerfilData(null);
      setModalSolicitud(null);
      setGrupoMenuAbierto(null);
      setMostrarAgregarMiembros(false);
      mensajePrioritarioProcessedRef.current = null;
    }
  }, [open]);
  const [tabPrincipal, setTabPrincipal] = useState("chats");
  const [tipoChat, setTipoChat] = useState(null);
  const [chatActual, setChatActual] = useState(null);
  const [mensajeResaltadoId, setMensajeResaltadoId] = useState(null);

  const [usuariosCOPMEC, setUsuariosCOPMEC] = useState([]);
  const [estadosUsuarios, setEstadosUsuarios] = useState({}); // { nickname: 'activo'|'ausente'|'offline' }
  const [chatsActivos, setChatsActivos] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [historialLlamadas, setHistorialLlamadas] = useState([]);
  const [historialCargando, setHistorialCargando] = useState(false);

  const [mensajesGeneral, setMensajesGeneral] = useState([]);
  const [mensajesPrivado, setMensajesPrivado] = useState({});
  const [mensajesGrupal, setMensajesGrupal] = useState({});

  const [mensajeInput, setMensajeInput] = useState("");
  const [escribiendoPorChat, setEscribiendoPorChat] = useState({});
  const [noLeidos, setNoLeidos] = useState(0);
  const [filtroUsuarios, setFiltroUsuarios] = useState("");
  const [perfilAbierto, setPerfilAbierto] = useState(false);
  const [perfilTab, setPerfilTab] = useState("acerca");
  const [perfilData, setPerfilData] = useState(null);
  const [perfilCompartidos, setPerfilCompartidos] = useState([]);
  const [perfilCargando, setPerfilCargando] = useState(false);
  const [perfilError, setPerfilError] = useState(null);
  const [perfilCompartidosTab, setPerfilCompartidosTab] = useState("imagenes");
  const [perfilTipo, setPerfilTipo] = useState(null); // 'usuario' o 'grupo'
  const [_editandoMiPerfil, setEditandoMiPerfil] = useState(false);
  const [editPerfilCargo, _setEditPerfilCargo] = useState("");
  const [editPerfilArea, _setEditPerfilArea] = useState("");
  const [_editPerfilGuardando, setEditPerfilGuardando] = useState(false);
  const [perfilGrupoMiembros, setPerfilGrupoMiembros] = useState([]);
  const [perfilGrupoAdmins, setPerfilGrupoAdmins] = useState([]);
  const [perfilGrupoRestricciones, setPerfilGrupoRestricciones] = useState({});
  const [menuMiembroAbierto, setMenuMiembroAbierto] = useState(null); // nickname del miembro
  const [menuMiembroPosicion, setMenuMiembroPosicion] = useState(null); // { x, y } para overlay
  const [submenuRestriccionAbierto, setSubmenuRestriccionAbierto] = useState(null); // nickname del miembro
  const [busquedaMiembros, setBusquedaMiembros] = useState("");
  const [filtroMiembros, setFiltroMiembros] = useState("todos"); // todos, admins, miembros
  const [editandoTema, setEditandoTema] = useState(false);
  const [editandoDescripcion, setEditandoDescripcion] = useState(false);
  const [nuevoTema, setNuevoTema] = useState("");
  const [nuevaDescripcion, setNuevaDescripcion] = useState("");
  // eslint-disable-next-line no-unused-vars
  const [usuarioRestringido, setUsuarioRestringido] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [restriccionInfo, setRestriccionInfo] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewBlob, setPreviewBlob] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewTextContent, setPreviewTextContent] = useState(null);
  const [previewError, setPreviewError] = useState(null);

  const [nuevoGrupoNombre, setNuevoGrupoNombre] = useState("");
  const [nuevoGrupoDesc, setNuevoGrupoDesc] = useState("");
  const [nuevoGrupoEsPublico, setNuevoGrupoEsPublico] = useState(true);
  const [mostrarCrearGrupo, setMostrarCrearGrupo] = useState(false);
  const [mostrarAgregarMiembros, setMostrarAgregarMiembros] = useState(false);
  const [grupoAgregarMiembros, setGrupoAgregarMiembros] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [grupoMenuAbierto, setGrupoMenuAbierto] = useState(null);
  const [modalSolicitud, setModalSolicitud] = useState(null); // { solicitudId, grupoId, usuario_nickname, fecha, groupName }
  // eslint-disable-next-line no-unused-vars
  const [solicitudesPendientes, setSolicitudesPendientes] = useState([]);
  
  // Estados para grupos desplegables de chats y grupos
  const [gruposChatsCollapsed, setGruposChatsCollapsed] = useState({}); // { nombreGrupo: true/false }
  const [gruposGruposCollapsed, setGruposGruposCollapsed] = useState({}); // { nombreGrupo: true/false }
  const [chatGroups, setChatGroups] = useState({}); // { chatId: "nombreGrupo" }
  const [grupoGroups, setGrupoGroups] = useState({}); // { grupoId: "nombreGrupo" }
  const [menuGrupoChat, setMenuGrupoChat] = useState(null); // ID del chat con menú abierto
  const [menuGrupoGrupo, setMenuGrupoGrupo] = useState(null); // ID del grupo con menú abierto
  const [modalGrupoNombre, setModalGrupoNombre] = useState(""); // Nombre del grupo a crear/renombrar
  const [modalGrupoAccion, setModalGrupoAccion] = useState(null); // { tipo: 'crear'|'renombrar', itemId, itemTipo: 'chat'|'grupo' }
  // eslint-disable-next-line no-unused-vars
  const [editandoGrupo, setEditandoGrupo] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [grupoEditNombre, setGrupoEditNombre] = useState("");
  // eslint-disable-next-line no-unused-vars
  const [grupoEditDesc, setGrupoEditDesc] = useState("");
  // eslint-disable-next-line no-unused-vars
  const [grupoEditPublico, setGrupoEditPublico] = useState(true);

  // Estados para funcionalidades avanzadas tipo Slack
  const [archivoAdjunto, setArchivoAdjunto] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [archivoSubiendo, setArchivoSubiendo] = useState(false);
  const [editandoMensaje, setEditandoMensaje] = useState(null);
  const [textoEdicion, setTextoEdicion] = useState("");
  const [mostrarSugerenciasMencion, setMostrarSugerenciasMencion] = useState(false);
  const [sugerenciasMencion, setSugerenciasMencion] = useState([]);
  const [posicionMencion, setPosicionMencion] = useState(0);
  const [configNotificaciones, setConfigNotificaciones] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recTime, setRecTime] = useState(0);          // segundos grabados
  const [recBars, setRecBars] = useState(new Array(30).fill(2)); // alturas del visualizador
  const recTimerRef = useRef(null);
  const recAnimRef = useRef(null);
  const recAnalyserRef = useRef(null);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [videoPreviewStream, setVideoPreviewStream] = useState(null);
  const [videoGrabado, setVideoGrabado] = useState(null); // { url, file } tras detener grabación
  const videoChunksRef = useRef([]);
  const videoStreamRef = useRef(null);
  const videoPreviewRef = useRef(null);
  const videoRecorderRef = useRef(null);
  const [reacciones, setReacciones] = useState({});
  const [mostrarToolbarFormato, setMostrarToolbarFormato] = useState(true);
  const [mostrarAdjuntosMobile, setMostrarAdjuntosMobile] = useState(false);
  const [galeriaThumbs, setGaleriaThumbs] = useState([]);
  const [menuMensaje, setMenuMensaje] = useState(null);
  const [lecturasPrivadas, setLecturasPrivadas] = useState({});
  const [respondiendoMensaje, setRespondiendoMensaje] = useState(null);
  const [reenviarMensaje, setReenviarMensaje] = useState(null);
  const [mostrarReenvio, setMostrarReenvio] = useState(false);
  const [mensajeFijado, setMensajeFijado] = useState(null);
  const [mensajesDestacados, setMensajesDestacados] = useState(new Set());
  const [emojiUso, setEmojiUso] = useState({});
  const [menuEmojiAbierto, setMenuEmojiAbierto] = useState(false);
  const [inputEmojiAbierto, setInputEmojiAbierto] = useState(false);
  const [emojiCategoriaActiva, setEmojiCategoriaActiva] = useState("recientes");
  const [emojiCategoriaActivaMenu, setEmojiCategoriaActivaMenu] = useState("recientes");
  const [emojiBusqueda, setEmojiBusqueda] = useState("");
  const [emojiBusquedaMenu, setEmojiBusquedaMenu] = useState("");
  const [emojisPersonalizados, setEmojisPersonalizados] = useState([]);
  const [seleccionModo, setSeleccionModo] = useState(false);
  const [seleccionMensajes, setSeleccionMensajes] = useState(new Set());
  const [modalLinkAbierto, setModalLinkAbierto] = useState(false);
  const [modalLinkTexto, setModalLinkTexto] = useState("");
  const [modalLinkUrl, setModalLinkUrl] = useState("");
  const [callActivo, setCallActivo] = useState(false);
  const [callIncoming, setCallIncoming] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [callExpanded, setCallExpanded] = useState(false);
  const [callMainView, setCallMainView] = useState("remote"); // remote | local
  const [callMainRemoteId, setCallMainRemoteId] = useState(null);
  const [callPipPosition, setCallPipPosition] = useState({ x: 0, y: 0 });
  const [callInvitePickerOpen, setCallInvitePickerOpen] = useState(false);
  const [callInviteSelection, setCallInviteSelection] = useState({});
  const [callMuted, setCallMuted] = useState(false);
  const [callVideoOff, setCallVideoOff] = useState(false);
  const [callFacingMode, setCallFacingMode] = useState("user");
  const [switchingCamera, setSwitchingCamera] = useState(false);
  const [sharingScreen, setSharingScreen] = useState(false);
  const [rtcConfig, setRtcConfig] = useState({ iceServers: [] });
  const [reuniones, setReuniones] = useState([]);
  const [modalReunionAbierto, setModalReunionAbierto] = useState(false);
  const [reunionEditando, setReunionEditando] = useState(null);
  const [reunionForm, setReunionForm] = useState({
    titulo: "",
    descripcion: "",
    fecha: "",
    hora: "",
    lugar: "",
    esVideollamada: false,
    participantes: []
  });

  const chatBodyRef = useRef(null);
  const chatScrollTimeoutRef = useRef(null);
  const chatScrollFrameRef = useRef(null);
  const cargandoChatsActivosRef = useRef(false);
  const mensajeInputRef = useRef(null);
  const typingStopTimerRef = useRef(null);
  const lastTypingEmitRef = useRef(0);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const gifInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const longPressTimeoutRef = useRef(null);
  const touchMovedRef = useRef(false);
  const localStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const callWindowRef = useRef(null);
  const pipDragRef = useRef({ dragging: false, moved: false, startX: 0, startY: 0, originX: 0, originY: 0 });
  const screenStreamRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const remoteStreamsRef = useRef({});
  const peerDisconnectTimersRef = useRef({});
  const pendingCandidatesRef = useRef({});
  const callRoomRef = useRef(null);
  const outgoingCallTimeoutRef = useRef(null);
  const incomingInviteRef = useRef({ room: null, ts: 0 });
  const callTransportRef = useRef(null);
  const pendingInviteTransportRef = useRef(null);
  const ringtoneRef = useRef(null);
  const outgoingRingRef = useRef(null);
  const lastActivityEmitRef = useRef(0);
  const callSignalPollBusyRef = useRef(false);
  const callSignalPollPausedUntilRef = useRef(0);

  const isSameNickname = (a, b) =>
    String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

  const normalizeCallNick = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

  const getEstadoUsuario = (displayName) => {
    const direct = estadosUsuarios[displayName];
    if (direct) return direct;
    const wanted = normalizeCallNick(displayName);
    if (!wanted) return "offline";
    const matchKey = Object.keys(estadosUsuarios).find((key) => normalizeCallNick(key) === wanted);
    return (matchKey ? estadosUsuarios[matchKey] : null) || "offline";
  };

  const buildRestPeerId = (nickname) => `rest:${normalizeCallNick(nickname)}`;

  const scrollChatToBottom = () => {
    if (!chatBodyRef.current) return;

    if (chatScrollFrameRef.current) {
      cancelAnimationFrame(chatScrollFrameRef.current);
      chatScrollFrameRef.current = null;
    }
    if (chatScrollTimeoutRef.current) {
      clearTimeout(chatScrollTimeoutRef.current);
      chatScrollTimeoutRef.current = null;
    }

    chatScrollFrameRef.current = requestAnimationFrame(() => {
      chatScrollFrameRef.current = requestAnimationFrame(() => {
        if (chatBodyRef.current) {
          chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
      });
    });

    chatScrollTimeoutRef.current = setTimeout(() => {
      if (chatBodyRef.current) {
        chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
      }
      chatScrollTimeoutRef.current = null;
    }, 250);
  };

  const isRestPeerId = (peerId) => String(peerId || "").startsWith("rest:");

  const getPeerNicknamesForFallback = () => Array.from(
    new Set(
      Object.values(peerConnectionsRef.current)
        .map((entry) => entry?.nickname)
        .filter(Boolean)
        .filter((nickname) => !isSameNickname(nickname, user?.nickname || user?.name || "")),
    ),
  );

  const getCallCandidates = () => {
    const userDisplayName = user?.nickname || user?.name || "";
    const currentUserNorm = normalizeCallNick(userDisplayName);

    let baseNicknames = [];
    if (tipoChat === "grupal") {
      const grupo = Array.isArray(grupos)
        ? grupos.find((g) => String(g.id) === String(chatActual))
        : null;
      baseNicknames = Array.isArray(grupo?.miembros) ? grupo.miembros : [];
    } else if (tipoChat === "privado") {
      baseNicknames = Array.isArray(usuariosCOPMEC)
        ? usuariosCOPMEC.map((u) => u.nickname || u.name).filter(Boolean)
        : [];
    }

    const inCallNicknames = new Set(
      Object.values(peerConnectionsRef.current)
        .map((entry) => normalizeCallNick(entry?.nickname))
        .filter(Boolean),
    );

    return Array.from(new Set(baseNicknames.map((n) => String(n || "").trim()).filter(Boolean)))
      .filter((nickname) => {
        const normalized = normalizeCallNick(nickname);
        if (!normalized || normalized === currentUserNorm) return false;
        if (inCallNicknames.has(normalized)) return false;
        return true;
      })
      .sort((a, b) => a.localeCompare(b, "es-MX"));
  };

  const placePipBottomRight = () => {
    const viewportWidth = window.innerWidth || 1280;
    const viewportHeight = window.innerHeight || 720;
    const pipWidth = 190;
    const pipHeight = 130;
    setCallPipPosition({
      x: Math.max(12, viewportWidth - pipWidth - 20),
      y: Math.max(12, viewportHeight - pipHeight - 106),
    });
  };

  const clampPipPosition = (x, y) => {
    const viewportWidth = window.innerWidth || 1280;
    const viewportHeight = window.innerHeight || 720;
    const pipWidth = 190;
    const pipHeight = 130;
    return {
      x: Math.min(Math.max(8, x), Math.max(8, viewportWidth - pipWidth - 8)),
      y: Math.min(Math.max(8, y), Math.max(8, viewportHeight - pipHeight - 86)),
    };
  };

  const handlePipPointerDown = (event) => {
    if (callMainView === "local") return;
    const origin = callPipPosition || { x: 0, y: 0 };
    pipDragRef.current = {
      dragging: true,
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
      originX: origin.x,
      originY: origin.y,
    };

    const onMove = (moveEvent) => {
      if (!pipDragRef.current.dragging) return;
      const dx = moveEvent.clientX - pipDragRef.current.startX;
      const dy = moveEvent.clientY - pipDragRef.current.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        pipDragRef.current.moved = true;
      }
      const next = clampPipPosition(pipDragRef.current.originX + dx, pipDragRef.current.originY + dy);
      setCallPipPosition(next);
    };

    const onUp = () => {
      const moved = pipDragRef.current.moved;
      pipDragRef.current.dragging = false;
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      if (!moved) {
        setCallMainView("local");
      }
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };

  const toggleCallExpanded = async () => {
    const next = !callExpanded;
    setCallExpanded(next);
    if (next) {
      placePipBottomRight();
      if (callWindowRef.current?.requestFullscreen) {
        try {
          await callWindowRef.current.requestFullscreen();
        } catch { /* noop */ }
      }
      return;
    }
    if (document.fullscreenElement && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch { /* noop */ }
    }
  };

  const invitarParticipantesEnLlamada = async () => {
    const room = callRoomRef.current;
    if (!room || !callActivo) return;
    const userDisplayName = user?.nickname || user?.name || "usuario";
    const seleccionados = Object.entries(callInviteSelection)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([nickname]) => nickname);

    if (!seleccionados.length) {
      showAlert("Selecciona al menos un player para invitar.", "warning");
      return;
    }

    if (socket?.connected) {
      socket.emit("call_invite", {
        room,
        fromNickname: userDisplayName,
        toNicknames: seleccionados,
        tipo: "extendida",
      });
      showAlert(`Invitacion enviada a ${seleccionados.length} participante(s).`, "success");
      setCallInvitePickerOpen(false);
      setCallInviteSelection({});
      return;
    }

    try {
      await sendCallSignalFallback({
        type: "invite",
        room,
        toNicknames: seleccionados,
        nickname: userDisplayName,
        fromPeerId: buildRestPeerId(userDisplayName),
      });
      showAlert(`Invitacion enviada por canal alterno a ${seleccionados.length} participante(s).`, "success");
      setCallInvitePickerOpen(false);
      setCallInviteSelection({});
    } catch {
      showAlert("No se pudieron enviar las invitaciones adicionales.", "error");
    }
  };

  const isDuplicateInvite = (room) => {
    const now = Date.now();
    if (incomingInviteRef.current.room === room && (now - incomingInviteRef.current.ts) < 8000) {
      return true;
    }
    incomingInviteRef.current = { room, ts: now };
    return false;
  };

  const sendCallSignalFallback = async ({ type, room, toNicknames, sdp, candidate, nickname, fromPeerId }) => {
    const normalizedTargets = Array.from(
      new Set(
        (Array.isArray(toNicknames) ? toNicknames : [])
          .map((target) => String(target || "").trim())
          .filter(Boolean),
      ),
    );

    if (!type || !room || normalizedTargets.length === 0) {
      const err = new Error("Señal de llamada incompleta (faltan destinatarios o sala)");
      err.status = 400;
      throw err;
    }

    return authFetch(`${SERVER_URL}/api/chat/calls/signal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        room,
        toNicknames: normalizedTargets,
        sdp,
        candidate,
        nickname,
        fromPeerId,
      }),
    });
  };

  const saveAudioSetting = (key, value) => {
    setAudioSettings((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "msgSound") localStorage.setItem(AUDIO_PREF_KEYS.msgSound, next.msgSound);
      if (key === "callIncomingSound") localStorage.setItem(AUDIO_PREF_KEYS.callIncomingSound, next.callIncomingSound);
      if (key === "callOutgoingSound") localStorage.setItem(AUDIO_PREF_KEYS.callOutgoingSound, next.callOutgoingSound);
      if (key === "msgVolume") localStorage.setItem(AUDIO_PREF_KEYS.msgVolume, String(next.msgVolume));
      if (key === "callVolume") localStorage.setItem(AUDIO_PREF_KEYS.callVolume, String(next.callVolume));
      syncNotificationPrefsToServiceWorker();
      return next;
    });
  };

  useEffect(() => {
    syncNotificationPrefsToServiceWorker();
  }, [audioSettings.msgSound, audioSettings.callIncomingSound]);

  // Toca un sonido de videollamada — patrón idéntico a notificationSounds.js:
  // ctx fresco cada vez, sin async/await, sin estado compartido.
  const playCallSound = (tipo) => {
    try {
      if (!ensureAudioGestureUnlock()) return;
      const configuredVolume = Math.min(1, Math.max(0, Number(audioSettings.callVolume ?? 1)));
      const volume = configuredVolume <= 0 ? 1 : configuredVolume;
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const doPlay = () => {
        const t = ctx.currentTime;
        if (tipo === "ringOutgoing") {
          [[480, 0], [440, 0], [480, 0.6], [440, 0.6]].forEach(([freq, start]) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = "sine"; osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.20 * volume, t + start);
            gain.gain.exponentialRampToValueAtTime(0.001, t + start + 0.4);
            osc.start(t + start); osc.stop(t + start + 0.42);
          });
        } else if (tipo === "ringIncoming") {
          [[920, 0], [920, 0.18], [740, 0.62], [740, 0.8]].forEach(([freq, start]) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = "triangle"; osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.26 * volume, t + start);
            gain.gain.exponentialRampToValueAtTime(0.001, t + start + 0.22);
            osc.start(t + start); osc.stop(t + start + 0.24);
          });
        } else if (tipo === "accept") {
          [523, 659, 784].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = "sine"; osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.18 * volume, t + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.5);
            osc.start(t + i * 0.1); osc.stop(t + i * 0.1 + 0.52);
          });
        } else if (tipo === "hangup") {
          [400, 300].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = "sine"; osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.45 * volume, t + i * 0.18);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.18 + 0.5);
            osc.start(t + i * 0.18); osc.stop(t + i * 0.18 + 0.52);
          });
        } else if (tipo === "reject") {
          [520, 420, 320].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = "square"; osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.22 * volume, t + i * 0.09);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.09 + 0.2);
            osc.start(t + i * 0.09); osc.stop(t + i * 0.09 + 0.22);
          });
        }
      };
      if (ctx.state === "suspended") {
        ctx.resume().then(doPlay).catch(() => {});
      } else {
        doPlay();
      }
    } catch { /* noop */ }
  };

  const playIncomingCallTone = () => {
    try {
      if (audioSettings.callIncomingSound === "ringIncoming") {
        playCallSound("ringIncoming");
        return;
      }
      const played = playNotificationSound(audioSettings.callIncomingSound, { volume: audioSettings.callVolume });
      if (!played) playCallSound("ringIncoming");
    } catch (_err) {
      console.warn("Error al reproducir tono entrante:", _err);
      playCallSound("ringIncoming");
    }
  };

  const playOutgoingCallTone = () => {
    try {
      if (audioSettings.callOutgoingSound === "ringOutgoing") {
        playCallSound("ringOutgoing");
        return;
      }
      const played = playNotificationSound(audioSettings.callOutgoingSound, { volume: audioSettings.callVolume });
      if (!played) playCallSound("ringOutgoing");
    } catch (err) {
      console.warn("Error al reproducir tono saliente:", err);
      playCallSound("ringOutgoing");
    }
  };

  const shouldPlayMessageSound = () => {
    if (configNotificaciones && Number(configNotificaciones.sonido_activo) === 0) return false;
    if (configNotificaciones && Number(configNotificaciones.notificaciones_activas) === 0) return false;
    if (configNotificaciones && Number(configNotificaciones.privados_activos) === 0) return false;
    return true;
  };

  const playIncomingMessageSound = () => {
    if (!shouldPlayMessageSound()) return;
    const messageVolume = Number(audioSettings.msgVolume) <= 0 ? 1 : audioSettings.msgVolume;
    const played = playNotificationSound(audioSettings.msgSound, { volume: messageVolume });
    if (!played) {
      playCallSound("accept");
    }
  };

  // Evita que errores de Notification interrumpan el flujo de invitación.
  const showIncomingCallNotification = (room, fromNickname) => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const title = "Llamada entrante";
    const body = `${fromNickname || "Usuario"} te está llamando`;
    const tag = `call-${room}`;

    try {
      if (navigator.serviceWorker?.ready) {
        navigator.serviceWorker.ready
          .then((registration) => {
            if (!registration?.showNotification) {
              new Notification(title, {
                body,
                icon: "/android-chrome-192x192.png",
                tag,
                requireInteraction: true,
              });
              return;
            }

            return registration.showNotification(title, {
              body,
              icon: "/android-chrome-192x192.png",
              badge: "/android-chrome-192x192.png",
              tag,
              requireInteraction: true,
              vibrate: [500, 200, 500],
              silent: false,
              sound: "/sounds/notification-call.wav",
              actions: [
                { action: "accept", title: "Aceptar" },
                { action: "reject", title: "Rechazar" },
              ],
              data: {
                type: "call_invite",
                room,
                caller: fromNickname || "Usuario",
                callerName: fromNickname || "Usuario",
                fromNickname: fromNickname || "Usuario",
                url: "/",
              },
            });
          })
          .catch(() => {
            new Notification(title, {
              body,
              icon: "/android-chrome-192x192.png",
              tag,
              requireInteraction: true,
            });
          });
        return;
      }

      new Notification(title, {
        body,
        icon: "/android-chrome-192x192.png",
        tag,
        requireInteraction: true,
      });
    } catch (_err) {
      console.warn("[NOTIFICATION] Error mostrando notificación de llamada:", _err?.message || _err);
    }
  };

  const makeInitialsAvatar = (name) => {
    const safeName = (name && typeof name === 'string' ? name : '').trim();
    const colors = ['#355f88','#1d4ed8','#7c3aed','#b45309','#314d69','#be185d','#0369a1','#2d4f72'];
    let hash = 0;
    for (let i = 0; i < safeName.length; i++) hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
    const bg = colors[Math.abs(hash) % colors.length];
    // Person silhouette icon
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 36 36'><rect width='36' height='36' rx='18' ry='18' fill='${bg}'/><circle cx='18' cy='14' r='5.5' fill='rgba(255, 255, 255, 0.88)'/><path d='M6 34c0-6.6 5.4-12 12-12s12 5.4 12 12' fill='rgba(255, 255, 255, 0.88)'/></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  };

  // Avatar fijo para Chat General (globo terráqueo)
  const makeGeneralAvatar = () => {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 36 36'><rect width='36' height='36' rx='18' ry='18' fill='%23032121'/><circle cx='18' cy='18' r='9' stroke='rgba(255, 255, 255, 0.9)' stroke-width='1.5' fill='none'/><line x1='9' y1='18' x2='27' y2='18' stroke='rgba(255, 255, 255, 0.9)' stroke-width='1.5'/><path d='M18 9c-3 3-5 5.8-5 9s2 6 5 9' stroke='rgba(255, 255, 255, 0.9)' stroke-width='1.5' fill='none'/><path d='M18 9c3 3 5 5.8 5 9s-2 6-5 9' stroke='rgba(255, 255, 255, 0.9)' stroke-width='1.5' fill='none'/></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  };

  const getAvatarUrl = (usuarioObj) => {
    const resolved = typeof usuarioObj === "string"
      ? resolveUsuarioChat(usuarioObj)
      : usuarioObj;
    if (!resolved) return makeInitialsAvatar(typeof usuarioObj === "string" ? usuarioObj : '?');

    const serverUrl = SERVER_URL;
    const cacheKey = resolved.photoTimestamp || resolved.id || "v1";
    const rawAvatarValue = String(
      resolved.photoThumbnailUrl
      || resolved.photo
      || resolved.avatarUrl
      || resolved.avatar_url
      || "",
    ).trim();
    const loweredAvatar = rawAvatarValue.toLowerCase();
    const avatarValue = ["", "null", "undefined", "nan", "[object object]"]
      .includes(loweredAvatar)
      || rawAvatarValue.includes("\\fakepath\\")
      ? ""
      : rawAvatarValue;

    if (avatarValue) {
      const withCache = (url) => {
        const separator = url.includes("?") ? "&" : "?";
        return `${url}${separator}t=${cacheKey}`;
      };

      if (avatarValue.startsWith('data:image')) return avatarValue;
      if (avatarValue.startsWith('blob:')) return avatarValue;
      if (avatarValue.startsWith('http')) return withCache(avatarValue);
      if (avatarValue.startsWith('//')) return withCache(`https:${avatarValue}`);
      if (avatarValue.startsWith('/')) return withCache(`${serverUrl}${avatarValue}`);
      return withCache(`${serverUrl}/uploads/perfiles/${avatarValue}`);
    }

    const displayName = resolved.name || resolved.nickname || resolved.nombre || '';
    return makeInitialsAvatar(displayName);
  };

  const getColorForName = (nickname) => {
    if (!nickname || typeof nickname !== 'string') {
      return "#666666"; // Color por defecto si nickname es null/undefined
    }
    const colors = ["#275a86", "#007bff", "#9b59b6", "#e67e22", "#295e8d"];
    let hash = 0;
    for (let i = 0; i < nickname.length; i++) {
      hash = nickname.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const normalizeUserKey = (value) => String(value || "").trim().toLowerCase();

  const resolveUsuarioChat = (clave) => {
    const targetKey = normalizeUserKey(clave);
    if (!targetKey) return null;
    return [
      ...(Array.isArray(usuariosCOPMEC) ? usuariosCOPMEC : []),
      user,
    ].find((entry) => {
      if (!entry) return false;
      return [entry?.name, entry?.nickname, entry?.email, entry?.id].some(
        (alias) => normalizeUserKey(alias) === targetKey,
      );
    }) || null;
  };

  const marcarEscritura = (deNickname, activo) => {
    const key = normalizeUserKey(deNickname);
    if (!key) return;
    setEscribiendoPorChat((prev) => {
      const next = { ...prev };
      if (activo) next[key] = Date.now() + 5200;
      else delete next[key];
      return next;
    });
  };

  const estaEscribiendoClave = (clave) => {
    const resolved = resolveUsuarioChat(clave);
    const keys = [clave, resolved?.name, resolved?.nickname, resolved?.email]
      .map((value) => normalizeUserKey(value))
      .filter(Boolean);
    const now = Date.now();
    return keys.some((key) => (escribiendoPorChat[key] || 0) > now);
  };

  const emitirEstadoEscritura = (paraNickname, typing) => {
    if (!socket?.connected || tipoChat !== "privado" || !paraNickname) return;
    const now = Date.now();
    if (typing && now - lastTypingEmitRef.current < 900) return;
    if (typing) lastTypingEmitRef.current = now;
    socket.emit("chat_typing", { para_nickname: paraNickname, typing: !!typing });
  };

  const buildProfileFallback = (nickname) => {
    const targetKey = normalizeUserKey(nickname);
    if (!targetKey) return null;
    const source = resolveUsuarioChat(nickname);
    if (!source && !nickname) return null;
    return {
      id: source?.id || null,
      name: source?.name || nickname,
      nickname: source?.nickname || source?.name || nickname,
      photo: source?.photo || null,
      photoThumbnailUrl: source?.photoThumbnailUrl || null,
      puesto: source?.role || null,
      cargo: source?.jobTitle || source?.cargo || null,
      area: source?.area || null,
      department: source?.department || null,
      playerAcceso: source?.email || null,
      correo: source?.correoElectronico || null,
      telefono: source?.telefono || null,
      telefono_visible: Boolean(source?.telefono_visible),
      birthday: source?.birthday || null,
      fechaIngreso: source?.fechaIngreso || null,
      active: source?.isActive !== false,
    };
  };

  // Cerrar menús al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuMiembroAbierto || submenuRestriccionAbierto) {
        const target = event.target;
        // Verificar si el clic fue fuera de los menús
        const isMenuClick = target.closest('.chat-member-menu') || target.closest('.chat-member-menu-overlay') || target.closest('button[title="Opciones"]');
        if (!isMenuClick) {
          setMenuMiembroAbierto(null);
          setSubmenuRestriccionAbierto(null);
        }
      }
    };
    
    if (menuMiembroAbierto || submenuRestriccionAbierto) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [menuMiembroAbierto, submenuRestriccionAbierto]);

  // ============================
  // 👂 Escuchar evento para abrir chat desde reuniones
  // ============================
  useEffect(() => {
    const handleAbrirChatDesdeReunion = (event) => {
      const { nickname, tipo } = event.detail;
      if (nickname) {
        setOpen(true);
        setTabPrincipal("chats");
        setTipoChat(tipo || "privado");
        setChatActual(nickname);
      }
    };

    window.addEventListener('abrir-chat-desde-reunion', handleAbrirChatDesdeReunion);
    return () => {
      window.removeEventListener('abrir-chat-desde-reunion', handleAbrirChatDesdeReunion);
    };
  }, []);

  useEffect(() => {
    const handleNotificationAction = async (event) => {
      const data = event?.detail || {};
      setOpen(true);
      if (data.type === "call_invite") {
        if (data.action === "accept" || data.action === "default") {
          setCallIncoming({
            room: data.room,
            fromNickname: data.callerName || data.caller || data.fromNickname,
            fromSocketId: null,
          });
          if (data.action === "accept") {
            setTimeout(() => aceptarLlamada(), 400);
          }
        }
        return;
      }
      if (data.type === "message" && data.fromNickname) {
        setTabPrincipal("chats");
        await abrirChat("privado", data.fromNickname);
        return;
      }
      if (data.type === "group_message" && data.groupId) {
        setTabPrincipal("chats");
        await abrirChat("grupal", data.groupId);
      }
    };

    const handlePushReply = async (event) => {
      const { fromNickname, text } = event?.detail || {};
      const mensaje = String(text || "").trim();
      if (!fromNickname || !mensaje) return;
      setOpen(true);
      try {
        await authFetch(`${SERVER_URL}/api/chat/privado`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ para_nickname: fromNickname, mensaje }),
        });
        await abrirChat("privado", fromNickname);
      } catch {
        showAlert("No se pudo enviar la respuesta desde la notificación.", "warning");
      }
    };

    const handleRejectCall = (event) => {
      const data = event?.detail || {};
      if (data.room) {
        setCallIncoming({
          room: data.room,
          fromNickname: data.caller || data.callerName || "Usuario",
          fromSocketId: null,
        });
      }
      rechazarLlamada();
    };

    window.addEventListener("axo-notification-action", handleNotificationAction);
    window.addEventListener("axo-push-reply", handlePushReply);
    window.addEventListener("axo-reject-call", handleRejectCall);
    return () => {
      window.removeEventListener("axo-notification-action", handleNotificationAction);
      window.removeEventListener("axo-push-reply", handlePushReply);
      window.removeEventListener("axo-reject-call", handleRejectCall);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================
  // 👤 Cargar usuarios de COPMEC
  // ============================
  useEffect(() => {
    if (!open) return;

    const cargarUsuarios = async () => {
      try {
        const data = await authFetch(`${SERVER_URL}/api/chat/usuarios`);
        setUsuariosCOPMEC(data || []);
      } catch (_e) {
        /* noop */
      }
    };

    const cargarEstados = async () => {
      try {
        const estados = await authFetch(`${SERVER_URL}/api/chat/usuarios/estados`);
        setEstadosUsuarios(estados || {});
      } catch (_e) {
        /* noop */
      }
    };

    cargarUsuarios();
    cargarEstados();
    
    // Recargar estados como fallback, evitando presión innecesaria al backend
    const interval = setInterval(() => {
      authFetch(`${SERVER_URL}/api/chat/usuarios/estados`)
        .then((estados) => setEstadosUsuarios(estados || {}))
        .catch(() => {});
    }, 45000);

    return () => { clearInterval(interval); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setEscribiendoPorChat((prev) => {
        let changed = false;
        const next = { ...prev };
        Object.keys(next).forEach((key) => {
          if ((next[key] || 0) <= now) {
            delete next[key];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  // Badge de chats no leídos: polling ligero solo con chat cerrado (si está abierto, otro efecto sincroniza).
  useEffect(() => {
    if (open) return undefined;
    let cancelled = false;

    const syncActivos = async () => {
      if (cargandoChatsActivosRef.current || cancelled || isChatBackendPaused()) return;
      cargandoChatsActivosRef.current = true;
      try {
        const data = await authFetch(`${SERVER_URL}/api/chat/activos`);
        if (!cancelled) setChatsActivos(data || []);
      } catch (err) {
        if (isNetworkFetchError(err) || err?.isBackendPaused) pauseChatBackend(120000);
      } finally {
        cargandoChatsActivosRef.current = false;
      }
    };

    syncActivos();
    const interval = setInterval(syncActivos, 180000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [SERVER_URL, open]);

  // Re-fetch chats y mensajes abiertos cuando el socket se reconecta (connectCount > 1)
  useEffect(() => {
    if (!connectCount || connectCount <= 1) return;
    authFetch(`${SERVER_URL}/api/chat/activos`)
      .then((data) => { if (data) setChatsActivos(data); })
      .catch(() => {});
    if (tipoChat === "privado" && chatActual) {
      authFetch(`/api/chat/privado/${chatActual}`)
        .then((data) => {
          const sorted = (data || []).sort((a, b) => new Date(a.fecha || 0) - new Date(b.fecha || 0));
          setMensajesPrivado((prev) => ({ ...prev, [chatActual]: sorted }));
          const lect = {};
          sorted.forEach((m) => { if (m.fecha_leido_otro) lect[String(m.id)] = m.fecha_leido_otro; });
          if (Object.keys(lect).length) setLecturasPrivadas((prev) => ({ ...prev, ...lect }));
        })
        .catch(() => {});
    }
    if (tipoChat === "grupal" && chatActual) {
      authFetch(`/api/chat/grupos/${chatActual}/mensajes`)
        .then((data) => {
          const sorted = (data || []).sort((a, b) => new Date(a.fecha || 0) - new Date(b.fecha || 0));
          setMensajesGrupal((prev) => ({ ...prev, [String(chatActual)]: sorted }));
        })
        .catch(() => {});
    }
    if (tipoChat === "general") {
      authFetch(`${SERVER_URL}/api/chat/general`)
        .then((data) => {
          setMensajesGeneral((data || []).sort((a, b) => new Date(a.fecha || 0) - new Date(b.fecha || 0)));
        })
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectCount]);

  // Fallback de sincronización del chat abierto: evita desfaces si un evento socket se pierde.
  useEffect(() => {
    if (!open || !tipoChat || !chatActual) return;

    const syncOpenChat = async () => {
      try {
        if (tipoChat === "general") {
          const data = await authFetch(`${SERVER_URL}/api/chat/general`);
          setMensajesGeneral((data || []).sort((a, b) => new Date(a.fecha || 0) - new Date(b.fecha || 0)));
          return;
        }

        if (tipoChat === "privado") {
          const data = await authFetch(`${SERVER_URL}/api/chat/privado/${chatActual}`);
          const sorted = (data || []).sort((a, b) => new Date(a.fecha || 0) - new Date(b.fecha || 0));
          setMensajesPrivado((prev) => ({ ...prev, [chatActual]: sorted }));
          const lect = {};
          sorted.forEach((m) => { if (m.fecha_leido_otro) lect[String(m.id)] = m.fecha_leido_otro; });
          if (Object.keys(lect).length) setLecturasPrivadas((prev) => ({ ...prev, ...lect }));
          return;
        }

        if (tipoChat === "grupal") {
          const data = await authFetch(`${SERVER_URL}/api/chat/grupos/${chatActual}/mensajes`);
          const sorted = (data || []).sort((a, b) => new Date(a.fecha || 0) - new Date(b.fecha || 0));
          setMensajesGrupal((prev) => ({ ...prev, [String(chatActual)]: sorted }));
        }
      } catch (_) { /* noop */ }
    };

    // Primer sync inmediato + intervalo moderado para evitar 429
    syncOpenChat();
    const interval = setInterval(syncOpenChat, 45000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tipoChat, chatActual, SERVER_URL]);

  // ============================
  // 👤 Usuarios activos (socket)
  // ============================
  useEffect(() => {
    if (!socket || !user) return;
    
    // Usar nickname si existe, si no usar name
    const userDisplayName = user.nickname || user.name;
    if (!userDisplayName) return;

    const emitirLoginChat = () => {
      socket.emit("login_chat", {
        nickname: userDisplayName,
        photo: user.photoThumbnailUrl || user.photo || null,
      });
    };

    emitirLoginChat();
    socket.on("connect", () => {
      emitirLoginChat();
    });
    socket.on("disconnect", (_reason) => {});
    socket.on("connect_error", (_error) => {});
    const loginPulse = setInterval(() => {
      if (socket.connected) {
        emitirLoginChat();
      }
    }, 90000);

    const refreshEstadosUsuarios = async (force = false) => {
      const now = Date.now();
      if (!force && now - lastEstadosFetchAtRef.current < 45000) return;
      if (estadosFetchInFlightRef.current) return;
      estadosFetchInFlightRef.current = true;
      try {
        const estados = await authFetch(`${SERVER_URL}/api/chat/usuarios/estados`);
        setEstadosUsuarios(estados || {});
        lastEstadosFetchAtRef.current = Date.now();
      } catch (_) {
        /* noop */
      } finally {
        estadosFetchInFlightRef.current = false;
      }
    };

    const handleUsuarios = (lista) => {
      if (Array.isArray(lista) && lista.length > 0) {
        const estados = {};
        lista.forEach((u) => { if (u.nickname) estados[u.nickname] = u.status || "offline"; });
        setEstadosUsuarios(estados);
        lastEstadosFetchAtRef.current = Date.now();
        return;
      }
      refreshEstadosUsuarios(false);
    };

    const handleEstadosActualizados = () => {
      refreshEstadosUsuarios(false);
    };

    socket.on("usuarios_activos", handleUsuarios);
    socket.on("estados_actualizados", handleEstadosActualizados);

    // Emitir actividad del usuario al servidor (throttle: 1 vez por minuto)
    const emitirActividad = () => {
      const ahora = Date.now();
      if (ahora - lastActivityEmitRef.current > 60000) {
        lastActivityEmitRef.current = ahora;
        socket.emit("user_activity");
      }
    };
    document.addEventListener("mousemove", emitirActividad, { passive: true });
    document.addEventListener("keydown", emitirActividad, { passive: true });
    document.addEventListener("pointerdown", emitirActividad, { passive: true });

    // Cargar chats activos y mensajes de COPMEC cuando el usuario se loguea
    // Esto asegura que los mensajes de OTP aparezcan aunque no estuviera conectado cuando se enviaron
    const cargarChatsYOTP = async () => {
      // Evitar solicitudes duplicadas simultáneas
      if (cargandoChatsActivosRef.current) {
        return;
      }
      
      cargandoChatsActivosRef.current = true;
      
      try {
        const data = await authFetch(`${SERVER_URL}/api/chat/activos`);
        setChatsActivos(data || []);
        
        // Si hay un chat con COPMEC, cargar los mensajes automáticamente
        const chatCOPMEC = data?.find(c => c.otro_usuario === "COPMEC");
        if (chatCOPMEC) {
          try {
            const mensajesCOPMEC = await authFetch(`${SERVER_URL}/api/chat/privado/COPMEC`);
            const mensajesOrdenados = (mensajesCOPMEC || []).sort((a, b) => {
              const fechaA = new Date(a.fecha || 0);
              const fechaB = new Date(b.fecha || 0);
              return fechaA - fechaB;
            });
            setMensajesPrivado((prev) => ({
              ...prev,
              "COPMEC": mensajesOrdenados,
            }));
            
            // Si hay mensajes de COPMEC y el usuario es admin, mostrar notificación
            if (mensajesOrdenados.length > 0 && esAdmin) {
              const ultimoMensaje = mensajesOrdenados[mensajesOrdenados.length - 1];
              // Verificar si el mensaje es reciente (últimos 10 minutos) para evitar notificaciones de mensajes antiguos
              const fechaMensaje = new Date(ultimoMensaje.fecha || 0);
              const ahora = new Date();
              const minutosDiferencia = (ahora - fechaMensaje) / (1000 * 60);
              
              if (ultimoMensaje && ultimoMensaje.mensaje.includes("código de acceso") && minutosDiferencia < 10) {
                // Mostrar notificación del navegador
                if ("Notification" in window && Notification.permission === "granted") {
                  new Notification("📱 Mensaje de COPMEC", {
                    body: ultimoMensaje.mensaje || "Tienes un nuevo mensaje de COPMEC",
                    icon: "/android-chrome-192x192.png",
                    tag: "COPMEC-otp",
                    requireInteraction: false
                  });
                } else if ("Notification" in window && Notification.permission === "default") {
                  Notification.requestPermission().then((permission) => {
                    if (permission === "granted") {
                      new Notification("📱 Mensaje de COPMEC", {
                        body: ultimoMensaje.mensaje || "Tienes un nuevo mensaje de COPMEC",
                        icon: "/android-chrome-192x192.png",
                        tag: "COPMEC-otp"
                      });
                    }
                  });
                }
                
                // Incrementar contador de no leídos
                setNoLeidos((n) => n + 1);
              }
            }
          } catch (e) {
            // Si es 404, simplemente no hay mensajes aún (normal)
            if (e.status !== 404 && !e.isNotFound) {
              /* noop */
            }
          }
        }
      } catch (_e) {
        /* noop */
      } finally {
        cargandoChatsActivosRef.current = false;
      }
    };

    // Cargar después de un pequeño delay para asegurar que el socket esté completamente configurado
    setTimeout(cargarChatsYOTP, 1000);

    return () => {
      clearInterval(loginPulse);
      socket.off("connect", emitirLoginChat);
      socket.off("usuarios_activos", handleUsuarios);
      socket.off("estados_actualizados", handleEstadosActualizados);
      document.removeEventListener("mousemove", emitirActividad);
      document.removeEventListener("keydown", emitirActividad);
      document.removeEventListener("pointerdown", emitirActividad);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, user, esAdmin]);

  // ============================
  // 💬 Cargar mensajes generales
  // ============================
  useEffect(() => {
    if (!open || tipoChat !== "general") return;

    const cargarMensajes = async () => {
      try {
        const data = await authFetch(`${SERVER_URL}/api/chat/general`);
        // Simplemente establecer los mensajes del servidor (sin temporales)
        setMensajesGeneral((data || []).sort((a, b) => {
          const fechaA = new Date(a.fecha || 0);
          const fechaB = new Date(b.fecha || 0);
          return fechaA - fechaB;
        }));
      } catch (_e) {
        /* noop */
      }
    };

    cargarMensajes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tipoChat]);

  // ============================
  // 💬 Cargar mensajes privados
  // ============================
  useEffect(() => {
    if (!open || tipoChat !== "privado" || !chatActual) return;

    const cargarMensajes = async () => {
      try {
        const data = await authFetch(`/api/chat/privado/${chatActual}`);
        // Simplemente establecer los mensajes del servidor (sin temporales)
        const mensajesOrdenados = (data || []).sort((a, b) => {
          const fechaA = new Date(a.fecha || 0);
          const fechaB = new Date(b.fecha || 0);
          return fechaA - fechaB;
        });
        setMensajesPrivado((prev) => ({
          ...prev,
          [chatActual]: mensajesOrdenados,
        }));
        // Cargar lecturas
        const lecturas = {};
        mensajesOrdenados.forEach((m) => {
          if (m.fecha_leido_otro) {
            lecturas[String(m.id)] = m.fecha_leido_otro;
          }
        });
        if (Object.keys(lecturas).length > 0) {
          setLecturasPrivadas((prev) => ({ ...prev, ...lecturas }));
        }
      } catch (_e) {
        /* noop */
      }
    };

    cargarMensajes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tipoChat, chatActual]);

  // ============================
  // 💬 Cargar mensajes grupales
  // ============================
  useEffect(() => {
    if (!open || tipoChat !== "grupal" || !chatActual) {
      setUsuarioRestringido(false);
      setRestriccionInfo(null);
      return;
    }

    const cargarMensajes = async () => {
      try {
        const data = await authFetch(`/api/chat/grupos/${chatActual}/mensajes`);
        // Simplemente establecer los mensajes del servidor (sin temporales)
        const mensajesOrdenados = (data || []).sort((a, b) => {
          const fechaA = new Date(a.fecha || 0);
          const fechaB = new Date(b.fecha || 0);
          return fechaA - fechaB;
        });
        setMensajesGrupal((prev) => ({
          ...prev,
          [chatActual]: mensajesOrdenados,
        }));
        
        // Verificar si el usuario está restringido
        try {
          const perfil = await authFetch(`${SERVER_URL}/api/chat/grupos/${chatActual}/perfil`);
          const userDisplayName = user?.nickname || user?.name;
          const restriccionUsuario = perfil?.restricciones?.[userDisplayName];
          if (restriccionUsuario) {
            setUsuarioRestringido(true);
            setRestriccionInfo(restriccionUsuario);
          } else {
            setUsuarioRestringido(false);
            setRestriccionInfo(null);
          }
        } catch (_err) {
          // Si no se puede cargar el perfil, asumir que no está restringido
          setUsuarioRestringido(false);
          setRestriccionInfo(null);
        }
      } catch (_e) {
        /* noop */
      }
    };

    cargarMensajes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tipoChat, chatActual]);

  // ============================
  // 💬 Cargar chats activos (cuando el chat está abierto)
  // ============================
  useEffect(() => {
    if (!open) return;

    const cargarChatsActivos = async (force = false) => {
      // Evitar solicitudes duplicadas simultáneas
      if (cargandoChatsActivosRef.current && !force) {
        return;
      }
      
      cargandoChatsActivosRef.current = true;
      
      try {
        const data = await authFetch(`${SERVER_URL}/api/chat/activos`);
        setChatsActivos(data || []);
        
        // Si hay un chat con COPMEC, SIEMPRE cargar los mensajes automáticamente
        const chatCOPMEC = data?.find(c => c.otro_usuario === "COPMEC");
        if (chatCOPMEC) {
          try {
            const mensajesCOPMEC = await authFetch(`${SERVER_URL}/api/chat/privado/COPMEC`);
            const mensajesOrdenados = (mensajesCOPMEC || []).sort((a, b) => {
              const fechaA = new Date(a.fecha || 0);
              const fechaB = new Date(b.fecha || 0);
              return fechaA - fechaB;
            });
            setMensajesPrivado((prev) => ({
              ...prev,
              "COPMEC": mensajesOrdenados,
            }));
          } catch (e) {
            // Si es 404, simplemente no hay mensajes aún (normal)
            if (e.status !== 404 && !e.isNotFound) {
              /* noop */
            }
          }
        }
      } catch (_e) {
        /* noop */
      } finally {
        cargandoChatsActivosRef.current = false;
      }
    };

    // Cargar al abrir el chat
    cargarChatsActivos(true);
    
    // Recargar cada 30 segundos para actualizar contadores (reducido de 5 segundos)
    const interval = setInterval(() => cargarChatsActivos(false), 60000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ============================
  // 💬 Cargar grupos (todos; es_miembro por usuario)
  // ============================
  useEffect(() => {
    if (!open || tabPrincipal !== "grupos") return;

    const cargarGrupos = async () => {
      try {
        const data = await authFetch("/api/chat/grupos");
        setGrupos(data || []);
      } catch (_e) {
        /* noop */
      }
    };

    cargarGrupos();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tabPrincipal]);

  // 📞 Cargar historial de llamadas
  useEffect(() => {
    if (!open || tabPrincipal !== "historial") return;
    let cancelado = false;
    const cargarHistorial = async (mostrarLoader = false) => {
      if (mostrarLoader) setHistorialCargando(true);
      try {
        const data = await authFetch(`${SERVER_URL}/api/chat/calls/historial`);
        if (!cancelado) setHistorialLlamadas(Array.isArray(data) ? data : []);
      } catch (_) {
        if (!cancelado) setHistorialLlamadas([]);
      } finally {
        if (mostrarLoader && !cancelado) setHistorialCargando(false);
      }
    };

    cargarHistorial(true);
    const interval = setInterval(() => cargarHistorial(false), 45000);

    return () => {
      cancelado = true;
      clearInterval(interval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tabPrincipal, SERVER_URL]);

  useEffect(() => {
    if (!open) return;
    const cargarConfigNotificaciones = async () => {
      try {
        const config = await authFetch(`${SERVER_URL}/api/chat/notificaciones/config`);
        setConfigNotificaciones(config || null);
      } catch (_err) {
        /* noop */
      }
    };
    cargarConfigNotificaciones();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, SERVER_URL]);

  useEffect(() => {
    const handler = async () => {
      if (!SERVER_URL) return;
      try {
        const config = await authFetch(`${SERVER_URL}/api/chat/notificaciones/config`);
        setConfigNotificaciones(config || null);
      } catch (_) { /* noop */ }
    };
    window.addEventListener("config-notificaciones-guardada", handler);
    return () => window.removeEventListener("config-notificaciones-guardada", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [SERVER_URL]);

  useEffect(() => {
    if (!open) return;
    const cargarRtcConfig = async () => {
      try {
        const data = await authFetch(`${SERVER_URL}/api/chat/rtc-config`);
        if (data?.iceServers?.length) {
          setRtcConfig(data);
        } else {
          setRtcConfig({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
        }
      } catch (_err) {
        setRtcConfig({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      }
    };
    cargarRtcConfig();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, SERVER_URL]);

  // Redirigir al chat del grupo y mostrar modal de solicitud (desde notificación)
  useEffect(() => {
    if (!open || !solicitudPending?.grupoId) return;
    abrirChat("grupal", solicitudPending.grupoId);
    setModalSolicitud({
      solicitudId: solicitudPending.solicitudId,
      grupoId: solicitudPending.grupoId,
      usuario_nickname: solicitudPending.solicitanteNickname,
      fecha: solicitudPending.fecha,
      groupName: solicitudPending.groupName,
    });
    onSolicitudConsumida?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, solicitudPending?.grupoId]);

  // Manejar apertura de mensaje prioritario desde notificación
  useEffect(() => {
    
    if (!open || !mensajePrioritarioPending) {
      return;
    }
    
    const { chatType, chatTarget, mensaje_id } = mensajePrioritarioPending;
    
    // Crear una clave única para este mensaje prioritario
    const mensajeKey = `${chatType}-${chatTarget}-${mensaje_id}`;
    
    
    // Si ya procesamos este mensaje, no hacer nada
    if (mensajePrioritarioProcessedRef.current === mensajeKey) {
      return;
    }
    
    
    // Marcar como procesado INMEDIATAMENTE para evitar re-ejecuciones
    mensajePrioritarioProcessedRef.current = mensajeKey;
    
    // Abrir el chat correspondiente
    abrirChat(chatType, chatType === "general" ? null : chatTarget);
    
    // Programar scroll después de un pequeño delay para que el chat se abra primero
    const scrollTimeout = setTimeout(() => {
      const el = document.getElementById(`msg-${mensaje_id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setMensajeResaltadoId(mensaje_id);
        
        // Consumir la notificación después de un delay
        const consumeTimeout = setTimeout(() => {
          setMensajeResaltadoId(null);
          onMensajePrioritarioConsumido?.();
          mensajePrioritarioProcessedRef.current = null; // Resetear para permitir procesar otro mensaje
        }, 3500);
        
        return () => clearTimeout(consumeTimeout);
      } else {
        /* noop */
      }
    }, 500);
    
    return () => {
      clearTimeout(scrollTimeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mensajePrioritarioPending]); // SOLO estas dos dependencias

  // Limpiar modal al salir del grupo
  useEffect(() => {
    if (tipoChat !== "grupal" || !chatActual) {
      setModalSolicitud(null);
      setSolicitudesPendientes([]);
    }
  }, [tipoChat, chatActual]);

  // Ocultar el form de crear grupo al cambiar de tab
  useEffect(() => {
    setMostrarCrearGrupo(false);
  }, [tabPrincipal]);

  // Cargar solicitudes pendientes al abrir un grupo (solo admins)
  useEffect(() => {
    if (!open || !SERVER_URL || tipoChat !== "grupal" || !chatActual) return;
    const cargar = async () => {
      try {
        const list = await authFetch(`${SERVER_URL}/api/chat/grupos/${chatActual}/solicitudes`);
        const arr = Array.isArray(list) ? list : [];
        setSolicitudesPendientes(arr);
        if (arr.length > 0) {
          const s = arr[0];
          setModalSolicitud({
            solicitudId: s.id,
            grupoId: s.grupo_id,
            usuario_nickname: s.usuario_nickname,
            fecha: s.fecha,
            groupName: "Grupo",
          });
        } else {
          setModalSolicitud(null);
        }
      } catch {
        setSolicitudesPendientes([]);
        setModalSolicitud(null);
      }
    };
    cargar();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, SERVER_URL, tipoChat, chatActual]);

  // ============================
  // 📨 Recibir mensajes (socket)
  // ============================
  useEffect(() => {
    if (!socket) return;
    
    // Obtener el nombre de usuario una vez al inicio
    const userDisplayName = user?.nickname || user?.name;

    // Handler para actualizar chats activos cuando hay cambios (definir primero)
    const handleChatsActivosActualizados = async () => {
      // Evitar solicitudes duplicadas simultáneas
      if (cargandoChatsActivosRef.current) {
        return;
      }
      
      cargandoChatsActivosRef.current = true;
      
      try {
        const data = await authFetch(`${SERVER_URL}/api/chat/activos`);
        setChatsActivos(data || []);
        
        // Si hay un mensaje de COPMEC y el chat está abierto y estamos viendo COPMEC, 
        // recargar los mensajes para asegurar que se muestren todos
        const chatCOPMEC = data?.find(c => c.otro_usuario === "COPMEC");
        if (chatCOPMEC && open && tipoChat === "privado" && chatActual === "COPMEC") {
          try {
            const mensajesCOPMEC = await authFetch(`${SERVER_URL}/api/chat/privado/COPMEC`);
            const mensajesOrdenados = (mensajesCOPMEC || []).sort((a, b) => {
              const fechaA = new Date(a.fecha || 0);
              const fechaB = new Date(b.fecha || 0);
              return fechaA - fechaB;
            });
            setMensajesPrivado((prev) => ({
              ...prev,
              "COPMEC": mensajesOrdenados,
            }));
          } catch (_e) {
            /* noop */
          }
        }
      } catch (_e) {
        /* noop */
      } finally {
        cargandoChatsActivosRef.current = false;
      }
    };

    // Mensaje general
    const handleGeneral = (mensaje) => {
      setMensajesGeneral((prev) => {
        // Evitar duplicados: verificar si el mensaje ya existe por ID
        const existe = prev.some((m) => m.id === mensaje.id);
        if (existe) {
          return prev;
        }
        
        // Verificar si es un mensaje nuestro (optimistic update) que debemos reemplazar
        const esNuestroMensaje = mensaje.usuario_nickname === userDisplayName;
        
        // Si es nuestro mensaje, simplemente agregarlo (ya no hay temporales)
        if (esNuestroMensaje) {
          return [...prev, mensaje].sort((a, b) => {
            const fechaA = new Date(a.fecha || 0).getTime();
            const fechaB = new Date(b.fecha || 0).getTime();
            return fechaA - fechaB;
          });
        }
        
        // Si no es nuestro mensaje, simplemente agregarlo
        return [...prev, mensaje];
      });
      const esNuestroMensaje = mensaje.usuario_nickname === userDisplayName;
      if (!esNuestroMensaje) {
        setNoLeidos((n) => n + 1);
        playIncomingMessageSound();
      }
    };

    // Mensaje privado
    const handlePrivado = (mensaje) => {
      const esMioPorNickname = isSameNickname(mensaje.de_nickname, userDisplayName);
      const otroUsuario = esMioPorNickname ? mensaje.para_nickname : mensaje.de_nickname;

      setMensajesPrivado((prev) => {
        const mensajesExistentes = prev[otroUsuario] || [];
        
        // Evitar duplicados: verificar si el mensaje ya existe por ID
        if (mensajesExistentes.some((m) => m.id === mensaje.id)) {
          return prev;
        }
        
        // Verificar si es un mensaje nuestro (optimistic update) que debemos reemplazar
        const esNuestroMensaje = isSameNickname(mensaje.de_nickname, userDisplayName);
        
        // Si es nuestro mensaje, simplemente agregarlo (ya no hay temporales)
        if (esNuestroMensaje) {
          return {
            ...prev,
            [otroUsuario]: [...mensajesExistentes, mensaje].sort((a, b) => {
              const fechaA = new Date(a.fecha || 0).getTime();
              const fechaB = new Date(b.fecha || 0).getTime();
              return fechaA - fechaB;
            }),
          };
        }
        
        // Si no es nuestro mensaje, simplemente agregarlo
        const nuevos = [...mensajesExistentes, mensaje].sort((a, b) => {
          const fechaA = new Date(a.fecha || 0).getTime();
          const fechaB = new Date(b.fecha || 0).getTime();
          return fechaA - fechaB;
        });
        return {
          ...prev,
          [otroUsuario]: nuevos,
        };
      });

      // Si es un mensaje de COPMEC, SIEMPRE recargar chats activos y cambiar a pestaña "chats"
      if (mensaje.de_nickname === "COPMEC") {
        // Recargar chats activos para asegurar que COPMEC aparezca en la lista
        if (!cargandoChatsActivosRef.current) {
          cargandoChatsActivosRef.current = true;
          authFetch(`${SERVER_URL}/api/chat/activos`)
            .then((data) => {
              setChatsActivos(data || []);
            })
            .catch((_e) => {
            })
            .finally(() => {
              cargandoChatsActivosRef.current = false;
            });
        }
        
        // Si el chat está abierto pero no estamos en el chat con COPMEC, cambiar a ese chat
        if (open && chatActual !== "COPMEC") {
          setTabPrincipal("chats");
          setTipoChat("privado");
          setChatActual("COPMEC");
        } else if (!open) {
          // Si el chat no está abierto, cambiar a pestaña chats cuando se abra
          setTabPrincipal("chats");
        }
        
        // SIEMPRE mostrar notificación para mensajes de COPMEC (todos los usuarios)
        // Mostrar notificación del navegador si está disponible
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("📱 Mensaje de COPMEC", {
            body: mensaje.mensaje || "Tienes un nuevo mensaje de COPMEC",
            icon: "/android-chrome-192x192.png",
            tag: "COPMEC-otp",
            requireInteraction: false
          });
        } else if ("Notification" in window && Notification.permission === "default") {
          // Solicitar permiso para notificaciones
          Notification.requestPermission().then((permission) => {
            if (permission === "granted") {
              new Notification("📱 Mensaje de COPMEC", {
                body: mensaje.mensaje || "Tienes un nuevo mensaje de COPMEC",
                icon: "/android-chrome-192x192.png",
                tag: "COPMEC-otp"
              });
            }
          });
        }
        
        // Incrementar contador de no leídos si el chat no está abierto o no estamos viendo COPMEC
        if (!open || chatActual !== "COPMEC") {
          setNoLeidos((n) => n + 1);
        }
      }

      // Actualizar chats activos
      setChatsActivos((prev) => {
        const existe = prev.some((c) => c.otro_usuario === otroUsuario);
        const esMioMensaje = isSameNickname(mensaje.de_nickname, userDisplayName);
        // Mensaje a uno mismo: siempre ya leído, independientemente de userDisplayName
        const esSelfMessage = isSameNickname(mensaje.de_nickname, mensaje.para_nickname);
        const viendoEsteEnLista = open && tipoChat === "privado" && isSameNickname(chatActual, otroUsuario);
        // Si es mensaje de COPMEC para admin, siempre contar como no leído hasta que se abra
        const esMensajeCOPMECAdmin = mensaje.de_nickname === "COPMEC" && esAdmin && mensaje.es_admin;
        
        if (existe) {
          return prev.map((c) => {
            if (c.otro_usuario === otroUsuario) {
              // Si estás viendo este chat, limpiar contador a 0 (excepto si es COPMEC para admin)
              // Si es tu mensaje o mensaje a ti mismo, también poner a 0
              const nuevosNoLeidos = (viendoEsteEnLista && !esMensajeCOPMECAdmin) || (esMioMensaje && !esMensajeCOPMECAdmin) || esSelfMessage
                ? 0
                : (c.mensajes_no_leidos || 0) + 1;
              return {
                ...c,
                ultimo_mensaje: mensaje.mensaje,
                ultima_fecha: mensaje.fecha,
                ultimo_remitente: mensaje.de_nickname,
                mensajes_no_leidos: nuevosNoLeidos,
              };
            }
            return c;
          });
        }
        // Si no existe el chat en la lista, agregarlo
        return [
          {
            otro_usuario: otroUsuario,
            ultimo_mensaje: mensaje.mensaje,
            ultima_fecha: mensaje.fecha,
            ultimo_remitente: mensaje.de_nickname,
            mensajes_no_leidos: (viendoEsteEnLista && !esMensajeCOPMECAdmin) || (esMioMensaje && !esMensajeCOPMECAdmin) || esSelfMessage ? 0 : 1,
          },
          ...prev,
        ];
      });

      const viendoEste = open && tipoChat === "privado" && isSameNickname(chatActual, otroUsuario);
      // Solo reproducir sonido e incrementar contador si NO estás viendo el chat
      // Y si es mensaje de COPMEC para admin, siempre notificar
      const esMensajeCOPMECAdmin = mensaje.de_nickname === "COPMEC" && esAdmin && mensaje.es_admin;
      // Mensaje a uno mismo: nunca notificar
      const esSelfMessageOuter = isSameNickname(mensaje.de_nickname, mensaje.para_nickname);
      
      // Si estás viendo este chat, marcar el mensaje como leído inmediatamente en el servidor
      if (viendoEste && !esMensajeCOPMECAdmin) {
        setChatsActivos((prev) =>
          prev.map((c) =>
            isSameNickname(c.otro_usuario, otroUsuario)
              ? { ...c, mensajes_no_leidos: 0 }
              : c
          )
        );
        authFetch(`${SERVER_URL}/api/chat/privado/${otroUsuario}/leer`, {
          method: "POST",
        }).catch((_e) => {
        });
      }
      
      if (!esSelfMessageOuter && !esMioPorNickname && (!viendoEste || esMensajeCOPMECAdmin)) {
        if (esMensajeCOPMECAdmin || !viendoEste) {
          setNoLeidos((n) => n + 1);
          playIncomingMessageSound();
        }
      }
    };

    // Mensaje grupal
    const handleGrupal = (mensaje) => {
      setMensajesGrupal((prev) => {
        const mensajesExistentes = prev[mensaje.grupo_id] || [];
        
        // Evitar duplicados: verificar si el mensaje ya existe por ID
        const existe = mensajesExistentes.some((m) => m.id === mensaje.id);
        if (existe) {
          return prev;
        }
        
        // Verificar si es un mensaje nuestro (optimistic update) que debemos reemplazar
        const esNuestroMensaje = mensaje.usuario_nickname === userDisplayName;
        
        // Si es nuestro mensaje, simplemente agregarlo (ya no hay temporales)
        if (esNuestroMensaje) {
          return {
            ...prev,
            [mensaje.grupo_id]: [...mensajesExistentes, mensaje].sort((a, b) => {
              const fechaA = new Date(a.fecha || 0).getTime();
              const fechaB = new Date(b.fecha || 0).getTime();
              return fechaA - fechaB;
            }),
          };
        }
        
        // Si no es nuestro mensaje, simplemente agregarlo
        const nuevos = [...mensajesExistentes, mensaje].sort((a, b) => {
          const fechaA = new Date(a.fecha || 0).getTime();
          const fechaB = new Date(b.fecha || 0).getTime();
          return fechaA - fechaB;
        });
        return {
          ...prev,
          [mensaje.grupo_id]: nuevos,
        };
      });

      const _viendoEste = open && tipoChat === "grupal" && chatActual === String(mensaje.grupo_id);
      const esNuestroMensaje = mensaje.usuario_nickname === userDisplayName;
      if (!esNuestroMensaje) {
        setNoLeidos((n) => n + 1);
        playIncomingMessageSound();
      }
    };

    // Actualizar grupos cuando se crea uno nuevo
    const handleGrupoCreado = async (_grupo) => {
      // Recargar grupos
      try {
        const data = await authFetch("/api/chat/grupos");
        setGrupos(data || []);
      } catch (_e) {
        /* noop */
      }
    };

    const handleGrupoSolicitudNueva = async (payload) => {
      if (!payload?.grupo_id || tipoChat !== "grupal" || String(chatActual) !== String(payload.grupo_id)) return;
      try {
        const list = await authFetch(`${SERVER_URL}/api/chat/grupos/${chatActual}/solicitudes`);
        const arr = Array.isArray(list) ? list : [];
        setSolicitudesPendientes(arr);
        if (arr.length > 0) {
          const s = arr[0];
          setModalSolicitud({
            solicitudId: s.id,
            grupoId: s.grupo_id,
            usuario_nickname: s.usuario_nickname,
            fecha: s.fecha,
            groupName: "Grupo",
          });
        } else {
          setModalSolicitud(null);
        }
      } catch {
        /* ignorar */
      }
    };

    const handleGrupoSolicitudRespondida = async (payload) => {
      if (!payload?.grupo_id || tipoChat !== "grupal" || String(chatActual) !== String(payload.grupo_id)) return;
      try {
        const list = await authFetch(`${SERVER_URL}/api/chat/grupos/${chatActual}/solicitudes`);
        const arr = Array.isArray(list) ? list : [];
        setSolicitudesPendientes(arr);
        if (arr.length > 0) {
          const s = arr[0];
          setModalSolicitud({
            solicitudId: s.id,
            grupoId: s.grupo_id,
            usuario_nickname: s.usuario_nickname,
            fecha: s.fecha,
            groupName: "Grupo",
          });
        } else {
          setModalSolicitud(null);
        }
        const data = await authFetch("/api/chat/grupos");
        setGrupos(data || []);
      } catch {
        /* ignorar */
      }
    };

    const handleGeneralBorrado = (payload) => {
      if (!payload?.id) return;
      setMensajesGeneral((prev) => prev.filter((m) => m.id !== payload.id));
    };

    const handlePrivadoBorrado = (payload) => {
      if (!payload?.id) return;
      const userDisplayName = user?.nickname || user?.name;
      const otroUsuario =
        payload.de_nickname === userDisplayName ? payload.para_nickname : payload.de_nickname;
      if (!otroUsuario) return;
      setMensajesPrivado((prev) => ({
        ...prev,
        [otroUsuario]: (prev[otroUsuario] || []).filter((m) => m.id !== payload.id),
      }));
    };

    const handleGrupalBorrado = (payload) => {
      if (!payload?.id || !payload?.grupo_id) return;
      const grupoId = String(payload.grupo_id);
      setMensajesGrupal((prev) => ({
        ...prev,
        [grupoId]: (prev[grupoId] || []).filter((m) => m.id !== payload.id),
      }));
    };

    const handleGeneralActualizado = (mensaje) => {
      if (!mensaje?.id) return;
      setMensajesGeneral((prev) => {
        const existe = prev.some((m) => m.id === mensaje.id);
        if (existe) {
          return prev.map((m) => (m.id === mensaje.id ? { ...m, ...mensaje } : m));
        } else {
          // Si no existe, agregarlo (por si acaso)
          return [...prev, mensaje].sort((a, b) => {
            const fechaA = new Date(a.fecha || 0).getTime();
            const fechaB = new Date(b.fecha || 0).getTime();
            return fechaA - fechaB;
          });
        }
      });
      
    };

    const handlePrivadoActualizado = (mensaje) => {
      if (!mensaje?.id) return;
      const userDisplayName = user?.nickname || user?.name;
      const otroUsuario =
        mensaje.de_nickname === userDisplayName
          ? mensaje.para_nickname
          : mensaje.de_nickname;
      if (!otroUsuario) return;
      setMensajesPrivado((prev) => {
        const mensajesChat = prev[otroUsuario] || [];
        const existe = mensajesChat.some((m) => m.id === mensaje.id);
        if (existe) {
          return {
            ...prev,
            [otroUsuario]: mensajesChat.map((m) =>
              m.id === mensaje.id ? { ...m, ...mensaje } : m
            ),
          };
        } else {
          return {
            ...prev,
            [otroUsuario]: [...mensajesChat, mensaje].sort((a, b) => {
              const fechaA = new Date(a.fecha || 0).getTime();
              const fechaB = new Date(b.fecha || 0).getTime();
              return fechaA - fechaB;
            }),
          };
        }
      });
      
    };

    const handleGrupalActualizado = (mensaje) => {
      if (!mensaje?.id || !mensaje?.grupo_id) return;
      const grupoId = String(mensaje.grupo_id);
      setMensajesGrupal((prev) => {
        const mensajesGrupo = prev[grupoId] || [];
        const existe = mensajesGrupo.some((m) => m.id === mensaje.id);
        if (existe) {
          return {
            ...prev,
            [grupoId]: mensajesGrupo.map((m) =>
              m.id === mensaje.id ? { ...m, ...mensaje } : m
            ),
          };
        } else {
          return {
            ...prev,
            [grupoId]: [...mensajesGrupo, mensaje].sort((a, b) => {
              const fechaA = new Date(a.fecha || 0).getTime();
              const fechaB = new Date(b.fecha || 0).getTime();
              return fechaA - fechaB;
            }),
          };
        }
      });
      
    };

    const handlePrivadoLeidos = (payload) => {
      if (!payload?.mensajes || !Array.isArray(payload.mensajes)) return;
      const userDisplayName = user?.nickname || user?.name;
      // Aceptar si somos el remitente (de_nickname) o si es un auto-mensaje (de === para)
      const esSelfMsg = payload.de_nickname === payload.para_nickname;
      if (payload.de_nickname !== userDisplayName && !esSelfMsg) return;
      setLecturasPrivadas((prev) => {
        const next = { ...prev };
        payload.mensajes.forEach((m) => {
          if (!m?.mensaje_id) return;
          next[String(m.mensaje_id)] = m.fecha_leido || true;
        });
        return next;
      });
    };

    const handleChatTyping = (payload) => {
      const yo = normalizeUserKey(user?.nickname || user?.name);
      const para = normalizeUserKey(payload?.para_nickname);
      const de = normalizeUserKey(payload?.de_nickname);
      if (!de || !para || para !== yo || de === yo) return;
      marcarEscritura(payload.de_nickname, !!payload?.typing);
    };

    socket.on("chat_general_nuevo", handleGeneral);
    socket.on("chat_privado_nuevo", handlePrivado);
    socket.on("chat_grupal_nuevo", handleGrupal);
    socket.on("chat_grupo_creado", handleGrupoCreado);
    socket.on("chat_grupo_solicitud_nueva", handleGrupoSolicitudNueva);
    socket.on("chat_grupo_solicitud_respondida", handleGrupoSolicitudRespondida);
    socket.on("chats_activos_actualizados", handleChatsActivosActualizados);
    socket.on("chat_general_borrado", handleGeneralBorrado);
    socket.on("chat_privado_borrado", handlePrivadoBorrado);
    socket.on("chat_grupal_borrado", handleGrupalBorrado);
    socket.on("chat_privado_leidos", handlePrivadoLeidos);
    socket.on("chat_general_actualizado", handleGeneralActualizado);
    socket.on("chat_privado_actualizado", handlePrivadoActualizado);
    socket.on("chat_grupal_actualizado", handleGrupalActualizado);
    socket.on("chat_general_editado", handleGeneralActualizado);
    socket.on("chat_privado_editado", handlePrivadoActualizado);
    socket.on("chat_grupal_editado", handleGrupalActualizado);
    socket.on("chat_typing", handleChatTyping);

    return () => {
      socket.off("chat_general_nuevo", handleGeneral);
      socket.off("chat_privado_nuevo", handlePrivado);
      socket.off("chat_grupal_nuevo", handleGrupal);
      socket.off("chat_grupo_creado", handleGrupoCreado);
      socket.off("chat_grupo_solicitud_nueva", handleGrupoSolicitudNueva);
      socket.off("chat_grupo_solicitud_respondida", handleGrupoSolicitudRespondida);
      socket.off("chats_activos_actualizados", handleChatsActivosActualizados);
      socket.off("chat_general_borrado", handleGeneralBorrado);
      socket.off("chat_privado_borrado", handlePrivadoBorrado);
      socket.off("chat_grupal_borrado", handleGrupalBorrado);
      socket.off("chat_privado_leidos", handlePrivadoLeidos);
      socket.off("chat_general_actualizado", handleGeneralActualizado);
      socket.off("chat_privado_actualizado", handlePrivadoActualizado);
      socket.off("chat_grupal_actualizado", handleGrupalActualizado);
      socket.off("chat_general_editado", handleGeneralActualizado);
      socket.off("chat_privado_editado", handlePrivadoActualizado);
      socket.off("chat_grupal_editado", handleGrupalActualizado);
      socket.off("chat_typing", handleChatTyping);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, open, tipoChat, chatActual, tabPrincipal, user, SERVER_URL, esAdmin, configNotificaciones, audioSettings.msgSound, audioSettings.msgVolume]);

  useEffect(() => {
    if (!socket) return;
    const userDisplayName = user?.nickname || user?.name || "usuario";

    const handleInvite = (payload) => {
      if (!payload?.room) return;
      if (callActivo && callRoomRef.current === payload.room) return;
      if (isDuplicateInvite(payload.room)) return;
      pendingInviteTransportRef.current = "socket";

      console.log('[INVITE] Llamada entrante de', payload.fromNickname);
      
      // Si el chat no está abierto, abrirlo para mostrar el modal en móvil
      if (!open) {
        console.log('[INVITE] Chat cerrado, abriendo para mostrar modal');
        setOpen(true);
      }
      
      playIncomingCallTone();
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 200]); // Vibración de llamada
      }

      showIncomingCallNotification(payload.room, payload.fromNickname || "Usuario");

      // Precargar stream para aceptación más rápida
      asegurarLocalStream().catch(() => {});

      setCallIncoming({
        room: payload.room,
        fromNickname: payload.fromNickname || "Usuario",
        fromSocketId: payload.fromSocketId || null,
      });
      console.log('[INVITE] Modal de invitación mostrado');
    };

    const handleUsers = (payload) => {
      if (callTransportRef.current && callTransportRef.current !== "socket") return;
      if (!payload?.room || callRoomRef.current !== payload.room) return;
      if (Array.isArray(payload.users)) {
        payload.users.forEach((u) => {
          if (u.socketId && u.socketId !== socket.id) {
            if (!peerConnectionsRef.current[u.socketId]) {
              peerConnectionsRef.current[u.socketId] = { pc: null, nickname: u.nickname || "Usuario" };
            } else if (u.nickname) {
              peerConnectionsRef.current[u.socketId].nickname = u.nickname;
            }
          }
        });
      }
    };

    const handleUserJoined = async (payload) => {
      if (callTransportRef.current && callTransportRef.current !== "socket") return;
      if (!payload?.room || callRoomRef.current !== payload.room) return;
      if (!callActivo || payload.socketId === socket.id) return;
      if (outgoingCallTimeoutRef.current) {
        clearTimeout(outgoingCallTimeoutRef.current);
        outgoingCallTimeoutRef.current = null;
      }
      // Parar ring saliente cuando alguien contesta
      if (outgoingRingRef.current) {
        clearInterval(outgoingRingRef.current);
        outgoingRingRef.current = null;
      }
      playCallSound("accept");
      showAlert(`${payload.nickname || "Usuario"} aceptó la videollamada.`, "success");
      const pc = crearPeerConnection(payload.socketId, payload.nickname || "Usuario");
      console.log('[PC] Creando offer para', payload.socketId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log('[PC] Offer creado y local description seteada');
      socket.emit("call_offer", {
        to: payload.socketId,
        room: payload.room,
        sdp: offer,
        nickname: userDisplayName,
      });
    };

    const handleOffer = async (payload) => {
      if (callTransportRef.current && callTransportRef.current !== "socket") return;
      if (!payload?.room || callRoomRef.current !== payload.room) return;
      if (!callActivo) return;
      const pc = crearPeerConnection(payload.from, payload.nickname || "Usuario");
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      console.log('[PC] Creando answer para', payload.from);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log('[PC] Answer creado y local description seteada');
      socket.emit("call_answer", { to: payload.from, room: payload.room, sdp: answer });
    };

    const handleAnswer = async (payload) => {
      if (callTransportRef.current && callTransportRef.current !== "socket") return;
      if (!payload?.room || callRoomRef.current !== payload.room) return;
      const pc = peerConnectionsRef.current[payload.from]?.pc;
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    };

    const handleIce = async (payload) => {
      if (callTransportRef.current && callTransportRef.current !== "socket") return;
      if (!payload?.room || callRoomRef.current !== payload.room) return;
      const candidate = new RTCIceCandidate(payload.candidate);
      const pc = peerConnectionsRef.current[payload.from]?.pc;
      if (pc && pc.remoteDescription) {
        await pc.addIceCandidate(candidate).catch(() => {});
      } else {
        if (!pendingCandidatesRef.current[payload.from]) {
          pendingCandidatesRef.current[payload.from] = [];
        }
        pendingCandidatesRef.current[payload.from].push(candidate);
      }
    };

    const handleUserLeft = (payload) => {
      if (callTransportRef.current && callTransportRef.current !== "socket") return;
      if (!payload?.room || callRoomRef.current !== payload.room) return;
      if (payload.socketId) limpiarPeer(payload.socketId);
      const remainingPeers = Object.keys(peerConnectionsRef.current).filter((id) => peerConnectionsRef.current[id]?.pc);
      if (remainingPeers.length === 0 && callActivo) {
        playCallSound("hangup");
        limpiarLlamada();
      }
    };

    const handleCallRejected = (payload) => {
      if (callTransportRef.current && callTransportRef.current !== "socket") return;
      if (!payload?.room || callRoomRef.current !== payload.room) return;
      if (outgoingCallTimeoutRef.current) {
        clearTimeout(outgoingCallTimeoutRef.current);
        outgoingCallTimeoutRef.current = null;
      }
      playCallSound("reject");
      showAlert(`${payload.nickname || "Usuario"} rechazó la videollamada.`, "warning");
      if (outgoingRingRef.current) {
        clearInterval(outgoingRingRef.current);
        outgoingRingRef.current = null;
      }
      if (socket) socket.emit("set_in_call", { inCall: false });
    };

    const handleCallInviteStatus = (payload) => {
      if (!payload?.room || callRoomRef.current !== payload.room) return;
      const delivered = Number(payload.delivered || 0);
      const reached = Array.isArray(payload.reachedNicknames) ? payload.reachedNicknames.length : 0;
      console.log("📱 Call status:", { delivered, reached, requested: payload.requestedNicknames });
      if (delivered > 0) {
        showAlert(`✓ Invitación enviada a ${reached} dispositivo(s)`, "success");
        return;
      }
      playCallSound("hangup");
      if (outgoingRingRef.current) {
        clearInterval(outgoingRingRef.current);
        outgoingRingRef.current = null;
      }
      const targets = Array.isArray(payload.requestedNicknames) ? payload.requestedNicknames.join(", ") : "usuario";
      showAlert(`❌ No se pudo entregar la llamada a ${targets}. Verifica que esté conectado al chat.`, "warning");
    };

    // Cancelación: cuando alguien acepta en otro dispositivo
    const handleCallCancelled = (payload) => {
      console.log('[CALL-CANCELLED] Invitación cancelada:', payload?.reason);
      if (payload?.reason === "accepted_on_another_device") {
        setCallIncoming(null);
        if (outgoingRingRef.current) {
          clearInterval(outgoingRingRef.current);
          outgoingRingRef.current = null;
        }
      }
    };

    socket.on("call_invite", handleInvite);
    socket.on("call_users", handleUsers);
    socket.on("call_user_joined", handleUserJoined);
    socket.on("call_offer", handleOffer);
    socket.on("call_answer", handleAnswer);
    socket.on("call_ice", handleIce);
    socket.on("call_user_left", handleUserLeft);
    socket.on("call_rejected", handleCallRejected);
    socket.on("call_invite_status", handleCallInviteStatus);
    socket.on("call_cancelled", handleCallCancelled);

    return () => {
      socket.off("call_invite", handleInvite);
      socket.off("call_users", handleUsers);
      socket.off("call_user_joined", handleUserJoined);
      socket.off("call_offer", handleOffer);
      socket.off("call_answer", handleAnswer);
      socket.off("call_ice", handleIce);
      socket.off("call_user_left", handleUserLeft);
      socket.off("call_rejected", handleCallRejected);
      socket.off("call_invite_status", handleCallInviteStatus);
      socket.off("call_cancelled", handleCallCancelled);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, user, callActivo, audioSettings.callIncomingSound, audioSettings.callOutgoingSound, audioSettings.callVolume]);

  useEffect(() => {
    const userDisplayName = user?.nickname || user?.name;
    if (!userDisplayName) return undefined;

    const handleRestSignal = async (payload) => {
      if (!payload?.type || !payload?.room) return;
      console.log('[REST-SIGNAL] Tipo:', payload.type, 'Room:', payload.room);

      if (payload.type === "invite") {
        if (callActivo && callRoomRef.current === payload.room) {
          console.log('[REST-SIGNAL] Invitación descartada - ya en llamada');
          return;
        }
        if (isDuplicateInvite(payload.room)) {
          console.log('[REST-SIGNAL] Invitación duplicada');
          return;
        }
        pendingInviteTransportRef.current = "rest";
        console.log('[REST-SIGNAL] 🟡 Invitación por REST de', payload.fromNickname);

        playIncomingCallTone();
        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200, 100, 200]); // Vibración de llamada
        }

        showIncomingCallNotification(payload.room, payload.fromNickname || "Usuario");

        // Precargar stream para aceptación más rápida
        asegurarLocalStream().catch(() => {});

        setCallIncoming({
          room: payload.room,
          fromNickname: payload.fromNickname || "Usuario",
          fromSocketId: payload.from || buildRestPeerId(payload.fromNickname || "usuario"),
        });
        return;
      }

      if (callRoomRef.current !== payload.room) return;
      if (callTransportRef.current && callTransportRef.current !== "rest") return;

      if (payload.type === "join") {
        if (!callActivo || !payload.from) return;
        if (peerConnectionsRef.current[payload.from]?.pc) return;
        if (outgoingCallTimeoutRef.current) {
          clearTimeout(outgoingCallTimeoutRef.current);
          outgoingCallTimeoutRef.current = null;
        }
        if (outgoingRingRef.current) {
          clearInterval(outgoingRingRef.current);
          outgoingRingRef.current = null;
        }
        playCallSound("accept");
        showAlert(`${payload.nickname || payload.fromNickname || "Usuario"} aceptó la videollamada.`, "success");
        const pc = crearPeerConnection(payload.from, payload.nickname || payload.fromNickname || "Usuario");
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendCallSignalFallback({
          type: "offer",
          room: payload.room,
          toNicknames: [payload.nickname || payload.fromNickname].filter(Boolean),
          sdp: offer,
          nickname: userDisplayName,
          fromPeerId: buildRestPeerId(userDisplayName),
        }).catch(() => {});
        return;
      }

      if (payload.type === "offer") {
        if (!callActivo) return;
        const pc = crearPeerConnection(payload.from, payload.nickname || payload.fromNickname || "Usuario");
        if (pc.remoteDescription) return;
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendCallSignalFallback({
          type: "answer",
          room: payload.room,
          toNicknames: [payload.nickname || payload.fromNickname].filter(Boolean),
          sdp: answer,
          nickname: userDisplayName,
          fromPeerId: buildRestPeerId(userDisplayName),
        }).catch(() => {});
        return;
      }

      if (payload.type === "answer") {
        const pc = peerConnectionsRef.current[payload.from]?.pc;
        if (!pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        return;
      }

      if (payload.type === "ice") {
        const candidate = new RTCIceCandidate(payload.candidate);
        const pc = peerConnectionsRef.current[payload.from]?.pc;
        if (pc && pc.remoteDescription) {
          await pc.addIceCandidate(candidate).catch(() => {});
        } else {
          if (!pendingCandidatesRef.current[payload.from]) {
            pendingCandidatesRef.current[payload.from] = [];
          }
          pendingCandidatesRef.current[payload.from].push(candidate);
        }
        return;
      }

      if (payload.type === "reject") {
        if (outgoingCallTimeoutRef.current) {
          clearTimeout(outgoingCallTimeoutRef.current);
          outgoingCallTimeoutRef.current = null;
        }
        playCallSound("reject");
        showAlert(`${payload.nickname || payload.fromNickname || "Usuario"} rechazó la videollamada.`, "warning");
        if (outgoingRingRef.current) {
          clearInterval(outgoingRingRef.current);
          outgoingRingRef.current = null;
        }
        return;
      }

      if (payload.type === "leave" && payload.from) {
        limpiarPeer(payload.from);
        const remainingPeers = Object.keys(peerConnectionsRef.current).filter((id) => peerConnectionsRef.current[id]?.pc);
        if (remainingPeers.length === 0 && callActivo) {
          playCallSound("hangup");
          limpiarLlamada();
        }
      }
    };

    const pollSignals = async () => {
      if (Date.now() < callSignalPollPausedUntilRef.current) return;
      if (isChatBackendPaused()) return;
      if (callSignalPollBusyRef.current) return;
      callSignalPollBusyRef.current = true;
      try {
        const data = await authFetch(`${SERVER_URL}/api/chat/calls/pending`);
        const signals = Array.isArray(data?.signals) ? data.signals : [];
        for (const signal of signals) {
          await handleRestSignal(signal);
        }
      } catch (err) {
        if (import.meta.env.DEV && (err?.status === 404 || err?.status === 401)) {
          callSignalPollPausedUntilRef.current = Date.now() + (10 * 60 * 1000);
        } else if (isNetworkFetchError(err) || err?.isBackendPaused) {
          callSignalPollPausedUntilRef.current = Date.now() + 120000;
          pauseChatBackend(120000);
        }
      } finally {
        callSignalPollBusyRef.current = false;
      }
    };

    if (!open && !callActivo) return undefined;

    pollSignals();
    const pollInterval = isChatBackendPaused()
      ? 90000
      : (socket?.connected ? 20000 : 35000);
    const interval = setInterval(pollSignals, pollInterval);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [SERVER_URL, user, callActivo, audioSettings.callIncomingSound, audioSettings.callOutgoingSound, audioSettings.callVolume]);

  // ── Sincronizar localVideoRef con localStreamRef y state ─────────────────────────
  useEffect(() => {
    if (callActivo && localVideoRef.current) {
      // Asignar stream cuando call inicia o cuando stream cambia
      if (localStreamRef.current && localVideoRef.current.srcObject !== localStreamRef.current) {
        console.log('[VIDEO] Sincronizando localVideoRef con stream');
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    }
  }, [callActivo, localStream, callMainView, callExpanded]);

  // ── Pre-calentar AudioContext en primer gesto de usuario ──────────────────
  useEffect(() => {
    ensureAudioGestureUnlock();
    return undefined;
  }, []);

  // ── Ringtone al recibir llamada entrante ──────────────────────────────────
  useEffect(() => {
    if (!callIncoming) {
      if (ringtoneRef.current) {
        clearInterval(ringtoneRef.current);
        ringtoneRef.current = null;
      }
      return;
    }
    playIncomingCallTone();
    ringtoneRef.current = setInterval(() => playIncomingCallTone(), 3200);
    return () => {
      if (ringtoneRef.current) {
        clearInterval(ringtoneRef.current);
        ringtoneRef.current = null;
      }
    };
  }, [callIncoming, audioSettings.callIncomingSound, audioSettings.callVolume]); // eslint-disable-line react-hooks/exhaustive-deps

  // ============================
  // ⬇ Scroll automático y marcar mensajes como leídos cuando se ven mensajes
  // ============================
  useEffect(() => {
    scrollChatToBottom();
    
    // Marcar mensajes como leídos automáticamente cuando se abre/ve el chat
    // Esto asegura que el badge desaparezca inmediatamente cuando se abre el chat
    if (open && tipoChat === "privado" && chatActual) {
      // Limpiar contador localmente primero para respuesta inmediata
      setChatsActivos((prev) =>
        prev.map((c) =>
          c.otro_usuario === chatActual ? { ...c, mensajes_no_leidos: 0 } : c
        )
      );
      
      // Marcar como leídos en el servidor
      authFetch(`${SERVER_URL}/api/chat/privado/${chatActual}/leer`, {
        method: "POST",
      })
        .then(() => {
          // Recargar chats activos para sincronizar
          return authFetch(`${SERVER_URL}/api/chat/activos`);
        })
        .then((data) => {
          setChatsActivos(data || []);
        })
        .catch((_e) => {
        });
    }

    if (open && tipoChat === "general") {
      // Marcar mensajes generales como leídos
      authFetch(`${SERVER_URL}/api/chat/general/leer`, { method: "POST" }).catch(() => {});
    }

    if (open && tipoChat === "grupal" && chatActual) {
      // Marcar mensajes grupales como leídos
      authFetch(`${SERVER_URL}/api/chat/grupos/${chatActual}/leer`, { method: "POST" }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoChat, chatActual, open, SERVER_URL]);

  // ⬇ Scroll automático al final cuando se cargan los mensajes
  // ============================
  useEffect(() => {
    if (!open) return;
    scrollChatToBottom();
  }, [tipoChat, chatActual, mensajesGeneral, mensajesPrivado, mensajesGrupal, open]);

  useEffect(() => {
    return () => {
      if (chatScrollFrameRef.current) {
        cancelAnimationFrame(chatScrollFrameRef.current);
      }
      if (chatScrollTimeoutRef.current) {
        clearTimeout(chatScrollTimeoutRef.current);
      }
      limpiarLlamada();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (open && tipoChat) {
      cargarPinYDestacados();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tipoChat, chatActual]);

  // ============================
  // 🟢 Abrir / Cerrar chat
  // ============================
  const abrirCerrarChat = () => {
    // Solicitar permiso para notificaciones del navegador (solo para admins)
    if (esAdmin && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {
        // Ignorar errores de solicitud de permiso
      });
    }
    
    if (!open) {
      setNoLeidos(0);
    } else {
      // Al cerrar, resetear todo el estado del chat para que se abra como nuevo la próxima vez
      setTabPrincipal("chats");
      setTipoChat(null);
      setChatActual(null);
      setMensajeInput("");
      setArchivoAdjunto(null);
      setEditandoMensaje(null);
      setRespondiendoMensaje(null);
      setMensajeResaltadoId(null);
      // No cerrar el perfil si estamos abriendo desde el sidebar
      if (!abriendoPerfilDesdeSidebarRef.current) {
        setPerfilAbierto(false);
        setPerfilData(null);
      }
      setModalSolicitud(null);
      setGrupoMenuAbierto(null);
      setMostrarAgregarMiembros(false);
      // Resetear el ref de mensaje prioritario procesado
      mensajePrioritarioProcessedRef.current = null;
    }
    
    setOpen(!open);
  };

  const closeChatPanel = () => {
    if (!open) return;
    abrirCerrarChat();
    if (onClose) onClose();
  };

  useEffect(() => {
    if (!open) return undefined;

    const handleEscapeCloseChat = (event) => {
      if (event.key !== "Escape") return;
      if (event.defaultPrevented) return;
      closeChatPanel();
    };

    window.addEventListener("keydown", handleEscapeCloseChat);
    return () => window.removeEventListener("keydown", handleEscapeCloseChat);
  }, [open, onClose]);

  // ============================
  // 📎 Funciones para archivos
  // ============================
  const subirArchivo = async (archivo) => {
    try {
      setArchivoSubiendo(true);
      const formData = new FormData();
      formData.append("archivo", archivo);

      const _token = localStorage.getItem("token");
      const response = await fetch(`${SERVER_URL}/api/chat/archivo`, {
        method: "POST",
        headers: {
                  },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Error al subir archivo");
      }

      const data = await response.json();
      return data.archivo;
    } catch (_err) {
      showAlert("Error al subir el archivo", "error");
      return null;
    } finally {
      setArchivoSubiendo(false);
    }
  };


  // ============================
  // @ Detectar menciones
  // ============================
  const detectarMenciones = (texto) => {
    const mencionRegex = /@(\w+)/g;
    const menciones = [];
    let match;
    while ((match = mencionRegex.exec(texto)) !== null) {
      menciones.push(match[1]);
    }
    return menciones;
  };

  const escapeHtml = (texto = "") =>
    texto
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const formatearMensaje = (texto = "") => {
    // Procesar stickers PRIMERO, antes de escapar HTML
    let html = texto;
    
    // Detectar si el mensaje contiene HTML de img ya escapado o sin escapar
    // Caso 1: HTML sin escapar (no debería pasar, pero por si acaso)
    const htmlImgRegex = /<img[^>]*src=["']([^"']*\/chat\/archivo\/(\d+)[^"']*)["'][^>]*>/gi;
    html = html.replace(htmlImgRegex, (match, url, id) => {
      // Si ya es HTML válido, extraer el ID y regenerar con token actualizado
      return `__STICKER_PLACEHOLDER_${id}_sticker__`;
    });
    
    // Caso 2: HTML escapado (como &lt;img...&gt;)
    const escapedImgRegex = /&lt;img[^&]*src=["']([^"']*\/chat\/archivo\/(\d+)[^"']*)["'][^&]*&gt;/gi;
    html = html.replace(escapedImgRegex, (match, url, id) => {
      return `__STICKER_PLACEHOLDER_${id}_sticker__`;
    });
    
    // Caso 3: Patrón [sticker:id:nombre]
    const stickerRegex = /\[sticker:(\d+):([^\]]+)\]/g;
    html = html.replace(stickerRegex, (match, id, nombre) => {
      return `__STICKER_PLACEHOLDER_${id}_${nombre}__`;
    });
    
    // Ahora escapar el HTML del resto del texto
    html = escapeHtml(html);
    
    // Reemplazar los placeholders con el HTML real del sticker (sin escapar)
    html = html.replace(/__STICKER_PLACEHOLDER_(\d+)_([^_]+)__/g, (match, id, nombre) => {
      const authToken = (typeof localStorage !== 'undefined' ? localStorage.getItem("token") : null);
      const urlSticker = `${SERVER_URL}/api/chat/archivo/${id}${authToken ? `` : ''}`;
      const nombreEscapado = escapeHtml(nombre === 'sticker' ? 'Sticker' : nombre);
      return `<img src="${urlSticker}" alt="${nombreEscapado}" class="msg-sticker-inline" style="max-width: 80px; max-height: 80px; vertical-align: middle; display: inline-block; margin: 2px; cursor: pointer; image-rendering: auto;" onclick="this.style.transform='scale(1.2)'; setTimeout(() => this.style.transform='scale(1)', 200);" onerror="this.style.display='none';" />`;
    });
    
    // Convertir URLs en enlaces clickeables (debe ir antes de otros reemplazos)
    // Regex mejorado para detectar URLs con o sin protocolo
    const urlRegex = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}[^\s<>"']*)/gi;
    html = html.replace(urlRegex, (url) => {
      try {
        // Agregar protocolo si no lo tiene
        let urlCompleta = url;
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          urlCompleta = `https://${url}`;
        }
        const urlObj = new URL(urlCompleta);
        const esExterno = urlObj.origin !== window.location.origin;
        return `<a href="${urlCompleta}" ${esExterno ? 'target="_blank" rel="noopener noreferrer"' : ''} class="msg-link-externo">${url}</a>`;
      } catch {
        return url; // Si no es una URL válida, dejarlo como está
      }
    });
    
    // Formato markdown
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/__([^_]+)__/g, "<u>$1</u>");
    html = html.replace(/~~([^~]+)~~/g, "<s>$1</s>");
    html = html.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1<em>$2</em>");
    html = html.replace(/\n/g, "<br/>");
    return html;
  };

  const aplicarFormato = (prefijo, sufijo = prefijo) => {
    const input = mensajeInputRef.current;
    if (!input) return;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const seleccionado = mensajeInput.slice(start, end);
    const nuevo =
      mensajeInput.slice(0, start) +
      prefijo +
      seleccionado +
      sufijo +
      mensajeInput.slice(end);
    setMensajeInput(nuevo);
    requestAnimationFrame(() => {
      input.focus();
      const cursorStart = start + prefijo.length;
      const cursorEnd = cursorStart + seleccionado.length;
      input.setSelectionRange(cursorStart, cursorEnd);
    });
  };

  const insertarTexto = (texto) => {
    const input = mensajeInputRef.current;
    if (!input) return;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const nuevo =
      mensajeInput.slice(0, start) + texto + mensajeInput.slice(end);
    setMensajeInput(nuevo);
    requestAnimationFrame(() => {
      input.focus();
      const pos = start + texto.length;
      input.setSelectionRange(pos, pos);
    });
  };

  const insertarLink = () => {
    const input = mensajeInputRef.current;
    if (!input) return;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const seleccionado = mensajeInput.slice(start, end) || "";
    setModalLinkTexto(seleccionado);
    setModalLinkUrl("");
    setModalLinkAbierto(true);
  };

  const insertarLista = (ordenada = false) => {
    insertarTexto(ordenada ? "1. " : "- ");
  };

  const insertarCita = () => {
    insertarTexto("> ");
  };

  const insertarLinkConfirmado = () => {
    const texto = modalLinkTexto.trim() || "enlace";
    const url = modalLinkUrl.trim();
    if (!url) {
      showAlert("Escribe un link válido.", "warning");
      return;
    }
    const input = mensajeInputRef.current;
    if (!input) return;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const nuevo =
      mensajeInput.slice(0, start) +
      `[${texto}](${url})` +
      mensajeInput.slice(end);
    setMensajeInput(nuevo);
    setModalLinkAbierto(false);
    requestAnimationFrame(() => {
      input.focus();
      const pos = start + texto.length + url.length + 4;
      input.setSelectionRange(pos, pos);
    });
  };

  const manejarEnterLista = (e) => {
    const input = mensajeInputRef.current;
    if (!input) return false;
    const start = input.selectionStart || 0;
    const textoHastaCursor = mensajeInput.slice(0, start);
    const ultimaLinea = textoHastaCursor.split("\n").pop() || "";
    const matchOrdenada = ultimaLinea.match(/^(\d+)\.\s/);
    const matchNoOrdenada = ultimaLinea.match(/^-\s/);
    if (matchOrdenada) {
      e.preventDefault();
      const siguiente = Number(matchOrdenada[1]) + 1;
      insertarTexto(`\n${siguiente}. `);
      return true;
    }
    if (matchNoOrdenada) {
      e.preventDefault();
      insertarTexto("\n- ");
      return true;
    }
    return false;
  };

  const esMovil = () => {
    return window.innerWidth <= 767;
  };

  const abrirAdjuntosMobile = () => {
    setMostrarAdjuntosMobile(true);
  };

  const cerrarAdjuntosMobile = () => {
    setMostrarAdjuntosMobile(false);
  };

  const adjuntarArchivo = (file) => {
    if (!file) return;
    // Detectar si es un sticker por el nombre del archivo
    const esSticker = file.name.toLowerCase().includes('sticker');
    if (esSticker) {
      file.esSticker = true;
    }
    setArchivoAdjunto(file);
    if (!mensajeInput.trim()) {
      if (esSticker) {
        // Para stickers, no agregar texto, se enviará como sticker
        setMensajeInput('');
      } else {
        setMensajeInput(`📎 ${file.name}\n`);
      }
    }
  };

  // Función para comprimir imágenes (preserva GIFs pequeños, comprime grandes)
  const comprimirImagen = (file, maxWidth = 200, calidad = 0.7) => {
    return new Promise((resolve, reject) => {
      // Si es un GIF pequeño (< 500KB), no comprimir para preservar la animación
      // Si es un GIF grande, comprimirlo para evitar problemas de cuota
      if (file.type === 'image/gif' && file.size < 500 * 1024) {
        resolve(file);
        return;
      }
      
      // Para GIFs grandes, necesitamos convertirlos a un formato comprimible
      // Nota: Esto perderá la animación, pero es necesario para evitar problemas de cuota
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Redimensionar si es necesario
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Preservar el tipo MIME original si no es GIF
          const tipoMime = file.type || 'image/jpeg';
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const archivoComprimido = new File([blob], file.name, {
                  type: tipoMime,
                  lastModified: Date.now()
                });
                resolve(archivoComprimido);
              } else {
                reject(new Error('Error al comprimir imagen'));
              }
            },
            tipoMime,
            calidad
          );
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Función para convertir base64 a File
  const base64ToFile = (base64String, filename) => {
    try {
      // Extraer el tipo MIME y los datos base64
      const matches = base64String.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        throw new Error('Formato base64 inválido');
      }
      
      const contentType = matches[1];
      const base64Data = matches[2];
      
      // Convertir base64 a bytes
      const byteCharacters = atob(base64Data);
      const byteArrays = [];
      
      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      
      const blob = new Blob(byteArrays, { type: contentType });
      return new File([blob], filename, { type: contentType });
    } catch (_error) {
      return null;
    }
  };

  // Enviar emoji personalizado como sticker
  const enviarEmojiPersonalizado = async (emoji) => {
    if (!emoji || !emoji.url) return;
    
    try {
      let archivo;
      
      // Si es base64, convertir a File
      if (emoji.url.startsWith('data:')) {
        const extension = emoji.url.match(/data:image\/(\w+);/)?.[1] || 'png';
        const nombreArchivo = `sticker-${emoji.nombre || 'emoji'}-${Date.now()}.${extension}`;
        archivo = base64ToFile(emoji.url, nombreArchivo);
        
        if (!archivo) {
          showAlert('Error al procesar el sticker', 'error');
          return;
        }
      } else {
        // Si es una URL externa, descargarla
        try {
          const response = await fetch(emoji.url);
          const blob = await response.blob();
          const extension = blob.type.split('/')[1] || 'png';
          archivo = new File([blob], `sticker-${emoji.nombre || 'emoji'}-${Date.now()}.${extension}`, { 
            type: blob.type 
          });
        } catch (_err) {
          showAlert('Error al cargar el sticker', 'error');
          return;
        }
      }
      
      // Agregar metadata para identificar como sticker
      archivo.esSticker = true;
      archivo.nombreSticker = emoji.nombre;
      
      // Cerrar el selector de emojis
      setInputEmojiAbierto(false);
      
      // Subir archivo y enviar automáticamente
      setArchivoSubiendo(true);
      const archivoSubido = await subirArchivo(archivo);
      
      if (!archivoSubido) {
        setArchivoSubiendo(false);
        return;
      }
      
      // Usar nickname si existe, si no usar name
      const userDisplayName = user?.nickname || user?.name;
      if (!userDisplayName) {
        showAlert("No se puede enviar mensajes sin nickname o nombre. Por favor configura tu nickname en tu perfil.", "warning");
        setArchivoSubiendo(false);
        return;
      }
      
      // Formatear mensaje como sticker
      const nombreSticker = archivo.name?.replace(/\.(png|jpg|jpeg|gif|webp)$/i, '') || 'sticker';
      const mensajeSticker = `[sticker:${archivoSubido.id}:${nombreSticker}]`;
      
      try {
        const bodyData = {
          mensaje: mensajeSticker,
          tipo_mensaje: "archivo",
          archivo_id: archivoSubido.id,
          menciona: null,
          enlace_compartido: null,
        };

        let respuesta;
        if (tipoChat === "general") {
          respuesta = await authFetch(`${SERVER_URL}/api/chat/general`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bodyData),
          });
          if (respuesta?.mensaje) {
            setMensajesGeneral((prev) => {
              const existe = prev.some((m) => m.id === respuesta.mensaje.id);
              if (existe) return prev;
              return [...prev, respuesta.mensaje].sort((a, b) => {
                const fechaA = new Date(a.fecha || 0).getTime();
                const fechaB = new Date(b.fecha || 0).getTime();
                return fechaA - fechaB;
              });
            });
          }
        } else if (tipoChat === "privado") {
          respuesta = await authFetch(`${SERVER_URL}/api/chat/privado`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...bodyData, para_nickname: chatActual }),
          });
          if (respuesta?.mensaje) {
            setMensajesPrivado((prev) => {
              const mensajesExistentes = prev[chatActual] || [];
              const existe = mensajesExistentes.some((m) => m.id === respuesta.mensaje.id);
              if (existe) return prev;
              return {
                ...prev,
                [chatActual]: [...mensajesExistentes, respuesta.mensaje].sort((a, b) => {
                  const fechaA = new Date(a.fecha || 0).getTime();
                  const fechaB = new Date(b.fecha || 0).getTime();
                  return fechaA - fechaB;
                }),
              };
            });
          }
        } else if (tipoChat === "grupal") {
          respuesta = await authFetch(`${SERVER_URL}/api/chat/grupos/${chatActual}/mensajes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bodyData),
          });
          if (respuesta?.mensaje) {
            setMensajesGrupal((prev) => {
              const mensajesExistentes = prev[chatActual] || [];
              const existe = mensajesExistentes.some((m) => m.id === respuesta.mensaje.id);
              if (existe) return prev;
              return {
                ...prev,
                [chatActual]: [...mensajesExistentes, respuesta.mensaje].sort((a, b) => {
                  const fechaA = new Date(a.fecha || 0).getTime();
                  const fechaB = new Date(b.fecha || 0).getTime();
                  return fechaA - fechaB;
                }),
              };
            });
          }
        }
        
        setArchivoSubiendo(false);
      } catch (_err) {
        showAlert("Error al enviar el sticker", "error");
        setArchivoSubiendo(false);
      }
    } catch (_error) {
      showAlert('Error al enviar sticker', 'error');
    }
  };

  // ========== SISTEMA DE REUNIONES ==========
  
  // Cargar reuniones desde el servidor
  useEffect(() => {
    const cargarReuniones = async () => {
      try {
        const data = await authFetch(`${SERVER_URL}/reuniones/proximas`);
        setReuniones(data || []);
        // Programar notificaciones para todas las reuniones
        (data || []).forEach(reunion => programarNotificacionesReunion(reunion));
      } catch (_e) {
        // Fallback a localStorage si falla el servidor
        const guardadas = localStorage.getItem('COPMEC_reuniones');
        if (guardadas) {
          try {
            const reunionesData = JSON.parse(guardadas);
            setReuniones(reunionesData);
            reunionesData.forEach(reunion => programarNotificacionesReunion(reunion));
          } catch (_err) {
            /* noop */
          }
        }
      }
    };
    if (open && SERVER_URL) {
      cargarReuniones();
    }
    
    // Verificar reuniones cada minuto para notificaciones próximas
    const intervalo = setInterval(() => {
      reuniones.forEach(reunion => {
        if (reunion.fecha && reunion.hora) {
          const fechaHora = new Date(`${reunion.fecha}T${reunion.hora}`);
          const ahora = new Date();
          const diffMinutos = (fechaHora.getTime() - ahora.getTime()) / (1000 * 60);
          
          // Notificar si está entre 10 y 11 minutos antes
          if (diffMinutos >= 10 && diffMinutos < 11) {
            mostrarNotificacionReunion(reunion, '10 minutos');
          }
          // Notificar si está entre 0 y 1 minuto (a la hora)
          else if (diffMinutos >= 0 && diffMinutos < 1) {
            mostrarNotificacionReunion(reunion, 'ahora');
          }
        }
      });
    }, 60000); // Cada minuto
    
    return () => clearInterval(intervalo);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reuniones, SERVER_URL, open]);

  // Programar notificaciones para una reunión
  const programarNotificacionesReunion = (reunion) => {
    if (!reunion.fecha || !reunion.hora) return;
    
    const fechaHora = new Date(`${reunion.fecha}T${reunion.hora}`);
    const ahora = new Date();
    
    // Notificación 10 minutos antes
    const notif10min = new Date(fechaHora.getTime() - 10 * 60 * 1000);
    if (notif10min > ahora) {
      const timeout10min = notif10min.getTime() - ahora.getTime();
      setTimeout(() => {
        mostrarNotificacionReunion(reunion, '10 minutos');
      }, timeout10min);
    }
    
    // Notificación a la hora exacta
    if (fechaHora > ahora) {
      const timeoutExacto = fechaHora.getTime() - ahora.getTime();
      setTimeout(() => {
        mostrarNotificacionReunion(reunion, 'ahora');
      }, timeoutExacto);
    }
  };

  // Mostrar notificación de reunión
  const mostrarNotificacionReunion = (reunion, cuando) => {
    const mensaje = cuando === 'ahora' 
      ? `🔔 ¡La reunión "${reunion.titulo}" es ahora!`
      : `⏰ La reunión "${reunion.titulo}" comienza en 10 minutos`;
    
    showAlert(mensaje, 'info');
    
    // Reproducir sonido de notificación si está disponible
    if (window.sonidoCOPMEC) {
      try {
        window.sonidoCOPMEC.reproducir('notification');
      } catch (_e) {
        /* noop */
      }
    }
  };

  // Crear o actualizar reunión
  const guardarReunion = () => {
    if (!reunionForm.titulo.trim() || !reunionForm.fecha || !reunionForm.hora) {
      showAlert('Completa todos los campos obligatorios', 'warning');
      return;
    }

    const nuevaReunion = {
      id: reunionEditando?.id || Date.now(),
      titulo: reunionForm.titulo.trim(),
      descripcion: reunionForm.descripcion.trim(),
      fecha: reunionForm.fecha,
      hora: reunionForm.hora,
      lugar: reunionForm.lugar.trim(),
      esVideollamada: reunionForm.esVideollamada,
      participantes: reunionForm.participantes,
      creador: user?.nickname || user?.name,
      chat_tipo: tipoChat,
      chat_id: chatActual || 'general',
      creada: new Date().toISOString()
    };

    let nuevasReuniones;
    if (reunionEditando) {
      nuevasReuniones = reuniones.map(r => r.id === reunionEditando.id ? nuevaReunion : r);
    } else {
      nuevasReuniones = [...reuniones, nuevaReunion];
    }

    setReuniones(nuevasReuniones);
    localStorage.setItem('COPMEC_reuniones', JSON.stringify(nuevasReuniones));
    
    // Programar notificaciones
    programarNotificacionesReunion(nuevaReunion);
    
    // Enviar mensaje al chat con la información de la reunión
    const mensajeReunion = `📅 **Reunión: ${nuevaReunion.titulo}**\n` +
      `📆 Fecha: ${new Date(nuevaReunion.fecha).toLocaleDateString('es-ES')}\n` +
      `🕐 Hora: ${nuevaReunion.hora}\n` +
      (nuevaReunion.lugar ? `📍 Lugar: ${nuevaReunion.lugar}\n` : '') +
      (nuevaReunion.esVideollamada ? '📹 Videollamada\n' : '') +
      (nuevaReunion.descripcion ? `\n${nuevaReunion.descripcion}` : '');
    
    setMensajeInput(mensajeReunion);
    setModalReunionAbierto(false);
    resetearFormularioReunion();
    showAlert(reunionEditando ? 'Reunión actualizada' : 'Reunión creada', 'success');
  };

  // Resetear formulario de reunión
  const resetearFormularioReunion = () => {
    setReunionForm({
      titulo: "",
      descripcion: "",
      fecha: "",
      hora: "",
      lugar: "",
      esVideollamada: false,
      participantes: []
    });
    setReunionEditando(null);
  };

  // Abrir modal de reunión
  const abrirModalReunion = (reunion = null) => {
    if (reunion) {
      setReunionEditando(reunion);
      setReunionForm({
        titulo: reunion.titulo || "",
        descripcion: reunion.descripcion || "",
        fecha: reunion.fecha || "",
        hora: reunion.hora || "",
        lugar: reunion.lugar || "",
        esVideollamada: reunion.esVideollamada || false,
        participantes: reunion.participantes || []
      });
    } else {
      resetearFormularioReunion();
    }
    setModalReunionAbierto(true);
  };

  // Eliminar reunión
  const eliminarReunion = async (reunionId) => {
    const confirmado = await showConfirm('¿Eliminar esta reunión?', 'Eliminar reunión');
    if (!confirmado) return;
    
    const nuevasReuniones = reuniones.filter(r => r.id !== reunionId);
    setReuniones(nuevasReuniones);
    localStorage.setItem('COPMEC_reuniones', JSON.stringify(nuevasReuniones));
    showAlert('Reunión eliminada', 'success');
  };

  // Iniciar videollamada desde reunión
  // eslint-disable-next-line no-unused-vars
  const iniciarReunionVideollamada = (reunion) => {
    if (reunion.esVideollamada) {
      abrirVideollamada();
    }
  };

  // Obtener reuniones del chat actual
  const obtenerReunionesChatActual = () => {
    const chatId = tipoChat === 'general' ? 'general' : (chatActual || '');
    return reuniones.filter(r => 
      r.chat_tipo === tipoChat && 
      (r.chat_id === chatId || r.chat_id === String(chatId))
    ).sort((a, b) => {
      const fechaA = new Date(`${a.fecha}T${a.hora}`);
      const fechaB = new Date(`${b.fecha}T${b.hora}`);
      return fechaA - fechaB;
    });
  };

  const manejarGaleria = (files) => {
    if (!files || files.length === 0) return;
    const seleccion = Array.from(files);
    const thumbs = seleccion.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setGaleriaThumbs(thumbs);
    adjuntarArchivo(seleccion[0]);
  };

  const abrirGaleriaDispositivo = () => {
    imageInputRef.current?.click();
  };

  const abrirGrabacionVideo = () => {
    videoInputRef.current?.click();
  };

  const agregarGif = () => {
    gifInputRef.current?.click();
  };

  const abrirCamara = async () => {
    // Usar input file para capturar fotos (web)
    imageInputRef.current?.click();
  };

  const iniciarGrabacionVoz = async () => {
    if (isRecording) return;
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        showAlert("Tu navegador no soporta notas de voz.", "warning");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus') ? 'audio/ogg;codecs=opus'
        : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const file = new File([blob], `nota-voz-${Date.now()}.${ext}`, { type: mimeType });
        setArchivoAdjunto(file);
        stream.getTracks().forEach((t) => t.stop());
        // Limpiar visualizador
        clearInterval(recTimerRef.current);
        cancelAnimationFrame(recAnimRef.current);
        setRecTime(0);
        setRecBars(new Array(30).fill(2));
        setIsRecording(false);
      };
      mediaRecorderRef.current = recorder;

      // --- Visualizador de audio ---
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        src.connect(analyser);
        recAnalyserRef.current = analyser;
        const data = new Uint8Array(analyser.frequencyBinCount);
        const NUM_BARS = 30;
        const tick = () => {
          analyser.getByteFrequencyData(data);
          const bars = Array.from({ length: NUM_BARS }, (_, i) => {
            const idx = Math.floor(i * data.length / NUM_BARS);
            return Math.max(2, Math.round((data[idx] / 255) * 36));
          });
          setRecBars(bars);
          recAnimRef.current = requestAnimationFrame(tick);
        };
        recAnimRef.current = requestAnimationFrame(tick);
      } catch (_) { /* sin visualizador si el navegador no soporta AudioContext */ }

      // --- Contador de tiempo ---
      setRecTime(0);
      recTimerRef.current = setInterval(() => setRecTime((t) => t + 1), 1000);

      setIsRecording(true);
      recorder.start();
    } catch (_err) {
      setIsRecording(false);
      showAlert("No se pudo iniciar la grabación de voz.", "error");
    }
  };

  const detenerGrabacionVoz = () => {
    clearInterval(recTimerRef.current);
    cancelAnimationFrame(recAnimRef.current);
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const iniciarGrabacionVideo = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        showAlert("Tu navegador no soporta videomensajes.", "warning");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: true
      });
      videoStreamRef.current = stream;
      setVideoPreviewStream(stream);
      setIsRecordingVideo(true);
    } catch (err) {
      setIsRecordingVideo(false);
      if (err.name === 'NotAllowedError') {
        showAlert("Permiso de cámara denegado. Permite el acceso en tu navegador.", "warning");
      } else {
        showAlert("No se pudo acceder a la cámara.", "error");
      }
    }
  };

  const iniciarGrabacionVideoRecorder = (stream) => {
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4';
    const recorder = new MediaRecorder(stream, { mimeType });
    videoChunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) videoChunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(videoChunksRef.current, { type: mimeType });
      const file = new File([blob], `video-mensaje-${Date.now()}.${ext}`, { type: mimeType });
      const url = URL.createObjectURL(blob);
      // Parar cámara pero mantener overlay en modo preview
      stream.getTracks().forEach((t) => t.stop());
      videoStreamRef.current = null;
      setVideoPreviewStream(null);
      setVideoGrabado({ url, file });
    };
    videoRecorderRef.current = recorder;
    recorder.start();
  };

  const enviarVideoGrabado = () => {
    if (videoGrabado) {
      setArchivoAdjunto(videoGrabado.file);
      URL.revokeObjectURL(videoGrabado.url);
      setVideoGrabado(null);
      setIsRecordingVideo(false);
    }
  };

  const descartarVideoGrabado = () => {
    if (videoGrabado) {
      URL.revokeObjectURL(videoGrabado.url);
      setVideoGrabado(null);
    }
    setIsRecordingVideo(false);
  };

  // Asignar stream a elemento video sin parpadeo
  useEffect(() => {
    const el = videoPreviewRef.current;
    if (!el) return;
    if (videoPreviewStream) {
      el.srcObject = videoPreviewStream;
      el.play().catch(() => {});
    } else {
      el.srcObject = null;
    }
  }, [videoPreviewStream]);

  const detenerGrabacionVideo = () => {
    if (videoRecorderRef.current && videoRecorderRef.current.state !== 'inactive') {
      videoRecorderRef.current.stop();
    } else if (videoStreamRef.current) {
      // Cancelar antes de iniciar grabación
      videoStreamRef.current.getTracks().forEach((t) => t.stop());
      videoStreamRef.current = null;
      setVideoPreviewStream(null);
      setIsRecordingVideo(false);
    }
  };

  const emojiReacciones = ["👍", "❤️", "😂", "😮", "😢", "🎉"];
  
  // Catálogo completo de emojis por categorías
  const emojiCategorias = {
    "recientes": {
      nombre: "Recientes",
      icono: "🕐",
      label: "Recientes",
      emojis: []
    },
    "caras": {
      nombre: "Caras",
      icono: "😊",
      label: "Caras",
      emojis: [
        "😀","😂","🥹","😊","😇","🥰","😍","🤩","😘","😋",
        "😛","😜","🤪","😝","🤑","🤗","🤭","🤔","😐","😏",
        "😒","🙄","😬","🤥","😔","😴","🥺","😢","😭","😱",
        "😤","😡","🤬","😈","💀","🤡","👻","👽","🤖","😺",
        "😎","🤓","🧐","😕","😟","😦","😧","😨","😰","😥",
        "🥳","🥵","🥶","😵","🤯","🤠","😷","🤒","🤕","🤧"
      ]
    },
    "gestos": {
      nombre: "Gestos",
      icono: "👋",
      label: "Gestos",
      emojis: [
        "👋","🤚","🖐️","✋","🖖","👌","🤌","✌️","🤞","🤟",
        "🤘","🤙","👈","👉","👆","👇","☝️","👍","👎","✊",
        "👊","🤛","🤜","👏","🙌","🤲","🤝","🙏","💪","🦾",
        "🫶","💋","💅","👁️","👀","🫀","🧠","🦷","💤","🙋"
      ]
    },
    "amor": {
      nombre: "Amor",
      icono: "❤️",
      label: "Amor",
      emojis: [
        "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔",
        "❣️","💕","💞","💓","💗","💖","💘","💝","💟","♥️",
        "😻","💑","👫","💏","🌹","💐","🌷","🫦","😽","🥰"
      ]
    },
    "fiesta": {
      nombre: "Fiesta",
      icono: "🎉",
      label: "Fiesta",
      emojis: [
        "🎉","🎊","🎈","🎁","🥳","🏆","🥇","🥈","🥉","🎖️",
        "🎗️","🎟️","🎫","🎆","🎇","✨","🌟","⭐","💫","🔥",
        "🎂","🍰","🧁","🍭","🍬","🎵","🎶","🎤","🎸","🪅"
      ]
    },
    "naturaleza": {
      nombre: "Natura",
      icono: "🌿",
      label: "Natura",
      emojis: [
        "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯",
        "🦁","🐮","🐸","🐵","🐔","🐧","🦆","🦅","🦉","🦇",
        "🐺","🦄","🐝","🦋","🐌","🐞","🐢","🐍","🐙","🦈",
        "🌲","🌳","🌵","🌷","🌹","🌺","🌻","🌼","🍀","🍁",
        "🌍","🌈","🌊","🌙","⭐","☀️","🌸","🍄","🌿","🦋"
      ]
    },
    "comida": {
      nombre: "Comida",
      icono: "🍕",
      label: "Comida",
      emojis: [
        "🍕","🍔","🍟","🌮","🌯","🥪","🍣","🍜","🍝","🍛",
        "🍲","🥘","🍱","🍗","🥩","🥓","🍳","🧀","🥚","🥞",
        "🍞","🥐","🧁","🎂","🍰","🍩","🍪","🍫","🍬","🍭",
        "🍎","🍊","🍋","🍇","🍓","🥝","🍑","🍒","🥭","🍌",
        "☕","🧋","🍵","🍺","🥂","🍷","🧃","🥤","🍹","🧊"
      ]
    },
    "trabajo": {
      nombre: "Trabajo",
      icono: "💼",
      label: "Trabajo",
      emojis: [
        "💼","📊","📈","📉","📋","📌","📍","📎","🖇️","📏",
        "📐","✂️","🗂️","🗃️","🗄️","📁","📂","📝","✏️","🖊️",
        "🖋️","🖌️","💻","🖥️","⌨️","🖱️","📱","☎️","📞","📟",
        "🔋","💡","🔦","🔬","🔭","📡","🏗️","🧰","⚙️","🔧",
        "🔩","🗜️","🛠️","⚖️","🏦","🏢","🏭","🧑‍💻","👔","🤝"
      ]
    },
    "deportes": {
      nombre: "Deporte",
      icono: "⚽",
      label: "Deporte",
      emojis: [
        "⚽","🏀","🏈","⚾","🎾","🏐","🏉","🥏","🎳","🏒",
        "🏓","🏸","🥊","🥋","⛳","🎯","🏆","🥇","🏋️","🤸",
        "🚴","🏊","🤽","🧗","🤺","🏇","🏄","⛷️","🤿","🧘",
        "🏃","💪","🥅","🎽","🛹","🛷","🎿","🪂","🏕️","⛺"
      ]
    },
    "simbolos": {
      nombre: "Símbolos",
      icono: "💠",
      label: "Símbolos",
      emojis: [
        "✅","❌","⭕","🔴","🟠","🟡","🟢","🔵","🟣","⚫",
        "⚪","🟤","🔶","🔷","🔸","🔹","🔺","🔻","💠","🔘",
        "🔲","🔳","▶️","⏸️","⏹️","⏭️","⏮️","🔀","🔁","🔄",
        "➕","➖","✖️","➗","💲","💱","‼️","⁉️","❓","❕",
        "⚠️","🚫","🔞","♻️","✔️","💯","🔝","🆕","🆙","🆒",
        "🔔","🔕","📣","📢","🎵","🎶","💬","💭","🗨️","👁️‍🗨️"
      ]
    },
    "personalizados": {
      nombre: "Personalizados",
      icono: "⭐",
      label: "Custom",
      emojis: []
    }
  };

  // Emojis extra para compatibilidad (se actualizarán con los más usados)
  // eslint-disable-next-line no-unused-vars
  const emojiExtra = emojiCategorias.caras.emojis.slice(0, 48);

  // Convierte un emoji Unicode a URL de Twemoji (Twitter Emoji CDN)
  const getTwemojiUrl = (emoji) => {
    try {
      const codePoints = [...emoji]
        .map(ch => ch.codePointAt(0).toString(16))
        .filter(cp => cp !== 'fe0f') // eliminar variation selector-16
        .join('-');
      return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codePoints}.svg`;
    } catch {
      return null;
    }
  };

  const ordenarEmojis = (lista) =>
    [...lista].sort(
      (a, b) => (emojiUso[b] || 0) - (emojiUso[a] || 0)
    );

  const emojiOrdenados = ordenarEmojis(emojiReacciones);

  // Cargar emojis personalizados desde localStorage
  useEffect(() => {
    const guardados = localStorage.getItem('COPMEC_emojis_personalizados');
    if (guardados) {
      try {
        setEmojisPersonalizados(JSON.parse(guardados));
      } catch (_e) {
        /* noop */
      }
    }
  }, []);

  // Actualizar emojis recientes
  useEffect(() => {
    const todosEmojis = Object.values(emojiCategorias).flatMap(cat => cat.emojis);
    const recientes = ordenarEmojis(todosEmojis).filter(e => (emojiUso[e] || 0) > 0).slice(0, 40);
    emojiCategorias.recientes.emojis = recientes;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emojiUso]);

  // Obtener emojis de la categoría activa o filtrados por búsqueda (para input)
  const obtenerEmojisMostrar = () => {
    if (emojiBusqueda.trim()) {
      // Buscar en todas las categorías
      const todosEmojis = Object.values(emojiCategorias)
        .filter(cat => cat.nombre !== "Personalizados")
        .flatMap(cat => cat.emojis);
      return todosEmojis.filter(emoji => {
        return typeof emoji === 'string' && emoji.includes(emojiBusqueda);
      });
    }
    
    if (emojiCategoriaActiva === "personalizados") {
      return emojisPersonalizados;
    }
    
    return emojiCategorias[emojiCategoriaActiva]?.emojis || [];
  };

  // Obtener emojis para el menú de mensajes
  const obtenerEmojisMostrarMenu = () => {
    if (emojiBusquedaMenu.trim()) {
      // Buscar en todas las categorías
      const todosEmojis = Object.values(emojiCategorias)
        .filter(cat => cat.nombre !== "Personalizados")
        .flatMap(cat => cat.emojis);
      return todosEmojis.filter(emoji => {
        return typeof emoji === 'string' && emoji.includes(emojiBusquedaMenu);
      });
    }
    
    if (emojiCategoriaActivaMenu === "personalizados") {
      return emojisPersonalizados;
    }
    
    return emojiCategorias[emojiCategoriaActivaMenu]?.emojis || [];
  };

  const toggleReaccion = (msgId, emoji) => {
    setReacciones((prev) => {
      const actual = prev[msgId] || {};
      const nuevo = { ...actual, [emoji]: !actual[emoji] };
      return { ...prev, [msgId]: nuevo };
    });
    setEmojiUso((prev) => ({ ...prev, [emoji]: (prev[emoji] || 0) + 1 }));
  };

  const obtenerIdDiaSemana = (date = new Date()) => {
    const day = date.getDay(); // 0 domingo, 1 lunes
    return day === 0 ? "7" : String(day);
  };

  const getChatIdActual = () => {
    if (tipoChat === "general") return "general";
    if (tipoChat === "privado") return chatActual || "";
    if (tipoChat === "grupal") return String(chatActual || "");
    return "";
  };

  const cargarPinYDestacados = async () => {
    const chatId = getChatIdActual();
    if (!tipoChat || !chatId) return;
    try {
      const pinRes = await authFetch(`${SERVER_URL}/api/chat/pin/${tipoChat}/${encodeURIComponent(chatId)}`);
      setMensajeFijado(pinRes?.pin || null);
    } catch (_e) {
      setMensajeFijado(null);
    }
    try {
      const destRes = await authFetch(
        `${SERVER_URL}/api/chat/destacados/${tipoChat}/${encodeURIComponent(chatId)}`
      );
      const ids = Array.isArray(destRes?.destacados) ? destRes.destacados : [];
      setMensajesDestacados(new Set(ids.map((id) => String(id))));
    } catch (_e) {
      setMensajesDestacados(new Set());
    }
  };

  const estaDentroHorario = (config) => {
    if (!config || config.notificaciones_activas === 0) return false;
    const diaId = obtenerIdDiaSemana();
    const dias = (config.dias_semana || "1,2,3,4,5,6,7")
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
    if (!dias.includes(diaId)) return false;

    const mapa = {
      "1": "lun",
      "2": "mar",
      "3": "mie",
      "4": "jue",
      "5": "vie",
      "6": "sab",
      "7": "dom",
    };
    const key = mapa[diaId];
    const inicio = config[`horario_${key}_inicio`] || config.horario_inicio || "08:00";
    const fin = config[`horario_${key}_fin`] || config.horario_fin || "22:00";
    const [hi, mi] = inicio.split(":").map(Number);
    const [hf, mf] = fin.split(":").map(Number);
    const ahora = new Date();
    const ahoraMin = ahora.getHours() * 60 + ahora.getMinutes();
    const inicioMin = hi * 60 + mi;
    const finMin = hf * 60 + mf;
    if (Number.isNaN(inicioMin) || Number.isNaN(finMin)) return true;
    if (finMin < inicioMin) {
      return ahoraMin >= inicioMin || ahoraMin <= finMin;
    }
    return ahoraMin >= inicioMin && ahoraMin <= finMin;
  };

  const abrirMenuMensaje = (event, payload, opciones = {}) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!payload?.mensaje) return;
    setMenuEmojiAbierto(false);
    const isMobile = window.innerWidth <= 767;
    const baseX = event?.clientX ?? window.innerWidth / 2;
    const baseY = event?.clientY ?? window.innerHeight / 2;
    const maxX = window.innerWidth - 260;
    const maxY = window.innerHeight - 360;
    const x = isMobile ? window.innerWidth / 2 : Math.max(12, Math.min(baseX, maxX));
    const y = isMobile ? window.innerHeight / 2 : Math.max(12, Math.min(baseY, maxY));
    setMenuMensaje({
      ...payload,
      x,
      y,
      isMobile,
      desdeLongPress: opciones.desdeLongPress || (!event && isMobile),
    });
  };

  const cerrarMenuMensaje = () => {
    setMenuMensaje(null);
    setMenuEmojiAbierto(false);
  };

  const cerrarMenuMiembro = () => {
    setMenuMiembroAbierto(null);
    setMenuMiembroPosicion(null);
    setSubmenuRestriccionAbierto(null);
  };

  const activarSeleccion = (mensaje) => {
    if (!mensaje?.id) return;
    setSeleccionModo(true);
    setSeleccionMensajes(new Set([mensaje.id]));
  };

  const toggleSeleccionMensaje = (mensajeId) => {
    if (!mensajeId) return;
    setSeleccionMensajes((prev) => {
      const next = new Set(prev);
      if (next.has(mensajeId)) {
        next.delete(mensajeId);
      } else {
        next.add(mensajeId);
      }
      return next;
    });
  };

  const salirSeleccion = () => {
    setSeleccionModo(false);
    setSeleccionMensajes(new Set());
  };

  const eliminarMensajesSeleccionados = async () => {
    if (!seleccionMensajes.size) return;
    const confirmado = await showConfirm(
      `¿Eliminar ${seleccionMensajes.size} mensajes seleccionados?`,
      "Eliminar mensajes"
    );
    if (!confirmado) return;
    const tipo = tipoChat === "general" ? "general" : tipoChat === "privado" ? "privado" : "grupal";
    const ids = Array.from(seleccionMensajes);
    // Solo eliminar mensajes con IDs reales (no temporales)
    const idsReales = ids.filter((id) => id && !id.toString().startsWith("temp-"));
    for (const id of idsReales) {
      try {
        await authFetch(`${SERVER_URL}/api/chat/mensaje/${tipo}/${id}`, { method: "DELETE" });
      } catch (_) { /* noop */ }
    }
    // Normalizar IDs para comparación (string)
    const idsSet = new Set(idsReales.map((id) => String(id)));
    if (tipo === "general") {
      setMensajesGeneral((prev) => prev.filter((m) => !m.id || !idsSet.has(String(m.id))));
    } else if (tipo === "privado") {
      setMensajesPrivado((prev) => ({
        ...prev,
        [chatActual]: (prev[chatActual] || []).filter((m) => !m.id || !idsSet.has(String(m.id))),
      }));
    } else if (tipo === "grupal") {
      setMensajesGrupal((prev) => ({
        ...prev,
        [chatActual]: (prev[chatActual] || []).filter((m) => !m.id || !idsSet.has(String(m.id))),
      }));
    }
    showAlert("Mensajes eliminados", "success");
    salirSeleccion();
  };

  const iniciarPress = (payload) => {
    touchMovedRef.current = false;
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
    }
    longPressTimeoutRef.current = setTimeout(() => {
      if (!touchMovedRef.current) {
        abrirMenuMensaje(null, payload, { desdeLongPress: true });
      }
    }, 550);
  };

  const cancelarPress = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
    }
  };

  const marcarMovimiento = () => {
    touchMovedRef.current = true;
    cancelarPress();
  };

  const copiarMensaje = async (texto) => {
    if (!texto) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(texto);
      } else {
        const temp = document.createElement("textarea");
        temp.value = texto;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
      }
      showAlert("Mensaje copiado", "success");
    } catch (_err) {
      showAlert("No se pudo copiar el mensaje", "error");
    }
  };

  const eliminarMensaje = async (mensaje) => {
    if (!mensaje?.id) {
      showAlert("Este mensaje aún no se puede borrar.", "warning");
      return;
    }
    const confirmado = await showConfirm(
      "¿Quieres eliminar este mensaje?",
      "Confirmar eliminación"
    );
    if (!confirmado) return;

    try {
      const tipo = tipoChat === "general" ? "general" : tipoChat === "privado" ? "privado" : "grupal";
      await authFetch(`${SERVER_URL}/api/chat/mensaje/${tipo}/${mensaje.id}`, {
        method: "DELETE",
      });

      if (tipo === "general") {
        setMensajesGeneral((prev) => prev.filter((m) => m.id !== mensaje.id));
      } else if (tipo === "privado") {
        setMensajesPrivado((prev) => ({
          ...prev,
          [chatActual]: (prev[chatActual] || []).filter((m) => m.id !== mensaje.id),
        }));
      } else if (tipo === "grupal") {
        setMensajesGrupal((prev) => ({
          ...prev,
          [chatActual]: (prev[chatActual] || []).filter((m) => m.id !== mensaje.id),
        }));
      }
      showAlert("Mensaje eliminado", "success");
    } catch (err) {
      const errorMsg = err?.message || err?.error || "No se pudo borrar el mensaje";
      if (err?.status === 403) {
        showAlert("No puedes eliminar mensajes de otros usuarios", "error");
      } else {
        showAlert(errorMsg, "error");
      }
    }
  };

  const mostrarInfoMensaje = async (mensaje) => {
    if (!mensaje?.id) {
      showAlert("Este mensaje aún no tiene info disponible.", "warning");
      return;
    }
    try {
      const tipo = tipoChat === "general" ? "general" : tipoChat === "privado" ? "privado" : "grupal";
      const info = await authFetch(`${SERVER_URL}/api/chat/mensaje/${tipo}/${mensaje.id}/info`);
      const fechaEnvio = info?.fecha_envio
        ? new Date(info.fecha_envio).toLocaleString("es-MX")
        : "No disponible";
      const fechaLeido = info?.fecha_leido
        ? new Date(info.fecha_leido).toLocaleString("es-MX")
        : "Aún no leído";
      const por = info?.leido_por ? ` por ${info.leido_por}` : "";
      showAlert(`Llegó: ${fechaEnvio}\nLeído${por}: ${fechaLeido}`, "info");
    } catch (_e) {
      showAlert("No se pudo obtener la info del mensaje.", "error");
    }
  };

  const responderMensaje = (mensaje, otroNickname) => {
    if (!mensaje) return;
    setRespondiendoMensaje({
      id: mensaje.id,
      texto: mensaje.mensaje || mensaje.archivo_nombre || "Mensaje",
      usuario: otroNickname || "Usuario",
    });
    mensajeInputRef.current?.focus();
  };

  const abrirReenvio = (mensaje) => {
    if (!mensaje) return;
    setReenviarMensaje(mensaje);
    setMostrarReenvio(true);
  };

  const reenviarMensajeA = async (tipo, destino) => {
    if (!reenviarMensaje) return;
    const textoBase =
      reenviarMensaje.mensaje ||
      reenviarMensaje.archivo_nombre ||
      reenviarMensaje.enlace_compartido ||
      "Mensaje reenviado";
    const userDisplayName = user?.nickname || user?.name || "Usuario";
    const nombreGrupoOrigen =
      tipoChat === "grupal"
        ? (Array.isArray(grupos) &&
            grupos.find((g) => String(g.id) === String(chatActual))?.nombre) ||
          `Grupo ${chatActual}`
        : null;
    const origenChat =
      tipoChat === "general"
        ? "General"
        : tipoChat === "privado"
        ? chatActual
        : nombreGrupoOrigen;

    const bodyData = {
      mensaje: textoBase,
      tipo_mensaje: reenviarMensaje.archivo_url ? "archivo" : "texto",
      archivo_url: reenviarMensaje.archivo_url || null,
      archivo_nombre: reenviarMensaje.archivo_nombre || null,
      archivo_tipo: reenviarMensaje.archivo_tipo || null,
      archivo_tamaño: reenviarMensaje.archivo_tamaño || null,
      reenviado_de_usuario:
        reenviarMensaje.usuario_nickname || reenviarMensaje.de_nickname || userDisplayName,
      reenviado_de_chat: origenChat,
      reenviado_de_tipo: tipoChat || "general",
    };

    try {
      if (tipo === "general") {
        await authFetch(`${SERVER_URL}/api/chat/general`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyData),
        });
      } else if (tipo === "privado") {
        await authFetch(`${SERVER_URL}/api/chat/privado`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...bodyData, para_nickname: destino }),
        });
      } else if (tipo === "grupal") {
        await authFetch(`${SERVER_URL}/api/chat/grupos/${destino}/mensajes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyData),
        });
      }
      showAlert("Mensaje reenviado", "success");
      setMostrarReenvio(false);
      setReenviarMensaje(null);
    } catch (_e) {
      showAlert("No se pudo reenviar el mensaje.", "error");
    }
  };

  const fijarMensaje = async (mensaje) => {
    if (!mensaje?.id) {
      showAlert("Este mensaje aún no se puede fijar.", "warning");
      return;
    }
    const chatId = getChatIdActual();
    if (!chatId) return;
    try {
      await authFetch(`${SERVER_URL}/api/chat/pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo_chat: tipoChat,
          chat_id: chatId,
          mensaje_id: mensaje.id,
        }),
      });
      setMensajeFijado(mensaje);
      showAlert("Mensaje fijado", "success");
    } catch (_e) {
      showAlert("No se pudo fijar el mensaje.", "error");
    }
  };

  const desfijarMensaje = async () => {
    const chatId = getChatIdActual();
    if (!chatId || !tipoChat) return;
    try {
      await authFetch(`${SERVER_URL}/api/chat/pin`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo_chat: tipoChat, chat_id: chatId }),
      });
      setMensajeFijado(null);
      showAlert("Mensaje desfijado", "success");
    } catch (_e) {
      showAlert("No se pudo desfijar el mensaje.", "error");
    }
  };

  // eslint-disable-next-line no-unused-vars
  const toggleDestacarMensaje = async (mensaje) => {
    if (!mensaje?.id) return;
    const chatId = getChatIdActual();
    if (!chatId) return;
    try {
      const res = await authFetch(`${SERVER_URL}/api/chat/destacados`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo_chat: tipoChat,
          chat_id: chatId,
          mensaje_id: mensaje.id,
        }),
      });
      setMensajesDestacados((prev) => {
        const next = new Set(Array.from(prev).map(String));
        if (res?.destacado) {
          next.add(String(mensaje.id));
        } else {
          next.delete(String(mensaje.id));
        }
        return next;
      });
    } catch (_e) {
      showAlert("No se pudo destacar el mensaje.", "error");
    }
  };

  const togglePrioridadMensaje = async (mensaje) => {
    if (!mensaje?.id) return;
    try {
      const nuevaPrioridad = mensaje.prioridad === 1 ? 0 : 1;
      
      // Determinar si el mensaje tiene etiquetas (menciones)
      const tieneEtiqueta = mensaje.menciona && mensaje.menciona.trim();
      const usuarioActual = user?.nickname || user?.name;
      
      // En grupos: si el mensaje tiene etiqueta y no es para el usuario actual, no permitir marcar
      if (tipoChat === "grupal" && nuevaPrioridad === 0 && tieneEtiqueta && mensaje.menciona !== usuarioActual) {
        showAlert("Solo la persona etiquetada puede marcar este mensaje como realizado", "warning");
        return;
      }
      
      const res = await authFetch(`${SERVER_URL}/api/chat/mensaje/${tipoChat}/${mensaje.id}/prioridad`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prioridad: nuevaPrioridad,
          menciona: mensaje.menciona || null
        }),
      });
      
      if (res?.ok || res?.success) {
        // Actualizar el mensaje en el estado local
        if (tipoChat === "general") {
          setMensajesGeneral((prev) =>
            prev.map((m) => (m.id === mensaje.id ? { ...m, prioridad: nuevaPrioridad } : m))
          );
        } else if (tipoChat === "privado") {
          setMensajesPrivado((prev) => ({
            ...prev,
            [chatActual]: (prev[chatActual] || []).map((m) =>
              m.id === mensaje.id ? { ...m, prioridad: nuevaPrioridad } : m
            ),
          }));
        } else if (tipoChat === "grupal") {
          setMensajesGrupal((prev) => ({
            ...prev,
            [chatActual]: (prev[chatActual] || []).map((m) =>
              m.id === mensaje.id ? { ...m, prioridad: nuevaPrioridad } : m
            ),
          }));
        }
        
        showAlert(
          nuevaPrioridad === 1
            ? "Mensaje marcado como prioritario"
            : "Marcado como realizado. Todos pueden eliminar la notificación.",
          "success"
        );
        
        // Si se marcó como realizado, notificar al servidor para limpiar notificaciones
        if (nuevaPrioridad === 0 && tipoChat === "grupal") {
          try {
            await authFetch(`${SERVER_URL}/api/chat/mensaje/${tipoChat}/${mensaje.id}/limpiar-notificacion`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                grupoId: chatActual,
                tieneEtiqueta: !!tieneEtiqueta
              }),
            });
          } catch (_err) {
            /* noop */
          }
        }
      }
    } catch (_e) {
      showAlert("No se pudo cambiar la prioridad del mensaje.", "error");
    }
  };

  const renderMenuPreview = (mensaje, esMio, otroNickname) => {
    if (!mensaje) return null;
    return (
      <div className={`msg-menu-bubble ${esMio ? "out" : "in"}`}>
        {(tipoChat !== "privado" || !esMio) && (
          <div className="msg-menu-nombre">{esMio ? "Tú" : otroNickname}</div>
        )}
        <div className="msg-menu-texto">
          {mensaje.menciona && (
            <button
              type="button"
              className="msg-mention-link"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                abrirChat("privado", mensaje.menciona);
              }}
            >
              @{mensaje.menciona}
            </button>
          )}
          {mensaje.enlace_compartido && (
            <a
              href={mensaje.enlace_compartido.startsWith("http") ? mensaje.enlace_compartido : `#${mensaje.enlace_compartido}`}
              className="msg-enlace"
              target={esEnlaceExterno(mensaje.enlace_compartido) ? "_blank" : undefined}
              rel={esEnlaceExterno(mensaje.enlace_compartido) ? "noopener noreferrer" : undefined}
              onClick={(e) => {
                if (!mensaje.enlace_compartido.startsWith("http")) {
                  e.preventDefault();
                  abrirEnApp(mensaje.enlace_compartido);
                }
              }}
            >
              {mensaje.enlace_compartido}
            </a>
          )}
          {(!mensaje.enlace_compartido || mensaje.mensaje !== mensaje.enlace_compartido) && (
            <span
              className="msg-texto-html"
              dangerouslySetInnerHTML={{ 
                __html: formatearMensaje(
                  mensaje.menciona 
                    ? (mensaje.mensaje || "").replace(new RegExp(`@${mensaje.menciona}\\b`, 'gi'), '').trim()
                    : (mensaje.mensaje || "")
                )
              }}
            />
          )}
          {mensaje.archivo_nombre && (
            <span className="msg-menu-archivo">📎 {mensaje.archivo_nombre}</span>
          )}
        </div>
      </div>
    );
  };


  // ============================
  // ✏️ Editar mensaje
  // ============================
  const iniciarEdicion = (mensaje) => {
    setEditandoMensaje(mensaje.id);
    setTextoEdicion(mensaje.mensaje);
  };

  const cancelarEdicion = () => {
    setEditandoMensaje(null);
    setTextoEdicion("");
  };

  const guardarEdicion = async () => {
    if (!textoEdicion.trim() || !editandoMensaje) return;

    try {
      const tipo = tipoChat === "general" ? "general" : tipoChat === "privado" ? "privado" : "grupal";
      const response = await authFetch(`${SERVER_URL}/api/chat/mensaje/${tipo}/${editandoMensaje}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensaje: textoEdicion.trim() }),
      });

      if (response && response.mensaje) {
        // Actualizar mensaje localmente con la respuesta del servidor
        if (tipo === "general") {
          setMensajesGeneral((prev) =>
            prev.map((m) => (m.id === editandoMensaje ? response.mensaje : m))
          );
        } else if (tipo === "privado") {
          setMensajesPrivado((prev) => ({
            ...prev,
            [chatActual]: (prev[chatActual] || []).map((m) =>
              m.id === editandoMensaje ? response.mensaje : m
            ),
          }));
        } else if (tipo === "grupal") {
          setMensajesGrupal((prev) => ({
            ...prev,
            [chatActual]: (prev[chatActual] || []).map((m) =>
              m.id === editandoMensaje ? response.mensaje : m
            ),
          }));
        }
        cancelarEdicion();
        showAlert("Mensaje editado correctamente", "success");
      }
    } catch (err) {
      showAlert("Error al editar el mensaje: " + (err.message || "Error desconocido"), "error");
    }
  };

  // ============================
  // ➤ Enviar mensaje
  // ============================
  const enviarMensaje = async () => {
    const texto = mensajeInput.trim();
    if (!texto && !archivoAdjunto) return;

    if (tipoChat === "privado" && chatActual) {
      clearTimeout(typingStopTimerRef.current);
      emitirEstadoEscritura(chatActual, false);
    }

    // Usar nickname si existe, si no usar name
    const userDisplayName = user?.nickname || user?.name;
    if (!userDisplayName) {
      showAlert("No se puede enviar mensajes sin nickname o nombre. Por favor configura tu nickname en tu perfil.", "warning");
      return;
    }

    // Subir archivo si existe
    let archivoId = null;
    const esSticker = archivoAdjunto?.esSticker || (archivoAdjunto?.name?.toLowerCase().includes('sticker'));
    if (archivoAdjunto) {
      const archivoSubido = await subirArchivo(archivoAdjunto);
      if (archivoSubido) {
        archivoId = archivoSubido.id;
      } else {
        return; // Si falla la subida, no enviar mensaje
      }
    }

    // Detectar menciones y enlaces
    const menciones = detectarMenciones(texto);
    const menciona = menciones.length > 0 ? menciones[0] : null;
    const enlaceCompartido = detectarEnlacesApp(texto);

    const tipoMensaje = archivoAdjunto ? "archivo" : "texto";
    const replyInfo = respondiendoMensaje
      ? {
          reply_to_id: respondiendoMensaje.id || null,
          reply_to_user: respondiendoMensaje.usuario || null,
          reply_to_text: respondiendoMensaje.texto || null,
        }
      : {};

    // Si es sticker, formatear el mensaje como sticker
    let mensajeFinal = texto || archivoAdjunto?.name || "Archivo";
    if (esSticker && archivoId) {
      const nombreSticker = archivoAdjunto?.name?.replace(/\.(png|jpg|jpeg|gif|webp)$/i, '') || 'sticker';
      mensajeFinal = `[sticker:${archivoId}:${nombreSticker}]`;
    }

    // Limpiar inputs antes de enviar
    setMensajeInput("");
    setArchivoAdjunto(null);
    setRespondiendoMensaje(null);

    try {
      const bodyData = {
        mensaje: mensajeFinal,
        tipo_mensaje: tipoMensaje,
        archivo_id: archivoId,
        menciona,
        enlace_compartido: enlaceCompartido,
        ...replyInfo,
      };


      let respuesta;
      if (tipoChat === "general") {
        respuesta = await authFetch(`${SERVER_URL}/api/chat/general`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyData),
        });
        // Agregar el mensaje real directamente
        if (respuesta?.mensaje) {
          setMensajesGeneral((prev) => {
            // Evitar duplicados
            const existe = prev.some((m) => m.id === respuesta.mensaje.id);
            if (existe) return prev;
            return [...prev, respuesta.mensaje].sort((a, b) => {
              const fechaA = new Date(a.fecha || 0).getTime();
              const fechaB = new Date(b.fecha || 0).getTime();
              return fechaA - fechaB;
            });
          });
        }
      } else if (tipoChat === "privado") {
        respuesta = await authFetch(`${SERVER_URL}/api/chat/privado`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...bodyData, para_nickname: chatActual }),
        });
        // Agregar el mensaje real directamente
        if (respuesta?.mensaje) {
          setMensajesPrivado((prev) => {
            const mensajesExistentes = prev[chatActual] || [];
            // Evitar duplicados
            const existe = mensajesExistentes.some((m) => m.id === respuesta.mensaje.id);
            if (existe) return prev;
            return {
              ...prev,
              [chatActual]: [...mensajesExistentes, respuesta.mensaje].sort((a, b) => {
                const fechaA = new Date(a.fecha || 0).getTime();
                const fechaB = new Date(b.fecha || 0).getTime();
                return fechaA - fechaB;
              }),
            };
          });
          // Marcar como leído de inmediato si el backend ya lo registró (auto-mensaje)
          if (respuesta.mensaje.fecha_leido_otro) {
            setLecturasPrivadas((prev) => ({
              ...prev,
              [String(respuesta.mensaje.id)]: respuesta.mensaje.fecha_leido_otro,
            }));
          }
        }
      } else if (tipoChat === "grupal") {
        respuesta = await authFetch(`${SERVER_URL}/api/chat/grupos/${chatActual}/mensajes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyData),
        });
        // Agregar el mensaje real directamente
        if (respuesta?.mensaje) {
          setMensajesGrupal((prev) => {
            const mensajesExistentes = prev[chatActual] || [];
            // Evitar duplicados
            const existe = mensajesExistentes.some((m) => m.id === respuesta.mensaje.id);
            if (existe) return prev;
            return {
              ...prev,
              [chatActual]: [...mensajesExistentes, respuesta.mensaje].sort((a, b) => {
                const fechaA = new Date(a.fecha || 0).getTime();
                const fechaB = new Date(b.fecha || 0).getTime();
                return fechaA - fechaB;
              }),
            };
          });
        }
      }
    } catch (e) {
      
      // Manejar errores de restricción
      if (e?.restriccion) {
        if (e?.indefinida) {
          showAlert("No puedes enviar mensajes en este grupo (restricción indefinida)", "error");
        } else if (e?.minutos_restantes) {
          const horas = Math.floor(e.minutos_restantes / 60);
          const minutos = e.minutos_restantes % 60;
          const tiempoRestante = horas > 0 
            ? `${horas}h ${minutos}m`
            : `${minutos}m`;
          showAlert(`No puedes enviar mensajes en este grupo. Tiempo restante: ${tiempoRestante}`, "error");
        } else {
          showAlert("No puedes enviar mensajes en este grupo", "error");
        }
      } else {
        showAlert(e?.message || "No se pudo enviar el mensaje. Por favor intenta de nuevo.", "error");
      }
      
      // Restaurar inputs si falló
      setMensajeInput(texto);
      if (archivoAdjunto) {
        setArchivoAdjunto(archivoAdjunto);
      }
      if (respondiendoMensaje) {
        setRespondiendoMensaje(respondiendoMensaje);
      }
    }
  };

  // ============================
  // 🗑 Limpiar chat (SOLO ADMIN)
  // ============================
  const limpiarChat = async () => {
    if (tipoChat === "general" && !esAdmin) {
      showAlert("Solo los administradores pueden borrar chats generales", "warning");
      return;
    }

    const mensajeConfirmacion =
      tipoChat === "privado"
        ? "¿Borrar esta conversación solo para ti?"
        : "¿Borrar esta conversación? (Solo admin)";
    const confirmado = await showConfirm(mensajeConfirmacion, "Confirmar eliminación");
    if (!confirmado) return;

    try {
      if (tipoChat === "general") {
        await authFetch(`${SERVER_URL}/api/chat/general`, { method: "DELETE" });
        setMensajesGeneral([]);
      } else if (tipoChat === "privado") {
        await authFetch(`/api/chat/privado/${chatActual}`, { method: "DELETE" });
        setMensajesPrivado((prev) => {
          const copia = { ...prev };
          delete copia[chatActual];
          return copia;
        });
        setTipoChat(null);
        setChatActual(null);
      }
    } catch (e) {
      showAlert("Error borrando chat: " + (e.message || "Error desconocido"), "error");
    }
  };

  // ============================
  // 🗑 Borrar grupo (SOLO ADMIN)
  // ============================
  // eslint-disable-next-line no-unused-vars
  const borrarGrupo = async (grupoId) => {
    if (!esAdmin) {
      showAlert("Solo los administradores pueden borrar grupos", "warning");
      return;
    }

    const confirmado = await showConfirm("¿Borrar este grupo? (Solo admin)", "Confirmar eliminación");
    if (!confirmado) return;

    try {
      await authFetch(`/api/chat/grupos/${grupoId}`, { method: "DELETE" });
      // Recargar grupos
      const data = await authFetch("/api/chat/grupos");
      setGrupos(data || []);
      // Si estaba viendo ese grupo, cerrarlo
      if (tipoChat === "grupal" && String(chatActual) === String(grupoId)) {
        setTipoChat(null);
        setChatActual(null);
        setTabPrincipal("grupos");
      }
    } catch (e) {
      showAlert("Error borrando grupo: " + (e.message || "Error desconocido"), "error");
    }
  };

  // ============================
  // ➕ Crear grupo
  // ============================
  const crearGrupo = async () => {
    if (!nuevoGrupoNombre.trim()) return;

    try {
      await authFetch(`${SERVER_URL}/api/chat/grupos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nuevoGrupoNombre.trim(),
          descripcion: nuevoGrupoDesc.trim() || null,
          es_publico: nuevoGrupoEsPublico ? 1 : 0,
        }),
      });
      setNuevoGrupoNombre("");
      setNuevoGrupoDesc("");
      setNuevoGrupoEsPublico(true);
      setMostrarCrearGrupo(false);
      // Recargar grupos
      const data = await authFetch("/api/chat/grupos");
      setGrupos(data || []);
    } catch (_e) {
      /* noop */
    }
  };


  // ============================
  // 🔗 Detectar y compartir enlaces de la app
  // ============================
  const detectarEnlacesApp = (texto) => {
    // Detectar URLs completas
    const urlRegex = /https?:\/\/[^\s]+/gi;
    const urlMatch = texto.match(urlRegex);
    if (urlMatch && urlMatch.length > 0) {
      return urlMatch[0];
    }
    
    // Detectar rutas de la misma app (ej: /inventario, /picking, etc.)
    const rutasApp = [
      'inventario', 'picking', 'activaciones', 'activos', 'reportes', 
      'admin', 'administrador', 'reenvios', 'devoluciones', 'auditoria',
      'rep_picking', 'rep_reenvios', 'rep_devoluciones', 'rep_activaciones'
    ];
    
    for (const ruta of rutasApp) {
      const regex = new RegExp(`(?:^|\\s)(/${ruta}|${ruta})(?:\\s|$)`, 'gi');
      const match = texto.match(regex);
      if (match) {
        const rutaEncontrada = match[0].trim();
        // Convertir a URL completa de la app
        const baseUrl = window.location.origin;
        return rutaEncontrada.startsWith('/') 
          ? `${baseUrl}${rutaEncontrada}` 
          : `${baseUrl}/${rutaEncontrada}`;
      }
    }
    
    return null;
  };

  const obtenerPreviewEnlace = (link) => {
    if (!link || typeof link !== "string") return null;
    let url;
    try {
      // Si no tiene protocolo, agregarlo
      const linkConProtocolo = link.startsWith("http://") || link.startsWith("https://") 
        ? link 
        : `https://${link}`;
      url = new URL(linkConProtocolo);
    } catch {
      // Si no es una URL válida, retornar null
      return null;
    }
    
    const esInterno = url.origin === window.location.origin;
    const share = url.searchParams.get("share");
    const tab = url.searchParams.get("tab");
    
    // Si es un enlace interno con share o tab, generar preview especial
    if (esInterno && (share || tab)) {
      const pedido = url.searchParams.get("pedido");
      const tipo = url.searchParams.get("tipo");
      const titulo =
        share === "reenvio"
          ? "Reenvío compartido"
          : share === "devolucion"
          ? `Devolución ${tipo ? `(${tipo})` : ""}`.trim()
          : "Enlace compartido";
      const subtitulo = pedido ? `Pedido: ${pedido}` : url.pathname;

      const qrEndpoint =
        share === "devolucion"
          ? `${SERVER_URL}/devoluciones/qr`
          : `${SERVER_URL}/reenvios/qr`;
      const imageUrl = `${qrEndpoint}?data=${encodeURIComponent(link)}`;

      return {
        titulo,
        subtitulo,
        imageUrl,
        link: url.href,
        esInterno: true,
      };
    }
    
    // Para URLs externas o internas sin share/tab, generar preview genérico
    const dominio = url.hostname.replace('www.', '');
    const titulo = dominio || "Enlace compartido";
    const pathYQuery = (url.pathname + url.search).substring(0, 100);
    const subtitulo = pathYQuery || link;
    
    // Intentar obtener favicon del sitio
    const faviconUrl = `${url.origin}/android-chrome-192x192.png`;
    
    return {
      titulo,
      subtitulo,
      imageUrl: faviconUrl,
      link: url.href,
      esInterno: esInterno,
    };
  };

  const esEnlaceExterno = (link) => {
    if (!link || typeof link !== "string") return false;
    try {
      // Si no tiene protocolo, agregarlo para validar
      const linkConProtocolo = link.startsWith("http://") || link.startsWith("https://") 
        ? link 
        : `https://${link}`;
      const url = new URL(linkConProtocolo);
      return url.origin !== window.location.origin;
    } catch {
      return false;
    }
  };

  // Función para calcular la edad desde una fecha (años y meses)
  const calcularEdad = (fecha) => {
    if (!fecha) return null;
    try {
      const fechaNac = new Date(`${fecha}T00:00:00`);
      if (Number.isNaN(fechaNac.getTime())) return null;
      const hoy = new Date();
      
      let años = hoy.getFullYear() - fechaNac.getFullYear();
      let meses = hoy.getMonth() - fechaNac.getMonth();
      let días = hoy.getDate() - fechaNac.getDate();
      
      // Ajustar si aún no ha cumplido años
      if (meses < 0 || (meses === 0 && días < 0)) {
        años -= 1;
        meses += 12;
      }
      
      // Ajustar meses si el día aún no ha llegado este mes
      if (días < 0) {
        meses -= 1;
        if (meses < 0) {
          meses += 12;
          años -= 1;
        }
      }
      
      return años >= 0 ? { años, meses } : null;
    } catch (_e) {
      return null;
    }
  };

  const formatearFechaPerfil = (fecha) => {
    if (!fecha) return "No definido";
    try {
      const parsed = new Date(`${fecha}T00:00:00`);
      if (Number.isNaN(parsed.getTime())) return fecha;
      const etiqueta = new Intl.DateTimeFormat("es-MX", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(parsed);
      const antiguedad = calcularEdad(fecha);
      if (antiguedad) {
        const tiempo = antiguedad.meses > 0
          ? `${antiguedad.años} años y ${antiguedad.meses} ${antiguedad.meses === 1 ? "mes" : "meses"} en la empresa`
          : `${antiguedad.años} ${antiguedad.años === 1 ? "año" : "años"} en la empresa`;
        return `${etiqueta} (${tiempo})`;
      }
      return etiqueta;
    } catch (_e) {
      return fecha;
    }
  };

  const abrirPerfilUsuario = async (nickname) => {
    if (!nickname) return;
    setPerfilTipo("usuario");
    setPerfilAbierto(true);
    setPerfilTab("info");
    setPerfilData(null);
    setPerfilCompartidos([]);
    setPerfilError(null);
    setPerfilCargando(true);

    const fallbackPerfil = buildProfileFallback(nickname);
    if (fallbackPerfil) {
      setPerfilData(fallbackPerfil);
    }

    try {
      const perfil = await authFetch(`${SERVER_URL}/api/chat/usuario/${encodeURIComponent(nickname)}/perfil`);
      setPerfilData(perfil || fallbackPerfil || null);
    } catch (err) {
      if (Number(err?.status) === 429) {
        // Mantener fallback visible y no ensuciar la UI con error transitorio.
        setPerfilError(null);
      } else {
        setPerfilError(err?.message || "Error cargando información del usuario");
      }
    } finally {
      setPerfilCargando(false);
    }

    // Cargar compartidos de forma independiente (no bloquea el perfil)
    try {
      const compartidos = await authFetch(`${SERVER_URL}/api/chat/privado/${encodeURIComponent(nickname)}/compartidos`);
      setPerfilCompartidos(Array.isArray(compartidos) ? compartidos : []);
    } catch {
      setPerfilCompartidos([]);
    }
  };

  const _guardarMiPerfil = async () => {
    if (!user) return;
    setEditPerfilGuardando(true);
    try {
      const result = await authFetch(`${SERVER_URL}/api/warehouse/users/me/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          area: editPerfilArea,
          jobTitle: editPerfilCargo,
        }),
      });
      if (result?.ok === false) {
        showAlert(result?.message || "No se pudo guardar el perfil.", "error");
      } else {
        setPerfilData((prev) => ({ ...prev, cargo: editPerfilCargo, area: editPerfilArea }));
        setEditandoMiPerfil(false);
        showAlert("Perfil actualizado correctamente.", "success");
      }
    } catch (err) {
      showAlert(err?.message || "Error al guardar el perfil.", "error");
    } finally {
      setEditPerfilGuardando(false);
    }
  };

  const abrirPerfilGrupo = async (grupoId) => {
    if (!grupoId) return;
    setPerfilTipo("grupo");
    setPerfilAbierto(true);
    setPerfilTab("acerca");
    setPerfilData(null);
    setPerfilCompartidos([]);
      setPerfilGrupoMiembros([]);
      setPerfilGrupoAdmins([]);
      setPerfilGrupoRestricciones({});
      setMenuMiembroAbierto(null);
      setSubmenuRestriccionAbierto(null);
      setPerfilError(null);
    setPerfilCargando(true);

    try {
      const perfil = await authFetch(`${SERVER_URL}/api/chat/grupos/${grupoId}/perfil`);
      setPerfilData(perfil || null);
      setPerfilGrupoMiembros(perfil?.miembros || []);
      setPerfilGrupoAdmins(perfil?.administradores || []);
      setPerfilGrupoRestricciones(perfil?.restricciones || {});
      
      // Verificar si el usuario actual está restringido (solo si estamos viendo este grupo en el chat)
      if (tipoChat === "grupal" && String(chatActual) === String(grupoId)) {
        const userDisplayName = user?.nickname || user?.name;
        const restriccionUsuario = perfil?.restricciones?.[userDisplayName];
        if (restriccionUsuario) {
          setUsuarioRestringido(true);
          setRestriccionInfo(restriccionUsuario);
        } else {
          setUsuarioRestringido(false);
          setRestriccionInfo(null);
        }
      }
      
      // Cargar compartidos (todos los tipos)
      const compartidos = await authFetch(`${SERVER_URL}/api/chat/grupos/${grupoId}/compartidos`);
      setPerfilCompartidos(Array.isArray(compartidos) ? compartidos : []);
    } catch (err) {
      setPerfilError(err?.message || "Error cargando información del grupo");
    } finally {
      setPerfilCargando(false);
    }
  };

  const cerrarPerfilUsuario = () => {
    // No cerrar si estamos abriendo desde el sidebar
    if (abriendoPerfilDesdeSidebarRef.current) return;
    setPerfilAbierto(false);
    setPerfilTipo(null);
  };

  // Función auxiliar para obtener token de forma robusta
  const obtenerToken = () => {
    try {
      return localStorage.getItem("token");
    } catch (_e) {
      return null;
    }
  };

  const abrirArchivoPrivado = async (archivo) => {
    if (!archivo) return;
    setPreviewItem(archivo);
    setPreviewUrl(null);
    setPreviewBlob(null);
    setPreviewTextContent(null);
    setPreviewError(null);
    
    if (archivo.archivo_url) {
      setPreviewLoading(true);
      try {
        // Extraer el ID del archivo de la URL si es una URL de chat
        const archivoIdMatch = archivo.archivo_url.match(/\/chat\/archivo\/(\d+)/);
        let url;
        
        // Obtener token de autenticación (opcional, la sesión se maneja por cookies)
        const _authToken = obtenerToken();
        
        if (archivoIdMatch) {
          // Es un archivo del chat, usar la ruta del endpoint
          const archivoId = archivoIdMatch[1];
          url = `${SERVER_URL}/api/chat/archivo/${archivoId}`;
        } else if (/^\d+:\d+$/.test(archivo.archivo_url)) {
          // Formato antiguo: "63:1" -> convertir a "/chat/archivo/63"
          const archivoId = archivo.archivo_url.split(':')[0];
          url = `${SERVER_URL}/api/chat/archivo/${archivoId}`;
        } else {
          // Es una URL directa (por ejemplo, uploads/perfiles)
          if (archivo.archivo_url.startsWith("http")) {
            url = archivo.archivo_url;
          } else {
            url = `${SERVER_URL}${archivo.archivo_url.startsWith("/") ? archivo.archivo_url : `/${archivo.archivo_url}`}`;
          }
        }
        
        // Para imágenes y videos, usar la URL directamente con token en query (para que funcione en <img> y <video>)
        if (archivo.archivo_tipo?.startsWith("image/") || archivo.archivo_tipo?.startsWith("video/")) {
          const urlConToken = `${url}`;
          setPreviewUrl(urlConToken);
          setPreviewLoading(false);
        } else {
          // Para otros archivos (PDFs, documentos, etc.), cargar como blob
          
          const response = await fetch(url, {
            method: "GET",
            headers: {
                          },
            credentials: "include",
          });
          
          if (!response.ok) {
            let _errorText = "";
            try {
              _errorText = await response.text();
            } catch (_e) {
              _errorText = response.statusText || "Error desconocido";
            }
            
            // Si es 401, puede ser problema de autenticación
            if (response.status === 401) {
              throw new Error("Error de autenticación. Por favor, recarga la página e inicia sesión nuevamente.");
            }
            
            // Si es 404, el archivo no existe
            if (response.status === 404) {
              throw new Error("El archivo no se encontró en el servidor.");
            }
            
            throw new Error(`Error ${response.status}: ${response.statusText || "No se pudo cargar el archivo"}`);
          }
          
          const blob = await response.blob();
          
          if (blob.size === 0) {
            throw new Error("El archivo está vacío o no se pudo descargar correctamente");
          }
          
          setPreviewBlob(blob);
          
          // Para archivos de texto, leer el contenido como texto
          if (archivo.archivo_tipo?.startsWith("text/")) {
            try {
              const text = await blob.text();
              setPreviewTextContent(text);
            } catch (_e) {
              /* noop */
            }
          }
          
          // Crear URL del blob para mostrar en iframe/embed (sin descargar)
          const blobUrl = URL.createObjectURL(blob);
          setPreviewUrl(blobUrl);
          setPreviewLoading(false);
        }
      } catch (err) {
        const errorMsg = err.message || "Error desconocido al cargar el archivo";
        setPreviewError(errorMsg);
        showAlert(`No se pudo cargar el archivo: ${errorMsg}`, "error");
        setPreviewLoading(false);
      }
    } else {
      setPreviewError("No hay URL de archivo disponible");
      setPreviewLoading(false);
    }
  };

  const cerrarPreview = () => {
    // Liberar blob URL si existe para evitar memory leaks
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewItem(null);
    setPreviewUrl(null);
    setPreviewBlob(null);
    setPreviewTextContent(null);
    setPreviewError(null);
  };

  const abrirEnApp = async (url) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const obtenerRoomLlamada = () => {
    const normalizar = (valor) =>
      String(valor || "usuario")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-_]/g, "");
    const yo = normalizar(user?.nickname || user?.name || "usuario");
    if (tipoChat === "privado") {
      const otro = normalizar(chatActual || "usuario");
      return `copmec-${[yo, otro].sort().join("-")}`;
    }
    if (tipoChat === "grupal") {
      return `copmec-grupo-${normalizar(chatActual || "grupo")}`;
    }
    return `copmec-general-${yo}`;
  };

  const getIceServers = () => {
    if (rtcConfig?.iceServers?.length) return rtcConfig.iceServers;
    return [{ urls: "stun:stun.l.google.com:19302" }];
  };

  const actualizarRemoteStreams = () => {
    const lista = Object.entries(remoteStreamsRef.current).map(([id, stream]) => {
      const tracks = stream.getTracks();
      console.log('[STREAMS] Stream', id, '-', tracks.map(t => `${t.kind}(${t.enabled})`).join(',') || 'sin tracks');
      return {
        id,
        stream,
        nickname: peerConnectionsRef.current[id]?.nickname || "Usuario",
      };
    });
    console.log('[STREAMS] Total:', lista.length, 'streams remotos');
    setRemoteStreams(lista);
  };

  const limpiarPeer = (socketId) => {
    if (peerDisconnectTimersRef.current[socketId]) {
      clearTimeout(peerDisconnectTimersRef.current[socketId]);
      delete peerDisconnectTimersRef.current[socketId];
    }
    const pc = peerConnectionsRef.current[socketId]?.pc;
    if (pc) {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      pc.oniceconnectionstatechange = null;
      pc.close();
    }
    delete peerConnectionsRef.current[socketId];
    delete remoteStreamsRef.current[socketId];
    delete pendingCandidatesRef.current[socketId];
    actualizarRemoteStreams();
  };

  const limpiarLlamada = () => {
    if (outgoingCallTimeoutRef.current) {
      clearTimeout(outgoingCallTimeoutRef.current);
      outgoingCallTimeoutRef.current = null;
    }
    if (outgoingRingRef.current) {
      clearInterval(outgoingRingRef.current);
      outgoingRingRef.current = null;
    }
    if (socket) socket.emit("set_in_call", { inCall: false });
    Object.keys(peerConnectionsRef.current).forEach(limpiarPeer);
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    localStreamRef.current = null;
    setLocalStream(null);
    setCallActivo(false);
    setCallExpanded(false);
    setCallMainView("remote");
    setCallMainRemoteId(null);
    setCallInvitePickerOpen(false);
    setCallInviteSelection({});
    setCallIncoming(null);
    setCallMuted(false);
    setCallVideoOff(false);
    setCallFacingMode("user");
    setSwitchingCamera(false);
    setSharingScreen(false);
    callRoomRef.current = null;
    callTransportRef.current = null;
    pendingInviteTransportRef.current = null;
  };

  const crearPeerConnection = (socketId, nickname) => {
    if (peerConnectionsRef.current[socketId]?.pc) {
      return peerConnectionsRef.current[socketId].pc;
    }
    const pc = new RTCPeerConnection({ iceServers: getIceServers() });
    const local = localStreamRef.current;
    if (local) {
      const tracks = local.getTracks();
      console.log('[PC] Agregando', tracks.length, 'tracks a pc de', socketId, '-', tracks.map(t => t.kind).join(','));
      tracks.forEach((track) => pc.addTrack(track, local));
    }
    pc.onicecandidate = (event) => {
      if (event.candidate && callRoomRef.current) {
        if (socket && socket.connected && !isRestPeerId(socketId)) {
          socket.emit("call_ice", {
            to: socketId,
            room: callRoomRef.current,
            candidate: event.candidate,
          });
        } else {
          sendCallSignalFallback({
            type: "ice",
            room: callRoomRef.current,
            toNicknames: nickname ? [nickname] : [],
            candidate: event.candidate,
            nickname: user?.nickname || user?.name || "Usuario",
            fromPeerId: buildRestPeerId(user?.nickname || user?.name || "usuario"),
          }).catch(() => {});
        }
      }
    };
    pc.ontrack = (event) => {
      console.log('[ONTRACK] Track remoto de', socketId, '-', event.track.kind, '- enabled:', event.track.enabled);
      if (!remoteStreamsRef.current[socketId]) {
        console.log('[ONTRACK] Creando nuevo MediaStream para', socketId);
        remoteStreamsRef.current[socketId] = new MediaStream();
      }
      // Agregar todos los tracks del evento
      event.streams.forEach((stream, idx) => {
        stream.getTracks().forEach((track) => {
          console.log('[ONTRACK] Agregando track:', track.kind, 'enabled:', track.enabled, '- stream idx:', idx);
          if (!remoteStreamsRef.current[socketId].getTracks().find(t => t.id === track.id)) {
            remoteStreamsRef.current[socketId].addTrack(track);
          }
        });
      });
      actualizarRemoteStreams();
    };

    const scheduleDisconnectCleanup = () => {
      if (peerDisconnectTimersRef.current[socketId]) return;
      peerDisconnectTimersRef.current[socketId] = setTimeout(() => {
        delete peerDisconnectTimersRef.current[socketId];
        const currentPc = peerConnectionsRef.current[socketId]?.pc;
        if (!currentPc) return;
        const connectionState = currentPc.connectionState;
        const iceState = currentPc.iceConnectionState;
        const stillDisconnected =
          ["disconnected", "failed", "closed"].includes(connectionState) ||
          ["disconnected", "failed", "closed"].includes(iceState);
        if (stillDisconnected) {
          console.log("[PC] Limpieza por desconexion sostenida:", socketId, connectionState, iceState);
          limpiarPeer(socketId);
        }
      }, 8000);
    };

    const clearDisconnectCleanup = () => {
      if (!peerDisconnectTimersRef.current[socketId]) return;
      clearTimeout(peerDisconnectTimersRef.current[socketId]);
      delete peerDisconnectTimersRef.current[socketId];
    };

    pc.onconnectionstatechange = () => {
      if (["connected"].includes(pc.connectionState)) {
        clearDisconnectCleanup();
        return;
      }
      if (["failed", "closed"].includes(pc.connectionState)) {
        limpiarPeer(socketId);
        return;
      }
      if (pc.connectionState === "disconnected") {
        scheduleDisconnectCleanup();
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (["connected", "completed"].includes(pc.iceConnectionState)) {
        clearDisconnectCleanup();
        return;
      }
      if (["failed", "closed"].includes(pc.iceConnectionState)) {
        limpiarPeer(socketId);
        return;
      }
      if (pc.iceConnectionState === "disconnected") {
        scheduleDisconnectCleanup();
      }
    };
    peerConnectionsRef.current[socketId] = { pc, nickname };
    const pendientes = pendingCandidatesRef.current[socketId];
    if (pendientes?.length) {
      pendientes.forEach((c) => {
        pc.addIceCandidate(c).catch(() => {});
      });
      delete pendingCandidatesRef.current[socketId];
    }
    return pc;
  };

  const asegurarLocalStream = async () => {
    if (localStreamRef.current) {
      console.log('[STREAM] Stream ya existe, reutilizando');
      setLocalStream(localStreamRef.current);
      return localStreamRef.current;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      const msg = "Tu dispositivo no soporta videollamadas.";
      console.error('[STREAM]', msg);
      throw new Error(msg);
    }
    try {
      console.log('[STREAM] Solicitando acceso a cámara y micrófono...');
      const constraints = {
        video: {
          facingMode: callFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream); // Disparar useEffect para sincronización
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      console.log('[STREAM] Local stream obtenido - Video:', videoTrack?.label || 'N/A', 'Audio:', audioTrack?.label || 'N/A');
      return stream;
    } catch (err) {
      const name = String(err?.name || "");
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        throw new Error("Permite camara y microfono para iniciar la videollamada.");
      }
      if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        throw new Error("No se encontraron camara o microfono disponibles.");
      }
      throw new Error("No se pudo acceder a la camara/microfono.");
    }
  };

  const esperarConexionSocket = async (timeoutMs = 9000) => {
    if (!socket) return false;
    if (socket.connected) return true;

    return await new Promise((resolve) => {
      let settled = false;
      const cleanup = () => {
        socket.off("connect", onConnect);
        socket.off("connect_error", onConnectError);
        clearTimeout(timer);
      };
      const onConnect = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(true);
      };
      const onConnectError = () => {
        // Esperar al timeout: Socket.IO puede recuperarse solo.
      };
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(false);
      }, timeoutMs);

      socket.on("connect", onConnect);
      socket.on("connect_error", onConnectError);
      try {
        socket.connect();
      } catch (_) { /* noop */ }
    });
  };

  const iniciarLlamada = async () => {
    if (tipoChat !== "privado" && tipoChat !== "grupal") {
      showAlert("La videollamada solo está disponible en chats privados y grupos.", "warning");
      return;
    }
    try {
      const room = obtenerRoomLlamada();
      const userDisplayName = user?.nickname || user?.name || "usuario";
      const destinatarios = [];
      if (tipoChat === "privado") {
        if (chatActual) destinatarios.push(chatActual);
      } else if (tipoChat === "grupal") {
        const grupo = Array.isArray(grupos)
          ? grupos.find((g) => String(g.id) === String(chatActual))
          : null;
        if (grupo?.miembros?.length) {
          destinatarios.push(...grupo.miembros);
        }
      }
      const unicos = Array.from(new Set(destinatarios)).filter((n) => {
        if (!n) return false;
        return normalizeCallNick(n) !== normalizeCallNick(userDisplayName);
      });
      
      // Paralelizar: obtener stream y conectar socket simultáneamente
      const [streamResult, connected] = await Promise.all([
        asegurarLocalStream().catch(() => null),
        esperarConexionSocket(3000), // Reducir a 3s
      ]);

      if (!streamResult) {
        showAlert("No se pudo acceder a cámara/micrófono para iniciar la videollamada.", "error");
        return;
      }

      setCallActivo(true);
      setCallMainView("remote");
      setCallMainRemoteId(null);
      placePipBottomRight();
      callRoomRef.current = room;

      const emitirInvitacion = () => {
        socket.emit("set_in_call", { inCall: true });
        socket.emit("call_invite", {
          room,
          fromNickname: userDisplayName,
          toNicknames: unicos,
          tipo: tipoChat,
        });
        socket.emit("call_join", { room, nickname: userDisplayName });
      };

      // Ring saliente — suena mientras espera que contesten
      playOutgoingCallTone();
      outgoingRingRef.current = setInterval(() => playOutgoingCallTone(), 3200);
      outgoingCallTimeoutRef.current = setTimeout(() => {
        if (callRoomRef.current !== room) return;
        showAlert("No hubo respuesta a la videollamada. Intento finalizado.", "warning");
        colgarLlamada();
      }, 45000);

      if (connected && socket.connected) {
        callTransportRef.current = "socket";
        emitirInvitacion();
        return;
      }

      callTransportRef.current = "rest";
      const fallbackResult = await sendCallSignalFallback({
        type: "invite",
        room,
        toNicknames: unicos,
        nickname: userDisplayName,
        fromPeerId: buildRestPeerId(userDisplayName),
      });
      const delivered = Number(fallbackResult?.delivered || 0);
      if (delivered > 0) {
        showAlert(`✓ Invitación enviada por canal alterno a ${delivered} usuario(s)`, "success");
        return;
      }
      showAlert("No se pudo iniciar la llamada por el canal alterno.", "error");
      limpiarLlamada();
    } catch (err) {
      showAlert(err?.message || "No se pudo iniciar la videollamada.", "error");
      limpiarLlamada();
    }
  };

  const aceptarLlamada = async () => {
    if (!callIncoming) return;
    try {
      playCallSound("accept");
      const userDisplayName = user?.nickname || user?.name || "usuario";
      const room = callIncoming.room;
      
      // Paralelizar: obtener stream y conectar socket simultáneamente
      const [streamResult] = await Promise.all([
        asegurarLocalStream().catch(() => null),
        esperarConexionSocket(3000), // Reducir a 3s (antes 9s)
      ]);
      
      if (!streamResult) {
        showAlert("No se pudo acceder a cámara/micrófono.", "error");
        return;
      }
      
      setCallActivo(true);
      setCallMainView("remote");
      setCallMainRemoteId(null);
      placePipBottomRight();
      callRoomRef.current = room;

      const unirLlamada = () => {
        socket.emit("set_in_call", { inCall: true });
        // 🔔 Cancelar invitación en otros dispositivos del usuario
        socket.emit("call_accepted", { 
          room, 
          fromNickname: callIncoming.fromNickname 
        });
        socket.emit("call_join", { room, nickname: userDisplayName });
      };

      const connected = await esperarConexionSocket(2000);
      const preferSocket = pendingInviteTransportRef.current === "socket";
      if (preferSocket && connected && socket.connected && !isRestPeerId(callIncoming?.fromSocketId)) {
        callTransportRef.current = "socket";
        unirLlamada();
      } else {
        callTransportRef.current = "rest";
        const fallbackResult = await sendCallSignalFallback({
          type: "join",
          room,
          toNicknames: [callIncoming.fromNickname].filter(Boolean),
          nickname: userDisplayName,
          fromPeerId: buildRestPeerId(userDisplayName),
        });
        if (!Number(fallbackResult?.delivered || 0)) {
          showAlert("No se pudo aceptar la llamada por el canal alterno.", "error");
          limpiarLlamada();
          return;
        }
      }

      setCallIncoming(null);
    } catch (err) {
      showAlert(err?.message || "No se pudo aceptar la videollamada.", "error");
      limpiarLlamada();
    }
  };

  const rechazarLlamada = () => {
    playCallSound("reject");
    if (socket && socket.connected) socket.emit("set_in_call", { inCall: false });
    if (socket && socket.connected && callIncoming?.room && callIncoming?.fromSocketId && !isRestPeerId(callIncoming.fromSocketId)) {
      const userDisplayName = user?.nickname || user?.name || "Usuario";
      socket.emit("call_reject", {
        to: callIncoming.fromSocketId,
        room: callIncoming.room,
        nickname: userDisplayName,
      });
    } else if (callIncoming?.room && callIncoming?.fromNickname) {
      sendCallSignalFallback({
        type: "reject",
        room: callIncoming.room,
        toNicknames: [callIncoming.fromNickname],
        nickname: user?.nickname || user?.name || "Usuario",
        fromPeerId: buildRestPeerId(user?.nickname || user?.name || "usuario"),
      }).catch(() => {});
    }
    setCallIncoming(null);
  };

  const colgarLlamada = () => {
    playCallSound("hangup");
    if (socket && socket.connected && callRoomRef.current) {
      socket.emit("call_leave", { room: callRoomRef.current });
    } else if (callRoomRef.current) {
      sendCallSignalFallback({
        type: "leave",
        room: callRoomRef.current,
        toNicknames: getPeerNicknamesForFallback(),
        nickname: user?.nickname || user?.name || "Usuario",
        fromPeerId: buildRestPeerId(user?.nickname || user?.name || "usuario"),
      }).catch(() => {});
    }
    limpiarLlamada();
  };

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setCallMuted(stream.getAudioTracks().some((t) => !t.enabled));
  };

  const toggleVideo = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setCallVideoOff(stream.getVideoTracks().some((t) => !t.enabled));
  };

  const replaceLocalVideoTrack = async (videoTrack, streamContainer, stopPreviousTrack = true) => {
    if (!videoTrack) return;
    Object.values(peerConnectionsRef.current).forEach(({ pc }) => {
      const sender = pc?.getSenders().find((s) => s.track?.kind === "video");
      if (sender) sender.replaceTrack(videoTrack);
    });

    if (localStreamRef.current) {
      const previousVideo = localStreamRef.current.getVideoTracks()[0];
      if (previousVideo) {
        localStreamRef.current.removeTrack(previousVideo);
        if (stopPreviousTrack) previousVideo.stop();
      }
      localStreamRef.current.addTrack(videoTrack);
    } else {
      localStreamRef.current = streamContainer;
    }

    setLocalStream(localStreamRef.current);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  };

  const getCameraStreamForFacingMode = async (facingMode, releaseCurrent = false) => {
    if (releaseCurrent) {
      const currentVideo = localStreamRef.current?.getVideoTracks?.()[0];
      if (currentVideo && localStreamRef.current) {
        localStreamRef.current.removeTrack(currentVideo);
        try { currentVideo.stop(); } catch { /* noop */ }
      }
    }

    const common = {
      width: { ideal: 1280 },
      height: { ideal: 720 },
    };

    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { ...common, facingMode: { exact: facingMode } },
        audio: false,
      });
    } catch {
      return await navigator.mediaDevices.getUserMedia({
        video: { ...common, facingMode },
        audio: false,
      });
    }
  };

  const cambiarCamara = async () => {
    if (!callActivo || switchingCamera) return;
    if (sharingScreen) {
      showAlert("Desactiva compartir pantalla antes de cambiar de cámara.", "warning");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      showAlert("Este dispositivo no permite cambiar la cámara.", "warning");
      return;
    }

    const nextFacingMode = callFacingMode === "user" ? "environment" : "user";
    setSwitchingCamera(true);
    try {
      try {
        const currentVideo = localStreamRef.current?.getVideoTracks?.()[0];
        if (currentVideo?.applyConstraints) {
          await currentVideo.applyConstraints({ facingMode: nextFacingMode });
          setCallFacingMode(nextFacingMode);
          setCallVideoOff(!currentVideo.enabled);
          return;
        }
      } catch {
        // fallback below
      }

      let camStream;
      try {
        camStream = await getCameraStreamForFacingMode(nextFacingMode, false);
      } catch (firstErr) {
        const firstName = String(firstErr?.name || "");
        if (firstName === "NotReadableError" || firstName === "AbortError" || firstName === "TrackStartError") {
          camStream = await getCameraStreamForFacingMode(nextFacingMode, true);
        } else {
          throw firstErr;
        }
      }

      const newVideo = camStream.getVideoTracks()[0];
      if (!newVideo) {
        throw new Error("No se pudo obtener video de la cámara seleccionada.");
      }
      await replaceLocalVideoTrack(newVideo, camStream, true);
      setCallFacingMode(nextFacingMode);
    } catch (err) {
      showAlert(err?.message || "No se pudo cambiar la cámara en este dispositivo.", "warning");
    } finally {
      setSwitchingCamera(false);
    }
  };

  const stopScreenShare = async () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    try {
      const camStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: callFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      const camTrack = camStream.getVideoTracks()[0];
      await replaceLocalVideoTrack(camTrack, camStream, true);
    } catch { /* noop */ }
    setSharingScreen(false);
  };

  const toggleScreenShare = async () => {
    if (!callActivo) return;
    const userAgent = String(navigator?.userAgent || "").toLowerCase();
    const isMobileDevice =
      /android|iphone|ipad|ipod|mobile/.test(userAgent) ||
      Boolean(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
    if (isMobileDevice) {
      showAlert("Compartir pantalla se oculta en móviles para evitar fallos de compatibilidad.", "warning");
      return;
    }
    if (sharingScreen) {
      await stopScreenShare();
      return;
    }
    // Permitir screen share si getDisplayMedia está disponible (funciona en algunos móviles)
    if (!navigator.mediaDevices?.getDisplayMedia) {
      showAlert("Compartir pantalla no está disponible en este navegador.", "warning");
      return;
    }
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      screenStreamRef.current = screenStream;
      const screenTrack = screenStream.getVideoTracks()[0];
      await replaceLocalVideoTrack(screenTrack, screenStream, true);
      setSharingScreen(true);
      screenTrack.addEventListener("ended", () => stopScreenShare(), { once: true });
    } catch (err) {
      console.log('[SCREEN] Screen share denied or unavailable:', err.message);
      // No mostrar error si el usuario canceló
      if (err.name !== 'NotAllowedError') {
        showAlert("No se pudo compartir la pantalla. " + err.message, "warning");
      }
    }
  };

  const abrirVideollamada = async () => {
    await iniciarLlamada();
  };

  const mainRemoteStream = remoteStreams.find((item) => item.id === callMainRemoteId) || remoteStreams[0] || null;
  const remoteThumbnails = remoteStreams.filter((item) => !mainRemoteStream || item.id !== mainRemoteStream.id);
  const callInviteCandidates = getCallCandidates();
  const callIsMobile = /android|iphone|ipad|ipod|mobile/i.test(String(navigator?.userAgent || ""));
  const canShowScreenShare = !callIsMobile;

  useEffect(() => {
    if (!callActivo) return;
    if (!remoteStreams.length) {
      setCallMainRemoteId(null);
      setCallMainView("local");
      return;
    }
    if (!callMainRemoteId || !remoteStreams.some((item) => item.id === callMainRemoteId)) {
      setCallMainRemoteId(remoteStreams[0].id);
      setCallMainView("remote");
    }
  }, [callActivo, callMainRemoteId, remoteStreams]);

  useEffect(() => {
    if (!callActivo) return;
    placePipBottomRight();
  }, [callActivo, callExpanded]);

  // blobToBase64 removida (no usada en web-only)
  // solicitarPermisoAlmacenamiento removida (no usada en web-only)

  const descargarArchivoPrivado = async (archivo) => {
    if (!archivo?.archivo_url) return;
    try {
      let blob = previewBlob;
      if (!blob) {
        const response = await fetch(`${SERVER_URL}${archivo.archivo_url}`, {
          method: "GET",
          headers: {},
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error("No se pudo descargar el archivo");
        }
        blob = await response.blob();
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = archivo.archivo_nombre || "archivo";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (_err) {
      showAlert("No se pudo descargar el archivo.", "error");
    }
  };


  // ============================
  // ➕ Agregar miembro a grupo
  // ============================
  const agregarMiembroAGrupo = async (grupoId, usuarioNickname) => {
    try {
      await authFetch(`/api/chat/grupos/${grupoId}/miembros`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario_nickname: usuarioNickname }),
      });
      
      // Mostrar mensaje de éxito (el modal se actualizará automáticamente)
      
      // Recargar grupos para actualizar la lista de miembros
      const data = await authFetch("/api/chat/grupos");
      setGrupos(data || []);
      
      // Si estamos viendo ese grupo, recargar también los mensajes
      if (tipoChat === "grupal" && String(chatActual) === String(grupoId)) {
        const mensajesData = await authFetch(`/api/chat/grupos/${grupoId}/mensajes`);
        setMensajesGrupal((prev) => ({
          ...prev,
          [grupoId]: mensajesData || [],
        }));
      }
      
      // NO cerrar el modal, permitir agregar más usuarios
    } catch (e) {
      showAlert("Error agregando miembro: " + (e.message || "Error desconocido"), "error");
    }
  };

  // ============================
  // 🎯 Abrir chat
  // ============================
  const abrirChat = async (tipo, destino) => {
    salirSeleccion();
    setTipoChat(tipo);
    setChatActual(destino);
    setTabPrincipal("chats");
    setNoLeidos(0);
    setMostrarAgregarMiembros(false);
    setGrupoMenuAbierto(null);
    // No cerrar el perfil si estamos abriendo desde el sidebar
    if (!abriendoPerfilDesdeSidebarRef.current) {
      setPerfilAbierto(false);
    }
    setPerfilTab("acerca");
    setPerfilData(null);
    setPerfilCompartidos([]);
    setPerfilError(null);
    setPerfilCargando(false);
    
    // Marcar mensajes como leídos automáticamente al abrir el chat
    try {
      if (tipo === "privado" && destino) {
        // Limpiar contador localmente primero para respuesta inmediata
        setChatsActivos((prev) =>
          prev.map((c) =>
            c.otro_usuario === destino ? { ...c, mensajes_no_leidos: 0 } : c
          )
        );
        
        // Marcar mensajes como leídos en el servidor
        await authFetch(`${SERVER_URL}/api/chat/privado/${destino}/leer`, {
          method: "POST",
        });
        
        // Recargar chats activos para sincronizar con el servidor
        const data = await authFetch(`${SERVER_URL}/api/chat/activos`);
        setChatsActivos(data || []);
      } else if (tipo === "general") {
        // Marcar mensajes generales como leídos
        await authFetch(`${SERVER_URL}/api/chat/general/leer`, {
          method: "POST",
        });
      } else if (tipo === "grupal" && destino) {
        // Marcar mensajes grupales como leídos
        await authFetch(`${SERVER_URL}/api/chat/grupos/${destino}/leer`, {
          method: "POST",
        });
      }
    } catch (_e) {
      /* noop */
    }
  };
  
  // ============================
  // 📁 Funciones para grupos desplegables
  // ============================
  const toggleChatGroupCollapse = (groupName) => {
    setGruposChatsCollapsed(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };
  
  const toggleGrupoGroupCollapse = (groupName) => {
    setGruposGruposCollapsed(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };
  
  const agruparChats = () => {
    const grouped = {};
    chatsActivos.forEach(chat => {
      const groupName = chatGroups[chat.otro_usuario];
      if (groupName) {
        if (!grouped[groupName]) {
          grouped[groupName] = [];
        }
        grouped[groupName].push(chat);
      }
    });
    // Agregar chats sin grupo al final, sin etiqueta
    const sinGrupo = chatsActivos.filter(chat => !chatGroups[chat.otro_usuario]);
    if (sinGrupo.length > 0) {
      grouped['__sin_grupo__'] = sinGrupo;
    }
    return grouped;
  };
  
  const agruparGrupos = () => {
    const grouped = {};
    grupos.forEach(grupo => {
      const groupName = grupoGroups[grupo.id];
      if (groupName) {
        if (!grouped[groupName]) {
          grouped[groupName] = [];
        }
        grouped[groupName].push(grupo);
      }
    });
    // Agregar grupos sin carpeta al final, sin etiqueta
    const sinGrupo = grupos.filter(grupo => !grupoGroups[grupo.id]);
    if (sinGrupo.length > 0) {
      grouped['__sin_grupo__'] = sinGrupo;
    }
    return grouped;
  };
  
  const tieneNoLeidosEnGrupo = (items, esChat = true) => {
    return items.some(item => {
      if (esChat) {
        return item.mensajes_no_leidos > 0;
      } else {
        // Para grupos, necesitamos verificar si hay mensajes no leídos
        // Esto se podría extender con más lógica si es necesario
        return false;
      }
    });
  };
  
  // Funciones para gestionar carpetas/grupos desplegables
  const asignarACarpeta = (itemId, itemTipo, carpetaNombre) => {
    if (itemTipo === 'chat') {
      setChatGroups(prev => ({
        ...prev,
        [itemId]: carpetaNombre
      }));
      // Guardar en localStorage
      const saved = JSON.parse(localStorage.getItem('chatGroups') || '{}');
      saved[itemId] = carpetaNombre;
      localStorage.setItem('chatGroups', JSON.stringify(saved));
    } else if (itemTipo === 'grupo') {
      setGrupoGroups(prev => ({
        ...prev,
        [itemId]: carpetaNombre
      }));
      // Guardar en localStorage
      const saved = JSON.parse(localStorage.getItem('grupoGroups') || '{}');
      saved[itemId] = carpetaNombre;
      localStorage.setItem('grupoGroups', JSON.stringify(saved));
    }
    setMenuGrupoChat(null);
    setMenuGrupoGrupo(null);
  };
  
  const crearYAsignarCarpeta = (itemId, itemTipo) => {
    setModalGrupoAccion({ tipo: 'crear', itemId, itemTipo });
    setModalGrupoNombre('');
  };
  
  const renombrarCarpeta = (carpetaNombreAntiguo) => {
    setModalGrupoAccion({ tipo: 'renombrar', carpetaNombreAntiguo });
    setModalGrupoNombre(carpetaNombreAntiguo);
  };
  
  const confirmarAccionCarpeta = () => {
    if (!modalGrupoNombre.trim()) {
      showAlert('Por favor ingresa un nombre para la carpeta', 'warning');
      return;
    }
    
    if (modalGrupoAccion.tipo === 'crear') {
      asignarACarpeta(modalGrupoAccion.itemId, modalGrupoAccion.itemTipo, modalGrupoNombre.trim());
    } else if (modalGrupoAccion.tipo === 'renombrar') {
      const nombreAntiguo = modalGrupoAccion.carpetaNombreAntiguo;
      const nombreNuevo = modalGrupoNombre.trim();
      
      // Renombrar en chatGroups
      const newChatGroups = { ...chatGroups };
      Object.keys(newChatGroups).forEach(key => {
        if (newChatGroups[key] === nombreAntiguo) {
          newChatGroups[key] = nombreNuevo;
        }
      });
      setChatGroups(newChatGroups);
      localStorage.setItem('chatGroups', JSON.stringify(newChatGroups));
      
      // Renombrar en grupoGroups
      const newGrupoGroups = { ...grupoGroups };
      Object.keys(newGrupoGroups).forEach(key => {
        if (newGrupoGroups[key] === nombreAntiguo) {
          newGrupoGroups[key] = nombreNuevo;
        }
      });
      setGrupoGroups(newGrupoGroups);
      localStorage.setItem('grupoGroups', JSON.stringify(newGrupoGroups));
    }
    
    setModalGrupoAccion(null);
    setModalGrupoNombre('');
  };
  
  // Cargar grupos desde localStorage al inicio
  React.useEffect(() => {
    const savedChatGroups = localStorage.getItem('chatGroups');
    const savedGrupoGroups = localStorage.getItem('grupoGroups');
    if (savedChatGroups) {
      try {
        setChatGroups(JSON.parse(savedChatGroups));
      } catch (_e) {
        /* noop */
      }
    }
    if (savedGrupoGroups) {
      try {
        setGrupoGroups(JSON.parse(savedGrupoGroups));
      } catch (_e) {
        /* noop */
      }
    }
  }, []);

  // Obtener mensajes actuales
  const mensajesActuales =
    tipoChat === "general"
      ? mensajesGeneral
      : tipoChat === "privado"
      ? mensajesPrivado[chatActual] || []
      : tipoChat === "grupal"
      ? mensajesGrupal[chatActual] || []
      : [];

  const compartidosImagenes = perfilCompartidos.filter(
    (item) => item.archivo_url && item.archivo_tipo?.startsWith("image/")
  );
  const compartidosVideos = perfilCompartidos.filter(
    (item) => item.archivo_url && item.archivo_tipo?.startsWith("video/")
  );
  const compartidosArchivos = perfilCompartidos.filter(
    (item) =>
      item.archivo_url &&
      !item.archivo_tipo?.startsWith("image/") &&
      !item.archivo_tipo?.startsWith("video/")
  );
  const compartidosEnlaces = perfilCompartidos.filter(
    (item) => item.enlace_compartido
  );
  const previewTipo = previewItem?.enlace_compartido
    ? "enlace"
    : previewItem?.archivo_tipo?.startsWith("image/")
    ? "imagen"
    : previewItem?.archivo_tipo?.startsWith("video/")
    ? "video"
    : previewItem?.archivo_url
    ? "archivo"
    : null;

  return (
    <>
      {/* BOTÓN FLOTANTE - OCULTAR si viene del menú inferior */}
      {!open && !onClose && (
        <button className="chat-boton-pro" onClick={abrirCerrarChat}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          {(() => {
            // Usar chatsActivos como fuente de verdad (incluye no-leídos del servidor)
            // y noLeidos como respaldo para mensajes llegados antes de que carguen los chats
            const fromChats = chatsActivos.reduce((t, c) => t + (c.mensajes_no_leidos || 0), 0);
            const total = Math.max(noLeidos, fromChats);
            return total > 0 ? (
              <span className="chat-badge">{total > 99 ? "99+" : total}</span>
            ) : null;
          })()}
        </button>
      )}

      {/* OVERLAY */}
      {open && <div className="chat-overlay" onClick={abrirCerrarChat} />}

      {/* PANEL */}
      {open && (
        <div className={`chat-pro-ventana ${tipoChat && window.innerWidth <= 980 ? 'mobile-chat-open' : ''}`}>
          {/* Botón volver en móvil */}
          {tipoChat && window.innerWidth <= 980 && (
            <button 
              className="chat-back-button"
              onClick={() => {
                setTipoChat(null);
                setChatActual(null);
                setTabPrincipal("chats");
              }}
            >
              ←
            </button>
          )}
          
          {/* CONTENEDOR PRINCIPAL CON VISTA DIVIDIDA */}
          <div className="chat-container-main">
            {/* SIDEBAR IZQUIERDO - LISTA DE CHATS */}
            {(!tipoChat || window.innerWidth > 767) && (
              <div className="chat-sidebar">
                {/* HEADER DEL SIDEBAR */}
                <div className="chat-sidebar-header ui-surface-dark">
                  <h2 className="chat-sidebar-title">Mensajes</h2>
                  <button 
                    className="chat-close-btn"
                    onClick={closeChatPanel}
                    title="Cerrar chat"
                  >
                    ✕
                  </button>
                </div>
                
                {/* HEADER DEL USUARIO ACTUAL */}
                <div className="chat-user-header">
                  <div className="chat-user-header-avatar">
                    <img
                      src={getAvatarUrl(user)}
                      alt={user?.nickname || user?.name || "Usuario"}
                      className="chat-user-avatar-img"
                      onError={(e) => {
                        e.target.src = makeInitialsAvatar(e.target.alt || '?');
                      }}
                    />
                  </div>
                  <div className="chat-user-header-info">
                    <span className="chat-user-header-name" style={{ color: getColorForName(user?.nickname || user?.name || "Usuario") }}>
                      {user?.nickname || user?.name || "Usuario"}
                    </span>
                  </div>
                  <div className="chat-user-header-actions">
                    <button
                      className="chat-user-header-btn"
                      onClick={() => {
                        const userNickname = user?.nickname || user?.name;
                        if (!userNickname) return;
                        
                        // Marcar que estamos abriendo el perfil desde el sidebar
                        abriendoPerfilDesdeSidebarRef.current = true;
                        
                        // Asegurar que el chat esté abierto
                        if (!open) {
                          setOpen(true);
                        }
                        
                        // NO cambiar tabPrincipal - mantener en "usuarios" para que se vea la lista
                        // Solo abrir el perfil como overlay
                        abrirPerfilUsuario(userNickname);
                        
                        // Mantener el flag activo por un tiempo para proteger contra resets
                        setTimeout(() => {
                          abriendoPerfilDesdeSidebarRef.current = false;
                        }, 500);
                      }}
                    title="Ver mi perfil"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                    </button>
                    <button
                      className="chat-user-header-btn"
                      onClick={() => {
                        const userNickname = user?.nickname || user?.name;
                        if (userNickname) {
                          abrirChat("privado", userNickname);
                        }
                      }}
                      title="Mi chat personal"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    </button>
                  </div>
                </div>
                
                {/* TABS PRINCIPALES */}
                <div className="chat-tabs">
            <div
              className={`tab tab-circular ${tabPrincipal === "chats" ? "active" : ""}`}
              onClick={() => setTabPrincipal("chats")}
              title="Chats"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Chats
              {(() => {
                const totalNoLeidos = chatsActivos.reduce((total, chat) => {
                  return total + (chat.mensajes_no_leidos || 0);
                }, 0);
                return totalNoLeidos > 0 ? (
                  <span className="tab-badge-count">{totalNoLeidos > 99 ? "99+" : totalNoLeidos}</span>
                ) : null;
              })()}
            </div>
            <div
              className={`tab tab-circular ${tabPrincipal === "grupos" ? "active" : ""}`}
              onClick={() => setTabPrincipal("grupos")}
              title="Grupos"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Grupos
            </div>
            <div
              className={`tab tab-circular ${tabPrincipal === "usuarios" ? "active" : ""}`}
              onClick={() => {
                setTabPrincipal("usuarios");
                setTipoChat(null);
                setChatActual(null);
              }}
              title="Players"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              Players
            </div>
            <div
              className={`tab tab-circular ${tabPrincipal === "historial" ? "active" : ""}`}
              onClick={() => {
                setTabPrincipal("historial");
                setTipoChat(null);
                setChatActual(null);
              }}
              title="Historial de llamadas"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.65 3.4 2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.8a16 16 0 0 0 7.29 7.29l1.06-1.06a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              Llamadas
            </div>
            <div
              className={`tab tab-circular ${tabPrincipal === "ajustes" ? "active" : ""}`}
              onClick={() => {
                setTabPrincipal("ajustes");
                setTipoChat(null);
                setChatActual(null);
              }}
              title="Ajustes"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              Ajustes
            </div>
                </div>
                
                {/* CONTENIDO DEL SIDEBAR */}
                <div className="chat-sidebar-content">
                  {/* REUNIONES PRÓXIMAS */}
                  {tipoChat && obtenerReunionesChatActual().length > 0 && (
                    <div className="reuniones-proximas-sidebar">
                      <div className="reuniones-proximas-header">
                        <span>📅 Reuniones próximas</span>
                      </div>
                      {obtenerReunionesChatActual().slice(0, 3).map(reunion => {
                        const fechaHora = new Date(`${reunion.fecha}T${reunion.hora}`);
                        const ahora = new Date();
                        const esHoy = fechaHora.toDateString() === ahora.toDateString();
                        const esProxima = fechaHora > ahora;
                        
                        return (
                          <div key={reunion.id} className="reunion-item-sidebar">
                            <div className="reunion-item-info">
                              <div className="reunion-item-titulo">{reunion.titulo}</div>
                              <div className="reunion-item-fecha">
                                {esHoy ? 'Hoy' : fechaHora.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} 
                                {' '}a las {reunion.hora}
                              </div>
                              {reunion.lugar && (
                                <div className="reunion-item-lugar">📍 {reunion.lugar}</div>
                              )}
                              {reunion.esVideollamada && (
                                <div className="reunion-item-video">📹 Videollamada</div>
                              )}
                            </div>
                            {esProxima && (
                              <button
                                className="reunion-item-btn"
                                onClick={() => abrirModalReunion(reunion)}
                                title="Editar reunión"
                              >
                                ✏️
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* USUARIOS */}
                  {tabPrincipal === "usuarios" && (
                    <div className="usuarios-list-pro">
                      <div className="chat-buscador-usuarios">
                        <input
                          type="text"
                          value={filtroUsuarios}
                          onChange={(e) => setFiltroUsuarios(e.target.value)}
                          placeholder="Buscar player..."
                        />
                      </div>
              <div
                className="usuario-item-pro general-chat"
                onClick={() => abrirChat("general", null)}
              >
                <div className="avatar-container">
                  <img src={makeGeneralAvatar()} alt="Chat General" className="chat-avatar" />
                </div>
                <div className="chat-activo-content">
                  <span className="chat-activo-nombre">Chat General</span>
                  <span style={{fontSize:'0.72rem',color:'var(--cp-text-3)'}}>Canal de toda la organización</span>
                </div>
              </div>
              {usuariosCOPMEC
                .filter((u) => {
                  // Excluir el usuario actual de la lista
                  const userNickname = user?.nickname || user?.name;
                  const uNickname = u.nickname || u.name;
                  if (userNickname && uNickname && userNickname === uNickname) {
                    return false;
                  }
                  // Aplicar filtro de búsqueda
                  const displayName = (u.nickname || u.name || "").toLowerCase();
                  const query = filtroUsuarios.trim().toLowerCase();
                  return !query || displayName.includes(query);
                })
                .map((u) => {
                  const displayName = u.nickname || u.name || "Usuario";
                  const isUserActive = u.active === 1;
                  const estado = getEstadoUsuario(displayName);
                  
                  // Determinar título del estado
                  let statusTitle = 'Usuario offline';
                  if (estado === 'en-llamada') {
                    statusTitle = 'En videollamada';
                  } else if (estado === 'activo') {
                    statusTitle = 'Usuario activo (en la app)';
                  } else if (estado === 'ausente') {
                    statusTitle = 'Usuario ausente (más de 1 hora sin actividad)';
                  } else {
                    statusTitle = 'Usuario offline';
                  }
                  
                  return (
                    <div
                      key={u.id}
                      className={`usuario-item-pro ${!isUserActive ? 'usuario-inactivo' : ''}`}
                      onClick={() => {
                        // Usar nickname si existe, si no usar name
                        const destinoNombre = u.nickname || u.name;
                        if (destinoNombre) {
                          abrirChat("privado", destinoNombre);
                        } else {
                          showAlert("Este usuario no tiene nickname ni nombre configurado.", "warning");
                        }
                      }}
                    >
                      <div className={`avatar-container status-${estado}`} title={statusTitle}>
                        <img
                          src={getAvatarUrl(u)}
                          alt={displayName}
                          className="chat-avatar"
                          onError={(e) => {
                            e.target.src = makeInitialsAvatar(e.target.alt || '?');
                          }}
                        />
                      </div>
                      <span style={{ color: getColorForName(displayName) }}>
                        {displayName}
                      </span>
                    </div>
                  );
                })}
                    </div>
                  )}

                  {tabPrincipal === "historial" && (
                    <div className="usuarios-list-pro">
                      <div className="chat-audio-settings-title" style={{ marginBottom: 8 }}>
                        Historial de Llamadas
                      </div>
                      {historialCargando ? (
                        <div style={{ textAlign: "center", padding: "20px", opacity: 0.5 }}>Cargando...</div>
                      ) : historialLlamadas.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "24px 12px", opacity: 0.5, fontSize: 13 }}>
                          <div style={{ fontSize: 28, marginBottom: 8 }}>📞</div>
                          Sin llamadas registradas
                        </div>
                      ) : (
                        historialLlamadas.map((ll) => {
                          const _yo = user?.nickname || user?.name || "";
                          const contraparte = ll.fueIniciador
                            ? (ll.receptores || []).join(", ")
                            : ll.iniciador;
                          const fecha = new Date(ll.iniciadaEn);
                          const fechaStr = fecha.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
                          const horaStr = fecha.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
                          let durStr = "";
                          if (ll.duracionSegundos != null) {
                            const m = Math.floor(ll.duracionSegundos / 60);
                            const s = ll.duracionSegundos % 60;
                            durStr = m > 0 ? `${m}m ${s}s` : `${s}s`;
                          }
                          const estadoIcon = {
                            finalizada: "✅",
                            activa: "🔴",
                            pendiente: "🕓",
                            rechazada: "❌",
                            perdida: "📵",
                          }[ll.estado] || "📞";
                          return (
                            <div key={ll.id} className="usuario-item-pro" style={{ cursor: "default", flexDirection: "column", alignItems: "flex-start", gap: 2, padding: "8px 12px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%" }}>
                                <span style={{ fontSize: 15 }}>{estadoIcon}</span>
                                <span style={{ fontWeight: 600, fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {ll.fueIniciador ? "📤 " : "📥 "}{contraparte || "Desconocido"}
                                </span>
                                <span style={{ fontSize: 11, opacity: 0.5, whiteSpace: "nowrap" }}>{fechaStr} {horaStr}</span>
                              </div>
                              <div style={{ fontSize: 11, opacity: 0.55, paddingLeft: 21, display: "flex", gap: 10 }}>
                                <span>{ll.tipo === "grupal" ? "Grupal" : "Privada"}</span>
                                <span style={{ textTransform: "capitalize" }}>{ll.estado}</span>
                                {durStr && <span>⏱ {durStr}</span>}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {tabPrincipal === "ajustes" && (
                    <div className="usuarios-list-pro chat-audio-settings">
                      <div className="chat-audio-settings-title">
                        Sonidos del chat
                      </div>

                      <label className="chat-audio-field">
                        <span className="chat-audio-label">Sonido de mensaje</span>
                        <select
                          value={audioSettings.msgSound}
                          onChange={(e) => saveAudioSetting("msgSound", e.target.value)}
                        >
                          {NOTIFICATION_SOUNDS.map((s) => (
                            <option key={s.id} value={s.id}>{s.emoji} {s.label}</option>
                          ))}
                        </select>
                      </label>

                      <label className="chat-audio-field">
                        <span className="chat-audio-label">
                          Volumen mensaje ({Math.round(audioSettings.msgVolume * 100)}%)
                        </span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={audioSettings.msgVolume}
                          onChange={(e) => saveAudioSetting("msgVolume", Number(e.target.value))}
                        />
                      </label>

                      <label className="chat-audio-field">
                        <span className="chat-audio-label">Tono entrante</span>
                        <select
                          value={audioSettings.callIncomingSound}
                          onChange={(e) => saveAudioSetting("callIncomingSound", e.target.value)}
                        >
                          {CALL_SOUND_OPTIONS.map((s) => (
                            <option key={s.id} value={s.id}>{s.label}</option>
                          ))}
                        </select>
                      </label>

                      <label className="chat-audio-field">
                        <span className="chat-audio-label">Tono saliente</span>
                        <select
                          value={audioSettings.callOutgoingSound}
                          onChange={(e) => saveAudioSetting("callOutgoingSound", e.target.value)}
                        >
                          {CALL_SOUND_OPTIONS.map((s) => (
                            <option key={s.id} value={s.id}>{s.label}</option>
                          ))}
                        </select>
                      </label>

                      <label className="chat-audio-field">
                        <span className="chat-audio-label">
                          Volumen llamada ({Math.round(audioSettings.callVolume * 100)}%)
                        </span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={audioSettings.callVolume}
                          onChange={(e) => saveAudioSetting("callVolume", Number(e.target.value))}
                        />
                      </label>

                      <div className="chat-audio-actions">
                        <button
                          type="button"
                          className="chat-audio-test-btn"
                          onClick={playIncomingMessageSound}
                          title="Probar sonido de mensaje"
                        >
                          Probar mensaje
                        </button>
                        <button
                          type="button"
                          className="chat-audio-test-btn"
                          onClick={playIncomingCallTone}
                          title="Probar tono de llamada"
                        >
                          Probar llamada
                        </button>
                        <button
                          type="button"
                          className="chat-audio-test-btn"
                          onClick={playOutgoingCallTone}
                          title="Probar tono saliente"
                        >
                          Probar salida
                        </button>
                      </div>
                    </div>
                  )}

                  {/* CHATS ACTIVOS */}
                  {tabPrincipal === "chats" && (
                    <div className="usuarios-list-pro">
                      <div
                        className="usuario-item-pro general-chat"
                        onClick={() => abrirChat("general", null)}
                      >
                        <div className="avatar-container">
                          <img src={makeGeneralAvatar()} alt="Chat General" className="chat-avatar" />
                        </div>
                        <span>Chat General</span>
                      </div>
                      
                      {(() => {
                        const chatsPorGrupo = agruparChats();
                        const gruposOrdenados = Object.keys(chatsPorGrupo).sort((a, b) => {
                          // "__sin_grupo__" siempre al final
                          if (a === "__sin_grupo__") return 1;
                          if (b === "__sin_grupo__") return -1;
                          return a.localeCompare(b);
                        });
                        
                        return gruposOrdenados.map((groupName) => {
                          const chatsEnGrupo = chatsPorGrupo[groupName];
                          const isCollapsed = gruposChatsCollapsed[groupName] || false;
                          const tieneNoLeidos = tieneNoLeidosEnGrupo(chatsEnGrupo, true);
                          
                          // Si es "__sin_grupo__", mostrar los chats directamente sin header
                          if (groupName === "__sin_grupo__") {
                            return chatsEnGrupo.sort((a, b) => {
                              const userDisplayName = user?.nickname || user?.name;
                              const aEsMio = a.otro_usuario === userDisplayName;
                              const bEsMio = b.otro_usuario === userDisplayName;
                              
                              if (aEsMio && !bEsMio) return -1;
                              if (!aEsMio && bEsMio) return 1;
                              
                              const fechaA = a.ultima_fecha ? new Date(a.ultima_fecha) : new Date(0);
                              const fechaB = b.ultima_fecha ? new Date(b.ultima_fecha) : new Date(0);
                              return fechaB - fechaA;
                            }).map((chat) => {
                              const userDisplayName = user?.nickname || user?.name;
                              const esMioUltimoMensaje = chat.ultimo_remitente === userDisplayName;
                              const estadoBase = getEstadoUsuario(chat.otro_usuario);
                              const estado = estadoBase;
                              
                              let statusTitle = 'Usuario offline';
                              if (estado === 'en-llamada') {
                                statusTitle = 'En videollamada';
                              } else if (estado === 'activo') {
                                statusTitle = 'Usuario activo (en la app)';
                              } else if (estado === 'ausente') {
                                statusTitle = 'Usuario ausente (más de 1 hora sin actividad)';
                              } else {
                                statusTitle = 'Usuario offline';
                              }
                              
                              return (
                                <div
                                  key={chat.otro_usuario}
                                  className={`usuario-item-pro chat-activo-item ${chat.mensajes_no_leidos > 0 ? "chat-con-mensajes-no-leidos" : ""}`}
                                >
                                  <div 
                                    className={`avatar-container status-${estado} chat-activo-avatar-wrap`} 
                                    title={statusTitle}
                                    onClick={() => abrirChat("privado", chat.otro_usuario)}
                                  >
                                    <img
                                      src={getAvatarUrl(chat.otro_usuario)}
                                      alt={chat.otro_usuario}
                                      className="chat-avatar"
                                      onError={(e) => {
                                        e.target.src = makeInitialsAvatar(e.target.alt || '?');
                                      }}
                                    />
                                    {chat.mensajes_no_leidos > 0 && (
                                      <span className="chat-badge-bolita">
                                        {chat.mensajes_no_leidos > 99 ? "99+" : chat.mensajes_no_leidos}
                                      </span>
                                    )}
                                  </div>
                                  <div 
                                    className="chat-activo-content"
                                    onClick={() => abrirChat("privado", chat.otro_usuario)}
                                  >
                                    <div className="chat-activo-header">
                                      <span className="chat-activo-nombre" style={{ color: getColorForName(chat.otro_usuario || "Usuario") }}>
                                        {chat.otro_usuario}
                                      </span>
                                    </div>
                                    {estaEscribiendoClave(chat.otro_usuario) ? (
                                      <div className="chat-activo-mensaje chat-activo-typing">
                                        <span className="chat-typing-label">escribiendo</span>
                                        <span className="chat-typing-dots" aria-hidden="true"><i /><i /><i /></span>
                                      </div>
                                    ) : chat.ultimo_mensaje ? (
                                      <div className="chat-activo-mensaje">
                                        {esMioUltimoMensaje ? (
                                          <span className="chat-mensaje-prefijo">Tú:</span>
                                        ) : (
                                          <span className="chat-mensaje-prefijo">{chat.otro_usuario}:</span>
                                        )}
                                        <span className="chat-mensaje-texto">{chat.ultimo_mensaje}</span>
                                      </div>
                                    ) : null}
                                  </div>
                                  <div className="chat-item-menu-container">
                                    <span
                                      className="chat-item-menu-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setMenuGrupoChat(menuGrupoChat === chat.otro_usuario ? null : chat.otro_usuario);
                                      }}
                                      title="Opciones"
                                    >
                                      ⋮
                                    </span>
                                    {menuGrupoChat === chat.otro_usuario && (
                                      <div className="chat-item-menu-dropdown" onClick={(e) => e.stopPropagation()}>
                                        <button onClick={() => crearYAsignarCarpeta(chat.otro_usuario, 'chat')}>
                                          ➕ Nueva carpeta
                                        </button>
                                        <hr />
                                        <div className="chat-item-menu-carpetas">
                                          {Object.keys(agruparChats()).filter(k => k !== '__sin_grupo__').map(carpeta => (
                                            <button
                                              key={carpeta}
                                              onClick={() => asignarACarpeta(chat.otro_usuario, 'chat', carpeta)}
                                            >
                                              📁 {carpeta}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            });
                          }
                          
                          // Para grupos con nombre, mostrar header desplegable
                          return (
                            <div key={groupName} className="chat-group-section">
                              <div 
                                className={`chat-group-header ${tieneNoLeidos && isCollapsed ? 'has-unread' : ''}`}
                              >
                                <span 
                                  className="chat-group-toggle"
                                  onClick={() => toggleChatGroupCollapse(groupName)}
                                >
                                  {isCollapsed ? '▶' : '▼'}
                                </span>
                                <span 
                                  className={`chat-group-name ${tieneNoLeidos && isCollapsed ? 'unread-group' : ''}`}
                                  onClick={() => toggleChatGroupCollapse(groupName)}
                                >
                                  📁 {groupName}
                                </span>
                                <span 
                                  className="chat-group-count"
                                  onClick={() => toggleChatGroupCollapse(groupName)}
                                >
                                  ({chatsEnGrupo.length})
                                </span>
                                <button
                                  className="chat-group-rename-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    renombrarCarpeta(groupName);
                                  }}
                                  title="Renombrar carpeta"
                                >
                                  ✏️
                                </button>
                              </div>
                              
                              {!isCollapsed && chatsEnGrupo.sort((a, b) => {
                                const userDisplayName = user?.nickname || user?.name;
                                const aEsMio = a.otro_usuario === userDisplayName;
                                const bEsMio = b.otro_usuario === userDisplayName;
                                
                                if (aEsMio && !bEsMio) return -1;
                                if (!aEsMio && bEsMio) return 1;
                                
                                const fechaA = a.ultima_fecha ? new Date(a.ultima_fecha) : new Date(0);
                                const fechaB = b.ultima_fecha ? new Date(b.ultima_fecha) : new Date(0);
                                return fechaB - fechaA;
                              }).map((chat) => {
                                const userDisplayName = user?.nickname || user?.name;
                                const esMioUltimoMensaje = chat.ultimo_remitente === userDisplayName;
                                const estadoBase = getEstadoUsuario(chat.otro_usuario);
                                const estado = estadoBase;
                                
                                let statusTitle = 'Usuario offline';
                                if (estado === 'en-llamada') {
                                  statusTitle = 'En videollamada';
                                } else if (estado === 'activo') {
                                  statusTitle = 'Usuario activo (en la app)';
                                } else if (estado === 'ausente') {
                                  statusTitle = 'Usuario ausente (más de 1 hora sin actividad)';
                                } else {
                                  statusTitle = 'Usuario offline';
                                }
                                
                                return (
                                  <div
                                    key={chat.otro_usuario}
                                    className={`usuario-item-pro chat-activo-item chat-grouped ${chat.mensajes_no_leidos > 0 ? "chat-con-mensajes-no-leidos" : ""}`}
                                  >
                                    <div 
                                      className={`avatar-container status-${estado} chat-activo-avatar-wrap`} 
                                      title={statusTitle}
                                      onClick={() => abrirChat("privado", chat.otro_usuario)}
                                    >
                                      <img
                                        src={getAvatarUrl(chat.otro_usuario)}
                                        alt={chat.otro_usuario}
                                        className="chat-avatar"
                                        onError={(e) => {
                                          e.target.src = makeInitialsAvatar(e.target.alt || '?');
                                        }}
                                      />
                                      {chat.mensajes_no_leidos > 0 && (
                                        <span className="chat-badge-bolita">
                                          {chat.mensajes_no_leidos > 99 ? "99+" : chat.mensajes_no_leidos}
                                        </span>
                                      )}
                                    </div>
                                    <div 
                                      className="chat-activo-content"
                                      onClick={() => abrirChat("privado", chat.otro_usuario)}
                                    >
                                      <div className="chat-activo-header">
                                        <span className="chat-activo-nombre" style={{ color: getColorForName(chat.otro_usuario || "Usuario") }}>
                                          {chat.otro_usuario}
                                        </span>
                                      </div>
                                      {estaEscribiendoClave(chat.otro_usuario) ? (
                                        <div className="chat-activo-mensaje chat-activo-typing">
                                          <span className="chat-typing-label">escribiendo</span>
                                          <span className="chat-typing-dots" aria-hidden="true"><i /><i /><i /></span>
                                        </div>
                                      ) : chat.ultimo_mensaje ? (
                                        <div className="chat-activo-mensaje">
                                          {esMioUltimoMensaje ? (
                                            <span className="chat-mensaje-prefijo">Tú:</span>
                                          ) : (
                                            <span className="chat-mensaje-prefijo">{chat.otro_usuario}:</span>
                                          )}
                                          <span className="chat-mensaje-texto">{chat.ultimo_mensaje}</span>
                                        </div>
                                      ) : null}
                                    </div>
                                    <div className="chat-item-menu-container">
                                      <span
                                        className="chat-item-menu-btn"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setMenuGrupoChat(menuGrupoChat === chat.otro_usuario ? null : chat.otro_usuario);
                                        }}
                                        title="Opciones"
                                      >
                                        ⋮
                                      </span>
                                      {menuGrupoChat === chat.otro_usuario && (
                                        <div className="chat-item-menu-dropdown" onClick={(e) => e.stopPropagation()}>
                                          <button onClick={() => crearYAsignarCarpeta(chat.otro_usuario, 'chat')}>
                                            ➕ Nueva carpeta
                                          </button>
                                          <hr />
                                          <div className="chat-item-menu-carpetas">
                                            {Object.keys(agruparChats()).filter(k => k !== '__sin_grupo__').map(carpeta => (
                                              <button
                                                key={carpeta}
                                                onClick={() => asignarACarpeta(chat.otro_usuario, 'chat', carpeta)}
                                              >
                                                📁 {carpeta}
                                              </button>
                                            ))}
                                          </div>
                                          {chatGroups[chat.otro_usuario] && (
                                            <>
                                              <hr />
                                              <button onClick={() => asignarACarpeta(chat.otro_usuario, 'chat', null)}>
                                                ❌ Quitar de carpeta
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        });
                      })()}
                      
                      {chatsActivos.length === 0 && (
                        <div className="chat-empty-pro">No hay chats activos</div>
                      )}
                    </div>
                  )}

                  {/* GRUPOS */}
                  {tabPrincipal === "grupos" && (
                    <div className="usuarios-list-pro">
                      {mostrarCrearGrupo ? (
                        <div className="crear-grupo-form">
                          <p className="crear-grupo-title">Nuevo grupo</p>
                          <input
                            type="text"
                            placeholder="Nombre del grupo"
                            value={nuevoGrupoNombre}
                            onChange={(e) => setNuevoGrupoNombre(e.target.value)}
                            className="crear-grupo-input"
                          />
                          <input
                            type="text"
                            placeholder="Descripción (opcional)"
                            value={nuevoGrupoDesc}
                            onChange={(e) => setNuevoGrupoDesc(e.target.value)}
                            className="crear-grupo-input"
                          />
                          <div className="crear-grupo-switch-row">
                            <div className="crear-grupo-switch-info">
                              <span className="crear-grupo-switch-label">
                                {nuevoGrupoEsPublico ? "Grupo Público" : "Grupo Privado"}
                              </span>
                              <span className="crear-grupo-switch-desc">
                                {nuevoGrupoEsPublico ? "Cualquiera puede unirse" : "Solo por invitación"}
                              </span>
                            </div>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={nuevoGrupoEsPublico}
                              className={`cp-switch ${nuevoGrupoEsPublico ? "cp-switch--on" : ""}`}
                              onClick={() => setNuevoGrupoEsPublico(v => !v)}
                            />
                          </div>
                          <div className="crear-grupo-actions">
                            <button
                              onClick={() => {
                                setMostrarCrearGrupo(false);
                                setNuevoGrupoNombre("");
                                setNuevoGrupoDesc("");
                              }}
                              className="crear-grupo-btn crear-grupo-btn--cancel"
                            >
                              Cancelar
                            </button>
                            <button onClick={crearGrupo} className="crear-grupo-btn crear-grupo-btn--create">
                              Crear grupo
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="cp-crear-grupo-trigger"
                          onClick={() => setMostrarCrearGrupo(true)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                          Nuevo grupo
                        </button>
                      )}
                      
                      {/* Grupos agrupados */}
                      {(() => {
                        const agrupados = agruparGrupos(grupos);
                        const gruposOrdenados = Object.keys(agrupados).sort((a, b) => {
                          // "__sin_grupo__" siempre al final
                          if (a === "__sin_grupo__") return 1;
                          if (b === "__sin_grupo__") return -1;
                          return a.localeCompare(b);
                        });
                        
                        return gruposOrdenados.map((nombreGrupo) => {
                          const gruposEnGrupo = agrupados[nombreGrupo];
                          const tieneNoLeidos = tieneNoLeidosEnGrupo(gruposEnGrupo, false);
                          const estaColapsado = gruposGruposCollapsed[nombreGrupo] || false;
                          
                          // Si es "__sin_grupo__", mostrar los grupos directamente sin header
                          if (nombreGrupo === "__sin_grupo__") {
                            return gruposEnGrupo.map((g) => {
                              const esPublico = g.es_publico !== 0;
                              const esMiembro = g.es_miembro === true;
                              return (
                                <div
                                  key={g.id}
                                  className={`usuario-item-pro grupo-item ${!esMiembro ? "grupo-no-miembro" : ""}`}
                                >
                                  <span 
                                    className="grupo-icon"
                                    onClick={() => {
                                      if (!esMiembro) return;
                                      abrirChat("grupal", g.id);
                                    }}
                                  >
                                    👥
                                  </span>
                                  <div 
                                    className="grupo-info"
                                    onClick={() => {
                                      if (!esMiembro) return;
                                      abrirChat("grupal", g.id);
                                    }}
                                  >
                                    <div className="grupo-header-row">
                                      <span className="grupo-nombre">{g.nombre}</span>
                                      <span className={`grupo-badge ${esPublico ? "publico" : "privado"}`}>
                                        {esPublico ? "Público" : "Privado"}
                                      </span>
                                    </div>
                                    {g.descripcion && (
                                      <div className="grupo-desc">{g.descripcion}</div>
                                    )}
                                    <div className="grupo-miembros">
                                      {g.miembros?.length || 0} miembros
                                    </div>
                                  </div>
                                  <div className="grupo-actions">
                                    <span
                                      className="chat-item-menu-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setMenuGrupoGrupo(menuGrupoGrupo === g.id ? null : g.id);
                                      }}
                                      title="Opciones"
                                    >
                                      ⋮
                                    </span>
                                    {menuGrupoGrupo === g.id && (
                                      <div className="chat-item-menu-dropdown" onClick={(e) => e.stopPropagation()}>
                                        <button onClick={() => crearYAsignarCarpeta(g.id, 'grupo')}>
                                          ➕ Nueva carpeta
                                        </button>
                                        <hr />
                                        <div className="chat-item-menu-carpetas">
                                          {Object.keys(agruparGrupos()).filter(k => k !== '__sin_grupo__').map(carpeta => (
                                            <button
                                              key={carpeta}
                                              onClick={() => asignarACarpeta(g.id, 'grupo', carpeta)}
                                            >
                                              📁 {carpeta}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            });
                          }
                          
                          return (
                            <div key={nombreGrupo} className="chat-group-section">
                              <div
                                className={`chat-group-header ${estaColapsado ? "collapsed" : ""} ${tieneNoLeidos ? "has-unread" : ""}`}
                              >
                                <span 
                                  className="chat-group-toggle"
                                  onClick={() => toggleGrupoGroupCollapse(nombreGrupo)}
                                >
                                  {estaColapsado ? '▶' : '▼'}
                                </span>
                                <span 
                                  className={`chat-group-name ${tieneNoLeidos && estaColapsado ? "unread-group" : ""}`}
                                  onClick={() => toggleGrupoGroupCollapse(nombreGrupo)}
                                >
                                  📁 {nombreGrupo}
                                </span>
                                <span 
                                  className="chat-group-count"
                                  onClick={() => toggleGrupoGroupCollapse(nombreGrupo)}
                                >
                                  ({gruposEnGrupo.length})
                                </span>
                                <button
                                  className="chat-group-rename-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    renombrarCarpeta(nombreGrupo);
                                  }}
                                  title="Renombrar carpeta"
                                >
                                  ✏️
                                </button>
                              </div>
                              {!estaColapsado && (
                                <div className="chat-group-items">
                                  {gruposEnGrupo.map((g) => {
                                    const esPublico = g.es_publico !== 0;
                                    const esMiembro = g.es_miembro === true;
                                    return (
                                      <div
                                        key={g.id}
                                        className={`usuario-item-pro grupo-item chat-grouped ${!esMiembro ? "grupo-no-miembro" : ""}`}
                                      >
                                        <span 
                                          className="grupo-icon"
                                          onClick={() => {
                                            if (!esMiembro) return;
                                            abrirChat("grupal", g.id);
                                          }}
                                        >
                                          👥
                                        </span>
                                        <div 
                                          className="grupo-info"
                                          onClick={() => {
                                            if (!esMiembro) return;
                                            abrirChat("grupal", g.id);
                                          }}
                                        >
                                          <div className="grupo-header-row">
                                            <span className="grupo-nombre">{g.nombre}</span>
                                            <span className={`grupo-badge ${esPublico ? "publico" : "privado"}`}>
                                              {esPublico ? "Público" : "Privado"}
                                            </span>
                                          </div>
                                          {g.descripcion && (
                                            <div className="grupo-desc">{g.descripcion}</div>
                                          )}
                                          <div className="grupo-miembros">
                                            {g.miembros?.length || 0} miembros
                                          </div>
                                        </div>
                                        <div className="grupo-actions">
                                          <span
                                            className="chat-item-menu-btn"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setMenuGrupoGrupo(menuGrupoGrupo === g.id ? null : g.id);
                                            }}
                                            title="Opciones"
                                          >
                                            ⋮
                                          </span>
                                          {menuGrupoGrupo === g.id && (
                                            <div className="chat-item-menu-dropdown" onClick={(e) => e.stopPropagation()}>
                                              <button
                                                onClick={() => {
                                                  abrirPerfilGrupo(g.id);
                                                  setMenuGrupoGrupo(null);
                                                }}
                                              >
                                                ℹ️ Ver info
                                              </button>
                                              <hr />
                                              <button onClick={() => crearYAsignarCarpeta(g.id, 'grupo')}>
                                                ➕ Nueva carpeta
                                              </button>
                                              <hr />
                                              <div className="chat-item-menu-carpetas">
                                                {Object.keys(agruparGrupos()).filter(k => k !== '__sin_grupo__').map(carpeta => (
                                                  <button
                                                    key={carpeta}
                                                    onClick={() => asignarACarpeta(g.id, 'grupo', carpeta)}
                                                  >
                                                    📁 {carpeta}
                                                  </button>
                                                ))}
                                              </div>
                                              {grupoGroups[g.id] && (
                                                <>
                                                  <hr />
                                                  <button onClick={() => asignarACarpeta(g.id, 'grupo', null)}>
                                                    ❌ Quitar de carpeta
                                                  </button>
                                                </>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}
                      
                      {Array.isArray(grupos) && grupos.length === 0 && !mostrarCrearGrupo && (
                        <div className="chat-empty-pro">No hay grupos</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PANEL PRINCIPAL - CHAT ABIERTO O PERFIL ABIERTO */}
            {(tipoChat || perfilAbierto) && (
              <div className="chat-main-panel">
                {tipoChat === "grupal" && modalSolicitud && (
                  <div className="chat-modal-solicitud-overlay">
                    <div className="chat-modal-solicitud">
                      <p className="chat-modal-solicitud-texto">
                        <strong>{modalSolicitud.usuario_nickname}</strong> solicita acceso al grupo.
                      </p>
                      <p className="chat-modal-solicitud-fecha">
                        {modalSolicitud.fecha
                          ? new Date(modalSolicitud.fecha).toLocaleString("es", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })
                          : ""}
                      </p>
                      <div className="chat-modal-solicitud-actions">
                        <button
                          className="chat-modal-solicitud-btn aceptar"
                          onClick={async () => {
                            const sol = { ...modalSolicitud };
                            setModalSolicitud(null);
                            try {
                              await authFetch(
                                `${SERVER_URL}/api/chat/grupos/${sol.grupoId}/solicitudes/${sol.solicitudId}/responder`,
                                { method: "POST", body: JSON.stringify({ aceptar: true }) }
                              );
                              const list = await authFetch(`${SERVER_URL}/api/chat/grupos/${chatActual}/solicitudes`);
                              const arr = Array.isArray(list) ? list : [];
                              setSolicitudesPendientes(arr);
                              if (arr.length > 0) {
                                const s = arr[0];
                                setModalSolicitud({ solicitudId: s.id, grupoId: s.grupo_id, usuario_nickname: s.usuario_nickname, fecha: s.fecha, groupName: "Grupo" });
                              }
                              showAlert("Solicitud aceptada. El usuario se unió al grupo.", "success");
                              const data = await authFetch("/api/chat/grupos");
                              setGrupos(data || []);
                            } catch (e) {
                              setModalSolicitud(sol);
                              showAlert(e?.message || "Error al aceptar.", "error");
                            }
                          }}
                        >
                          Aceptar
                        </button>
                        <button
                          className="chat-modal-solicitud-btn rechazar"
                          onClick={async () => {
                            const sol = { ...modalSolicitud };
                            setModalSolicitud(null);
                            try {
                              await authFetch(
                                `${SERVER_URL}/api/chat/grupos/${sol.grupoId}/solicitudes/${sol.solicitudId}/responder`,
                                { method: "POST", body: JSON.stringify({ aceptar: false }) }
                              );
                              const list = await authFetch(`${SERVER_URL}/api/chat/grupos/${chatActual}/solicitudes`);
                              const arr = Array.isArray(list) ? list : [];
                              setSolicitudesPendientes(arr);
                              if (arr.length > 0) {
                                const s = arr[0];
                                setModalSolicitud({ solicitudId: s.id, grupoId: s.grupo_id, usuario_nickname: s.usuario_nickname, fecha: s.fecha, groupName: "Grupo" });
                              }
                              showAlert("Solicitud rechazada.", "info");
                            } catch (e) {
                              setModalSolicitud(sol);
                              showAlert(e?.message || "Error al rechazar.", "error");
                            }
                          }}
                        >
                          Rechazar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                <div className="chat-inner">
                  {perfilAbierto ? (
                    <div className="chat-profile-panel">
                      <div className="chat-profile-panel-header">
                        <button
                          className="chat-profile-back"
                          onClick={cerrarPerfilUsuario}
                          title="Volver al chat"
                        >
                          ←
                        </button>
                        <span style={{ flex: 1, textAlign: "center" }}>Perfil</span>
                        <button
                          className="chat-profile-share-btn"
                          onClick={async () => {
                            try {
                              // Construir URL con información del perfil
                              const baseUrl = new URL(window.location.origin);
                              if (perfilTipo === "usuario" && perfilData?.nickname) {
                                baseUrl.pathname = '/chat';
                                baseUrl.searchParams.set("perfil", "usuario");
                                baseUrl.searchParams.set("nickname", perfilData.nickname);
                              } else if (perfilTipo === "grupo" && perfilData?.id) {
                                baseUrl.pathname = '/chat';
                                baseUrl.searchParams.set("perfil", "grupo");
                                baseUrl.searchParams.set("grupoId", String(perfilData.id));
                              } else {
                                // Si no hay datos del perfil, usar URL actual
                                baseUrl.href = window.location.href;
                              }
                              
                              const urlToShare = baseUrl.toString();
                              
                              // Intentar Web Share API primero
                              if (navigator.share && typeof navigator.share === 'function') {
                                try {
                                  await navigator.share({
                                    title: perfilTipo === "usuario" 
                                      ? `Perfil de ${perfilData?.name || perfilData?.nickname || "Usuario"}`
                                      : `Grupo: ${perfilData?.nombre || "Grupo"}`,
                                    text: perfilTipo === "usuario"
                                      ? `Mira el perfil de ${perfilData?.name || perfilData?.nickname || "este usuario"}`
                                      : `Únete al grupo ${perfilData?.nombre || "este grupo"}`,
                                    url: urlToShare
                                  });
                                  return; // Éxito, salir
                                } catch (shareErr) {
                                  // Si el usuario cancela, no mostrar error
                                  if (shareErr.name === "AbortError") {
                                    return;
                                  }
                                  // Si falla, continuar con clipboard
                                }
                              }
                              
                              // Fallback: copiar al portapapeles
                              if (navigator.clipboard && navigator.clipboard.writeText) {
                                await navigator.clipboard.writeText(urlToShare);
                                showAlert("Enlace copiado al portapapeles", "success");
                              } else {
                                // Fallback para navegadores antiguos
                                const textArea = document.createElement("textarea");
                                textArea.value = urlToShare;
                                textArea.style.position = "fixed";
                                textArea.style.left = "-999999px";
                                document.body.appendChild(textArea);
                                textArea.select();
                                try {
                                  document.execCommand('copy');
                                  showAlert("Enlace copiado al portapapeles", "success");
                                } catch (_e) {
                                  showAlert("No se pudo copiar el enlace. Por favor, cópialo manualmente: " + urlToShare, "warning");
                                }
                                document.body.removeChild(textArea);
                              }
                            } catch (_err) {
                              showAlert("Error al compartir. Por favor, intenta de nuevo.", "error");
                            }
                          }}
                          title="Compartir"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="18" cy="5" r="3"></circle>
                            <circle cx="6" cy="12" r="3"></circle>
                            <circle cx="18" cy="19" r="3"></circle>
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                          </svg>
                        </button>
                      </div>
                      <div className="chat-profile-tabs">
                        {perfilTipo === "grupo" ? (
                          <>
                            <button
                              className={`chat-profile-tab ${perfilTab === "acerca" ? "active" : ""}`}
                              onClick={() => setPerfilTab("acerca")}
                            >
                              Acerca de
                            </button>
                            <button
                              className={`chat-profile-tab ${perfilTab === "miembros" ? "active" : ""}`}
                              onClick={() => setPerfilTab("miembros")}
                            >
                              Miembros {perfilGrupoMiembros.length > 0 && ` ${perfilGrupoMiembros.length}`}
                            </button>
                            <button
                              className={`chat-profile-tab ${perfilTab === "configuracion" ? "active" : ""}`}
                              onClick={() => setPerfilTab("configuracion")}
                            >
                              Configuración
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className={`chat-profile-tab ${perfilTab === "info" ? "active" : ""}`}
                              onClick={() => setPerfilTab("info")}
                            >
                              Información
                            </button>
                            <button
                              className={`chat-profile-tab ${perfilTab === "archivos" ? "active" : ""}`}
                              onClick={() => setPerfilTab("archivos")}
                            >
                              Compartidos
                            </button>
                            {/* Solo mostrar pestaña de reuniones si es el perfil propio */}
                            {(() => {
                              const userNickname = user?.nickname || user?.name;
                              const perfilNickname = perfilData?.nickname || perfilData?.name;
                              const esMiPerfil = userNickname && perfilNickname && userNickname === perfilNickname;
                              return esMiPerfil ? (
                                <button
                                  className={`chat-profile-tab ${perfilTab === "reuniones" ? "active" : ""}`}
                                  onClick={() => setPerfilTab("reuniones")}
                                >
                                  Reuniones
                                </button>
                              ) : null;
                            })()}
                          </>
                        )}
                      </div>
                      <div className="chat-profile-modal-body">
                        {perfilCargando && <div className="chat-empty-pro">Cargando...</div>}
                        {!perfilCargando && perfilError && (
                          <div className="chat-empty-pro">{perfilError}</div>
                        )}
                        {!perfilCargando && !perfilError && perfilTab === "acerca" && perfilTipo === "grupo" && (
                          <div className="chat-profile-info" style={{ padding: "16px" }}>
                            {/* Tema */}
                            <div style={{ marginBottom: "24px", borderBottom: "1px solid var(--chat-border)", paddingBottom: "16px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--chat-text)" }}>Tema</div>
                                {perfilData?.es_admin && (
                                  <button
                                    onClick={() => {
                                      if (editandoTema) {
                                        // Guardar tema
                                        // TODO: Implementar endpoint para actualizar tema
                                        setEditandoTema(false);
                                      } else {
                                        setNuevoTema(perfilData?.tema || "");
                                        setEditandoTema(true);
                                      }
                                    }}
                                    style={{
                                      background: "transparent",
                                      border: "none",
                                      color: "var(--azul-primario)",
                                      cursor: "pointer",
                                      fontSize: "0.85rem"
                                    }}
                                  >
                                    {editandoTema ? "Guardar" : "Editar"}
                                  </button>
                                )}
                              </div>
                              {editandoTema ? (
                                <input
                                  type="text"
                                  value={nuevoTema}
                                  onChange={(e) => setNuevoTema(e.target.value)}
                                  placeholder="Agregar un tema"
                                  style={{
                                    width: "100%",
                                    padding: "8px",
                                    background: "var(--fondo-input)",
                                    border: "1px solid var(--chat-border)",
                                    borderRadius: "6px",
                                    color: "var(--chat-text)",
                                    fontSize: "0.9rem"
                                  }}
                                  onBlur={() => {
                                    setEditandoTema(false);
                                    // TODO: Guardar tema
                                  }}
                                  autoFocus
                                />
                              ) : (
                                <div style={{ fontSize: "0.9rem", color: "var(--chat-muted)" }}>
                                  {perfilData?.tema || "Agregar un tema"}
                                </div>
                              )}
                            </div>

                            {/* Descripción */}
                            <div style={{ marginBottom: "24px", borderBottom: "1px solid var(--chat-border)", paddingBottom: "16px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--chat-text)" }}>Descripción</div>
                                {perfilData?.es_admin && (
                                  <button
                                    onClick={() => {
                                      if (editandoDescripcion) {
                                        // Guardar descripción
                                        // TODO: Implementar endpoint para actualizar descripción
                                        setEditandoDescripcion(false);
                                      } else {
                                        setNuevaDescripcion(perfilData?.descripcion || "");
                                        setEditandoDescripcion(true);
                                      }
                                    }}
                                    style={{
                                      background: "transparent",
                                      border: "none",
                                      color: "var(--azul-primario)",
                                      cursor: "pointer",
                                      fontSize: "0.85rem"
                                    }}
                                  >
                                    {editandoDescripcion ? "Guardar" : "Editar"}
                                  </button>
                                )}
                              </div>
                              {editandoDescripcion ? (
                                <textarea
                                  value={nuevaDescripcion}
                                  onChange={(e) => setNuevaDescripcion(e.target.value)}
                                  placeholder="Agregar una descripción"
                                  style={{
                                    width: "100%",
                                    padding: "8px",
                                    background: "var(--fondo-input)",
                                    border: "1px solid var(--chat-border)",
                                    borderRadius: "6px",
                                    color: "var(--chat-text)",
                                    fontSize: "0.9rem",
                                    minHeight: "80px",
                                    resize: "vertical"
                                  }}
                                  onBlur={() => {
                                    setEditandoDescripcion(false);
                                    // TODO: Guardar descripción
                                  }}
                                  autoFocus
                                />
                              ) : (
                                <div style={{ fontSize: "0.9rem", color: "var(--chat-muted)" }}>
                                  {perfilData?.descripcion || "Agregar una descripción"}
                                </div>
                              )}
                            </div>

                            {/* Administrado por */}
                            <div style={{ marginBottom: "24px", borderBottom: "1px solid var(--chat-border)", paddingBottom: "16px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                                <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--chat-text)" }}>Administrado por</div>
                                <span style={{ fontSize: "0.75rem", color: "var(--chat-muted)", cursor: "help" }} title="Los administradores pueden gestionar el grupo">ⓘ</span>
                              </div>
                              <div style={{ fontSize: "0.9rem", color: "var(--azul-primario)" }}>
                                {perfilGrupoAdmins.length > 0 
                                  ? perfilGrupoAdmins.map((admin, idx) => (
                                      <span key={admin}>
                                        {admin}{idx < perfilGrupoAdmins.length - 1 ? ", " : ""}
                                      </span>
                                    ))
                                  : perfilData?.creado_por || "Sin administradores"}
                              </div>
                            </div>

                            {/* Creado por */}
                            <div style={{ marginBottom: "24px", borderBottom: "1px solid var(--chat-border)", paddingBottom: "16px" }}>
                              <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--chat-text)", marginBottom: "8px" }}>Creado por</div>
                              <div style={{ fontSize: "0.9rem", color: "var(--chat-muted)" }}>
                                {perfilData?.creado_por || "Desconocido"} el {new Date(perfilData?.fecha_creacion || Date.now()).toLocaleDateString("es-MX", { 
                                  day: "numeric", 
                                  month: "long", 
                                  year: "numeric" 
                                })}
                              </div>
                            </div>

                            {/* Dejar el grupo */}
                            <div style={{ marginTop: "24px" }}>
                              <button
                                onClick={async () => {
                                  if (await showConfirm("Dejar el grupo", `¿Estás seguro de que quieres dejar el grupo "${perfilData?.nombre}"?`) === true) {
                                    try {
                                      const userDisplayName = user?.nickname || user?.name;
                                      await authFetch(`${SERVER_URL}/api/chat/grupos/${chatActual}/miembros/${userDisplayName}`, {
                                        method: "DELETE",
                                      });
                                      showAlert("Has dejado el grupo", "success");
                                      cerrarPerfilUsuario();
                                      // Recargar grupos
                                      const data = await authFetch("/api/chat/grupos");
                                      setGrupos(data || []);
                                    } catch (_err) {
                                      showAlert("Error al dejar el grupo", "error");
                                    }
                                  }
                                }}
                                style={{
                                  width: "100%",
                                  padding: "12px",
                                  background: "transparent",
                                  border: "1px solid #ef4444",
                                  borderRadius: "8px",
                                  color: "#ef4444",
                                  cursor: "pointer",
                                  fontSize: "0.9rem",
                                  fontWeight: 600
                                }}
                              >
                                Dejar el grupo
                              </button>
                            </div>
                          </div>
                        )}
                        {!perfilCargando && !perfilError && perfilTab === "info" && perfilTipo === "usuario" && (
                          <div className="chat-profile-info">
                                <div className="chat-profile-hero-card">
                                  <div className="chat-profile-hero-photo">
                                    <img
                                      src={getAvatarUrl(perfilData)}
                                      alt={perfilData?.name || "Usuario"}
                                      onError={(event) => {
                                        const fallback = makeInitialsAvatar(perfilData?.name || perfilData?.nickname || "?");
                                        if (event.currentTarget.src !== fallback) {
                                          event.currentTarget.src = fallback;
                                        }
                                      }}
                                    />
                                  </div>
                                  <div className="chat-profile-hero-data">
                                    <div className="chat-profile-hero-name">
                                      {perfilData?.name || "No definido"}
                                    </div>
                                    <div className="chat-profile-hero-subtitle">
                                      {perfilData?.cargo || perfilData?.puesto || "Puesto no definido"}
                                    </div>
                                    <div className="chat-profile-hero-nick">
                                      @{perfilData?.nickname || "sin-nickname"}
                                    </div>
                                    <div className="chat-profile-hero-status">
                                      <span
                                        className={`chat-profile-status-dot ${
                                          estaDentroHorario(configNotificaciones) ? "active" : "inactive"
                                        }`}
                                      />
                                      <span>
                                        {estaDentroHorario(configNotificaciones)
                                          ? "Disponible"
                                          : "Notificaciones pospuestas"}
                                      </span>
                                    </div>
                                    <div className="chat-profile-hero-time">
                                      {new Date().toLocaleTimeString("es-MX", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}{" "}
                                      hora local
                                    </div>
                                  </div>
                                </div>

                                {/* Sección: Rol en la organización */}
                                <div className="chat-profile-section">
                                  <div className="chat-profile-section-title">Rol en la organización</div>
                                  {perfilData?.puesto && (
                                    <div className="chat-profile-card">
                                      <span>Nivel</span>
                                      <strong>{perfilData.puesto}</strong>
                                    </div>
                                  )}
                                  {perfilData?.cargo && (
                                    <div className="chat-profile-card">
                                      <span>Cargo</span>
                                      <strong>{perfilData.cargo}</strong>
                                    </div>
                                  )}
                                  {perfilData?.area && (
                                    <div className="chat-profile-card">
                                      <span>Área</span>
                                      <strong>{perfilData.area}</strong>
                                    </div>
                                  )}
                                  {perfilData?.department && perfilData.department !== perfilData?.area && (
                                    <div className="chat-profile-card">
                                      <span>Departamento</span>
                                      <strong>{perfilData.department}</strong>
                                    </div>
                                  )}
                                  {!perfilData?.puesto && !perfilData?.cargo && !perfilData?.area && (
                                    <div className="chat-profile-card">
                                      <span style={{ opacity: 0.5 }}>Sin información de rol</span>
                                    </div>
                                  )}
                                </div>

                                <div className="chat-profile-section">
                                  <div className="chat-profile-section-title">Información de contacto</div>
                                  <div className="chat-profile-card">
                                    <span>Player de acceso</span>
                                    <strong>{perfilData?.playerAcceso || perfilData?.correo || "No definido"}</strong>
                                  </div>
                                  <div className="chat-profile-card">
                                    <span>Correo electrónico</span>
                                    <strong>{perfilData?.correo || "No definido"}</strong>
                                  </div>
                                </div>

                                <div className="chat-profile-section">
                                  <div className="chat-profile-section-title">Acerca de mí</div>
                                  <div className="chat-profile-card">
                                    <span>Teléfono</span>
                                    <strong>
                                      {perfilData?.telefono_visible
                                        ? perfilData?.telefono || "No definido"
                                        : "No visible"}
                                    </strong>
                                  </div>
                                  <div className="chat-profile-card">
                                    <span>Cumpleaños</span>
                                    <strong>
                                      {perfilData?.birthday 
                                        ? (() => {
                                            const edad = calcularEdad(perfilData.birthday);
                                            if (edad) {
                                              const edadTexto = edad.meses > 0 
                                                ? `${edad.años} años y ${edad.meses} ${edad.meses === 1 ? 'mes' : 'meses'}`
                                                : `${edad.años} años`;
                                              return `${perfilData.birthday} (${edadTexto})`;
                                            }
                                            return perfilData.birthday;
                                          })()
                                        : "No definido"}
                                    </strong>
                                  </div>
                                  <div className="chat-profile-card">
                                    <span>Fecha de ingreso</span>
                                    <strong>
                                      {perfilData?.fechaIngreso
                                        ? formatearFechaPerfil(perfilData.fechaIngreso)
                                        : "No definido"}
                                    </strong>
                                  </div>
                                </div>
                          </div>
                        )}
                        {!perfilCargando && !perfilError && perfilTab === "archivos" && (
                          <div className="chat-profile-files">
                            <div className="chat-profile-subtabs">
                              <button
                                className={`chat-profile-subtab ${perfilCompartidosTab === "imagenes" ? "active" : ""}`}
                                onClick={() => setPerfilCompartidosTab("imagenes")}
                              >
                                Imágenes
                              </button>
                              <button
                                className={`chat-profile-subtab ${perfilCompartidosTab === "videos" ? "active" : ""}`}
                                onClick={() => setPerfilCompartidosTab("videos")}
                              >
                                Videos
                              </button>
                              <button
                                className={`chat-profile-subtab ${perfilCompartidosTab === "archivos" ? "active" : ""}`}
                                onClick={() => setPerfilCompartidosTab("archivos")}
                              >
                                Archivos
                              </button>
                              <button
                                className={`chat-profile-subtab ${perfilCompartidosTab === "enlaces" ? "active" : ""}`}
                                onClick={() => setPerfilCompartidosTab("enlaces")}
                              >
                                Enlaces
                              </button>
                            </div>
                            {perfilCompartidosTab === "imagenes" && (
                              <>
                                {compartidosImagenes.length === 0 ? (
                                  <div className="chat-empty-pro">No hay imágenes</div>
                                ) : (
                                  compartidosImagenes.map((archivo) => (
                                    <button
                                      key={`img-${archivo.id}`}
                                      className="chat-profile-file"
                                      onClick={() => abrirArchivoPrivado(archivo)}
                                    >
                                      <div className="chat-profile-file-name">
                                        🖼️ {archivo.archivo_nombre || "Imagen"}
                                      </div>
                                      <div className="chat-profile-file-meta">
                                        {perfilTipo === "grupo" ? archivo.usuario_nickname : archivo.de_nickname} · {new Date(archivo.fecha).toLocaleDateString("es-MX")}
                                      </div>
                                    </button>
                                  ))
                                )}
                              </>
                            )}
                            {perfilCompartidosTab === "videos" && (
                              <>
                                {compartidosVideos.length === 0 ? (
                                  <div className="chat-empty-pro">No hay videos</div>
                                ) : (
                                  compartidosVideos.map((archivo) => (
                                    <button
                                      key={`vid-${archivo.id}`}
                                      className="chat-profile-file"
                                      onClick={() => abrirArchivoPrivado(archivo)}
                                    >
                                      <div className="chat-profile-file-name">
                                        🎞️ {archivo.archivo_nombre || "Video"}
                                      </div>
                                      <div className="chat-profile-file-meta">
                                        {perfilTipo === "grupo" ? archivo.usuario_nickname : archivo.de_nickname} · {new Date(archivo.fecha).toLocaleDateString("es-MX")}
                                      </div>
                                    </button>
                                  ))
                                )}
                              </>
                            )}
                            {perfilCompartidosTab === "archivos" && (
                              <>
                                {compartidosArchivos.length === 0 ? (
                                  <div className="chat-empty-pro">No hay archivos</div>
                                ) : (
                                  compartidosArchivos.map((archivo) => (
                                    <button
                                      key={`file-${archivo.id}`}
                                      className="chat-profile-file"
                                      onClick={() => abrirArchivoPrivado(archivo)}
                                    >
                                      <div className="chat-profile-file-name">
                                        📎 {archivo.archivo_nombre || "Archivo"}
                                      </div>
                                      <div className="chat-profile-file-meta">
                                        {perfilTipo === "grupo" ? archivo.usuario_nickname : archivo.de_nickname} ·{" "}
                                        {archivo.archivo_tamaño
                                          ? `${(archivo.archivo_tamaño / 1024).toFixed(1)} KB`
                                          : "Tamaño desconocido"}{" "}
                                        · {new Date(archivo.fecha).toLocaleDateString("es-MX")}
                                      </div>
                                    </button>
                                  ))
                                )}
                              </>
                            )}
                            {perfilCompartidosTab === "enlaces" && (
                              <>
                                {compartidosEnlaces.length === 0 ? (
                                  <div className="chat-empty-pro">No hay enlaces</div>
                                ) : (
                                  compartidosEnlaces.map((item) => (
                                    <a
                                      key={`link-${item.id}`}
                                      href={item.enlace_compartido}
                                      className="chat-profile-file"
                                      target={esEnlaceExterno(item.enlace_compartido) ? "_blank" : undefined}
                                      rel={esEnlaceExterno(item.enlace_compartido) ? "noopener noreferrer" : undefined}
                                    >
                                      <div className="chat-profile-file-name">
                                        🔗 {item.enlace_compartido}
                                      </div>
                                      <div className="chat-profile-file-meta">
                                        {perfilTipo === "grupo" ? item.usuario_nickname : item.de_nickname} · {new Date(item.fecha).toLocaleDateString("es-MX")}
                                      </div>
                                    </a>
                                  ))
                                )}
                              </>
                            )}
                          </div>
                        )}
                        {!perfilCargando && !perfilError && perfilTab === "reuniones" && perfilTipo === "usuario" && (() => {
                          // Verificar que es el perfil propio antes de mostrar reuniones
                          const userNickname = user?.nickname || user?.name;
                          const perfilNickname = perfilData?.nickname || perfilData?.name;
                          const esMiPerfil = userNickname && perfilNickname && userNickname === perfilNickname;
                          
                          if (!esMiPerfil) {
                            return (
                              <div className="chat-empty-pro">
                                Solo puedes ver tus propias reuniones
                              </div>
                            );
                          }
                          
                          return (
                            <ReunionesPerfilUsuario 
                              reuniones={reuniones}
                              serverUrl={SERVER_URL}
                              authFetch={authFetch}
                              user={user}
                              setReuniones={setReuniones}
                            />
                          );
                        })()}
                        {!perfilCargando && !perfilError && perfilTab === "miembros" && perfilTipo === "grupo" && (
                          <div className="chat-profile-files" style={{ padding: "16px" }}>
                            {/* Búsqueda y filtros - Sticky */}
                            <div style={{ 
                              display: "flex", 
                              gap: "8px", 
                              marginBottom: "16px",
                              position: "sticky",
                              top: "0",
                              zIndex: 10,
                              background: "var(--chat-surface)",
                              padding: "8px 0",
                              marginTop: "-8px",
                              marginLeft: "-16px",
                              marginRight: "-16px",
                              paddingLeft: "16px",
                              paddingRight: "16px"
                            }}>
                              <div style={{ flex: "3" }}>
                                <input
                                  type="text"
                                  placeholder="Buscar miembros"
                                  value={busquedaMiembros}
                                  onChange={(e) => setBusquedaMiembros(e.target.value)}
                                  style={{
                                    width: "100%",
                                    padding: "8px 12px",
                                    background: "var(--fondo-input)",
                                    border: "1px solid var(--chat-border)",
                                    borderRadius: "6px",
                                    color: "var(--chat-text)",
                                    fontSize: "0.9rem"
                                  }}
                                />
                              </div>
                              <select
                                value={filtroMiembros}
                                onChange={(e) => setFiltroMiembros(e.target.value)}
                                style={{
                                  flex: "1",
                                  padding: "8px 12px",
                                  background: "var(--fondo-input)",
                                  border: "1px solid var(--chat-border)",
                                  borderRadius: "6px",
                                  color: "var(--chat-text)",
                                  fontSize: "0.9rem",
                                  cursor: "pointer"
                                }}
                              >
                                <option value="todos">Todos</option>
                                <option value="admins">Administradores</option>
                                <option value="miembros">Miembros</option>
                              </select>
                            </div>

                            {/* Lista de miembros filtrada */}
                            {(() => {
                              let miembrosFiltrados = perfilGrupoMiembros;
                              
                              // Filtrar por búsqueda
                              if (busquedaMiembros.trim()) {
                                miembrosFiltrados = miembrosFiltrados.filter(nickname => 
                                  nickname.toLowerCase().includes(busquedaMiembros.toLowerCase())
                                );
                              }
                              
                              // Filtrar por tipo
                              if (filtroMiembros === "admins") {
                                miembrosFiltrados = miembrosFiltrados.filter(nickname => 
                                  perfilGrupoAdmins.includes(nickname) || perfilData?.creado_por === nickname
                                );
                              } else if (filtroMiembros === "miembros") {
                                miembrosFiltrados = miembrosFiltrados.filter(nickname => 
                                  !perfilGrupoAdmins.includes(nickname) && perfilData?.creado_por !== nickname
                                );
                              }
                              
                              return miembrosFiltrados.length === 0 ? (
                                <div className="chat-empty-pro">No se encontraron miembros</div>
                              ) : (
                                miembrosFiltrados.map((nickname) => {
                                const usuario = usuariosCOPMEC.find(u => (u.nickname || u.name) === nickname);
                                const esAdmin = perfilGrupoAdmins.includes(nickname);
                                const esCreador = perfilData?.creado_por === nickname;
                                const userDisplayName = user?.nickname || user?.name;
                                const esYo = nickname === userDisplayName;
                                const puedoGestionar = perfilData?.es_admin && !esYo;
                                const restriccion = perfilGrupoRestricciones[nickname];
                                const tieneRestriccionIndefinida = restriccion?.indefinida === true;
                                const menuAbierto = menuMiembroAbierto === nickname;
                                const submenuAbierto = submenuRestriccionAbierto === nickname;
                                
                                return (
                                  <div key={nickname} className="chat-profile-card" style={{ marginBottom: "8px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: menuAbierto ? "8px" : "0" }}>
                                      <img
                                        src={getAvatarUrl(usuario)}
                                        alt={nickname}
                                        className="chat-avatar"
                                        style={{ width: "40px", height: "40px" }}
                                      />
                                      <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600 }}>{nickname}</div>
                                        <div style={{ fontSize: "0.75rem", color: "var(--chat-muted)" }}>
                                          {esCreador ? "Creador" : esAdmin ? "Administrador" : "Miembro"}
                                          {restriccion && (
                                            <span style={{ marginLeft: "6px", color: "#ef4444" }}>
                                              🔒 {restriccion.indefinida ? "Restringido (indefinido)" : "Restringido"}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      {!esYo && (
                                        <button
                                          className="chat-profile-action-btn"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (menuAbierto) {
                                              setMenuMiembroAbierto(null);
                                              setMenuMiembroPosicion(null);
                                              setSubmenuRestriccionAbierto(null);
                                            } else {
                                              const rect = e.currentTarget.getBoundingClientRect();
                                              setMenuMiembroPosicion({ x: rect.left, y: rect.bottom + 4 });
                                              setMenuMiembroAbierto(nickname);
                                              setSubmenuRestriccionAbierto(null);
                                            }
                                          }}
                                          style={{ 
                                            fontSize: "1.1rem", 
                                            padding: "4px 8px",
                                            background: menuAbierto ? "var(--fondo-card-hover)" : "transparent",
                                            color: "var(--texto-principal)",
                                            border: "1px solid var(--borde-visible)",
                                            borderRadius: "6px",
                                            cursor: "pointer"
                                          }}
                                          title="Opciones"
                                        >
                                          ⋮
                                        </button>
                                      )}
                                    </div>
                                    
                                    {/* Menú ya no inline; se muestra como overlay */}
                                    {/* eslint-disable-next-line no-constant-binary-expression */}
                                    {menuAbierto && false && (
                                      <div 
                                        className="chat-member-menu"
                                        style={{
                                          display: "inline-block",
                                          marginTop: "4px",
                                          background: "rgba(0, 0, 0, 0.05)",
                                          backdropFilter: "blur(8px)",
                                          border: "1px solid rgba(255, 255, 255, 0.1)",
                                          borderRadius: "4px",
                                          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                                          zIndex: 1000,
                                          padding: "2px"
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {/* Opciones de administración - Solo para admins */}
                                        {puedoGestionar && !esCreador && (
                                          <>
                                            <button
                                              className="chat-profile-action-btn"
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                setMenuMiembroAbierto(null);
                                                try {
                                                  await authFetch(`${SERVER_URL}/api/chat/grupos/${chatActual}/miembros/${nickname}/admin`, {
                                                    method: "POST",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({ es_admin: !esAdmin }),
                                                  });
                                                  abrirPerfilGrupo(chatActual);
                                                  showAlert(esAdmin ? "Administrador removido" : "Administrador agregado", "success");
                                                } catch (_err) {
                                                  showAlert("Error gestionando administrador", "error");
                                                }
                                              }}
                                              style={{ 
                                                width: "auto", 
                                                display: "block",
                                                textAlign: "left",
                                                fontSize: "0.7rem", 
                                                padding: "4px 8px",
                                                background: "transparent",
                                                border: "none",
                                                color: "var(--chat-text)",
                                                cursor: "pointer",
                                                borderRadius: "4px",
                                                lineHeight: "1.4",
                                                whiteSpace: "nowrap"
                                              }}
                                              onMouseEnter={(e) => e.target.style.background = "rgba(255, 255, 255, 0.1)"}
                                              onMouseLeave={(e) => e.target.style.background = "transparent"}
                                            >
                                              {esAdmin ? "❌ Remover admin" : "⭐ Hacer admin"}
                                            </button>
                                            
                                            <div style={{ position: "relative" }}>
                                              <button
                                                className="chat-profile-action-btn"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setSubmenuRestriccionAbierto(submenuAbierto ? null : nickname);
                                                }}
                                                style={{ 
                                                  width: "auto", 
                                                  display: "block",
                                                  textAlign: "left",
                                                  fontSize: "0.7rem", 
                                                  padding: "4px 8px",
                                                  background: "transparent",
                                                  border: "none",
                                                  color: tieneRestriccionIndefinida ? "#5f8fbe" : "var(--chat-text)",
                                                  cursor: "pointer",
                                                  borderRadius: "4px",
                                                  whiteSpace: "nowrap"
                                                }}
                                                onMouseEnter={(e) => e.target.style.background = "rgba(255, 255, 255, 0.1)"}
                                                onMouseLeave={(e) => e.target.style.background = "transparent"}
                                              >
                                                <span>{tieneRestriccionIndefinida ? "✅ Permitir" : "🔒 Restringir"}</span>
                                                <span style={{ fontSize: "0.6rem" }}>{submenuAbierto ? "▲" : "▼"}</span>
                                              </button>
                                              
                                              {/* Submenú de restricciones */}
                                              {submenuAbierto && (
                                                <div 
                                                  style={{
                                                    display: "inline-block",
                                                    marginTop: "2px",
                                                    background: "rgba(0, 0, 0, 0.05)",
                                                    backdropFilter: "blur(8px)",
                                                    border: "1px solid rgba(255, 255, 255, 0.1)",
                                                    borderRadius: "4px",
                                                    padding: "2px"
                                                  }}
                                                  onClick={(e) => e.stopPropagation()}
                                                >
                                                  {tieneRestriccionIndefinida ? (
                                                    <button
                                                      onClick={async (e) => {
                                                        e.stopPropagation();
                                                        setSubmenuRestriccionAbierto(null);
                                                        setMenuMiembroAbierto(null);
                                                        try {
                                                          await authFetch(`${SERVER_URL}/api/chat/grupos/${chatActual}/miembros/${nickname}/restringir`, {
                                                            method: "POST",
                                                            headers: { "Content-Type": "application/json" },
                                                            body: JSON.stringify({ duracion_minutos: null, remover: true }),
                                                          });
                                                          abrirPerfilGrupo(chatActual);
                                                          showAlert("Restricción removida", "success");
                                                        } catch (_err) {
                                                          showAlert("Error removiendo restricción", "error");
                                                        }
                                                      }}
                                                      style={{ 
                                                        width: "auto", 
                                                        display: "block",
                                                        textAlign: "left",
                                                        fontSize: "0.65rem", 
                                                        padding: "4px 6px",
                                                        background: "transparent",
                                                        border: "none",
                                                        color: "#5f8fbe",
                                                        cursor: "pointer",
                                                        borderRadius: "3px",
                                                        lineHeight: "1.3",
                                                        whiteSpace: "nowrap"
                                                      }}
                                                      onMouseEnter={(e) => e.target.style.background = "rgba(54, 120, 177, 0.1)"}
                                                      onMouseLeave={(e) => e.target.style.background = "transparent"}
                                                    >
                                                      ✅ Permitir mensaje
                                                    </button>
                                                  ) : (
                                                    <>
                                                      {["5 min", "10 min", "15 min", "30 min", "1 hora", "24 horas", "Indefinido"].map((opcion) => (
                                                        <button
                                                          key={opcion}
                                                          onClick={async (e) => {
                                                            e.stopPropagation();
                                                            setSubmenuRestriccionAbierto(null);
                                                            setMenuMiembroAbierto(null);
                                                            
                                                            let minutos = null;
                                                            if (opcion === "5 min") minutos = 5;
                                                            else if (opcion === "10 min") minutos = 10;
                                                            else if (opcion === "15 min") minutos = 15;
                                                            else if (opcion === "30 min") minutos = 30;
                                                            else if (opcion === "1 hora") minutos = 60;
                                                            else if (opcion === "24 horas") minutos = 24 * 60;
                                                            else if (opcion === "Indefinido") minutos = null;
                                                            
                                                            try {
                                                              await authFetch(`${SERVER_URL}/api/chat/grupos/${chatActual}/miembros/${nickname}/restringir`, {
                                                                method: "POST",
                                                                headers: { "Content-Type": "application/json" },
                                                                body: JSON.stringify({ duracion_minutos: minutos }),
                                                              });
                                                              abrirPerfilGrupo(chatActual);
                                                              showAlert(`Restricción aplicada: ${opcion}`, "success");
                                                            } catch (_err) {
                                                              showAlert("Error aplicando restricción", "error");
                                                            }
                                                          }}
                                                          style={{ 
                                                            width: "auto", 
                                                            display: "block",
                                                            textAlign: "left",
                                                            fontSize: "0.65rem", 
                                                            padding: "4px 6px",
                                                            background: "transparent",
                                                            border: "none",
                                                            color: "var(--chat-text)",
                                                            cursor: "pointer",
                                                            borderRadius: "3px",
                                                            lineHeight: "1.3",
                                                            whiteSpace: "nowrap"
                                                          }}
                                                          onMouseEnter={(e) => e.target.style.background = "rgba(255, 255, 255, 0.1)"}
                                                          onMouseLeave={(e) => e.target.style.background = "transparent"}
                                                        >
                                                          {opcion}
                                                        </button>
                                                      ))}
                                                    </>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                            
                                            <button
                                              className="chat-profile-action-btn"
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                setMenuMiembroAbierto(null);
                                                if (await showConfirm("Eliminar miembro", `¿Eliminar a ${nickname} del grupo?`) === true) {
                                                  try {
                                                    await authFetch(`${SERVER_URL}/api/chat/grupos/${chatActual}/miembros/${nickname}`, {
                                                      method: "DELETE",
                                                    });
                                                    abrirPerfilGrupo(chatActual);
                                                    showAlert("Miembro eliminado del grupo", "success");
                                                  } catch (_err) {
                                                    showAlert("Error eliminando miembro", "error");
                                                  }
                                                }
                                              }}
                                              style={{ 
                                                width: "auto", 
                                                display: "block",
                                                textAlign: "left",
                                                fontSize: "0.7rem", 
                                                padding: "4px 8px",
                                                background: "transparent",
                                                border: "none",
                                                color: "#ef4444",
                                                cursor: "pointer",
                                                borderRadius: "4px",
                                                lineHeight: "1.4",
                                                whiteSpace: "nowrap"
                                              }}
                                              onMouseEnter={(e) => e.target.style.background = "rgba(255, 255, 255, 0.1)"}
                                              onMouseLeave={(e) => e.target.style.background = "transparent"}
                                            >
                                              🗑️ Eliminar
                                            </button>
                                          </>
                                        )}
                                        
                                        {/* Transferir propiedad - Solo para el creador */}
                                        {perfilData?.es_creador && !esCreador && (
                                          <button
                                            className="chat-profile-action-btn"
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              setMenuMiembroAbierto(null);
                                              if (await showConfirm("Transferir propiedad", `¿Transferir la propiedad del grupo a ${nickname}?`) === true) {
                                                try {
                                                  await authFetch(`${SERVER_URL}/api/chat/grupos/${chatActual}/transferir`, {
                                                    method: "POST",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({ nuevo_creador: nickname }),
                                                  });
                                                  abrirPerfilGrupo(chatActual);
                                                  showAlert("Propiedad transferida", "success");
                                                } catch (_err) {
                                                  showAlert("Error transfiriendo propiedad", "error");
                                                }
                                              }
                                            }}
                                            style={{ 
                                              width: "auto", 
                                              display: "block",
                                              textAlign: "left",
                                              fontSize: "0.7rem", 
                                              padding: "4px 8px",
                                              background: "transparent",
                                              border: "none",
                                              color: "var(--chat-text)",
                                              cursor: "pointer",
                                              borderRadius: "4px",
                                              lineHeight: "1.4",
                                              whiteSpace: "nowrap"
                                            }}
                                            onMouseEnter={(e) => e.target.style.background = "rgba(255, 255, 255, 0.1)"}
                                            onMouseLeave={(e) => e.target.style.background = "transparent"}
                                          >
                                            👑 Transferir propiedad
                                          </button>
                                        )}
                                        
                                        {/* Opciones básicas - Para todos */}
                                        <button
                                          className="chat-profile-action-btn"
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            setMenuMiembroAbierto(null);
                                            abrirPerfilUsuario(nickname);
                                          }}
                                          style={{ 
                                            width: "auto", 
                                            display: "block",
                                            textAlign: "left",
                                            fontSize: "0.7rem", 
                                            padding: "4px 8px",
                                            background: "transparent",
                                            border: "none",
                                            color: "var(--chat-text)",
                                            cursor: "pointer",
                                            borderRadius: "4px",
                                            lineHeight: "1.4",
                                            whiteSpace: "nowrap"
                                          }}
                                          onMouseEnter={(e) => e.target.style.background = "rgba(255, 255, 255, 0.1)"}
                                          onMouseLeave={(e) => e.target.style.background = "transparent"}
                                        >
                                          👤 Ver perfil
                                        </button>
                                        
                                        <button
                                          className="chat-profile-action-btn"
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            setMenuMiembroAbierto(null);
                                            abrirChat("privado", nickname);
                                          }}
                                          style={{ 
                                            width: "auto", 
                                            display: "block",
                                            textAlign: "left",
                                            fontSize: "0.7rem", 
                                            padding: "4px 8px",
                                            background: "transparent",
                                            border: "none",
                                            color: "var(--chat-text)",
                                            cursor: "pointer",
                                            borderRadius: "4px",
                                            lineHeight: "1.4",
                                            whiteSpace: "nowrap"
                                          }}
                                          onMouseEnter={(e) => e.target.style.background = "var(--fondo-input)"}
                                          onMouseLeave={(e) => e.target.style.background = "transparent"}
                                        >
                                          💬 Enviar mensaje
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                                })
                              );
                            })()}
                          </div>
                        )}
                        {!perfilCargando && !perfilError && perfilTab === "configuracion" && perfilTipo === "grupo" && (
                          <div className="chat-profile-info" style={{ padding: "16px" }}>
                            {/* Hacer grupo público/privado */}
                            {perfilData?.es_admin && (
                              <div style={{ marginBottom: "24px", borderBottom: "1px solid var(--chat-border)", paddingBottom: "16px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                  <div>
                                    <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--chat-text)", marginBottom: "4px" }}>
                                      Visibilidad del grupo
                                    </div>
                                    <div style={{ fontSize: "0.85rem", color: "var(--chat-muted)", lineHeight: "1.5" }}>
                                      {perfilData?.es_publico ? "Este grupo es público. Cualquiera puede unirse." : "Este grupo es privado. Solo los miembros pueden verlo."}
                                    </div>
                                  </div>
                                  <button
                                    onClick={async () => {
                                      try {
                                        const nuevoEstado = !perfilData?.es_publico;
                                        await authFetch(`${SERVER_URL}/api/chat/grupos/${chatActual}`, {
                                          method: "PUT",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({ es_publico: nuevoEstado }),
                                        });
                                        abrirPerfilGrupo(chatActual);
                                        showAlert(`Grupo ${nuevoEstado ? "público" : "privado"}`, "success");
                                      } catch (_err) {
                                        showAlert("Error cambiando visibilidad del grupo", "error");
                                      }
                                    }}
                                    style={{
                                      background: "transparent",
                                      border: "1px solid var(--chat-border)",
                                      borderRadius: "6px",
                                      color: "var(--azul-primario)",
                                      cursor: "pointer",
                                      fontSize: "0.85rem",
                                      padding: "6px 12px"
                                    }}
                                  >
                                    {perfilData?.es_publico ? "Hacer privado" : "Hacer público"}
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Permisos de publicación */}
                            <div style={{ marginBottom: "24px", borderBottom: "1px solid var(--chat-border)", paddingBottom: "16px" }}>
                              <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--chat-text)", marginBottom: "12px" }}>
                                Permisos de publicación
                              </div>
                              <div style={{ fontSize: "0.85rem", color: "var(--chat-muted)", marginBottom: "8px", lineHeight: "1.5" }}>
                                <div style={{ marginBottom: "4px" }}>• Todos pueden publicar</div>
                                <div style={{ marginBottom: "4px" }}>• Todos pueden responder a los mensajes</div>
                                <div style={{ marginBottom: "8px" }}>
                                  • Según los ajustes del espacio de trabajo, solo las personas con permisos pueden usar las menciones de @canal y @aquí
                                </div>
                                <button type="button" onClick={(e) => e.preventDefault()} style={{ background: "transparent", border: "none", color: "var(--azul-primario)", textDecoration: "none", cursor: "pointer", padding: 0 }}>Más información</button>
                              </div>
                            </div>

                            {/* Juntas */}
                            <div style={{ marginBottom: "24px", borderBottom: "1px solid var(--chat-border)", paddingBottom: "16px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                                <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--chat-text)" }}>Juntas</div>
                                <span style={{ fontSize: "0.75rem", color: "var(--chat-muted)", cursor: "help" }} title="Información sobre juntas">ⓘ</span>
                              </div>
                              <div style={{ fontSize: "0.85rem", color: "var(--chat-muted)", marginBottom: "12px" }}>
                                Los miembros pueden iniciar juntas y unirse a ellas en este grupo.
                              </div>
                              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                <button
                                  style={{
                                    padding: "4px 8px",
                                    background: "transparent",
                                    border: "2px solid var(--borde-visible)",
                                    borderRadius: "4px",
                                    color: "var(--texto-principal)",
                                    cursor: "pointer",
                                    fontSize: "0.85rem",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    whiteSpace: "nowrap"
                                  }}
                                  disabled
                                  title="Próximamente"
                                >
                                  🎧 Iniciar junta
                                </button>
                                <button
                                  style={{
                                    padding: "4px 8px",
                                    background: "transparent",
                                    border: "1px solid var(--chat-border)",
                                    borderRadius: "4px",
                                    color: "var(--chat-text)",
                                    cursor: "pointer",
                                    fontSize: "0.85rem",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    whiteSpace: "nowrap"
                                  }}
                                  disabled
                                  title="Próximamente"
                                >
                                  🔗 Copiar el enlace de la junta
                                </button>
                              </div>
                              <button type="button" onClick={(e) => e.preventDefault()} style={{ background: "transparent", border: "none", color: "var(--azul-primario)", textDecoration: "none", fontSize: "0.85rem", marginTop: "8px", display: "block", cursor: "pointer", padding: 0, textAlign: "left" }}>Más información</button>
                            </div>

                            {/* Iniciar siempre las notas de IA */}
                            <div style={{ marginBottom: "24px", borderBottom: "1px solid var(--chat-border)", paddingBottom: "16px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--chat-text)", marginBottom: "4px" }}>
                                    Iniciar siempre las notas de IA
                                  </div>
                                  <div style={{ fontSize: "0.85rem", color: "var(--chat-muted)", lineHeight: "1.5" }}>
                                    Elige si todas las juntas de este grupo se transcribirán y resumirán de forma predeterminada. Pueden cambiar este ajuste: Miembros.
                                  </div>
                                </div>
                                {perfilData?.es_admin && (
                                  <button
                                    style={{
                                      background: "transparent",
                                      border: "none",
                                      color: "var(--azul-primario)",
                                      cursor: "pointer",
                                      fontSize: "0.85rem",
                                      padding: "4px 8px"
                                    }}
                                    disabled
                                    title="Próximamente"
                                  >
                                    Editar
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Elegir quiénes pueden agregar, quitar y reorganizar pestañas */}
                            <div style={{ marginBottom: "24px", borderBottom: "1px solid var(--chat-border)", paddingBottom: "16px" }}>
                              <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--chat-text)", marginBottom: "8px" }}>
                                Elige quiénes pueden agregar, quitar y reorganizar pestañas
                              </div>
                              {perfilData?.es_admin ? (
                                <select
                                  style={{
                                    width: "100%",
                                    padding: "8px 12px",
                                    background: "var(--fondo-input)",
                                    border: "1px solid var(--chat-border)",
                                    borderRadius: "6px",
                                    color: "var(--chat-text)",
                                    fontSize: "0.9rem",
                                    cursor: "pointer"
                                  }}
                                  disabled
                                  title="Próximamente"
                                >
                                  <option>Todos</option>
                                  <option>Solo administradores</option>
                                </select>
                              ) : (
                                <div style={{ fontSize: "0.85rem", color: "var(--chat-muted)" }}>Todos</div>
                              )}
                            </div>

                            {/* Copiar nombres de los miembros */}
                            <div style={{ marginBottom: "16px" }}>
                              <button
                                onClick={async () => {
                                  try {
                                    const nombres = perfilGrupoMiembros.join(", ");
                                    await navigator.clipboard.writeText(nombres);
                                    showAlert("Nombres copiados al portapapeles", "success");
                                  } catch (_err) {
                                    showAlert("Error al copiar nombres", "error");
                                  }
                                }}
                                style={{
                                  padding: "4px 8px",
                                  background: "transparent",
                                  border: "2px solid var(--borde-visible)",
                                  borderRadius: "4px",
                                  color: "var(--texto-principal)",
                                  cursor: "pointer",
                                  fontSize: "0.85rem",
                                  fontWeight: 500,
                                  whiteSpace: "nowrap",
                                  display: "inline-block"
                                }}
                              >
                                Copiar nombres de los miembros
                              </button>
                            </div>

                            {/* Copiar direcciones de correo electrónico de los miembros */}
                            <div style={{ marginBottom: "16px" }}>
                              <button
                                onClick={async () => {
                                  try {
                                    const correos = perfilGrupoMiembros
                                      .map(nickname => {
                                        const usuario = usuariosCOPMEC.find(u => (u.nickname || u.name) === nickname);
                                        return usuario?.correo || null;
                                      })
                                      .filter(c => c)
                                      .join(", ");
                                    if (correos) {
                                      await navigator.clipboard.writeText(correos);
                                      showAlert("Correos copiados al portapapeles", "success");
                                    } else {
                                      showAlert("No hay correos disponibles", "warning");
                                    }
                                  } catch (_err) {
                                    showAlert("Error al copiar correos", "error");
                                  }
                                }}
                                style={{
                                  padding: "4px 8px",
                                  background: "transparent",
                                  border: "2px solid var(--borde-visible)",
                                  borderRadius: "4px",
                                  color: "var(--texto-principal)",
                                  cursor: "pointer",
                                  fontSize: "0.85rem",
                                  fontWeight: 500,
                                  whiteSpace: "nowrap",
                                  display: "inline-block"
                                }}
                              >
                                Copiar direcciones de correo electrónico de los miembros
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="chat-panel-body">
                      <div className="chat-header-pro">
                        {tipoChat === "general" ? (
                          <>
                            <div className="chat-header-left">
                              <span className="grupo-icon">🌐</span>
                              <span className="chat-header-title">
                                <strong>Chat General</strong>
                              </span>
                            </div>
                            {esAdmin && (
                              <button
                                className="chat-delete-btn"
                                onClick={limpiarChat}
                                title="Vaciar historial (Solo admin)"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                              </button>
                            )}
                          </>
                        ) : tipoChat === "privado" ? (
                          <>
                            <div className="chat-header-left">
                              <img
                                src={getAvatarUrl(chatActual)}
                                alt={chatActual}
                                className="chat-avatar header-avatar"
                                onError={(e) => {
                                  e.target.src = makeInitialsAvatar(e.target.alt || '?');
                                }}
                              />
                              <span className="chat-header-title">
                                <button
                                  className="chat-header-name-button"
                                  onClick={() => {
                                    // Solo abrir perfil si NO es el usuario actual
                                    const userNickname = user?.nickname || user?.name;
                                    if (chatActual && chatActual !== userNickname) {
                                      abrirPerfilUsuario(chatActual);
                                    }
                                  }}
                                  title="Ver información y archivos"
                                  type="button"
                                >
                                  <strong style={{ color: getColorForName(chatActual || "Usuario") }}>
                                    {chatActual}
                                  </strong>
                                </button>
                                {estaEscribiendoClave(chatActual) ? (
                                  <span className="chat-header-typing">
                                    <span className="chat-typing-label">escribiendo</span>
                                    <span className="chat-typing-dots" aria-hidden="true"><i /><i /><i /></span>
                                  </span>
                                ) : null}
                              </span>
                            </div>
                            <div className="chat-header-actions">
                              <button
                                className="chat-header-icon-btn"
                                onClick={abrirVideollamada}
                                title="Videollamada"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                              </button>
                              <button
                                className="chat-delete-btn"
                                onClick={limpiarChat}
                                title="Borrar conversación"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                              </button>
                            </div>
                          </>
                        ) : tipoChat === "grupal" ? (
                          <>
                            <div className="chat-header-left">
                              <span className="grupo-icon">👥</span>
                              <span className="chat-header-title">
                                <strong style={{ color: getColorForName(chatActual || "Grupo") }}>
                                  {(Array.isArray(grupos) && grupos.find((g) => String(g.id) === String(chatActual))?.nombre) ||
                                    "Grupo"}
                                </strong>
                              </span>
                            </div>
                            <div className="chat-header-actions">
                              <button
                                className="chat-header-icon-btn"
                                onClick={abrirVideollamada}
                                title="Videollamada"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                              </button>
                              <button
                                className="chat-add-member-btn"
                                onClick={() => {
                                  setGrupoAgregarMiembros(chatActual);
                                  setMostrarAgregarMiembros(true);
                                }}
                                title="Agregar miembro"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                              </button>
                            </div>
                          </>
                        ) : null}
                      </div>
                      {mensajeFijado && (
                        <div className="chat-pinned-bar">
                          <span className="chat-pinned-icon">📌</span>
                          <span className="chat-pinned-text">
                            {mensajeFijado.mensaje ||
                              mensajeFijado.archivo_nombre ||
                              "Mensaje fijado"}
                          </span>
                          <button
                            className="chat-pinned-close"
                            onClick={desfijarMensaje}
                            title="Desfijar"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                      {seleccionModo && (
                        <div className="chat-selection-bar">
                          <span>{seleccionMensajes.size} seleccionados</span>
                          <div className="chat-selection-actions">
                            <button onClick={eliminarMensajesSeleccionados}>Eliminar</button>
                            <button onClick={salirSeleccion}>Cancelar</button>
                          </div>
                        </div>
                      )}

                      {tipoChat === "privado" && chatActual && estaEscribiendoClave(chatActual) && (
                        <div className="chat-typing-live" role="status" aria-live="polite">
                          <span className="chat-typing-dots" aria-hidden="true"><i /><i /><i /></span>
                          <span>{resolveUsuarioChat(chatActual)?.name || chatActual} está escribiendo…</span>
                        </div>
                      )}

                      <div className="chat-body-pro" ref={chatBodyRef}>
                        {mensajesActuales.length === 0 && (
                          <div className="chat-empty-pro">No hay mensajes</div>
                        )}

                        {mensajesActuales.map((m, i) => {
                          const userDisplayName = user?.nickname || user?.name;
                          const esMio =
                            m.usuario_nickname === userDisplayName ||
                            m.de_nickname === userDisplayName;
                          const msgKey = m.id || i;
                          const mensajeId = m.id || null;
                          const estaSeleccionado = mensajeId
                            ? seleccionMensajes.has(mensajeId)
                            : false;
                          const msgIdStr = String(m.id || "");
                          const estaDestacado = msgIdStr && mensajesDestacados.has(msgIdStr);
                          const esPrioritario = m.prioridad === 1;
                          const fueLeido =
                            tipoChat === "privado" &&
                            esMio &&
                            !!lecturasPrivadas[msgIdStr];
                          const fueEntregado =
                            tipoChat === "privado" && esMio;

                          // Calcular el nombre del remitente correctamente
                          let otroNickname = "Usuario";
                          if (tipoChat === "general") {
                            otroNickname = m.usuario_nickname || "Usuario";
                          } else if (tipoChat === "privado") {
                            // En chat privado, el remitente es quien envió el mensaje
                            otroNickname = m.de_nickname || chatActual || "Usuario";
                          } else if (tipoChat === "grupal") {
                            otroNickname = m.usuario_nickname || "Usuario";
                          }

                          return (
                            <div
                              key={i}
                              id={mensajeId ? `msg-${mensajeId}` : undefined}
                              className={`${esMio ? "msg-row msg-row-out" : "msg-row msg-row-in"}${mensajeResaltadoId === mensajeId ? " msg-resaltado-prioritario" : ""}`}
                            >
                              {!esMio && (
                                <img
                                  src={
                                    m.usuario_photo
                                      ? (m.usuario_photo.startsWith("http") || m.usuario_photo.startsWith("/uploads")
                                          ? (m.usuario_photo.startsWith("http")
                                              ? m.usuario_photo
                                              : `${SERVER_URL}${m.usuario_photo}`)
                                          : `${SERVER_URL}/uploads/perfiles/${m.usuario_photo}`)
                                      : m.de_photo
                                      ? (m.de_photo.startsWith("http") || m.de_photo.startsWith("/uploads")
                                          ? (m.de_photo.startsWith("http")
                                              ? m.de_photo
                                              : `${SERVER_URL}${m.de_photo}`)
                                          : `${SERVER_URL}/uploads/perfiles/${m.de_photo}`)
                                      : getAvatarUrl({})
                                  }
                                  alt=""
                                  className="chat-avatar msg-avatar"
                                  onError={(e) => {
                                    e.target.src = makeInitialsAvatar(e.target.alt || '?');
                                  }}
                                />
                              )}

                              {esMio && (
                                <button
                                  type="button"
                                  className="msg-reenviar-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    abrirReenvio(m);
                                  }}
                                  onContextMenu={(e) => e.stopPropagation()}
                                  title="Reenviar"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 17 20 12 15 7"/><path d="M4 18v-2a4 4 0 0 1 4-4h12"/></svg>
                                </button>
                              )}

                              <div
                                className={`${esMio ? "msg-yo-pro" : "msg-otro-pro"} ${
                                  estaSeleccionado ? "msg-selected" : ""
                                } ${esPrioritario ? "msg-prioritario" : ""}`}
                                style={{
                                  borderColor: esPrioritario
                                    ? "#ff6b6b"
                                    : esMio
                                    ? getColorForName(userDisplayName || "Usuario")
                                    : getColorForName(otroNickname),
                                  borderWidth: esPrioritario ? "2px" : "1px",
                                }}
                                onClick={(e) => {
                                  if (!seleccionModo || !mensajeId) return;
                                  if (
                                    e.target.closest("button") ||
                                    e.target.closest("a") ||
                                    e.target.closest(".msg-archivo-link")
                                  ) {
                                    return;
                                  }
                                  toggleSeleccionMensaje(mensajeId);
                                }}
                                onContextMenu={(e) =>
                                  abrirMenuMensaje(e, {
                                    mensaje: m,
                                    msgKey,
                                    esMio,
                                    otroNickname,
                                  })
                                }
                                onDoubleClick={(e) => {
                                  if (seleccionModo || editandoMensaje === m.id) return;
                                  if (e.target.closest("button") || e.target.closest("a") || e.target.closest(".msg-archivo-link") || e.target.closest(".msg-mention-link") || e.target.closest(".msg-reenviar-btn")) return;
                                  togglePrioridadMensaje(m);
                                }}
                                onTouchStart={() =>
                                  iniciarPress({
                                    mensaje: m,
                                    msgKey,
                                    esMio,
                                    otroNickname,
                                  })
                                }
                                onTouchEnd={cancelarPress}
                                onTouchMove={marcarMovimiento}
                              >
                                {tipoChat === "privado" && (
                                  <div className={`msg-usuario-nombre ${esMio ? "msg-yo-label" : "msg-otro-label"}`}>
                                    {esMio ? "Tú" : otroNickname}
                                  </div>
                                )}
                                {tipoChat !== "privado" && !esMio && (
                                  <div className="msg-usuario-nombre">
                                    {otroNickname}
                                    {esPrioritario && <span className="msg-prioridad-badge">🔴 Prioridad Alta</span>}
                                  </div>
                                )}
                                {esPrioritario && tipoChat === "privado" && (
                                  <div className="msg-prioridad-indicator">🔴 Mensaje Prioritario</div>
                                )}
                                {(m.reenviado_de_usuario || m.reenviado_de_chat) && (
                                  <div className="msg-forwarded">
                                    ↪ Reenviado de {m.reenviado_de_usuario || m.reenviado_de_chat || "Usuario"}
                                  </div>
                                )}
                                {m.reply_to_text && (
                                  <div className="msg-reply">
                                    <span className="msg-reply-user">
                                      {m.reply_to_user || "Usuario"}
                                    </span>
                                    <span className="msg-reply-text">
                                      {m.reply_to_text}
                                    </span>
                                  </div>
                                )}
                                <div className="msg-contenido">
                                  {editandoMensaje === m.id ? (
                                    <div className="msg-editar-form">
                                      <input
                                        type="text"
                                        value={textoEdicion}
                                        onChange={(e) => setTextoEdicion(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            guardarEdicion();
                                          } else if (e.key === "Escape") {
                                            cancelarEdicion();
                                          }
                                        }}
                                        autoFocus
                                      />
                                      <button onClick={guardarEdicion} className="btn-guardar-edicion">✓</button>
                                      <button onClick={cancelarEdicion} className="btn-cancelar-edicion">✕</button>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="msg-texto">
                                        {m.menciona && (
                                          <button
                                            type="button"
                                            className="msg-mention-link"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              abrirChat("privado", m.menciona);
                                            }}
                                          >
                                            @{m.menciona}
                                          </button>
                                        )}
                                        {m.enlace_compartido && (
                                          <a
                                            href={m.enlace_compartido.startsWith("http") ? m.enlace_compartido : `#${m.enlace_compartido}`}
                                            className="msg-enlace"
                                            target={esEnlaceExterno(m.enlace_compartido) ? "_blank" : undefined}
                                            rel={esEnlaceExterno(m.enlace_compartido) ? "noopener noreferrer" : undefined}
                                          >
                                            {m.enlace_compartido}
                                          </a>
                                        )}
                                        {(!m.enlace_compartido || m.mensaje !== m.enlace_compartido) && !m.archivo_url && (() => {
                                          // Si el mensaje es solo un sticker, no mostrar el texto
                                          const mensajeTexto = m.menciona 
                                            ? (m.mensaje || "").replace(new RegExp(`@${m.menciona}\\b`, 'gi'), '').trim()
                                            : (m.mensaje || "");
                                          const esSoloSticker = /^\[sticker:\d+:[^\]]+\]$/.test(mensajeTexto.trim());
                                          
                                          if (esSoloSticker) {
                                            return null; // No mostrar texto si es solo sticker
                                          }
                                          
                                          return (
                                            <span
                                              className="msg-texto-html"
                                              dangerouslySetInnerHTML={{
                                                __html: formatearMensaje(mensajeTexto),
                                              }}
                                            />
                                          );
                                        })()}
                                        {m.mensaje_editado === 1 && (
                                          <span className="msg-editado-indicador" title={`Editado el ${new Date(m.fecha_edicion).toLocaleString("es-MX")}`}>
                                            (editado)
                                          </span>
                                        )}
                                      </div>
                                      {m.enlace_compartido && (
                                        (() => {
                                          const preview = obtenerPreviewEnlace(m.enlace_compartido);
                                          if (preview) {
                                            return (
                                              <a
                                                href={preview.link}
                                                className="msg-link-preview"
                                                target={preview.esInterno ? undefined : "_blank"}
                                                rel={preview.esInterno ? undefined : "noopener noreferrer"}
                                                onClick={(e) => {
                                                  if (!preview.link.startsWith("http")) {
                                                    e.preventDefault();
                                                    abrirEnApp(preview.link);
                                                  }
                                                }}
                                              >
                                                <img 
                                                  src={preview.imageUrl} 
                                                  alt={preview.titulo}
                                                  onError={(e) => {
                                                    // Si falla la imagen, ocultarla
                                                    e.target.style.display = 'none';
                                                  }}
                                                />
                                                <div className="msg-link-preview-content">
                                                  <div className="msg-link-preview-title">{preview.titulo}</div>
                                                  <div className="msg-link-preview-subtitle">{preview.subtitulo}</div>
                                                </div>
                                              </a>
                                            );
                                          }
                                          // Si no hay preview, mostrar el enlace como link clickeable
                                          return (
                                            <a
                                              href={m.enlace_compartido.startsWith("http") ? m.enlace_compartido : `#${m.enlace_compartido}`}
                                              className="msg-enlace"
                                              target={esEnlaceExterno(m.enlace_compartido) ? "_blank" : undefined}
                                              rel={esEnlaceExterno(m.enlace_compartido) ? "noopener noreferrer" : undefined}
                                              onClick={(e) => {
                                                if (!m.enlace_compartido.startsWith("http")) {
                                                  e.preventDefault();
                                                  abrirEnApp(m.enlace_compartido);
                                                }
                                              }}
                                            >
                                              🔗 {m.enlace_compartido}
                                            </a>
                                          );
                                        })()
                                      )}
                                      {m.archivo_url && (() => {
                                        // Detectar si es un sticker:
                                        // 1. Por el patrón [sticker:id:nombre] en el mensaje
                                        // 2. Por el nombre del archivo que contiene "sticker"
                                        const tienePatronSticker = m.mensaje?.includes('[sticker:');
                                        const esStickerPorNombre = m.archivo_nombre?.toLowerCase().includes('sticker');
                                        const esImagen = m.archivo_tipo?.startsWith('image/');
                                        const esSticker = (tienePatronSticker || esStickerPorNombre) && esImagen;
                                        
                                        if (esSticker) {
                                          // Construir URL completa con token de autenticación
                                          const _token1 = obtenerToken();
                                          let urlImagen = m.archivo_url;
                                          
                                          if (urlImagen.startsWith('/chat/archivo/')) {
                                            urlImagen = `${SERVER_URL}${urlImagen}`;
                                          } else if (!urlImagen.startsWith('http')) {
                                            urlImagen = `${SERVER_URL}${urlImagen.startsWith('/') ? '' : '/'}${urlImagen}`;
                                          }
                                          
                                          const esGif = m.archivo_tipo === 'image/gif' || m.archivo_nombre?.toLowerCase().endsWith('.gif');
                                          return (
                                            <img 
                                              src={urlImagen} 
                                              alt={m.archivo_nombre || "Sticker"} 
                                              className="msg-sticker"
                                              style={esGif ? { imageRendering: 'auto' } : {}}
                                              onClick={() =>
                                                abrirArchivoPrivado({
                                                  archivo_url: m.archivo_url,
                                                  archivo_nombre: m.archivo_nombre,
                                                  archivo_tamaño: m.archivo_tamaño,
                                                  archivo_tipo: m.archivo_tipo,
                                                })
                                              }
                                              onError={(e) => {
                                                // Si falla, mostrar como archivo normal
                                                e.target.style.display = 'none';
                                              }}
                                            />
                                          );
                                        }
                                        
                                        // Si es imagen normal, mostrarla más pequeña
                                        if (esImagen) {
                                          const _token2 = obtenerToken();
                                          let urlImagen = m.archivo_url;
                                          
                                          if (urlImagen.startsWith('/chat/archivo/')) {
                                            urlImagen = `${SERVER_URL}${urlImagen}`;
                                          } else if (!urlImagen.startsWith('http')) {
                                            urlImagen = `${SERVER_URL}${urlImagen.startsWith('/') ? '' : '/'}${urlImagen}`;
                                          }
                                          
                                          return (
                                            <img 
                                              src={urlImagen} 
                                              alt={m.archivo_nombre || "Imagen"} 
                                              className="msg-imagen"
                                              style={{ maxWidth: '200px', maxHeight: '200px', cursor: 'pointer', borderRadius: '8px' }}
                                              onClick={() =>
                                                abrirArchivoPrivado({
                                                  archivo_url: m.archivo_url,
                                                  archivo_nombre: m.archivo_nombre,
                                                  archivo_tamaño: m.archivo_tamaño,
                                                  archivo_tipo: m.archivo_tipo,
                                                })
                                              }
                                              onError={(e) => {
                                                e.target.style.display = 'none';
                                              }}
                                            />
                                          );
                                        }
                                        
                                        // Si es VIDEO (antes de checar audio para evitar falsos positivos)
                                        const esVideo = m.archivo_tipo?.startsWith('video/') ||
                                          m.archivo_nombre?.toLowerCase().startsWith('video-mensaje');
                                        
                                        if (esVideo) {
                                          let urlVideo = m.archivo_url;
                                          if (urlVideo.startsWith('/chat/archivo/') || urlVideo.startsWith('/api/chat/archivo/')) {
                                            urlVideo = `${SERVER_URL}${urlVideo.startsWith('/api') ? urlVideo : '/api' + urlVideo}`;
                                          } else if (!urlVideo.startsWith('http')) {
                                            urlVideo = `${SERVER_URL}${urlVideo.startsWith('/') ? '' : '/'}${urlVideo}`;
                                          }
                                          return (
                                            <div className="msg-video-player">
                                              <video
                                                src={urlVideo}
                                                controls
                                                preload="metadata"
                                                style={{ width: '100%', maxWidth: '280px', borderRadius: '12px' }}
                                              />
                                            </div>
                                          );
                                        }

                                        // Si es audio (nota de voz), mostrar reproductor inline
                                        const esAudio = m.archivo_tipo?.startsWith('audio/') ||
                                          m.archivo_nombre?.toLowerCase().endsWith('.ogg') ||
                                          m.archivo_nombre?.toLowerCase().endsWith('.mp3') ||
                                          m.archivo_nombre?.toLowerCase().startsWith('nota-voz');
                                        
                                        if (esAudio) {
                                          let urlAudio = m.archivo_url;
                                          if (urlAudio.startsWith('/chat/archivo/') || urlAudio.startsWith('/api/chat/archivo/')) {
                                            urlAudio = `${SERVER_URL}${urlAudio.startsWith('/api') ? urlAudio : '/api' + urlAudio}`;
                                          } else if (!urlAudio.startsWith('http')) {
                                            urlAudio = `${SERVER_URL}${urlAudio.startsWith('/') ? '' : '/'}${urlAudio}`;
                                          }
                                          return (
                                            <div className="msg-audio-player">
                                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,opacity:0.6}}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                                              <audio
                                                src={urlAudio}
                                                controls
                                                preload="auto"
                                                style={{ flex:1, minWidth:'160px', maxWidth:'240px', height:'32px' }}
                                              />
                                            </div>
                                          );
                                        }
                                        
                                        // Mostrar como archivo normal (no imagen, no audio)
                                        return (
                                          <div className="msg-archivo">
                                            <button
                                              type="button"
                                              className="msg-archivo-link"
                                              onClick={() =>
                                                abrirArchivoPrivado({
                                                  archivo_url: m.archivo_url,
                                                  archivo_nombre: m.archivo_nombre,
                                                  archivo_tamaño: m.archivo_tamaño,
                                                  archivo_tipo: m.archivo_tipo,
                                                })
                                              }
                                            >
                                              📎 {m.archivo_nombre || "Archivo"}
                                              {m.archivo_tamaño && (
                                                <span className="msg-archivo-tamaño">
                                                  {" "}({(m.archivo_tamaño / 1024).toFixed(1)} KB)
                                                </span>
                                              )}
                                            </button>
                                          </div>
                                        );
                                      })()}
                                    </>
                                  )}
                                </div>
                                <div className="msg-footer">
                                  <div className="msg-hora">
                                    {new Date(m.fecha).toLocaleTimeString("es-MX", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </div>
                                  {estaDestacado && <span className="msg-star">⭐</span>}
                                  {esMio && tipoChat === "privado" && (
                                    <span
                                      className={`msg-read-indicator ${fueLeido ? "read" : fueEntregado ? "delivered" : "sent"}`}
                                      title={fueLeido ? "Leído" : fueEntregado ? "Entregado" : "Enviado"}
                                      aria-label={fueLeido ? "Leído" : fueEntregado ? "Entregado" : "Enviado"}
                                    >
                                      <span className="msg-read-dots" aria-hidden="true">
                                        <i />
                                        {(fueLeido || fueEntregado) ? <i /> : null}
                                      </span>
                                    </span>
                                  )}
                                </div>
                                {reacciones[msgKey] && (
                                  <div className="msg-reacciones">
                                    <div className="msg-reaccion-picker">
                                      {emojiOrdenados.map((emoji) => {
                                        const twUrl = getTwemojiUrl(emoji);
                                        return (
                                          <button
                                            key={`${msgKey}-${emoji}`}
                                            className={`msg-reaccion-btn ${reacciones[msgKey]?.[emoji] ? "active" : ""}`}
                                            onClick={() => toggleReaccion(msgKey, emoji)}
                                            title={emoji}
                                          >
                                            {twUrl
                                              ? <img src={twUrl} alt={emoji} className="cpep-twemoji" onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='inline'; }} />
                                              : null}
                                            <span style={{display: twUrl ? 'none' : 'inline'}}>{emoji}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                    <div className="msg-reaccion-list">
                                      {emojiOrdenados
                                        .filter((emoji) => reacciones[msgKey]?.[emoji])
                                        .map((emoji) => {
                                          const twUrl = getTwemojiUrl(emoji);
                                          return (
                                            <span key={`${msgKey}-r-${emoji}`} className="msg-reaccion-pill">
                                              {twUrl
                                                ? <img src={twUrl} alt={emoji} className="cpep-twemoji" style={{width:'14px',height:'14px',verticalAlign:'middle'}} />
                                                : emoji} 1
                                            </span>
                                          );
                                        })}
                                    </div>
                                  </div>
                                )}
                              </div>
                              {!esMio && (
                                <button
                                  type="button"
                                  className="msg-reenviar-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    abrirReenvio(m);
                                  }}
                                  onContextMenu={(e) => e.stopPropagation()}
                                  title="Reenviar"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 17 20 12 15 7"/><path d="M4 18v-2a4 4 0 0 1 4-4h12"/></svg>
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="chat-input-pro">
                        {respondiendoMensaje && (
                          <div className="chat-reply-bar">
                            <div className="chat-reply-info">
                              <span>Respondiendo a {respondiendoMensaje.usuario}</span>
                              <strong>{respondiendoMensaje.texto}</strong>
                            </div>
                            <button
                              className="chat-reply-cancel"
                              onClick={() => setRespondiendoMensaje(null)}
                            >
                              ✕
                            </button>
                          </div>
                        )}
                        {isRecording && (
                          <div className="audio-rec-panel">
                            <div className="audio-rec-dot" />
                            <span className="audio-rec-time">
                              {String(Math.floor(recTime / 60)).padStart(2,'0')}:{String(recTime % 60).padStart(2,'0')}
                            </span>
                            <div className="audio-rec-bars">
                              {recBars.map((h, i) => (
                                <span key={i} className="audio-rec-bar" style={{ height: h + 'px' }} />
                              ))}
                            </div>
                            <button className="audio-rec-stop" onClick={detenerGrabacionVoz} title="Detener y adjuntar">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
                              Detener
                            </button>
                            <button className="audio-rec-cancel" onClick={() => {
                              clearInterval(recTimerRef.current);
                              cancelAnimationFrame(recAnimRef.current);
                              if (mediaRecorderRef.current) {
                                mediaRecorderRef.current.onstop = null;
                                mediaRecorderRef.current.stop();
                              }
                              setRecTime(0); setRecBars(new Array(30).fill(2)); setIsRecording(false);
                            }} title="Cancelar">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                          </div>
                        )}
                        {archivoAdjunto && (
                          <div className="archivo-adjunto-preview">
                            <span>
                              {archivoAdjunto.type?.startsWith('audio/')
                                ? <>🎤 Nota de voz ({(archivoAdjunto.size/1024).toFixed(0)} KB)</>
                                : archivoAdjunto.type?.startsWith('video/')
                                ? <>🎥 Videomensaje ({(archivoAdjunto.size/1024).toFixed(0)} KB)</>
                                : <>&#1f4669; {archivoAdjunto.name}</>}
                            </span>
                            <button
                              className="btn-remover-archivo"
                              onClick={() => setArchivoAdjunto(null)}
                            >
                              ✕
                            </button>
                          </div>
                        )}
                        {mostrarToolbarFormato && (
                          <div className="chat-input-toolbar">
                            <div className="chat-toolbar-left">
                              <button className="chat-btn-tool" title="Negrita" onClick={() => aplicarFormato("**")}>
                                <strong>B</strong>
                              </button>
                              <button className="chat-btn-tool" title="Itálica" onClick={() => aplicarFormato("*")}>
                                <em>I</em>
                              </button>
                              <button className="chat-btn-tool" title="Subrayado" onClick={() => aplicarFormato("__")}>
                                <u>U</u>
                              </button>
                              <button className="chat-btn-tool" title="Tachado" onClick={() => aplicarFormato("~~")}>
                                <s>S</s>
                              </button>
                              <button className="chat-btn-tool" title="Código" onClick={() => aplicarFormato("`")}>
                                {"</>"}
                              </button>
                              <button className="chat-btn-tool" title="Link" onClick={insertarLink}>
                                🔗
                              </button>
                              <button className="chat-btn-tool" title="Lista" onClick={() => insertarLista(false)}>
                                •
                              </button>
                              <button className="chat-btn-tool" title="Lista numerada" onClick={() => insertarLista(true)}>
                                1.
                              </button>
                              <button className="chat-btn-tool" title="Cita" onClick={insertarCita}>
                                ""
                              </button>
                            </div>
                          </div>
                        )}
                        <input
                          type="file"
                          style={{ display: "none" }}
                          ref={fileInputRef}
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              adjuntarArchivo(file);
                            }
                          }}
                        />
                        <input
                          type="file"
                          style={{ display: "none" }}
                          ref={imageInputRef}
                          accept="image/*"
                          multiple
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              manejarGaleria(e.target.files);
                            }
                          }}
                        />
                        <input
                          type="file"
                          style={{ display: "none" }}
                          ref={videoInputRef}
                          accept="video/*"
                          capture="environment"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              adjuntarArchivo(e.target.files[0]);
                            }
                          }}
                        />
                        <input
                          type="file"
                          style={{ display: "none" }}
                          ref={gifInputRef}
                          accept="image/gif"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              adjuntarArchivo(e.target.files[0]);
                            }
                          }}
                        />
                        <div className="chat-input-quick">
                          {/* Adjuntar archivo */}
                          <button
                            className="chat-btn-quick"
                            onClick={() => (esMovil() ? abrirAdjuntosMobile() : fileInputRef.current?.click())}
                            title="Adjuntar archivo"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                          </button>
                          {/* Formato texto */}
                          <button
                            className={`chat-btn-quick ${mostrarToolbarFormato ? "active" : ""}`}
                            onClick={() => setMostrarToolbarFormato((prev) => !prev)}
                            title="Formato"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
                          </button>
                          {/* Emoji */}
                          <button
                            className="chat-btn-quick"
                            title="Emoji"
                            onClick={() => setInputEmojiAbierto((prev) => !prev)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                          </button>
                          {/* Mención */}
                          <button
                            className="chat-btn-quick"
                            title="Mencionar"
                            onClick={() => insertarTexto("@")}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/></svg>
                          </button>
                          {/* Videomensaje (cámara) */}
                          <button
                            className={`chat-btn-quick ${isRecordingVideo ? "grabando" : ""}`}
                            onClick={iniciarGrabacionVideo}
                            title={isRecordingVideo ? "Detener videomensaje" : "Videomensaje"}
                          >
                            {isRecordingVideo
                              ? <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                              : <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                            }
                          </button>
                          {/* Nota de voz */}
                          <button
                            className={`chat-btn-quick ${isRecording ? "grabando" : ""}`}
                            onClick={isRecording ? detenerGrabacionVoz : iniciarGrabacionVoz}
                            title={isRecording ? "Detener nota de voz" : "Nota de voz"}
                          >
                            {isRecording
                              ? <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                              : <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                            }
                          </button>
                        </div>
                        {inputEmojiAbierto && (
                          <div className="chat-input-emoji-picker-completo">
                            {/* Header con título y búsqueda */}
                            <div className="cpep-header">
                              <span className="cpep-title">Emojis</span>
                              <input
                                className="cpep-search"
                                type="text"
                                placeholder="Buscar…"
                                value={emojiBusqueda}
                                onChange={(e) => setEmojiBusqueda(e.target.value)}
                              />
                            </div>
                            {/* Pills de categoría */}
                            {!emojiBusqueda.trim() && (
                              <div className="cpep-pills">
                                {Object.entries(emojiCategorias).map(([key, cat]) => (
                                  <button
                                    key={key}
                                    className={`cpep-pill ${emojiCategoriaActiva === key ? "active" : ""}`}
                                    onClick={() => setEmojiCategoriaActiva(key)}
                                  >
                                    {key === "personalizados" ? (
                                      <img src="/android-chrome-192x192.png" alt="Custom" style={{width:14,height:14,borderRadius:3}} />
                                    ) : (
                                      (() => {
                                        const u = getTwemojiUrl(cat.icono);
                                        return u
                                          ? <img src={u} alt={cat.icono} className="cpep-twemoji" style={{width:14,height:14}} />
                                          : <span className="cpep-pill-icon">{cat.icono}</span>;
                                      })()
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                            {/* Nombre de categoría activa */}
                            {!emojiBusqueda.trim() && emojiCategoriaActiva !== "recientes" && (
                              <div className="cpep-cat-name">
                                {emojiCategorias[emojiCategoriaActiva]?.icono} {emojiCategorias[emojiCategoriaActiva]?.nombre}
                              </div>
                            )}
                            {/* Vacío recientes */}
                            {!emojiBusqueda.trim() && emojiCategoriaActiva === "recientes" && emojiCategorias.recientes.emojis.length === 0 && (
                              <div className="cpep-empty">Usa emojis para verlos aquí</div>
                            )}
                            {/* Grid */}
                            <div className="cpep-grid">
                              {obtenerEmojisMostrar().map((emoji, index) => {
                                const esPersonalizado = emojiCategoriaActiva === "personalizados" || (typeof emoji === "object" && emoji.url);
                                const emojiValue = esPersonalizado ? (emoji.url || emoji.emoji) : emoji;
                                const emojiKey = esPersonalizado ? `custom-${index}-${emoji.id || index}` : `ep-${emoji}-${index}`;
                                return (
                                  <button
                                    key={emojiKey}
                                    className="cpep-item"
                                    onClick={() => {
                                      if (esPersonalizado) {
                                        enviarEmojiPersonalizado(emoji);
                                      } else {
                                        insertarTexto(emoji);
                                        setEmojiUso((prev) => ({ ...prev, [emoji]: (prev[emoji] || 0) + 1 }));
                                        setInputEmojiAbierto(false);
                                      }
                                    }}
                                    title={esPersonalizado ? emoji.nombre || "Emoji personalizado" : emoji}
                                  >
                                    {esPersonalizado
                                      ? <img src={emojiValue} alt={emoji.nombre || ""} className="emoji-picker-custom-img" />
                                      : (() => {
                                          const url = getTwemojiUrl(emoji);
                                          return url
                                            ? <img src={url} alt={emoji} className="cpep-twemoji" onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='inline'; }} />
                                            : null;
                                        })()
                                    }
                                    {!esPersonalizado && <span className="ep-emoji-fallback" style={{display:'none'}}>{emoji}</span>}
                                  </button>
                                );
                              })}
                            </div>
                            {/* Agregar emoji personalizado */}
                            {emojiCategoriaActiva === "personalizados" && (
                              <div className="emoji-picker-add-custom">
                                <input
                                  type="file"
                                  id="emoji-custom-upload"
                                  accept="image/*"
                                  style={{ display: "none" }}
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      try {
                                        const esGif = file.type === 'image/gif';
                                        const maxWidth = esGif && file.size > 500 * 1024 ? 150 : 200;
                                        const calidad = esGif && file.size > 500 * 1024 ? 0.6 : 0.7;
                                        const imagenComprimida = await comprimirImagen(file, maxWidth, calidad);
                                        const reader = new FileReader();
                                        reader.onload = (event) => {
                                          try {
                                            const nuevoEmoji = {
                                              id: Date.now(),
                                              nombre: file.name.replace(/\.[^/.]+$/, ""),
                                              url: event.target?.result,
                                              archivo: file.name,
                                              tipo: file.type
                                            };
                                            const nuevosEmojis = [...emojisPersonalizados, nuevoEmoji];
                                            const intentarGuardar = (emojis, intentos = 0) => {
                                              try {
                                                localStorage.setItem('COPMEC_emojis_personalizados', JSON.stringify(emojis));
                                                setEmojisPersonalizados(emojis);
                                              } catch (storageError) {
                                                if (storageError.name === 'QuotaExceededError' && intentos < 3) {
                                                  const limites = [10, 5, 3];
                                                  intentarGuardar(emojis.slice(-limites[intentos] || 3), intentos + 1);
                                                } else {
                                                  showAlert('No se pudo guardar. Almacenamiento lleno.', 'error');
                                                }
                                              }
                                            };
                                            intentarGuardar(nuevosEmojis);
                                          } catch (_err) {
                                            showAlert('Error al agregar el emoji', 'error');
                                          }
                                        };
                                        reader.readAsDataURL(imagenComprimida);
                                      } catch (_err) {
                                        showAlert('Error al procesar la imagen', 'error');
                                      }
                                    }
                                    e.target.value = "";
                                  }}
                                />
                                <button
                                  className="emoji-picker-add-btn"
                                  onClick={() => document.getElementById('emoji-custom-upload')?.click()}
                                >
                                  + Agregar sticker
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="chat-input-row">
                          <textarea
                            ref={mensajeInputRef}
                            value={mensajeInput}
                            onChange={(e) => {
                              const texto = e.target.value;
                              setMensajeInput(texto);

                              if (tipoChat === "privado" && chatActual) {
                                if (texto.trim()) {
                                  emitirEstadoEscritura(chatActual, true);
                                  clearTimeout(typingStopTimerRef.current);
                                  typingStopTimerRef.current = setTimeout(() => {
                                    emitirEstadoEscritura(chatActual, false);
                                  }, 2200);
                                } else {
                                  clearTimeout(typingStopTimerRef.current);
                                  emitirEstadoEscritura(chatActual, false);
                                }
                              }

                              // Detectar @mentions
                              const ultimoArroba = texto.lastIndexOf("@");
                              if (ultimoArroba !== -1) {
                                const textoDespuesArroba = texto.substring(ultimoArroba + 1);
                                const espacioSiguiente = textoDespuesArroba.indexOf(" ");
                                if (espacioSiguiente === -1 || espacioSiguiente > 0) {
                                  const busqueda = espacioSiguiente === -1
                                    ? textoDespuesArroba
                                    : textoDespuesArroba.substring(0, espacioSiguiente);
                                  const sugerencias = usuariosCOPMEC
                                    .filter((u) => {
                                      const nombre = u.nickname || u.name || "";
                                      return nombre.toLowerCase().includes(busqueda.toLowerCase()) &&
                                             nombre !== (user?.nickname || user?.name);
                                    })
                                    .slice(0, 5);
                                  if (sugerencias.length > 0) {
                                    setMostrarSugerenciasMencion(true);
                                    setSugerenciasMencion(sugerencias);
                                    setPosicionMencion(ultimoArroba);
                                  } else {
                                    setMostrarSugerenciasMencion(false);
                                  }
                                } else {
                                  setMostrarSugerenciasMencion(false);
                                }
                              } else {
                                setMostrarSugerenciasMencion(false);
                              }
                            }}
                            placeholder={
                              tipoChat === "privado" && chatActual
                                ? `Mensaje @${chatActual}`
                                : "Tomar notas"
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                              if (manejarEnterLista(e)) return;
                              e.preventDefault();
                              enviarMensaje();
                              } else if (e.key === "Escape") {
                                setMostrarSugerenciasMencion(false);
                              }
                            }}
                            className="chat-input-textarea"
                            rows={2}
                          />
                          <button onClick={enviarMensaje} className="chat-btn-enviar">➤</button>
                        </div>
                        {mostrarSugerenciasMencion && sugerenciasMencion.length > 0 && (
                          <div className="sugerencias-mention">
                            {sugerenciasMencion.map((u) => (
                              <div
                                key={u.id}
                                className="sugerencia-item"
                                onClick={() => {
                                  const nombre = u.nickname || u.name || "";
                                  const textoAntes = mensajeInput.substring(0, posicionMencion);
                                  const textoDespues = mensajeInput.substring(
                                    posicionMencion + 1 + (mensajeInput.substring(posicionMencion + 1).split(" ")[0] || "").length
                                  );
                                  setMensajeInput(`${textoAntes}@${nombre} ${textoDespues}`);
                                  setMostrarSugerenciasMencion(false);
                                  mensajeInputRef.current?.focus();
                                }}
                              >
                                <img
                                  src={getAvatarUrl(u)}
                                  alt={u.nickname || u.name || ""}
                                  className="chat-avatar-small"
                                />
                                <span>{u.nickname || u.name || ""}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Panel principal para mostrar el perfil cuando no hay chat abierto */}
      {/* El contenido del perfil se renderiza automáticamente cuando perfilAbierto es true */}
      {/* porque ya cambié la condición de tipoChat a solo perfilAbierto */}

      {previewItem && (
        <div className="chat-preview-overlay">
          <div className="chat-preview-content">
            <div className="chat-preview-header">
              <button className="chat-preview-back" onClick={cerrarPreview}>
                ←
              </button>
              <span className="chat-preview-title">
                {previewItem.archivo_nombre || previewItem.enlace_compartido || "Contenido compartido"}
              </span>
              <button className="chat-preview-close" onClick={cerrarPreview}>
                ✕
              </button>
            </div>
            <div className="chat-preview-body">
              {previewLoading && <div className="chat-empty-pro">Cargando...</div>}
              {!previewLoading && previewTipo === "imagen" && previewUrl && (
                <img src={previewUrl} alt={previewItem.archivo_nombre || "Imagen"} />
              )}
              {!previewLoading && previewTipo === "video" && previewUrl && (
                <video src={previewUrl} controls />
              )}
              {!previewLoading && previewTipo === "archivo" && (
                <div className="chat-preview-file">
                  <div style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "8px" }}>
                    📎 {previewItem.archivo_nombre || "Archivo"}
                  </div>
                  {previewItem.archivo_tamaño && (
                    <div className="chat-preview-meta" style={{ marginBottom: "12px" }}>
                      Tamaño: {(previewItem.archivo_tamaño / 1024).toFixed(1)} KB
                    </div>
                  )}
                  {previewItem.archivo_tipo && (
                    <div className="chat-preview-meta" style={{ marginBottom: "12px", fontSize: "0.85rem" }}>
                      Tipo: {previewItem.archivo_tipo}
                    </div>
                  )}
                  {previewError ? (
                    <div style={{ 
                      width: "100%", 
                      padding: "20px", 
                      textAlign: "center",
                      color: "var(--error)",
                      background: "var(--fondo-input)",
                      borderRadius: "var(--radio-md)",
                      border: "1px solid var(--error)"
                    }}>
                      <div style={{ fontSize: "2rem", marginBottom: "12px" }}>⚠️</div>
                      <div style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "8px" }}>
                        Error al cargar la vista previa
                      </div>
                      <div style={{ fontSize: "0.85rem", marginBottom: "16px" }}>
                        {previewError}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--chat-muted)" }}>
                        Puedes intentar descargar el archivo usando el botón de abajo
                      </div>
                    </div>
                  ) : previewUrl || previewTextContent ? (
                    <div style={{ marginBottom: "12px", width: "100%", height: "60vh", minHeight: "400px" }}>
                      {previewItem.archivo_tipo === "application/pdf" ? (
                        <div style={{ width: "100%", height: "100%", position: "relative" }}>
                          <iframe
                            title="Vista previa PDF"
                            src={`${previewUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                            className="chat-preview-iframe"
                            style={{ 
                              width: "100%", 
                              height: "100%", 
                              border: "1px solid var(--chat-border)",
                              borderRadius: "var(--radio-md)"
                            }}
                            onLoad={() => {
                            }}
                            onError={(_e) => {
                              setPreviewError("No se pudo cargar el PDF en el visor. Intenta descargarlo.");
                            }}
                          />
                        </div>
                      ) : previewItem.archivo_tipo?.startsWith("text/") && previewTextContent ? (
                        <div style={{
                          width: "100%",
                          height: "100%",
                          border: "1px solid var(--chat-border)",
                          borderRadius: "var(--radio-md)",
                          background: "var(--fondo-input)",
                          padding: "16px",
                          overflow: "auto",
                          fontFamily: "monospace",
                          fontSize: "0.9rem",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          color: "var(--chat-text)",
                          lineHeight: "1.5"
                        }}>
                          {previewTextContent}
                        </div>
                      ) : previewItem.archivo_tipo?.startsWith("text/") ? (
                        <div style={{ width: "100%", height: "100%", position: "relative" }}>
                          <iframe
                            title="Vista previa texto"
                            src={previewUrl}
                            className="chat-preview-iframe"
                            style={{ 
                              width: "100%", 
                              height: "100%", 
                              border: "1px solid var(--chat-border)",
                              borderRadius: "var(--radio-md)"
                            }}
                            onLoad={() => {
                            }}
                            onError={(_e) => {
                              setPreviewError("No se pudo cargar el archivo de texto en el visor.");
                            }}
                          />
                        </div>
                      ) : previewItem.archivo_tipo?.includes("html") ? (
                        <div style={{ width: "100%", height: "100%", position: "relative" }}>
                          <iframe
                            title="Vista previa HTML"
                            src={previewUrl}
                            className="chat-preview-iframe"
                            sandbox="allow-same-origin allow-scripts"
                            style={{ 
                              width: "100%", 
                              height: "100%", 
                              border: "1px solid var(--chat-border)",
                              borderRadius: "var(--radio-md)"
                            }}
                            onLoad={() => {
                            }}
                            onError={(_e) => {
                              setPreviewError("No se pudo cargar el archivo HTML en el visor.");
                            }}
                          />
                        </div>
                      ) : (
                        <div style={{ 
                          width: "100%", 
                          height: "100%", 
                          display: "flex", 
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "1px solid var(--chat-border)",
                          borderRadius: "var(--radio-md)",
                          background: "var(--fondo-input)",
                          padding: "20px",
                          textAlign: "center"
                        }}>
                          <div style={{ fontSize: "3rem", marginBottom: "12px" }}>📄</div>
                          <div style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "8px" }}>
                            {previewItem.archivo_nombre || "Archivo"}
                          </div>
                          <div style={{ fontSize: "0.85rem", color: "var(--chat-muted)", marginBottom: "16px" }}>
                            Este tipo de archivo no se puede previsualizar en el navegador
                          </div>
                          <div style={{ fontSize: "0.8rem", color: "var(--chat-muted)" }}>
                            Usa el botón "Descargar" para abrirlo con una aplicación externa
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="chat-preview-meta" style={{ marginBottom: "12px" }}>
                      Vista previa no disponible. Puedes descargarlo usando el botón de abajo.
                    </div>
                  )}
                </div>
              )}
              {!previewLoading && previewTipo === "enlace" && (
                <div className="chat-preview-link">
                  {(() => {
                    const preview = obtenerPreviewEnlace(previewItem.enlace_compartido);
                    if (preview) {
                      return (
                        <div className="chat-preview-link-content">
                          <div className="chat-preview-link-header">
                            {preview.imageUrl && (
                              <img 
                                src={preview.imageUrl} 
                                alt={preview.titulo}
                                className="chat-preview-link-icon"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            )}
                            <div className="chat-preview-link-info">
                              <div className="chat-preview-link-title">{preview.titulo}</div>
                              <div className="chat-preview-link-subtitle">{preview.subtitulo}</div>
                              <div className="chat-preview-link-url">{preview.link}</div>
                            </div>
                          </div>
                          <button
                            className="chat-preview-open"
                            onClick={() => abrirEnApp(previewItem.enlace_compartido)}
                          >
                            🔗 Abrir enlace
                          </button>
                        </div>
                      );
                    }
                    // Fallback si no hay preview
                    return (
                      <div className="chat-preview-link-content">
                        <div className="chat-preview-link-info">
                          <div className="chat-preview-link-title">Enlace compartido</div>
                          <div className="chat-preview-link-url">{previewItem.enlace_compartido}</div>
                        </div>
                        <button
                          className="chat-preview-open"
                          onClick={() => abrirEnApp(previewItem.enlace_compartido)}
                        >
                          🔗 Abrir enlace
                        </button>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
            {previewItem.archivo_url && (
              <button
                className="chat-preview-download"
                onClick={() => descargarArchivoPrivado(previewItem)}
              >
                Descargar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Overlay de previsualización de videomensaje */}
      {(videoPreviewStream || videoGrabado) && (
        <div className="video-record-overlay">
          <div className="video-record-card">
            <div className="video-record-header">
              <span className="video-record-title">
                {videoGrabado
                  ? 'Vista previa — ¿Enviar?'
                  : videoRecorderRef.current?.state === 'recording'
                    ? <><span className="video-rec-dot"/> Grabando...</>
                    : 'Vista previa de cámara'}
              </span>
            </div>

            {/* Preview en vivo (cámara) */}
            {videoPreviewStream && !videoGrabado && (
              <video
                className="video-record-preview"
                ref={videoPreviewRef}
                autoPlay
                muted
                playsInline
              />
            )}

            {/* Preview del video grabado */}
            {videoGrabado && (
              <video
                className="video-record-preview"
                src={videoGrabado.url}
                controls
                autoPlay
                playsInline
                style={{ background: '#000000' }}
              />
            )}

            <div className="video-record-actions">
              {videoGrabado ? (
                // Modo: review del video grabado
                <>
                  <button className="video-record-btn start" onClick={enviarVideoGrabado}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    Enviar
                  </button>
                  <button className="video-record-btn cancel" onClick={descartarVideoGrabado}>
                    Descartar
                  </button>
                </>
              ) : videoRecorderRef.current?.state !== 'recording' ? (
                // Modo: cámara lista, sin grabar
                <>
                  <button
                    className="video-record-btn start"
                    onClick={() => iniciarGrabacionVideoRecorder(videoPreviewStream)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg>
                    Grabar
                  </button>
                  <button className="video-record-btn cancel" onClick={detenerGrabacionVideo}>
                    Cancelar
                  </button>
                </>
              ) : (
                // Modo: grabando
                <>
                  <button className="video-record-btn stop" onClick={detenerGrabacionVideo}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
                    Detener
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {callIncoming && !callActivo && (
        <div className="call-overlay">
          <div className="call-incoming-card">
            <div className="call-title">Videollamada entrante</div>
            <div className="call-user">{callIncoming.fromNickname || "Usuario"}</div>
            <div className="call-actions">
              <button className="call-btn accept" onClick={aceptarLlamada}>
                Aceptar
              </button>
              <button className="call-btn reject" onClick={rechazarLlamada}>
                Rechazar
              </button>
            </div>
          </div>
        </div>
      )}

      {callActivo && (
        <div className="call-overlay">
          <div ref={callWindowRef} className={`call-window ${callExpanded ? "call-window-expanded" : ""}`}>
            <div className="call-header">
              <div className="call-title">
                Videollamada {tipoChat === "grupal" ? "Grupal" : "Privada"}
              </div>
              <div className="call-header-actions">
                <button className="call-close" onClick={toggleCallExpanded} title={callExpanded ? "Salir de pantalla completa" : "Pantalla completa"}>
                  {callExpanded ? "🗗" : "🗖"}
                </button>
                <button className="call-close" onClick={colgarLlamada} title="Colgar llamada">
                  ✕
                </button>
              </div>
            </div>
            <div className="call-stage">
              <div className="call-main-surface">
                {callMainView === "local" || !mainRemoteStream ? (
                  <div className="call-video-box call-video-main local-main">
                    <video
                      className="call-video"
                      muted
                      autoPlay
                      playsInline
                      ref={localVideoRef}
                    />
                    <span className="call-label">{sharingScreen ? "Tu pantalla" : "Tu cámara"}</span>
                  </div>
                ) : (
                  <VideoTile stream={mainRemoteStream.stream} nickname={mainRemoteStream.nickname} />
                )}
                {!mainRemoteStream && callMainView !== "local" && (
                  <div className="call-empty">Esperando participantes...</div>
                )}
              </div>

              {callMainView === "remote" && mainRemoteStream ? (
                <div
                  className="call-video-box local call-pip"
                  style={{ left: `${callPipPosition.x}px`, top: `${callPipPosition.y}px` }}
                  onPointerDown={handlePipPointerDown}
                  title="Arrastra para mover. Toca para poner tu cámara en principal"
                >
                  <video
                    className="call-video"
                    muted
                    autoPlay
                    playsInline
                    ref={localVideoRef}
                  />
                  <span className="call-label">{sharingScreen ? "Tu pantalla" : "Tú"}</span>
                </div>
              ) : mainRemoteStream ? (
                <div
                  className="call-video-box call-pip"
                  style={{ left: `${callPipPosition.x}px`, top: `${callPipPosition.y}px` }}
                  onClick={() => setCallMainView("remote")}
                  title="Toca para volver al receptor en principal"
                >
                  <video
                    className="call-video"
                    autoPlay
                    playsInline
                    ref={(node) => {
                      if (node) node.srcObject = mainRemoteStream.stream || null;
                    }}
                  />
                  <span className="call-label">{mainRemoteStream.nickname || "Receptor"}</span>
                </div>
              ) : null}

              {remoteThumbnails.length > 0 && (
                <div className="call-thumbnails-strip">
                  {remoteThumbnails.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      className="call-thumb-btn"
                      onClick={() => {
                        setCallMainRemoteId(item.id);
                        setCallMainView("remote");
                      }}
                      title={`Ver a ${item.nickname || "Usuario"} en principal`}
                    >
                      <video
                        className="call-thumb-video"
                        autoPlay
                        playsInline
                        ref={(node) => {
                          if (node) node.srcObject = item.stream || null;
                        }}
                      />
                      <span className="call-thumb-label">{item.nickname || "Usuario"}</span>
                    </button>
                  ))}
                </div>
              )}

              {callInvitePickerOpen ? (
                <div className="call-invite-panel">
                  <div className="call-invite-title">Agregar participantes</div>
                  <div className="call-invite-list">
                    {callInviteCandidates.length ? callInviteCandidates.map((nickname) => (
                      <label key={nickname} className="call-invite-item">
                        <input
                          type="checkbox"
                          checked={Boolean(callInviteSelection[nickname])}
                          onChange={(event) => {
                            setCallInviteSelection((current) => ({
                              ...current,
                              [nickname]: event.target.checked,
                            }));
                          }}
                        />
                        <span>{nickname}</span>
                      </label>
                    )) : <div className="call-invite-empty">No hay players disponibles para invitar.</div>}
                  </div>
                  <div className="call-invite-actions">
                    <button type="button" className="call-control" onClick={() => setCallInvitePickerOpen(false)}>Cancelar</button>
                    <button type="button" className="call-control" onClick={invitarParticipantesEnLlamada}>Invitar</button>
                  </div>
                </div>
              ) : null}

              <div className="call-controls call-controls-floating">
                <button
                  className={`call-control ${callMuted ? "active" : ""}`}
                  onClick={toggleMute}
                  title={callMuted ? "Activar micro" : "Silenciar"}
                >
                  {callMuted ? "🔇" : "🎤"}
                </button>
                <button
                  className={`call-control ${callVideoOff ? "active" : ""}`}
                  onClick={toggleVideo}
                  title={callVideoOff ? "Activar cámara" : "Desactivar cámara"}
                >
                  {callVideoOff ? "📷✖" : "📷"}
                </button>
                <button
                  className={`call-control ${switchingCamera ? "active" : ""}`}
                  onClick={cambiarCamara}
                  title="Cambiar cámara"
                  disabled={switchingCamera}
                >
                  {switchingCamera ? "⏳" : "🔄"}
                </button>
                {canShowScreenShare ? (
                  <button
                    className={`call-control ${sharingScreen ? "active" : ""}`}
                    onClick={toggleScreenShare}
                    title={sharingScreen ? "Dejar de compartir pantalla" : "Compartir pantalla"}
                  >
                    {sharingScreen ? "💻✖" : "💻"}
                  </button>
                ) : null}
                <button
                  className={`call-control ${callInvitePickerOpen ? "active" : ""}`}
                  onClick={() => setCallInvitePickerOpen((current) => !current)}
                  title="Agregar participantes"
                >
                  ➕
                </button>
                <button className="call-control hangup" onClick={colgarLlamada}>
                  Colgar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {menuMiembroAbierto && menuMiembroPosicion && perfilTab === "miembros" && perfilTipo === "grupo" && (() => {
        const nickname = menuMiembroAbierto;
        const esAdmin = perfilGrupoAdmins.includes(nickname);
        const esCreador = perfilData?.creado_por === nickname;
        const userDisplayName = user?.nickname || user?.name;
        const puedoGestionar = perfilData?.es_admin && nickname !== userDisplayName;
        const restriccion = perfilGrupoRestricciones[nickname];
        const tieneRestriccionIndefinida = restriccion?.indefinida === true;
        const submenuAbierto = submenuRestriccionAbierto === nickname;
        return (
          <div className="chat-member-menu-backdrop" onClick={cerrarMenuMiembro}>
            <div
              className="chat-member-menu-overlay"
              style={{ left: menuMiembroPosicion.x, top: menuMiembroPosicion.y }}
              onClick={(e) => e.stopPropagation()}
            >
              {puedoGestionar && !esCreador && (
                <>
                  <button
                    className="chat-profile-action-btn"
                    onClick={async (e) => {
                      e.stopPropagation();
                      cerrarMenuMiembro();
                      try {
                        await authFetch(`${SERVER_URL}/api/chat/grupos/${chatActual}/miembros/${nickname}/admin`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ es_admin: !esAdmin }),
                        });
                        abrirPerfilGrupo(chatActual);
                        showAlert(esAdmin ? "Administrador removido" : "Administrador agregado", "success");
                      } catch (_err) {
                        showAlert("Error gestionando administrador", "error");
                      }
                    }}
                  >
                    {esAdmin ? "❌ Remover admin" : "⭐ Hacer admin"}
                  </button>
                  <div style={{ position: "relative" }}>
                    <button
                      className="chat-profile-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSubmenuRestriccionAbierto(submenuAbierto ? null : nickname);
                      }}
                    >
                      <span>{tieneRestriccionIndefinida ? "✅ Permitir" : "🔒 Restringir"}</span>
                      <span style={{ fontSize: "0.6rem" }}>{submenuAbierto ? "▲" : "▼"}</span>
                    </button>
                    {submenuAbierto && (
                      <div style={{ marginTop: "2px", padding: "2px", background: "var(--fondo-input)", borderRadius: "4px", border: "1px solid var(--chat-border)" }} onClick={(e) => e.stopPropagation()}>
                        {tieneRestriccionIndefinida ? (
                          <button className="chat-profile-action-btn" onClick={async (e) => {
                            e.stopPropagation();
                            cerrarMenuMiembro();
                            try {
                              await authFetch(`${SERVER_URL}/api/chat/grupos/${chatActual}/miembros/${nickname}/restringir`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ duracion_minutos: null, remover: true }),
                              });
                              abrirPerfilGrupo(chatActual);
                              showAlert("Restricción removida", "success");
                            } catch (_err) {
                              showAlert("Error removiendo restricción", "error");
                            }
                          }}>✅ Permitir mensaje</button>
                        ) : (
                          <>
                            {["5 min", "10 min", "15 min", "30 min", "1 hora", "24 horas", "Indefinido"].map((opcion) => {
                              let minutos = null;
                              if (opcion === "5 min") minutos = 5;
                              else if (opcion === "10 min") minutos = 10;
                              else if (opcion === "15 min") minutos = 15;
                              else if (opcion === "30 min") minutos = 30;
                              else if (opcion === "1 hora") minutos = 60;
                              else if (opcion === "24 horas") minutos = 24 * 60;
                              return (
                                <button key={opcion} className="chat-profile-action-btn" onClick={async (e) => {
                                  e.stopPropagation();
                                  cerrarMenuMiembro();
                                  try {
                                    await authFetch(`${SERVER_URL}/api/chat/grupos/${chatActual}/miembros/${nickname}/restringir`, {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ duracion_minutos: minutos }),
                                    });
                                    abrirPerfilGrupo(chatActual);
                                    showAlert(`Restricción aplicada: ${opcion}`, "success");
                                  } catch (_err) {
                                    showAlert("Error aplicando restricción", "error");
                                  }
                                }}>{opcion}</button>
                              );
                            })}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    className="chat-profile-action-btn"
                    onClick={async (e) => {
                      e.stopPropagation();
                      cerrarMenuMiembro();
                      if (await showConfirm("Eliminar miembro", `¿Eliminar a ${nickname} del grupo?`) === true) {
                        try {
                          await authFetch(`${SERVER_URL}/api/chat/grupos/${chatActual}/miembros/${nickname}`, { method: "DELETE" });
                          abrirPerfilGrupo(chatActual);
                          showAlert("Miembro eliminado del grupo", "success");
                        } catch (_err) {
                          showAlert("Error eliminando miembro", "error");
                        }
                      }
                    }}
                    style={{ color: "#ef4444" }}
                  >
                    🗑️ Eliminar
                  </button>
                </>
              )}
              {perfilData?.es_creador && !esCreador && (
                <button
                  className="chat-profile-action-btn"
                  onClick={async (e) => {
                    e.stopPropagation();
                    cerrarMenuMiembro();
                    if (await showConfirm("Transferir propiedad", `¿Transferir la propiedad del grupo a ${nickname}?`) === true) {
                      try {
                        await authFetch(`${SERVER_URL}/api/chat/grupos/${chatActual}/transferir`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ nuevo_creador: nickname }),
                        });
                        abrirPerfilGrupo(chatActual);
                        showAlert("Propiedad transferida", "success");
                      } catch (_err) {
                        showAlert("Error transfiriendo propiedad", "error");
                      }
                    }
                  }}
                >
                  👑 Transferir propiedad
                </button>
              )}
              <button className="chat-profile-action-btn" onClick={(e) => { e.stopPropagation(); cerrarMenuMiembro(); abrirPerfilUsuario(nickname); }}>
                👤 Ver perfil
              </button>
              <button className="chat-profile-action-btn" onClick={(e) => { e.stopPropagation(); cerrarMenuMiembro(); abrirChat("privado", nickname); }}>
                💬 Enviar mensaje
              </button>
            </div>
          </div>
        );
      })()}

      {menuMensaje && (
        <div
          className={`msg-menu-backdrop ${menuMensaje.desdeLongPress ? "mobile" : ""}`}
          onClick={cerrarMenuMensaje}
        >
          {menuMensaje.desdeLongPress && (
            <div className="msg-menu-preview" onClick={(e) => e.stopPropagation()}>
              {renderMenuPreview(
                menuMensaje.mensaje,
                menuMensaje.esMio,
                menuMensaje.otroNickname
              )}
            </div>
          )}
          <div
            className={`msg-menu ${menuMensaje.desdeLongPress ? "mobile" : ""}`}
            style={
              menuMensaje.desdeLongPress
                ? undefined
                : { left: menuMensaje.x, top: menuMensaje.y }
            }
            onClick={(e) => e.stopPropagation()}
          >
            <div className="msg-menu-reacciones">
              {emojiOrdenados.map((emoji) => {
                const twUrl = getTwemojiUrl(emoji);
                return (
                  <button
                    key={`menu-${menuMensaje.msgKey}-${emoji}`}
                    className={`msg-reaccion-btn ${reacciones[menuMensaje.msgKey]?.[emoji] ? "active" : ""}`}
                    onClick={() => { toggleReaccion(menuMensaje.msgKey, emoji); cerrarMenuMensaje(); }}
                    title={emoji}
                  >
                    {twUrl
                      ? <img src={twUrl} alt={emoji} className="cpep-twemoji" onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='inline'; }} />
                      : null}
                    <span style={{display: twUrl ? 'none' : 'inline'}}>{emoji}</span>
                  </button>
                );
              })}
              <button
                className="msg-reaccion-btn"
                onClick={() => { setMenuEmojiAbierto((prev) => !prev); }}
              >
                ➕
              </button>
            </div>
            {menuEmojiAbierto && (
              <div className="msg-emoji-picker-completo">
                {/* Header + búsqueda */}
                <div className="cpep-header">
                  <span className="cpep-title">Emojis</span>
                  <input
                    className="cpep-search"
                    type="text"
                    placeholder="Buscar…"
                    value={emojiBusquedaMenu}
                    onChange={(e) => setEmojiBusquedaMenu(e.target.value)}
                  />
                </div>
                {/* Pills */}
                {!emojiBusquedaMenu.trim() && (
                  <div className="cpep-pills">
                    {Object.entries(emojiCategorias).map(([key, cat]) => (
                      <button
                        key={key}
                        className={`cpep-pill ${emojiCategoriaActivaMenu === key ? "active" : ""}`}
                        onClick={() => setEmojiCategoriaActivaMenu(key)}
                      >
                        {key === "personalizados"
                          ? <img src="/android-chrome-192x192.png" alt="Custom" style={{width:14,height:14,borderRadius:3}} />
                          : (() => { const u = getTwemojiUrl(cat.icono); return u ? <img src={u} alt={cat.icono} style={{width:14,height:14}} /> : <span>{cat.icono}</span>; })()
                        }
                      </button>
                    ))}
                  </div>
                )}
                {/* Nombre categoría */}
                {!emojiBusquedaMenu.trim() && emojiCategoriaActivaMenu !== "recientes" && (
                  <div className="cpep-cat-name">
                    {emojiCategorias[emojiCategoriaActivaMenu]?.nombre}
                  </div>
                )}
                {/* Grid */}
                <div className="cpep-grid">
                  {obtenerEmojisMostrarMenu().map((emoji, index) => {
                    const esPersonalizado = emojiCategoriaActivaMenu === "personalizados" || (typeof emoji === 'object' && emoji.url);
                    const emojiValue = esPersonalizado ? (emoji.url || emoji.emoji) : emoji;
                    const emojiKey = esPersonalizado ? `menu-custom-${index}-${emoji.id || index}` : `menu-ep-${emoji}-${index}`;
                    return (
                      <button
                        key={emojiKey}
                        className="cpep-item"
                        onClick={() => {
                          if (esPersonalizado) {
                            toggleReaccion(menuMensaje.msgKey, "😀");
                          } else {
                            toggleReaccion(menuMensaje.msgKey, emoji);
                            setEmojiUso((prev) => ({ ...prev, [emoji]: (prev[emoji] || 0) + 1 }));
                          }
                          setMenuEmojiAbierto(false);
                          cerrarMenuMensaje();
                        }}
                        title={esPersonalizado ? emoji.nombre || "Emoji personalizado" : emoji}
                      >
                        {esPersonalizado
                          ? <img src={emojiValue} alt={emoji.nombre || ""} className="emoji-picker-custom-img" />
                          : (() => {
                              const url = getTwemojiUrl(emoji);
                              return url
                                ? <img src={url} alt={emoji} className="cpep-twemoji" onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='inline'; }} />
                                : null;
                            })()
                        }
                        {!esPersonalizado && <span className="ep-emoji-fallback" style={{display:'none'}}>{emoji}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="msg-menu-list">
              <button
                className="msg-menu-item"
                onClick={() => {
                  mostrarInfoMensaje(menuMensaje.mensaje);
                  cerrarMenuMensaje();
                }}
              >
                ℹ️ Info. del mensaje
              </button>
              <button
                className="msg-menu-item"
                onClick={() => {
                  responderMensaje(menuMensaje.mensaje, menuMensaje.otroNickname);
                  cerrarMenuMensaje();
                }}
              >
                ↩️ Responder
              </button>
              {menuMensaje.esMio && !editandoMensaje && (
                <button
                  className="msg-menu-item"
                  onClick={() => {
                    iniciarEdicion(menuMensaje.mensaje);
                    cerrarMenuMensaje();
                  }}
                >
                  ✏️ Editar
                </button>
              )}
              <button
                className="msg-menu-item"
                onClick={() => {
                  copiarMensaje(menuMensaje.mensaje?.mensaje || "");
                  cerrarMenuMensaje();
                }}
              >
                📋 Copiar
              </button>
              <button
                className="msg-menu-item"
                onClick={() => {
                  if (mensajeFijado?.id === menuMensaje.mensaje?.id) {
                    desfijarMensaje();
                  } else {
                    fijarMensaje(menuMensaje.mensaje);
                  }
                  cerrarMenuMensaje();
                }}
              >
                {mensajeFijado?.id === menuMensaje.mensaje?.id ? "📌 Desfijar" : "📌 Fijar"}
              </button>
              <button
                className="msg-menu-item"
                onClick={() => {
                  activarSeleccion(menuMensaje.mensaje);
                  cerrarMenuMensaje();
                }}
              >
                ✅ Seleccionar
              </button>
              <button
                className="msg-menu-item danger"
                onClick={() => {
                  eliminarMensaje(menuMensaje.mensaje);
                  cerrarMenuMensaje();
                }}
              >
                🗑️ Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalLinkAbierto && (
        <div className="chat-link-modal-backdrop" onClick={() => setModalLinkAbierto(false)}>
          <div className="chat-link-modal" onClick={(e) => e.stopPropagation()}>
            <div className="chat-link-modal-title">Insertar enlace</div>
            <label>
              Texto
              <input
                type="text"
                value={modalLinkTexto}
                onChange={(e) => setModalLinkTexto(e.target.value)}
                placeholder="Texto del enlace"
              />
            </label>
            <label>
              Link
              <input
                type="url"
                value={modalLinkUrl}
                onChange={(e) => setModalLinkUrl(e.target.value)}
                placeholder="https://..."
              />
            </label>
            <div className="chat-link-modal-actions">
              <button onClick={() => setModalLinkAbierto(false)}>Cancelar</button>
              <button onClick={insertarLinkConfirmado}>Insertar</button>
            </div>
          </div>
        </div>
      )}

      {mostrarReenvio && (
        <div className="chat-forward-backdrop" onClick={() => setMostrarReenvio(false)}>
          <div className="chat-forward-modal" onClick={(e) => e.stopPropagation()}>
            <div className="chat-forward-header">
              <span>Reenviar mensaje</span>
              <button
                className="chat-forward-close"
                onClick={() => setMostrarReenvio(false)}
              >
                ✕
              </button>
            </div>
            <div className="chat-forward-section">
              <div className="chat-forward-title">General</div>
              <button
                className="chat-forward-item"
                onClick={() => reenviarMensajeA("general")}
              >
                🌐 Chat General
              </button>
            </div>
            <div className="chat-forward-section">
              <div className="chat-forward-title">Privados</div>
              <div className="chat-forward-list">
                {usuariosCOPMEC.map((u) => {
                  const name = u.nickname || u.name;
                  if (!name) return null;
                  return (
                    <button
                      key={`fw-${u.id}`}
                      className="chat-forward-item"
                      onClick={() => reenviarMensajeA("privado", name)}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="chat-forward-section">
              <div className="chat-forward-title">Grupos</div>
              <div className="chat-forward-list">
                {grupos.map((g) => (
                  <button
                    key={`fw-g-${g.id}`}
                    className="chat-forward-item"
                    onClick={() => reenviarMensajeA("grupal", g.id)}
                  >
                    👥 {g.nombre}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {mostrarAdjuntosMobile && (
        <div className="chat-attach-overlay" onClick={cerrarAdjuntosMobile}>
          <div className="chat-attach-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="chat-attach-handle"></div>
            <div className="chat-attach-header">
              <span>Fotos y videos</span>
              <button className="chat-attach-link" onClick={abrirGaleriaDispositivo}>
                Ver galería
              </button>
            </div>
            <div className="chat-attach-gallery">
              <button className="chat-attach-camera" onClick={abrirCamara} title="Tomar foto">
                📷
              </button>
              {galeriaThumbs.map((thumb) => (
                <button
                  key={thumb.url}
                  className="chat-attach-thumb"
                  onClick={() => manejarGaleria([thumb.file])}
                >
                  <img src={thumb.url} alt="preview" />
                </button>
              ))}
            </div>
            <div className="chat-attach-actions">
              <button onClick={iniciarGrabacionVoz}>🎙️ Grabar un clip de audio</button>
              <button
                onClick={() => {
                  abrirGrabacionVideo();
                  cerrarAdjuntosMobile();
                }}
              >
                🎥 Grabar un clip de video
              </button>
              <button
                onClick={() => {
                  fileInputRef.current?.click();
                  cerrarAdjuntosMobile();
                }}
              >
                📁 Subir un archivo
              </button>
              <button
                onClick={() => {
                  agregarGif();
                  cerrarAdjuntosMobile();
                }}
              >
                🖼️ Agregar un GIF
              </button>
              <button onClick={() => insertarLista(false)}>📝 Crear un elemento de lista</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AGREGAR MIEMBROS */}
          {mostrarAgregarMiembros && grupoAgregarMiembros && (
            <div className="modal-agregar-miembros">
              <div className="modal-agregar-miembros-content">
                <div className="modal-agregar-miembros-header">
                  <h3>Agregar miembros al grupo</h3>
                  <button
                    className="modal-close-btn"
                    onClick={() => {
                      setMostrarAgregarMiembros(false);
                      setGrupoAgregarMiembros(null);
                    }}
                  >
                    ✕
                  </button>
                </div>
                <div className="modal-agregar-miembros-list">
                  {(() => {
                    const usuariosDisponibles = usuariosCOPMEC.filter((u) => {
                      // Obtener nombre del usuario
                      const nombreUsuario = u.nickname || u.name;
                      
                      // Debe tener nombre
                      if (!nombreUsuario) return false;
                      
                      // No debe ser el usuario actual
                      const userDisplayName = user?.nickname || user?.name;
                      if (nombreUsuario === userDisplayName) return false;
                      
                      // Obtener el grupo actual
                      const grupoActual = Array.isArray(grupos) ? grupos.find(
                        (g) => String(g.id) === String(grupoAgregarMiembros)
                      ) : null;
                      
                      // Si no hay grupo, mostrar todos los usuarios (excepto el actual)
                      if (!grupoActual) return true;
                      
                      // Obtener lista de miembros (asegurar que sea array)
                      const miembros = Array.isArray(grupoActual.miembros) 
                        ? grupoActual.miembros 
                        : (grupoActual.miembros ? [grupoActual.miembros] : []);
                      
                      // No debe estar ya en el grupo
                      return !miembros.includes(nombreUsuario);
                    });
                    
                    if (usuariosDisponibles.length === 0) {
                      return (
                        <div className="chat-empty-pro">
                          No hay usuarios disponibles para agregar
                        </div>
                      );
                    }
                    
                    return usuariosDisponibles.map((u) => (
                      <div
                        key={u.id}
                        className="usuario-item-agregar"
                        onClick={async () => {
                          await agregarMiembroAGrupo(grupoAgregarMiembros, u.nickname);
                          // NO cerrar el modal, permitir agregar más usuarios
                          // El modal se actualizará automáticamente porque se recargan los grupos
                        }}
                      >
                        <img
                          src={getAvatarUrl(u)}
                          alt={u.nickname}
                          className="chat-avatar"
                          onError={(e) => {
                            e.target.src = makeInitialsAvatar(e.target.alt || '?');
                          }}
                        />
                        <span style={{ color: getColorForName(u.nickname || u.name || "Usuario") }}>
                          {u.nickname || u.name}
                        </span>
                        <span className="agregar-icon">➕</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          )}

      {/* Modal de Reunión */}
      {modalReunionAbierto && (
        <div className="chat-modal-reunion-backdrop" onClick={() => setModalReunionAbierto(false)}>
          <div className="chat-modal-reunion" onClick={(e) => e.stopPropagation()}>
            <div className="chat-modal-reunion-header">
              <h3>{reunionEditando ? 'Editar reunión' : 'Nueva reunión'}</h3>
              <button
                className="modal-close-btn"
                onClick={() => {
                  setModalReunionAbierto(false);
                  resetearFormularioReunion();
                }}
              >
                ✕
              </button>
            </div>
            
            <div className="chat-modal-reunion-body">
              <div className="reunion-form-group">
                <label>Título *</label>
                <input
                  type="text"
                  value={reunionForm.titulo}
                  onChange={(e) => setReunionForm({...reunionForm, titulo: e.target.value})}
                  placeholder="Ej: Reunión de equipo"
                  className="reunion-input"
                />
              </div>
              
              <div className="reunion-form-group">
                <label>Descripción</label>
                <textarea
                  value={reunionForm.descripcion}
                  onChange={(e) => setReunionForm({...reunionForm, descripcion: e.target.value})}
                  placeholder="Agregar detalles de la reunión..."
                  className="reunion-textarea"
                  rows="3"
                />
              </div>
              
              <div className="reunion-form-row">
                <div className="reunion-form-group">
                  <label>Fecha *</label>
                  <SpanishDateInput
                    value={reunionForm.fecha}
                    onChange={(e) => setReunionForm({ ...reunionForm, fecha: e.target.value })}
                    placeholder="Seleccionar fecha"
                    className="reunion-input"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                
                <div className="reunion-form-group">
                  <label>Hora *</label>
                  <input
                    type="time"
                    value={reunionForm.hora}
                    onChange={(e) => setReunionForm({...reunionForm, hora: e.target.value})}
                    className="reunion-input"
                  />
                </div>
              </div>
              
              <div className="reunion-form-group">
                <label>Lugar</label>
                <input
                  type="text"
                  value={reunionForm.lugar}
                  onChange={(e) => setReunionForm({...reunionForm, lugar: e.target.value})}
                  placeholder="Ej: Sala de conferencias, Zoom, etc."
                  className="reunion-input"
                />
              </div>
              
              <div className="reunion-form-group">
                <label className="reunion-checkbox-label">
                  <input
                    type="checkbox"
                    checked={reunionForm.esVideollamada}
                    onChange={(e) => setReunionForm({...reunionForm, esVideollamada: e.target.checked})}
                    className="reunion-checkbox"
                  />
                  <span>Es videollamada</span>
                </label>
              </div>
              
              {tipoChat === 'grupal' && (
                <div className="reunion-form-group">
                  <label>Participantes (opcional)</label>
                  
                  {/* Participantes seleccionados */}
                  {reunionForm.participantes.length > 0 && (
                    <div className="reunion-participantes-seleccionados">
                      {reunionForm.participantes.map((nickname) => {
                        const usuario = usuariosCOPMEC.find(u => (u.nickname || u.name) === nickname);
                        return (
                          <span key={nickname} className="reunion-participante-tag">
                            <img
                              src={getAvatarUrl({
                                photo: usuario?.photo,
                                id: usuario?.id,
                                nickname: usuario?.nickname || usuario?.name
                              })}
                              alt={usuario?.nickname || usuario?.name || nickname}
                              className="reunion-participante-avatar"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                            <span className="reunion-participante-nombre">{usuario?.nickname || usuario?.name || nickname}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setReunionForm({
                                  ...reunionForm,
                                  participantes: reunionForm.participantes.filter(p => p !== nickname)
                                });
                              }}
                              className="reunion-participante-remove"
                            >
                              ✕
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Lista de participantes disponibles */}
                  <div className="reunion-participantes">
                    {usuariosCOPMEC.filter(u => u.nickname !== (user?.nickname || user?.name)).map(u => (
                      <label key={u.nickname} className="reunion-participante-item">
                        <input
                          type="checkbox"
                          checked={reunionForm.participantes.includes(u.nickname)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setReunionForm({
                                ...reunionForm,
                                participantes: [...reunionForm.participantes, u.nickname]
                              });
                            } else {
                              setReunionForm({
                                ...reunionForm,
                                participantes: reunionForm.participantes.filter(p => p !== u.nickname)
                              });
                            }
                          }}
                        />
                        <img
                          src={getAvatarUrl({
                            photo: u.photo,
                            id: u.id,
                            nickname: u.nickname || u.name
                          })}
                          alt={u.nickname || u.name}
                          className="reunion-participante-avatar-small"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                        <span>{u.nickname || u.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="chat-modal-reunion-actions">
              {reunionEditando && (
                <button
                  className="reunion-btn-eliminar"
                  onClick={() => {
                    eliminarReunion(reunionEditando.id);
                    setModalReunionAbierto(false);
                    resetearFormularioReunion();
                  }}
                >
                  🗑️ Eliminar
                </button>
              )}
              <button
                className="reunion-btn-cancelar"
                onClick={() => {
                  setModalReunionAbierto(false);
                  resetearFormularioReunion();
                }}
              >
                Cancelar
              </button>
              <button
                className="reunion-btn-guardar"
                onClick={guardarReunion}
              >
                {reunionEditando ? 'Actualizar' : 'Crear'} reunión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para crear/renombrar carpetas */}
      {modalGrupoAccion && (
        <div className="modal-carpeta-overlay" onClick={() => setModalGrupoAccion(null)}>
          <div className="modal-carpeta-content" onClick={(e) => e.stopPropagation()}>
            <h3>{modalGrupoAccion.tipo === 'crear' ? '📁 Nueva carpeta' : '✏️ Renombrar carpeta'}</h3>
            <input
              type="text"
              placeholder="Nombre de la carpeta"
              value={modalGrupoNombre}
              onChange={(e) => setModalGrupoNombre(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  confirmarAccionCarpeta();
                }
              }}
              autoFocus
            />
            <div className="modal-carpeta-buttons">
              <button onClick={() => setModalGrupoAccion(null)}>Cancelar</button>
              <button onClick={confirmarAccionCarpeta}>
                {modalGrupoAccion.tipo === 'crear' ? 'Crear' : 'Renombrar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}

