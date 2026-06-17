import React, { useState, useEffect, useRef, useMemo } from "react";
import { ChatAudioMessage } from "./ChatAudioMessage.jsx";
import ReunionesPerfilUsuario from "./ReunionesPerfilUsuario.jsx";
import "./ChatPro.css";
import axoAiLogo from "../assets/AXOIA.png";
import { persistCallSession, readCallSession, clearCallSession } from "../utils/callSession.js";
import { buscarConflictosReunion, formatConflictosMensaje } from "../utils/reunionConflicts.js";
import { buildReunionInviteUrl } from "../utils/reunionInvite.js";
import { PlayerPickerList, PlayerPickerChips } from "./PlayerPickerList.jsx";

const AXO_AI_LEGACY_NICK = "COPMEC";
const isAxoAiChatNick = (value) => String(value || "").trim().toUpperCase() === AXO_AI_LEGACY_NICK;
const getChatDisplayName = (value) => (isAxoAiChatNick(value) ? "AXO AI" : String(value || "").trim() || "Usuario");

import { useAlert } from "./AlertModal";
import { SpanishDateInput } from "./SpanishDateInput";
import { NOTIFICATION_SOUNDS, playNotificationSound, ensureAudioGestureUnlock } from "../utils/notificationSounds";
import { syncNotificationPrefsToServiceWorker } from "../utils/pushBridge.js";
import { SoundGlyph, VibrationRhythmGlyph } from "./SoundGlyph.jsx";
import {
  VIBRATION_INTENSITY_OPTIONS,
  VIBRATION_RHYTHM_OPTIONS,
  readVibrationPrefs,
  writeVibrationPref,
  triggerAppVibration,
} from "../utils/vibrationPrefs.js";
// COPMEC: removed getServerUrl
// COPMEC: removed ReunionesPerfilUsuario

// Componente estable para cada video remoto — evita parpadeo al reasignar srcObject
const CpMenuIcon = ({ type }) => {
  const svgProps = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    className: "cp-menu-svg",
  };
  switch (type) {
    case "chat":
      return <svg {...svgProps}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
    case "user":
      return <svg {...svgProps}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
    case "users":
      return <svg {...svgProps}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
    case "plus":
      return <svg {...svgProps}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
    case "folder":
      return <svg {...svgProps}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>;
    case "remove":
      return <svg {...svgProps}><polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" /></svg>;
    case "reply":
      return <svg {...svgProps}><polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" /></svg>;
    case "copy":
      return <svg {...svgProps}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>;
    case "forward":
      return <svg {...svgProps}><polyline points="15 17 20 12 15 7" /><path d="M4 18v-2a4 4 0 0 1 4-4h12" /></svg>;
    case "pin":
      return <svg {...svgProps}><path d="M12 17v5" /><path d="M9 3h6l1 7h4l-5 6v-4H9v4L4 10h4z" /></svg>;
    case "star":
      return <svg {...svgProps}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;
    case "select":
      return <svg {...svgProps}><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>;
    case "edit":
      return <svg {...svgProps}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>;
    case "download":
      return <svg {...svgProps}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>;
    case "info":
      return <svg {...svgProps}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>;
    case "trash":
      return <svg {...svgProps}><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>;
    case "check":
      return <svg {...svgProps}><polyline points="20 6 9 17 4 12" /></svg>;
    case "rename":
      return <svg {...svgProps}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>;
    case "admin":
      return <svg {...svgProps}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.77 1.05 1.41 1.1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
    default:
      return null;
  }
};

const VideoTile = React.memo(function VideoTile({ stream, nickname }) {
  const videoRef = useRef(null);
  useEffect(() => {
    const node = videoRef.current;
    if (!node) return;
    node.srcObject = stream || null;
    if (stream) {
      node.play().catch(() => {});
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
    { id: "ringIncoming", label: "Ring", icon: "ringIncoming" },
    { id: "ringOutgoing", label: "Saliente", icon: "ringOutgoing" },
    ...NOTIFICATION_SOUNDS.filter((s) => !["zen", "soft", "alertSoft"].includes(s.id)),
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
      let errorPayload = null;
      try {
        const payload = await r.clone().json();
        errorPayload = payload;
        backendMessage = payload?.message || payload?.error || "";
      } catch (_) {
        try {
          backendMessage = await r.clone().text();
        } catch (_) { /* noop */ }
      }
      const err = new Error(backendMessage || r.statusText || 'Request failed');
      err.status = r.status;
      if (errorPayload) err.data = errorPayload;
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
  const [vibrationSettings, setVibrationSettings] = useState(() => readVibrationPrefs());
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
  const refrescarHistorialRef = useRef(null);
  const [sinLeerGrupos, setSinLeerGrupos] = useState([]);
  const [sinLeerCargando, setSinLeerCargando] = useState(false);
  const [sinLeerColapsados, setSinLeerColapsados] = useState({});
  const scrollToMensajeRef = useRef(null);
  const [sidebarNavVisible, setSidebarNavVisible] = useState(() => {
    try {
      return localStorage.getItem("chatSidebarNavVisible") !== "0";
    } catch {
      return true;
    }
  });

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
  const [editandoNombreGrupo, setEditandoNombreGrupo] = useState(false);
  const [editandoDescripcion, setEditandoDescripcion] = useState(false);
  const [nuevoNombreGrupo, setNuevoNombreGrupo] = useState("");
  const [nuevaDescripcion, setNuevaDescripcion] = useState("");
  const [guardandoGrupoPerfil, setGuardandoGrupoPerfil] = useState(false);
  const [gestionandoAdminsGrupo, setGestionandoAdminsGrupo] = useState(false);
  const [subiendoFotoGrupo, setSubiendoFotoGrupo] = useState(false);
  const grupoFotoInputRef = useRef(null);
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
  const [menuLateralContextual, setMenuLateralContextual] = useState(null);
  const [sidebarChatSections, setSidebarChatSections] = useState([]); // orden de secciones — mensajes directos
  const [sidebarGrupoSections, setSidebarGrupoSections] = useState([]); // orden de secciones — canales y grupos
  const [modalAdminSeccion, setModalAdminSeccion] = useState(null);
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
  const autoEnviarAudioRef = useRef(false);
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
  const callActivoRef = useRef(false);
  const marcarCallActivo = (activo) => {
    callActivoRef.current = activo;
    setCallActivo(activo);
  };
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
  const callFacingModeRef = useRef("user");
  const [switchingCamera, setSwitchingCamera] = useState(false);
  const [sharingScreen, setSharingScreen] = useState(false);
  const [callOverlayMinimized, setCallOverlayMinimized] = useState(false);
  const [pendingCallRestore, setPendingCallRestore] = useState(null);
  const callFloatingVideoRef = useRef(null);
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
    duracionMinutos: 60,
    participantes: []
  });
  const [reunionConflictos, setReunionConflictos] = useState([]);
  const [verificandoConflictosReunion, setVerificandoConflictosReunion] = useState(false);
  const [reunionSolicitudModal, setReunionSolicitudModal] = useState(null);
  const [reunionSolicitudMensaje, setReunionSolicitudMensaje] = useState("");
  const [reunionSolicitudDuracion, setReunionSolicitudDuracion] = useState(90);
  const [modalAgregarParticipantesReunion, setModalAgregarParticipantesReunion] = useState(null);
  const [participantesNuevosReunion, setParticipantesNuevosReunion] = useState([]);

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
  const audioStreamRef = useRef(null);
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
      const base = Array.isArray(usuariosCOPMEC)
        ? usuariosCOPMEC.map((u) => u.nickname || u.name).filter(Boolean)
        : [];
      if (chatActual) base.push(chatActual);
      baseNicknames = base;
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

    const emitirInvitacionExtra = () => {
      socket.emit("call_invite", {
        room,
        fromNickname: userDisplayName,
        toNicknames: seleccionados,
        tipo: tipoChat === "grupal" ? "grupal" : "extendida",
      });
    };

    if (socket?.connected) {
      emitirInvitacionExtra();
      showAlert(`Invitación enviada a ${seleccionados.length} participante(s).`, "success");
      setCallInvitePickerOpen(false);
      setCallInviteSelection({});
      return;
    }

    try {
      const fallbackResult = await sendCallSignalFallback({
        type: "invite",
        room,
        toNicknames: seleccionados,
        nickname: userDisplayName,
        fromPeerId: buildRestPeerId(userDisplayName),
      });
      const delivered = Number(fallbackResult?.delivered || 0);
      if (delivered > 0) {
        showAlert(`Invitación enviada por canal alterno a ${delivered} participante(s).`, "success");
        setCallInvitePickerOpen(false);
        setCallInviteSelection({});
        return;
      }
      showAlert("No se pudieron enviar las invitaciones adicionales.", "error");
    } catch {
      showAlert("No se pudieron enviar las invitaciones adicionales.", "error");
    }
  };

  const guardarSesionLlamada = () => {
    if (!callRoomRef.current) return;
    persistCallSession({
      room: callRoomRef.current,
      tipoChat,
      chatActual: chatActual || "",
      user: user?.nickname || user?.name || "",
    });
  };

  const solicitarPiPLlamada = async () => {
    const video = localVideoRef.current || callFloatingVideoRef.current;
    if (!video || !document.pictureInPictureEnabled) return;
    if (document.pictureInPictureElement === video) return;
    try {
      await video.requestPictureInPicture();
    } catch {
      /* noop */
    }
  };

  const restaurarVistaLlamada = () => {
    setCallOverlayMinimized(false);
    setOpen(true);
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
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

  const saveVibrationSetting = (key, value) => {
    writeVibrationPref(key, value);
    setVibrationSettings((prev) => {
      const next = { ...prev, [key]: value };
      syncNotificationPrefsToServiceWorker();
      return next;
    });
  };

  useEffect(() => {
    syncNotificationPrefsToServiceWorker();
  }, [
    audioSettings.msgSound,
    audioSettings.callIncomingSound,
    vibrationSettings.msgEnabled,
    vibrationSettings.msgIntensity,
    vibrationSettings.msgRhythm,
    vibrationSettings.callEnabled,
    vibrationSettings.callIntensity,
    vibrationSettings.callRhythm,
  ]);

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
      const played = playNotificationSound(audioSettings.callIncomingSound, { volume: audioSettings.callVolume, kind: "call" });
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
      const played = playNotificationSound(audioSettings.callOutgoingSound, { volume: audioSettings.callVolume, kind: "call" });
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
    playNotificationSound(audioSettings.msgSound, { volume: messageVolume, kind: "message" });
    triggerAppVibration("message");
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
                silent: true,
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
              silent: true,
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
              silent: true,
            });
          });
        return;
      }

      new Notification(title, {
        body,
        icon: "/android-chrome-192x192.png",
        tag,
        requireInteraction: true,
        silent: true,
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

  const makeGrupoAvatarFallback = () => {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 56 56'><rect width='56' height='56' rx='14' ry='14' fill='%23e8edf2'/><circle cx='22' cy='24' r='6' fill='%23314d69'/><circle cx='34' cy='24' r='6' fill='%23314d69'/><path d='M14 40c2-6 8-9 14-9s12 3 14 9' fill='%23314d69' opacity='0.85'/></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  };

  const getGrupoFotoUrl = (grupo) => {
    const raw = String(grupo?.foto || "").trim();
    if (!raw || raw === "null") return null;
    if (raw.startsWith("http") || raw.startsWith("data:")) return raw;
    const path = raw.startsWith("/") ? raw : `/${raw}`;
    return `${SERVER_URL}${path}`;
  };

  const obtenerAdminsGrupoVisibles = (perfil) => {
    const creador = perfil?.creado_por;
    const delegados = Array.isArray(perfil?.administradores) ? perfil.administradores : [];
    const lista = [];
    if (creador) lista.push(creador);
    delegados.forEach((admin) => {
      if (admin && admin !== creador && !lista.includes(admin)) lista.push(admin);
    });
    return lista;
  };

  const renderGrupoAvatar = (grupo, { className = "grupo-icon", onClick } = {}) => {
    const fotoUrl = getGrupoFotoUrl(grupo);
    const contenido = fotoUrl ? (
      <img
        src={fotoUrl}
        alt={grupo?.nombre || "Grupo"}
        onError={(event) => {
          const fallback = makeGrupoAvatarFallback();
          if (event.currentTarget.src !== fallback) {
            event.currentTarget.src = fallback;
          }
        }}
      />
    ) : (
      <span className="grupo-icon-fallback" aria-hidden="true">👥</span>
    );

    return (
      <span
        className={className}
        onClick={onClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick(e);
          }
        } : undefined}
      >
        {contenido}
      </span>
    );
  };

  const getAvatarUrl = (usuarioObj) => {
    const resolved = typeof usuarioObj === "string"
      ? resolveUsuarioChat(usuarioObj)
      : usuarioObj;
    const resolvedNick = resolved?.nickname || resolved?.name || (typeof usuarioObj === "string" ? usuarioObj : "");
    if (isAxoAiChatNick(resolvedNick) || (typeof usuarioObj === "string" && isAxoAiChatNick(usuarioObj))) {
      return axoAiLogo;
    }
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
                  new Notification("📱 Mensaje de AXO AI", {
                    body: ultimoMensaje.mensaje || "Tienes un nuevo mensaje de AXO AI",
                    icon: "/android-chrome-192x192.png",
                    tag: "axo-ai-otp",
                    requireInteraction: false,
                    silent: true,
                  });
                  playIncomingMessageSound();
                } else if ("Notification" in window && Notification.permission === "default") {
                  Notification.requestPermission().then((permission) => {
                    if (permission === "granted") {
                      new Notification("📱 Mensaje de AXO AI", {
                        body: ultimoMensaje.mensaje || "Tienes un nuevo mensaje de AXO AI",
                        icon: "/android-chrome-192x192.png",
                        tag: "axo-ai-otp",
                        silent: true,
                      });
                      playIncomingMessageSound();
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

  const cargarHistorialLlamadas = async (mostrarLoader = false) => {
    if (mostrarLoader) setHistorialCargando(true);
    try {
      const data = await authFetch(`${SERVER_URL}/api/chat/calls/historial`);
      setHistorialLlamadas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("[ChatPro] historial llamadas:", err?.message || err);
      setHistorialLlamadas([]);
    } finally {
      if (mostrarLoader) setHistorialCargando(false);
    }
  };

  refrescarHistorialRef.current = cargarHistorialLlamadas;

  // 📞 Cargar historial de llamadas
  useEffect(() => {
    if (!open || tabPrincipal !== "historial") return;
    let cancelado = false;
    const cargar = async (loader) => {
      if (cancelado) return;
      if (loader) setHistorialCargando(true);
      try {
        const data = await authFetch(`${SERVER_URL}/api/chat/calls/historial`);
        if (!cancelado) setHistorialLlamadas(Array.isArray(data) ? data : []);
      } catch (_) {
        if (!cancelado) setHistorialLlamadas([]);
      } finally {
        if (loader && !cancelado) setHistorialCargando(false);
      }
    };

    cargar(true);
    const interval = setInterval(() => cargar(false), 20000);

    return () => {
      cancelado = true;
      clearInterval(interval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tabPrincipal, SERVER_URL]);

  const toggleSidebarNav = () => {
    setSidebarNavVisible((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("chatSidebarNavVisible", next ? "1" : "0");
      } catch { /* noop */ }
      return next;
    });
  };

  const cargarSinLeer = async (mostrarLoader = true) => {
    if (mostrarLoader) setSinLeerCargando(true);
    try {
      const data = await authFetch(`${SERVER_URL}/api/chat/sin-leer`);
      setSinLeerGrupos(Array.isArray(data) ? data : []);
    } catch (_) {
      setSinLeerGrupos([]);
    } finally {
      if (mostrarLoader) setSinLeerCargando(false);
    }
  };

  useEffect(() => {
    if (!open || tabPrincipal !== "no-leidos") return;
    cargarSinLeer(true);
    const interval = setInterval(() => cargarSinLeer(false), 25000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tabPrincipal, SERVER_URL]);

  useEffect(() => {
    if (!scrollToMensajeRef.current || !open || !tipoChat) return;
    const mensajeId = scrollToMensajeRef.current;
    const intentarScroll = () => {
      const el = document.getElementById(`msg-${mensajeId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("msg-resaltado-prioritario");
        setTimeout(() => el.classList.remove("msg-resaltado-prioritario"), 2400);
        scrollToMensajeRef.current = null;
        return true;
      }
      return false;
    };
    if (intentarScroll()) return undefined;
    const t = setTimeout(intentarScroll, 400);
    return () => clearTimeout(t);
  }, [open, tipoChat, chatActual, mensajesPrivado, mensajesGrupal, mensajesGeneral]);

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
        
        // Si hay un mensaje de AXO AI y el chat está abierto y estamos viendo COPMEC, 
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

      // Si es un mensaje de AXO AI, SIEMPRE recargar chats activos y cambiar a pestaña "chats"
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
          new Notification("📱 Mensaje de AXO AI", {
            body: mensaje.mensaje || "Tienes un nuevo mensaje de AXO AI",
            icon: "/android-chrome-192x192.png",
            tag: "axo-ai-otp",
            requireInteraction: false,
            silent: true,
          });
          playIncomingMessageSound();
        } else if ("Notification" in window && Notification.permission === "default") {
          // Solicitar permiso para notificaciones
          Notification.requestPermission().then((permission) => {
            if (permission === "granted") {
              new Notification("📱 Mensaje de AXO AI", {
                body: mensaje.mensaje || "Tienes un nuevo mensaje de AXO AI",
                icon: "/android-chrome-192x192.png",
                tag: "axo-ai-otp",
                silent: true,
              });
              playIncomingMessageSound();
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
        // Si es mensaje de AXO AI para admin, siempre contar como no leído hasta que se abra
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
      // Y si es mensaje de AXO AI para admin, siempre notificar
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
      triggerAppVibration("call");

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
      if (!callActivoRef.current || payload.socketId === socket.id) return;
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
      if (!callActivoRef.current) return;
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
      if (remainingPeers.length === 0 && callActivoRef.current) {
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

    const handleReunionActualizada = (payload) => {
      const reunion = payload?.reunion;
      if (!reunion?.id) return;
      const userDisplayName = user?.nickname || user?.name || "";
      setReuniones((current) => {
        const exists = current.some((r) => r.id === reunion.id);
        if (!exists) return [...current, reunion];
        return current.map((r) => (r.id === reunion.id ? { ...r, ...reunion } : r));
      });
      if (reunion.estado === "activa" && reunion.esVideollamada) {
        showAlert(`La reunión "${reunion.titulo}" está activa. Puedes entrar desde el chat.`, "success");
      } else if (
        reunion.estado === "programada"
        && userDisplayName
        && reunion.creador !== userDisplayName
        && (reunion.participantes || []).includes(userDisplayName)
      ) {
        showAlert(
          `Te invitaron a "${reunion.titulo}" el ${reunion.fecha} a las ${reunion.hora}. `
          + "Si durará más de 1 hora o necesitas otro horario, solicita un cambio desde Perfil > Reuniones.",
          "info",
        );
      }
    };

    const handleReunionSolicitudCambio = (payload) => {
      const userDisplayName = user?.nickname || user?.name || "";
      if (!payload || payload.creador !== userDisplayName) return;
      const reunion = payload.reunion;
      const solicitante = payload.solicitante || "Un participante";
      const motivo = payload.motivo === "duracion_extendida"
        ? "indica que la reunión durará más de 1 hora"
        : "reporta conflicto de horario";
      showAlert(
        `${solicitante} ${motivo} para "${reunion?.titulo || "la reunión"}". `
        + (payload.mensaje ? `Mensaje: ${payload.mensaje}. ` : "")
        + "Puedes editar la reunión desde el calendario del chat.",
        "warning",
      );
      if (reunion?.id) {
        setReuniones((current) => {
          const exists = current.some((r) => r.id === reunion.id);
          if (!exists) return [...current, reunion];
          return current.map((r) => (r.id === reunion.id ? { ...r, ...reunion } : r));
        });
      }
    };
    socket.on("reunion_actualizada", handleReunionActualizada);
    socket.on("reunion_solicitud_cambio", handleReunionSolicitudCambio);

    const handleReunionSolicitudUnirse = (payload) => {
      const userDisplayName = user?.nickname || user?.name || "";
      if (!payload || payload.creador !== userDisplayName) return;
      const solicitante = payload.solicitante || "Alguien";
      const reunion = payload.reunion;
      showAlert(
        `${solicitante} quiere unirse a "${reunion?.titulo || "la reunión"}". `
        + "Puedes agregarlo desde Perfil > Reuniones o copiar el enlace de invitación.",
        "info",
      );
    };
    socket.on("reunion_solicitud_unirse", handleReunionSolicitudUnirse);

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
      socket.off("reunion_actualizada", handleReunionActualizada);
      socket.off("reunion_solicitud_cambio", handleReunionSolicitudCambio);
      socket.off("reunion_solicitud_unirse", handleReunionSolicitudUnirse);
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
        triggerAppVibration("call");

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
        if (!callActivoRef.current || !payload.from) return;
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
        if (!callActivoRef.current) return;
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
        if (remainingPeers.length === 0 && callActivoRef.current) {
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
    if (!callActivo || !localStreamRef.current) return;
    const node = localVideoRef.current;
    if (!node) return;
    if (node.srcObject !== localStreamRef.current) {
      console.log('[VIDEO] Sincronizando localVideoRef con stream');
      node.srcObject = localStreamRef.current;
    }
    node.play().catch(() => {});
  }, [callActivo, localStream, callMainView, callExpanded, remoteStreams]);

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
    if (callActivo) {
      setCallOverlayMinimized(true);
      setOpen(false);
      if (onClose) onClose();
      solicitarPiPLlamada();
      return;
    }
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
        const data = await authFetch(`${SERVER_URL}/api/chat/reuniones/proximas`);
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

  useEffect(() => {
    if (!modalReunionAbierto) return undefined;
    if (!reunionForm.fecha || !reunionForm.hora) {
      setReunionConflictos([]);
      return undefined;
    }
    const timer = setTimeout(() => {
      verificarConflictosReunionForm();
    }, 450);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    modalReunionAbierto,
    reunionForm.fecha,
    reunionForm.hora,
    reunionForm.duracionMinutos,
    reunionForm.participantes,
    reunionEditando?.id,
    tipoChat,
    chatActual,
  ]);

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
    const mensaje = cuando === "ahora"
      ? `🔔 ¡La reunión "${reunion.titulo}" es ahora!`
      : `⏰ La reunión "${reunion.titulo}" comienza en 10 minutos`;

    showAlert(mensaje, "info");
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      try {
        new Notification("Reunión COPMEC", { body: mensaje });
      } catch {
        /* noop */
      }
    }
    if (window.sonidoCOPMEC) {
      try {
        window.sonidoCOPMEC.reproducir("notification");
      } catch {
        /* noop */
      }
    }
  };

  const formatearMensajeReunion = (reunion) => {
    const base = (
      `📅 **Reunión: ${reunion.titulo}**\n`
      + `📆 Fecha: ${new Date(reunion.fecha).toLocaleDateString("es-MX")}\n`
      + `🕐 Hora: ${reunion.hora}\n`
      + `⏱ Duración estimada: ${reunion.duracionMinutos || 60} min\n`
      + (reunion.lugar ? `📍 Lugar: ${reunion.lugar}\n` : "")
      + (reunion.esVideollamada ? "📹 Videollamada\n" : "")
      + (reunion.descripcion ? `\n${reunion.descripcion}` : "")
    );
    const url = reunion.invitacionToken ? buildReunionInviteUrl(reunion.invitacionToken) : "";
    if (url) {
      return `${base}\n\n🔗 Enlace de invitación:\n${url}\n\nLos invitados externos pueden unirse sin cuenta del sistema cuando la reunión esté activa.`;
    }
    return `${base}\n\nSi la reunión durará más de 1 hora o necesitas otro horario, puedes solicitar un cambio desde tu perfil > Reuniones.`;
  };

  const enviarMensajeTextoDirecto = async (texto, { tipo = tipoChat, chatId = chatActual, paraNickname } = {}) => {
    const userDisplayName = user?.nickname || user?.name;
    if (!userDisplayName || !texto?.trim()) return false;
    const bodyData = { mensaje: texto.trim(), tipo_mensaje: "texto" };
    try {
      if (tipo === "general") {
        await authFetch(`${SERVER_URL}/api/chat/general`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyData),
        });
        return true;
      }
      if (tipo === "privado") {
        const destino = paraNickname || chatId;
        if (!destino) return false;
        await authFetch(`${SERVER_URL}/api/chat/privado`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...bodyData, para_nickname: destino }),
        });
        return true;
      }
      if (tipo === "grupal" && chatId) {
        await authFetch(`${SERVER_URL}/api/chat/grupos/${chatId}/mensajes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyData),
        });
        return true;
      }
    } catch {
      return false;
    }
    return false;
  };

  const notificarReunionInvolucrados = async (reunion) => {
    const texto = formatearMensajeReunion(reunion);
    const userDisplayName = user?.nickname || user?.name || "";
    const participantes = Array.isArray(reunion.participantes) ? reunion.participantes : [];

    if (reunion.chat_tipo === "grupal" && reunion.chat_id) {
      await enviarMensajeTextoDirecto(texto, { tipo: "grupal", chatId: reunion.chat_id });
    } else if (reunion.chat_tipo === "privado" && reunion.chat_id) {
      await enviarMensajeTextoDirecto(texto, { tipo: "privado", paraNickname: reunion.chat_id });
    } else if (reunion.chat_tipo === "general") {
      await enviarMensajeTextoDirecto(texto, { tipo: "general" });
    }

    await Promise.all(
      participantes
        .filter((nick) => nick && nick !== userDisplayName)
        .map((nick) => enviarMensajeTextoDirecto(texto, { tipo: "privado", paraNickname: nick })),
    );
  };

  const obtenerParticipantesReunionForm = () => {
    let participantes = [...(reunionForm.participantes || [])];
    if (tipoChat === "privado" && chatActual && !participantes.includes(chatActual)) {
      participantes.push(chatActual);
    }
    return Array.from(new Set(participantes.filter(Boolean)));
  };

  const verificarConflictosReunionForm = async () => {
    if (!reunionForm.fecha || !reunionForm.hora) {
      setReunionConflictos([]);
      return [];
    }
    const participantes = obtenerParticipantesReunionForm();
    const userDisplayName = user?.nickname || user?.name || "";
    const payload = {
      fecha: reunionForm.fecha,
      hora: reunionForm.hora,
      duracionMinutos: reunionForm.duracionMinutos || 60,
      participantes,
      excluirReunionId: reunionEditando?.id || null,
    };

    setVerificandoConflictosReunion(true);
    try {
      const data = await authFetch(`${SERVER_URL}/api/chat/reuniones/verificar-conflictos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const conflictos = data?.conflictos || [];
      setReunionConflictos(conflictos);
      return conflictos;
    } catch {
      const conflictos = buscarConflictosReunion({
        ...payload,
        creador: userDisplayName,
        reuniones,
        excluirReunionId: reunionEditando?.id,
      });
      setReunionConflictos(conflictos);
      return conflictos;
    } finally {
      setVerificandoConflictosReunion(false);
    }
  };

  const solicitarCambioReunion = async ({ reunion, motivo = "conflicto", mensaje = "", duracionEstimadaMinutos = null }) => {
    if (!reunion?.id) return;
    try {
      await authFetch(`${SERVER_URL}/api/chat/reuniones/${reunion.id}/solicitar-cambio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motivo,
          mensaje,
          duracionEstimadaMinutos,
        }),
      });
      showAlert("Solicitud enviada al creador de la reunión", "success");
      setReunionSolicitudModal(null);
      setReunionSolicitudMensaje("");
    } catch (err) {
      showAlert(err?.message || "No se pudo enviar la solicitud", "error");
    }
  };

  const abrirSolicitudCambioReunion = (reunion, motivo = "duracion_extendida") => {
    setReunionSolicitudModal({ reunion, motivo });
    setReunionSolicitudMensaje("");
    setReunionSolicitudDuracion(Math.max(90, reunion?.duracionMinutos || 60));
  };

  const obtenerEnlaceInvitacionReunion = async (reunion) => {
    if (reunion?.invitacionToken) return buildReunionInviteUrl(reunion.invitacionToken);
    if (!reunion?.id) return "";
    try {
      const data = await authFetch(`${SERVER_URL}/api/chat/reuniones/${reunion.id}/enlace`);
      if (data?.reunion) {
        setReuniones((current) => current.map((r) => (r.id === data.reunion.id ? { ...r, ...data.reunion } : r)));
      }
      return data?.url || buildReunionInviteUrl(data?.token);
    } catch {
      return "";
    }
  };

  const copiarEnlaceInvitacionReunion = async (reunion) => {
    const url = await obtenerEnlaceInvitacionReunion(reunion);
    if (!url) {
      showAlert("No se pudo obtener el enlace de invitación", "error");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      showAlert("Enlace copiado al portapapeles", "success");
    } catch {
      showAlert(`Enlace de invitación:\n${url}`, "info");
    }
  };

  const abrirModalAgregarParticipantesReunion = (reunion) => {
    setModalAgregarParticipantesReunion(reunion);
    setParticipantesNuevosReunion([]);
  };

  const agregarParticipantesReunion = async () => {
    const reunion = modalAgregarParticipantesReunion;
    if (!reunion?.id || !participantesNuevosReunion.length) {
      showAlert("Selecciona al menos un participante", "warning");
      return;
    }
    try {
      const data = await authFetch(`${SERVER_URL}/api/chat/reuniones/${reunion.id}/agregar-participantes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantes: participantesNuevosReunion }),
      });
      if (data?.reunion) {
        setReuniones((current) => current.map((r) => (r.id === data.reunion.id ? data.reunion : r)));
      }
      setModalAgregarParticipantesReunion(null);
      setParticipantesNuevosReunion([]);
      showAlert(`Se agregaron ${data?.agregados?.length || participantesNuevosReunion.length} participante(s) y se envió el enlace`, "success");
    } catch (err) {
      if (err?.status === 409 && Array.isArray(err?.data?.conflictos)) {
        showAlert(formatConflictosMensaje(err.data.conflictos), "warning");
        return;
      }
      showAlert(err?.message || "No se pudieron agregar participantes", "error");
    }
  };

  const solicitarUnirseReunion = async (reunion) => {
    if (!reunion?.id) return;
    try {
      const data = await authFetch(`${SERVER_URL}/api/chat/reuniones/${reunion.id}/solicitar-unirse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensaje: "Me gustaría unirme a esta reunión." }),
      });
      showAlert("Solicitud enviada al organizador de la reunión", "success");
      if (data?.url) {
        showAlert(`También puedes compartir este enlace: ${data.url}`, "info");
      }
    } catch (err) {
      showAlert(err?.message || "No se pudo enviar la solicitud", "error");
    }
  };

  // Crear o actualizar reunión
  const guardarReunion = async () => {
    if (!reunionForm.titulo.trim() || !reunionForm.fecha || !reunionForm.hora) {
      showAlert("Completa todos los campos obligatorios", "warning");
      return;
    }

    const chatId = tipoChat === "general" ? "general" : (chatActual || "");
    const participantes = obtenerParticipantesReunionForm();

    const conflictos = await verificarConflictosReunionForm();
    if (conflictos.length) {
      showAlert(formatConflictosMensaje(conflictos), "warning");
      return;
    }

    const payload = {
      titulo: reunionForm.titulo.trim(),
      descripcion: reunionForm.descripcion.trim(),
      fecha: reunionForm.fecha,
      hora: reunionForm.hora,
      lugar: reunionForm.lugar.trim(),
      esVideollamada: reunionForm.esVideollamada,
      duracionMinutos: reunionForm.duracionMinutos || 60,
      participantes,
      chat_tipo: tipoChat,
      chat_id: String(chatId),
    };

    try {
      let reunionGuardada;
      if (reunionEditando?.id && typeof reunionEditando.id === "number") {
        reunionGuardada = await authFetch(`${SERVER_URL}/api/chat/reuniones/${reunionEditando.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        setReuniones((current) => current.map((r) => (r.id === reunionGuardada.id ? reunionGuardada : r)));
      } else {
        reunionGuardada = await authFetch(`${SERVER_URL}/api/chat/reuniones`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        setReuniones((current) => [...current, reunionGuardada]);
        await notificarReunionInvolucrados(reunionGuardada);
      }

      programarNotificacionesReunion(reunionGuardada);
      localStorage.setItem("COPMEC_reuniones", JSON.stringify(
        reunionEditando?.id
          ? reuniones.map((r) => (r.id === reunionGuardada.id ? reunionGuardada : r))
          : [...reuniones, reunionGuardada],
      ));

      setModalReunionAbierto(false);
      setReunionConflictos([]);
      resetearFormularioReunion();
      showAlert(reunionEditando ? "Reunión actualizada" : "Reunión creada y notificaciones enviadas", "success");
    } catch (err) {
      if (err?.status === 409 && Array.isArray(err?.data?.conflictos)) {
        setReunionConflictos(err.data.conflictos);
        showAlert(formatConflictosMensaje(err.data.conflictos), "warning");
        return;
      }
      const nuevaReunion = {
        id: reunionEditando?.id || Date.now(),
        ...payload,
        creador: user?.nickname || user?.name,
        chat_tipo: tipoChat,
        chat_id: chatId,
        estado: "programada",
        creada: new Date().toISOString(),
      };
      const nuevasReuniones = reunionEditando
        ? reuniones.map((r) => (r.id === reunionEditando.id ? nuevaReunion : r))
        : [...reuniones, nuevaReunion];
      setReuniones(nuevasReuniones);
      localStorage.setItem("COPMEC_reuniones", JSON.stringify(nuevasReuniones));
      programarNotificacionesReunion(nuevaReunion);
      await notificarReunionInvolucrados(nuevaReunion);
      setModalReunionAbierto(false);
      resetearFormularioReunion();
      showAlert("Reunión guardada localmente (sin servidor)", "warning");
    }
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
      duracionMinutos: 60,
      participantes: []
    });
    setReunionConflictos([]);
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
        duracionMinutos: reunion.duracionMinutos || 60,
        participantes: reunion.participantes || []
      });
    } else {
      resetearFormularioReunion();
    }
    setModalReunionAbierto(true);
  };

  // Eliminar reunión
  const eliminarReunion = async (reunionId) => {
    const confirmado = await showConfirm("¿Eliminar esta reunión?", "Eliminar reunión");
    if (!confirmado) return;

    try {
      if (typeof reunionId === "number") {
        await authFetch(`${SERVER_URL}/api/chat/reuniones/${reunionId}`, { method: "DELETE" });
      }
    } catch {
      /* fallback local */
    }

    const nuevasReuniones = reuniones.filter((r) => r.id !== reunionId);
    setReuniones(nuevasReuniones);
    localStorage.setItem("COPMEC_reuniones", JSON.stringify(nuevasReuniones));
    showAlert("Reunión eliminada", "success");
  };

  const unirseLlamadaPorRoom = async (room, { invitarA = [] } = {}) => {
    const userDisplayName = user?.nickname || user?.name || "usuario";
    const streamResult = await asegurarLocalStream().catch(() => null);
    if (!streamResult) {
      showAlert("No se pudo acceder a cámara/micrófono.", "error");
      return false;
    }

    callRoomRef.current = room;
    marcarCallActivo(true);
    setCallMainView("remote");
    setCallMainRemoteId(null);
    setCallOverlayMinimized(false);
    placePipBottomRight();
    guardarSesionLlamada();

    const unir = () => {
      socket.emit("set_in_call", { inCall: true });
      socket.emit("call_join", { room, nickname: userDisplayName });
    };

    const connected = await esperarConexionSocket(3000);
    if (connected && socket?.connected) {
      callTransportRef.current = "socket";
      unir();
    } else {
      callTransportRef.current = "rest";
      await sendCallSignalFallback({
        type: "join",
        room,
        toNicknames: invitarA,
        nickname: userDisplayName,
        fromPeerId: buildRestPeerId(userDisplayName),
      }).catch(() => {});
    }

    setOpen(true);
    return true;
  };

  const reingresarLlamadaGuardada = async () => {
    const session = pendingCallRestore || readCallSession();
    if (!session?.room) return;
    try {
      if (session.tipoChat) setTipoChat(session.tipoChat);
      if (session.chatActual) setChatActual(session.chatActual);
      setTabPrincipal("chats");
      const ok = await unirseLlamadaPorRoom(session.room);
      if (ok) setPendingCallRestore(null);
    } catch {
      showAlert("No se pudo reingresar a la videollamada.", "error");
    }
  };

  const entrarReunionVideollamada = async (reunion) => {
    if (!reunion?.esVideollamada) return;
    let room = reunion.room;
    if (!room) {
      room = `copmec-reunion-${reunion.id}`;
      if (typeof reunion.id === "number") {
        try {
          const actualizada = await authFetch(`${SERVER_URL}/api/chat/reuniones/${reunion.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ estado: "activa", room }),
          });
          setReuniones((current) => current.map((r) => (r.id === actualizada.id ? actualizada : r)));
        } catch {
          /* local */
        }
      }
    }

    const participantes = Array.isArray(reunion.participantes) ? reunion.participantes : [];
    const userDisplayName = user?.nickname || user?.name || "";
    const invitarA = participantes.filter((n) => n && n !== userDisplayName);

    const ok = await unirseLlamadaPorRoom(room, { invitarA });
    if (!ok) return;

    if (socket?.connected && invitarA.length) {
      socket.emit("call_invite", {
        room,
        fromNickname: userDisplayName,
        toNicknames: invitarA,
        tipo: reunion.chat_tipo === "grupal" ? "grupal" : "extendida",
      });
    }
  };

  const iniciarReunionVideollamada = async (reunion) => {
    await entrarReunionVideollamada(reunion);
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
      audioStreamRef.current = stream;
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
        const debeEnviar = autoEnviarAudioRef.current;
        autoEnviarAudioRef.current = false;
        audioStreamRef.current?.getTracks?.().forEach((t) => t.stop());
        audioStreamRef.current = null;
        clearInterval(recTimerRef.current);
        cancelAnimationFrame(recAnimRef.current);
        setRecTime(0);
        setRecBars(new Array(30).fill(2));
        setIsRecording(false);
        mediaRecorderRef.current = null;
        if (debeEnviar && file.size > 0) {
          enviarArchivoDirecto(file);
        } else if (file.size > 0) {
          setArchivoAdjunto(file);
        }
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
      recorder.start(200);
    } catch (_err) {
      audioStreamRef.current?.getTracks?.().forEach((t) => t.stop());
      audioStreamRef.current = null;
      setIsRecording(false);
      showAlert("No se pudo iniciar la grabación de voz.", "error");
    }
  };

  const detenerGrabacionVoz = (autoEnviar = false) => {
    autoEnviarAudioRef.current = Boolean(autoEnviar);
    clearInterval(recTimerRef.current);
    cancelAnimationFrame(recAnimRef.current);
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        if (typeof recorder.requestData === "function") {
          recorder.requestData();
        }
      } catch (_) { /* noop */ }
      recorder.stop();
      return;
    }
    autoEnviarAudioRef.current = false;
    setIsRecording(false);
  };

  const cancelarGrabacionVoz = () => {
    autoEnviarAudioRef.current = false;
    clearInterval(recTimerRef.current);
    cancelAnimationFrame(recAnimRef.current);
    const recorder = mediaRecorderRef.current;
    if (recorder) {
      recorder.onstop = null;
      if (recorder.state !== "inactive") {
        recorder.stop();
      }
    }
    audioStreamRef.current?.getTracks?.().forEach((t) => t.stop());
    audioStreamRef.current = null;
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    setRecTime(0);
    setRecBars(new Array(30).fill(2));
    setIsRecording(false);
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

  const emojiReacciones = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
  
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
    const pos = isMobile
      ? { x: window.innerWidth / 2, y: window.innerHeight / 2 }
      : calcPosicionMenu(baseX, baseY, 248, 420);
    const x = pos.x;
    const y = pos.y;
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

  const calcularPosicionMenuMiembro = (rect) => {
    const menuWidth = 248;
    const menuMaxHeight = 380;
    const margin = 10;
    let x = rect.right - menuWidth;
    if (x < margin) x = margin;
    if (x + menuWidth > window.innerWidth - margin) {
      x = window.innerWidth - menuWidth - margin;
    }
    let y = rect.bottom + 6;
    if (y + menuMaxHeight > window.innerHeight - margin) {
      y = Math.max(margin, rect.top - menuMaxHeight - 6);
    }
    return { x, y };
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
          <div className="msg-menu-nombre">{esMio ? "Tú" : getChatDisplayName(otroNickname)}</div>
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

  const enviarArchivoDirecto = async (file, texto = "") => {
    if (!file || !tipoChat) return;
    const userDisplayName = user?.nickname || user?.name;
    if (!userDisplayName) {
      showAlert("No se puede enviar sin nickname o nombre.", "warning");
      return;
    }
    const archivoSubido = await subirArchivo(file);
    if (!archivoSubido) return;

    const menciones = detectarMenciones(texto);
    const menciona = menciones.length > 0 ? menciones[0] : null;
    const enlaceCompartido = detectarEnlacesApp(texto);
    const replyInfo = respondiendoMensaje
      ? {
          reply_to_id: respondiendoMensaje.id || null,
          reply_to_user: respondiendoMensaje.usuario || null,
          reply_to_text: respondiendoMensaje.texto || null,
        }
      : {};

    const bodyData = {
      mensaje: texto || file.name || "Archivo",
      tipo_mensaje: "archivo",
      archivo_id: archivoSubido.id,
      menciona,
      enlace_compartido: enlaceCompartido,
      ...replyInfo,
    };

    setRespondiendoMensaje(null);

    try {
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
            return [...prev, respuesta.mensaje].sort((a, b) => new Date(a.fecha || 0) - new Date(b.fecha || 0));
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
              [chatActual]: [...mensajesExistentes, respuesta.mensaje].sort((a, b) => new Date(a.fecha || 0) - new Date(b.fecha || 0)),
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
              [chatActual]: [...mensajesExistentes, respuesta.mensaje].sort((a, b) => new Date(a.fecha || 0) - new Date(b.fecha || 0)),
            };
          });
        }
      }
    } catch (e) {
      showAlert(e?.message || "No se pudo enviar la nota de voz.", "error");
    }
  };

  // ============================
  // ➤ Enviar mensaje
  // ============================
  const enviarMensaje = async () => {
    if (isRecording) {
      detenerGrabacionVoz(true);
      return;
    }
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

  const obtenerGrupoPerfilId = () => perfilData?.id ?? chatActual;

  const recargarListaGrupos = async () => {
    const data = await authFetch("/api/chat/grupos");
    const lista = Array.isArray(data) ? data : [];
    setGrupos(lista);
    return lista;
  };

  const aplicarDatosPerfilGrupo = (perfil, grupoId) => {
    setPerfilData(perfil || null);
    setPerfilGrupoMiembros(perfil?.miembros || []);
    setPerfilGrupoAdmins(perfil?.administradores || []);
    setPerfilGrupoRestricciones(perfil?.restricciones || {});
    setNuevoNombreGrupo(perfil?.nombre || "");
    setNuevaDescripcion(perfil?.descripcion || "");
    setEditandoNombreGrupo(false);
    setEditandoDescripcion(false);

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
  };

  const cargarDatosPerfilGrupo = async (grupoId) => {
    const perfil = await authFetch(`${SERVER_URL}/api/chat/grupos/${grupoId}/perfil`);
    aplicarDatosPerfilGrupo(perfil, grupoId);
    const compartidos = await authFetch(`${SERVER_URL}/api/chat/grupos/${grupoId}/compartidos`);
    setPerfilCompartidos(Array.isArray(compartidos) ? compartidos : []);
    return perfil;
  };

  const abrirPerfilGrupo = async (grupoId, tabInicial = "acerca") => {
    if (!grupoId) return;
    setPerfilTipo("grupo");
    setPerfilAbierto(true);
    setPerfilTab(tabInicial);
    setPerfilData(null);
    setPerfilCompartidos([]);
    setPerfilGrupoMiembros([]);
    setPerfilGrupoAdmins([]);
    setPerfilGrupoRestricciones({});
    setMenuMiembroAbierto(null);
    setSubmenuRestriccionAbierto(null);
    setPerfilError(null);
    setBusquedaMiembros("");
    setFiltroMiembros("todos");
    setGestionandoAdminsGrupo(false);
    setPerfilCargando(true);

    try {
      await cargarDatosPerfilGrupo(grupoId);
    } catch (err) {
      setPerfilError(err?.message || "Error cargando información del grupo");
    } finally {
      setPerfilCargando(false);
    }
  };

  const guardarGrupoPerfil = async (grupoId, payload, mensaje = "Grupo actualizado") => {
    if (!grupoId) return false;
    setGuardandoGrupoPerfil(true);
    try {
      await authFetch(`${SERVER_URL}/api/chat/grupos/${grupoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await recargarListaGrupos();
      await cargarDatosPerfilGrupo(grupoId);
      showAlert(mensaje, "success");
      return true;
    } catch (err) {
      showAlert(err?.message || "Error actualizando el grupo", "error");
      return false;
    } finally {
      setGuardandoGrupoPerfil(false);
    }
  };

  const subirFotoGrupo = async (archivo) => {
    if (!archivo) return;
    if (!archivo.type?.startsWith("image/")) {
      showAlert("Selecciona una imagen válida", "warning");
      return;
    }
    const grupoId = obtenerGrupoPerfilId();
    if (!grupoId) return;

    setSubiendoFotoGrupo(true);
    try {
      const formData = new FormData();
      formData.append("foto", archivo);
      await authFetch(`${SERVER_URL}/api/chat/grupos/${grupoId}/foto`, {
        method: "POST",
        body: formData,
      });
      await recargarListaGrupos();
      await cargarDatosPerfilGrupo(grupoId);
      showAlert("Foto del grupo actualizada", "success");
    } catch (err) {
      showAlert(err?.message || "Error subiendo la foto del grupo", "error");
    } finally {
      setSubiendoFotoGrupo(false);
      if (grupoFotoInputRef.current) grupoFotoInputRef.current.value = "";
    }
  };

  const quitarFotoGrupo = async () => {
    const grupoId = obtenerGrupoPerfilId();
    if (!grupoId || !perfilData?.foto) return;
    if (await showConfirm("Quitar foto", "¿Quitar la foto de perfil del grupo?") !== true) return;

    setSubiendoFotoGrupo(true);
    try {
      await authFetch(`${SERVER_URL}/api/chat/grupos/${grupoId}/foto`, { method: "DELETE" });
      await recargarListaGrupos();
      await cargarDatosPerfilGrupo(grupoId);
      showAlert("Foto del grupo eliminada", "success");
    } catch (err) {
      showAlert(err?.message || "Error quitando la foto del grupo", "error");
    } finally {
      setSubiendoFotoGrupo(false);
    }
  };

  const toggleAdminGrupoMiembro = async (nickname, hacerAdmin) => {
    const grupoId = obtenerGrupoPerfilId();
    if (!grupoId || !nickname) return;
    try {
      await authFetch(`${SERVER_URL}/api/chat/grupos/${grupoId}/miembros/${nickname}/admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ es_admin: hacerAdmin }),
      });
      await cargarDatosPerfilGrupo(grupoId);
      showAlert(hacerAdmin ? "Administrador agregado" : "Administrador removido", "success");
    } catch (err) {
      showAlert(err?.message || "Error gestionando administrador", "error");
    }
  };

  const eliminarGrupo = async () => {
    const grupoId = obtenerGrupoPerfilId();
    if (!grupoId) return;
    if (!perfilData?.es_creador && !esAdmin) {
      showAlert("Solo el creador del grupo puede eliminarlo", "warning");
      return;
    }

    const confirmado = await showConfirm(
      "Eliminar grupo",
      `¿Eliminar permanentemente el grupo "${perfilData?.nombre || "este grupo"}"? Esta acción no se puede deshacer.`,
    );
    if (!confirmado) return;

    try {
      await authFetch(`${SERVER_URL}/api/chat/grupos/${grupoId}`, { method: "DELETE" });
      showAlert("Grupo eliminado", "success");
      cerrarPerfilUsuario();
      await recargarListaGrupos();
      if (tipoChat === "grupal" && String(chatActual) === String(grupoId)) {
        setTipoChat(null);
        setChatActual(null);
        setTabPrincipal("grupos");
      }
    } catch (err) {
      showAlert(err?.message || "Error eliminando el grupo", "error");
    }
  };

  const abrirModalAgregarMiembros = (grupoId) => {
    if (!grupoId) return;
    setGrupoAgregarMiembros(grupoId);
    setMostrarAgregarMiembros(true);
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
    marcarCallActivo(false);
    setCallExpanded(false);
    setCallMainView("remote");
    setCallMainRemoteId(null);
    setCallInvitePickerOpen(false);
    setCallInviteSelection({});
    setCallIncoming(null);
    setCallMuted(false);
    setCallVideoOff(false);
    callFacingModeRef.current = "user";
    setCallFacingMode("user");
    setSwitchingCamera(false);
    setSharingScreen(false);
    setCallOverlayMinimized(false);
    setPendingCallRestore(null);
    clearCallSession();
    callRoomRef.current = null;
    callTransportRef.current = null;
    pendingInviteTransportRef.current = null;
  };

  const sincronizarTracksLocales = (pc) => {
    const local = localStreamRef.current;
    if (!local || !pc) return;
    const senders = pc.getSenders();
    local.getTracks().forEach((track) => {
      const hasSender = senders.some((sender) => sender.track?.kind === track.kind);
      if (!hasSender) pc.addTrack(track, local);
    });
  };

  const crearPeerConnection = (socketId, nickname) => {
    if (peerConnectionsRef.current[socketId]?.pc) {
      const existingPc = peerConnectionsRef.current[socketId].pc;
      sincronizarTracksLocales(existingPc);
      return existingPc;
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
      const remoteStream = remoteStreamsRef.current[socketId];
      const addTrackIfNew = (track) => {
        if (!track || remoteStream.getTracks().some((existing) => existing.id === track.id)) return;
        console.log('[ONTRACK] Agregando track:', track.kind, 'enabled:', track.enabled);
        remoteStream.addTrack(track);
      };
      if (event.streams?.length) {
        event.streams.forEach((stream) => {
          stream.getTracks().forEach(addTrackIfNew);
        });
      } else {
        addTrackIfNew(event.track);
      }
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
          facingMode: callFacingModeRef.current || callFacingMode,
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

      callRoomRef.current = room;
      marcarCallActivo(true);
      setCallMainView("remote");
      setCallMainRemoteId(null);
      placePipBottomRight();
      guardarSesionLlamada();

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
      
      callRoomRef.current = room;
      marcarCallActivo(true);
      setCallMainView("remote");
      setCallMainRemoteId(null);
      placePipBottomRight();
      guardarSesionLlamada();

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
    setTimeout(() => refrescarHistorialRef.current?.(false), 800);
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

    const stream = localStreamRef.current;
    const previousVideo = stream?.getVideoTracks?.()[0] || null;

    await Promise.all(
      Object.values(peerConnectionsRef.current).map(async ({ pc }) => {
        if (!pc) return;
        const videoSender = pc.getSenders().find((sender) => sender.track?.kind === "video");
        if (videoSender) {
          await videoSender.replaceTrack(videoTrack);
          return;
        }
        const targetStream = stream || streamContainer;
        if (targetStream) pc.addTrack(videoTrack, targetStream);
      }),
    );

    if (stream) {
      if (previousVideo && previousVideo !== videoTrack) {
        stream.removeTrack(previousVideo);
        if (stopPreviousTrack) {
          try { previousVideo.stop(); } catch { /* noop */ }
        }
      }
      if (!stream.getVideoTracks().includes(videoTrack)) {
        stream.addTrack(videoTrack);
      }
    } else {
      localStreamRef.current = streamContainer;
    }

    setLocalStream(localStreamRef.current);
    const node = localVideoRef.current;
    if (node) {
      node.srcObject = localStreamRef.current;
      node.play().catch(() => {});
    }
  };

  const isMobileCallDevice = () => {
    const ua = String(navigator?.userAgent || "").toLowerCase();
    return /android|iphone|ipad|ipod|mobile/.test(ua)
      || Boolean(window.matchMedia?.("(pointer: coarse)")?.matches);
  };

  const liberarTrackVideoLocal = () => {
    const stream = localStreamRef.current;
    const currentVideo = stream?.getVideoTracks?.()[0];
    if (!currentVideo || !stream) return;
    stream.removeTrack(currentVideo);
    try { currentVideo.stop(); } catch { /* noop */ }
  };

  const getCameraStreamForFacingMode = async (facingMode, releaseCurrent = false) => {
    if (releaseCurrent) liberarTrackVideoLocal();

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

    const nextFacingMode = (callFacingModeRef.current || callFacingMode) === "user" ? "environment" : "user";
    const mobile = isMobileCallDevice();
    setSwitchingCamera(true);
    try {
      if (!mobile) {
        try {
          const currentVideo = localStreamRef.current?.getVideoTracks?.()[0];
          const supportedFacing = currentVideo?.getCapabilities?.()?.facingMode;
          if (
            currentVideo?.applyConstraints
            && Array.isArray(supportedFacing)
            && supportedFacing.includes(nextFacingMode)
          ) {
            await currentVideo.applyConstraints({ facingMode: nextFacingMode });
            const switched = currentVideo.getSettings?.()?.facingMode === nextFacingMode;
            if (switched) {
              callFacingModeRef.current = nextFacingMode;
              setCallFacingMode(nextFacingMode);
              setCallVideoOff(!currentVideo.enabled);
              return;
            }
          }
        } catch {
          // fallback con nuevo stream abajo
        }
      }

      liberarTrackVideoLocal();

      let camStream;
      try {
        camStream = await getCameraStreamForFacingMode(nextFacingMode, false);
      } catch (firstErr) {
        const firstName = String(firstErr?.name || "");
        if (firstName === "NotReadableError" || firstName === "AbortError" || firstName === "TrackStartError") {
          await new Promise((resolve) => setTimeout(resolve, 250));
          camStream = await getCameraStreamForFacingMode(nextFacingMode, false);
        } else {
          throw firstErr;
        }
      }

      const newVideo = camStream.getVideoTracks()[0];
      if (!newVideo) {
        throw new Error("No se pudo obtener video de la cámara seleccionada.");
      }
      if (callVideoOff) newVideo.enabled = false;

      await replaceLocalVideoTrack(newVideo, camStream, true);
      callFacingModeRef.current = nextFacingMode;
      setCallFacingMode(nextFacingMode);
      setCallVideoOff(!newVideo.enabled);
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
          facingMode: callFacingModeRef.current || callFacingMode,
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
  const reunionActivaEnChat = obtenerReunionesChatActual().find((r) => r.estado === "activa" && r.esVideollamada);
  const callInviteCandidates = getCallCandidates();

  const usuarioPickerItems = useMemo(() => (
    (Array.isArray(usuariosCOPMEC) ? usuariosCOPMEC : [])
      .map((u) => ({
        id: u.id,
        nickname: u.nickname || u.name,
        name: u.name && u.name !== u.nickname ? u.name : "",
        photo: u.photo,
        subtitle: [u.jobTitle, u.area].filter(Boolean).join(" · "),
      }))
      .filter((item) => item.nickname)
  ), [usuariosCOPMEC]);

  const callInvitePickerItems = useMemo(() => {
    const map = new Map(usuarioPickerItems.map((item) => [item.nickname, item]));
    return callInviteCandidates.map((nick) => map.get(nick) || { id: nick, nickname: nick, name: nick });
  }, [callInviteCandidates, usuarioPickerItems]);

  const reunionPickerItems = useMemo(() => (
    usuarioPickerItems.filter((item) => item.nickname !== (user?.nickname || user?.name))
  ), [usuarioPickerItems, user]);

  const agregarParticipantesPickerItems = useMemo(() => {
    if (!modalAgregarParticipantesReunion) return [];
    const actuales = new Set([
      modalAgregarParticipantesReunion.creador,
      ...(Array.isArray(modalAgregarParticipantesReunion.participantes)
        ? modalAgregarParticipantesReunion.participantes
        : []),
    ]);
    return usuarioPickerItems.filter((item) => item.nickname && !actuales.has(item.nickname));
  }, [modalAgregarParticipantesReunion, usuarioPickerItems]);

  const grupoAgregarPickerItems = useMemo(() => {
    if (!grupoAgregarMiembros) return [];
    const userDisplayName = user?.nickname || user?.name;
    const grupoActual = Array.isArray(grupos)
      ? grupos.find((g) => String(g.id) === String(grupoAgregarMiembros))
      : null;
    const miembros = Array.isArray(grupoActual?.miembros)
      ? grupoActual.miembros
      : (grupoActual?.miembros ? [grupoActual.miembros] : []);
    return usuarioPickerItems.filter((item) => {
      if (!item.nickname || item.nickname === userDisplayName) return false;
      if (!grupoActual) return true;
      return !miembros.includes(item.nickname);
    });
  }, [grupoAgregarMiembros, grupos, usuarioPickerItems, user]);
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

  useEffect(() => {
    if (open && callActivo) setCallOverlayMinimized(false);
  }, [open, callActivo]);

  useEffect(() => {
    const session = readCallSession();
    if (session?.room && !callActivo) setPendingCallRestore(session);
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && callActivoRef.current) solicitarPiPLlamada();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    const node = callFloatingVideoRef.current;
    if (!node || !callActivo || !localStreamRef.current) return;
    if (node.srcObject !== localStreamRef.current) node.srcObject = localStreamRef.current;
    node.play().catch(() => {});
  }, [callActivo, callOverlayMinimized, open, localStream, remoteStreams]);

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
      
      await recargarListaGrupos();
      showAlert(`${usuarioNickname} agregado al grupo`, "success");

      if (perfilAbierto && perfilTipo === "grupo" && String(obtenerGrupoPerfilId()) === String(grupoId)) {
        await cargarDatosPerfilGrupo(grupoId);
      }

      if (tipoChat === "grupal" && String(chatActual) === String(grupoId)) {
        const mensajesData = await authFetch(`/api/chat/grupos/${grupoId}/mensajes`);
        setMensajesGrupal((prev) => ({
          ...prev,
          [grupoId]: mensajesData || [],
        }));
      }
    } catch (e) {
      showAlert("Error agregando miembro: " + (e.message || "Error desconocido"), "error");
    }
  };

  // ============================
  // 🎯 Abrir chat
  // ============================
  const previewTextoSinLeer = (mensaje) => {
    if (!mensaje) return "";
    if (mensaje.tipo_mensaje === "archivo" || mensaje.archivo_url) {
      const tipo = String(mensaje.archivo_tipo || "").toLowerCase();
      if (tipo.startsWith("image/")) return "Imagen";
      if (tipo.startsWith("audio/")) return "Nota de voz";
      if (tipo.startsWith("video/")) return "Video";
      return mensaje.archivo_nombre || mensaje.mensaje || "Archivo adjunto";
    }
    return String(mensaje.mensaje || "").trim() || "Mensaje";
  };

  const formatoHoraSinLeer = (fechaIso) => {
    if (!fechaIso) return "";
    const d = new Date(fechaIso);
    if (Number.isNaN(d.getTime())) return "";
    const hoy = new Date();
    if (d.toDateString() === hoy.toDateString()) {
      return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  const claveFechaMensajeChat = (fechaIso) => {
    if (!fechaIso) return "";
    const d = new Date(fechaIso);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${mo}-${day}`;
  };

  const etiquetaFechaMensajeChat = (fechaIso) => {
    if (!fechaIso) return "";
    const d = new Date(fechaIso);
    if (Number.isNaN(d.getTime())) return "";
    const hoy = new Date();
    const ayer = new Date(hoy);
    ayer.setDate(hoy.getDate() - 1);
    if (d.toDateString() === hoy.toDateString()) return "Hoy";
    if (d.toDateString() === ayer.toDateString()) return "Ayer";
    const mismoAnio = d.getFullYear() === hoy.getFullYear();
    const etiqueta = d.toLocaleDateString(
      "es-MX",
      mismoAnio
        ? { weekday: "long", day: "numeric", month: "long" }
        : { weekday: "long", day: "numeric", month: "long", year: "numeric" },
    );
    return etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1);
  };

  const claveSinLeerGrupo = (grupo) => `${grupo.tipo}-${grupo.conversacion_id}`;

  const toggleSinLeerGrupo = (clave) => {
    setSinLeerColapsados((prev) => ({ ...prev, [clave]: !prev[clave] }));
  };

  const marcarConversacionSinLeer = async (grupo) => {
    try {
      if (grupo.tipo === "privado") {
        await authFetch(`${SERVER_URL}/api/chat/privado/${grupo.conversacion_id}/leer`, { method: "POST" });
        setChatsActivos((prev) =>
          prev.map((c) => (c.otro_usuario === grupo.conversacion_id ? { ...c, mensajes_no_leidos: 0 } : c)),
        );
      } else if (grupo.tipo === "grupal") {
        await authFetch(`${SERVER_URL}/api/chat/grupos/${grupo.conversacion_id}/leer`, { method: "POST" });
      }
      await cargarSinLeer(false);
      const data = await authFetch(`${SERVER_URL}/api/chat/activos`);
      setChatsActivos(data || []);
    } catch (_) { /* noop */ }
  };

  const marcarTodosSinLeer = async () => {
    for (const grupo of sinLeerGrupos) {
      try {
        if (grupo.tipo === "privado") {
          await authFetch(`${SERVER_URL}/api/chat/privado/${grupo.conversacion_id}/leer`, { method: "POST" });
        } else if (grupo.tipo === "grupal") {
          await authFetch(`${SERVER_URL}/api/chat/grupos/${grupo.conversacion_id}/leer`, { method: "POST" });
        }
      } catch (_) { /* noop */ }
    }
    setChatsActivos((prev) => prev.map((c) => ({ ...c, mensajes_no_leidos: 0 })));
    await cargarSinLeer(false);
    try {
      const data = await authFetch(`${SERVER_URL}/api/chat/activos`);
      setChatsActivos(data || []);
    } catch (_) { /* noop */ }
  };

  const abrirMensajeSinLeer = async (grupo, mensaje) => {
    const mensajeId = mensaje?.id;
    scrollToMensajeRef.current = mensajeId || null;
    if (grupo.tipo === "privado") {
      await abrirChat("privado", grupo.conversacion_id, { irATabChats: true });
    } else if (grupo.tipo === "grupal") {
      await abrirChat("grupal", grupo.conversacion_id, { irATabChats: true });
    }
    setTimeout(() => cargarSinLeer(false), 1200);
  };

  const formatoFechaLlamada = (valor, conHora = true) => {
    if (!valor) return "—";
    const d = new Date(valor);
    if (Number.isNaN(d.getTime())) return "—";
    if (conHora) {
      return d.toLocaleString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
  };

  const formatoDuracionLlamada = (segundos) => {
    if (segundos == null || segundos <= 0) return null;
    const m = Math.floor(segundos / 60);
    const s = segundos % 60;
    if (m >= 60) {
      const h = Math.floor(m / 60);
      const rm = m % 60;
      return `${h}h ${rm}m`;
    }
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const eliminarRegistroLlamada = async (id) => {
    const confirmado = await showConfirm(
      "¿Eliminar este registro de videollamada del historial?",
      "Eliminar registro",
    );
    if (!confirmado) return;
    try {
      await authFetch(`${SERVER_URL}/api/chat/calls/historial/${id}`, { method: "DELETE" });
      setHistorialLlamadas((prev) => prev.filter((ll) => ll.id !== id));
      showAlert("Registro eliminado", "success");
    } catch (e) {
      showAlert(e?.message || "No se pudo eliminar el registro", "error");
    }
  };

  const eliminarTodoHistorial = async () => {
    const confirmado = await showConfirm(
      "¿Eliminar todo tu historial de videollamadas? Esta acción no se puede deshacer.",
      "Limpiar historial",
    );
    if (!confirmado) return;
    try {
      await authFetch(`${SERVER_URL}/api/chat/calls/historial`, { method: "DELETE" });
      setHistorialLlamadas([]);
      showAlert("Historial limpiado", "success");
    } catch (e) {
      showAlert(e?.message || "No se pudo limpiar el historial", "error");
    }
  };

  const volverDesdePanel = () => setTabPrincipal("chats");

  const renderPanelHeaderBar = (titulo, extras = null) => (
    <div className="cp-panel-header-bar">
      <button
        type="button"
        className="cp-panel-header-back"
        onClick={volverDesdePanel}
        aria-label="Volver"
      >
        ←
      </button>
      <div className="cp-panel-header-main">
        <div className="cp-panel-header-title-row">
          <h3 className="cp-panel-header-title">{titulo}</h3>
          {extras}
        </div>
      </div>
    </div>
  );

  const renderVistaHistorial = () => (
    <div className="cp-panel-vista cp-call-history cp-call-history-main">
      {renderPanelHeaderBar(
        "Historial de llamadas",
        historialLlamadas.length > 0 ? (
          <span className="cp-panel-vista-count">{historialLlamadas.length}</span>
        ) : null,
      )}
      <div className="cp-panel-vista-header cp-panel-subheader">
        <div className="cp-sidebar-actions cp-panel-subheader-actions">
          <button
            type="button"
            className="cp-sidebar-action-btn"
            onClick={() => cargarHistorialLlamadas(true)}
            title="Actualizar"
          >
            ↻ Actualizar
          </button>
          {historialLlamadas.length > 0 ? (
            <button
              type="button"
              className="cp-sidebar-action-btn cp-sidebar-action-btn--danger"
              onClick={eliminarTodoHistorial}
            >
              Limpiar historial
            </button>
          ) : null}
        </div>
      </div>
      <div className="cp-panel-vista-scroll">
        {historialCargando ? (
          <div className="chat-empty-pro">Cargando historial...</div>
        ) : historialLlamadas.length === 0 ? (
          <div className="cp-panel-vista-empty">
            <div className="cp-call-history-empty-icon">📹</div>
            <p>Sin videollamadas registradas</p>
            <span>Tus llamadas y videollamadas aparecerán aquí</span>
          </div>
        ) : (
          historialLlamadas.map((ll) => {
            const contraparte = ll.fueIniciador
              ? (Array.isArray(ll.receptores) ? ll.receptores : []).join(", ")
              : ll.iniciador;
            const primerContacto = String(contraparte || "").split(",")[0]?.trim();
            const durStr = formatoDuracionLlamada(ll.duracionSegundos);
            const estadoLabel = {
              finalizada: "Finalizada",
              activa: "En curso",
              pendiente: "Sin respuesta",
              rechazada: "Rechazada",
              perdida: "Perdida",
            }[ll.estado] || ll.estado;
            return (
              <article
                key={ll.id}
                className={`cp-call-history-item cp-call-history-item-main estado-${ll.estado || "desconocido"}`}
              >
                <div className="cp-call-history-item-main-left">
                  {primerContacto && ll.tipo !== "grupal" ? (
                    <img
                      src={getAvatarUrl(primerContacto)}
                      alt={primerContacto}
                      className="cp-call-history-avatar"
                      onError={(e) => { e.target.src = makeInitialsAvatar(primerContacto); }}
                    />
                  ) : (
                    <span className="cp-call-history-icon" aria-hidden="true">📹</span>
                  )}
                  <div className="cp-call-history-body">
                    <div className="cp-call-history-row">
                      <span className="cp-call-history-name">
                        {ll.fueIniciador ? "Saliente" : "Entrante"}
                        {" · "}
                        {contraparte || "Desconocido"}
                      </span>
                      <span className={`cp-call-history-badge estado-${ll.estado || "desconocido"}`}>
                        {estadoLabel}
                      </span>
                    </div>
                    <div className="cp-call-history-meta">
                      <span>{ll.tipo === "grupal" ? "Videollamada grupal" : "Videollamada privada"}</span>
                      {durStr ? <><span>·</span><span>Duración {durStr}</span></> : null}
                    </div>
                    <div className="cp-call-history-dates">
                      <span><strong>Inicio:</strong> {formatoFechaLlamada(ll.iniciadaEn)}</span>
                      {ll.aceptadaEn ? (
                        <span><strong>Aceptada:</strong> {formatoFechaLlamada(ll.aceptadaEn)}</span>
                      ) : null}
                      {ll.finalizadaEn ? (
                        <span><strong>Fin:</strong> {formatoFechaLlamada(ll.finalizadaEn)}</span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="cp-call-history-item-actions">
                  {primerContacto && ll.tipo !== "grupal" ? (
                    <button
                      type="button"
                      className="cp-sidebar-action-btn"
                      onClick={() => abrirChat("privado", primerContacto)}
                    >
                      Abrir chat
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="cp-sidebar-action-btn cp-sidebar-action-btn--danger"
                    onClick={() => eliminarRegistroLlamada(ll.id)}
                    title="Eliminar registro"
                  >
                    Eliminar
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );

  const renderVistaAjustes = () => {
    const renderChipsSonido = (opciones, valorActivo, onSelect, previewOptions = {}) => (
      <div className="cp-ajustes-sound-grid" role="listbox" aria-label="Seleccionar sonido">
        {opciones.map((s) => {
          const activo = valorActivo === s.id;
          const glyphId = s.icon || s.id;
          return (
            <button
              key={s.id}
              type="button"
              role="option"
              aria-selected={activo}
              className={`cp-ajustes-sound-chip ${activo ? "active" : ""}`}
              onClick={() => {
                onSelect(s.id);
                const previewKind = s.id === "ringIncoming" || s.id === "ringOutgoing"
                  ? "message"
                  : (previewOptions.kind || "message");
                playNotificationSound(s.id, {
                  kind: previewKind,
                  volume: previewOptions.volume ?? 1,
                });
                if (previewOptions.vibrateKind) {
                  triggerAppVibration(previewOptions.vibrateKind);
                }
              }}
            >
              <span className="cp-ajustes-sound-chip-icon" aria-hidden="true">
                <SoundGlyph id={glyphId} size={15} />
              </span>
              <span className="cp-ajustes-sound-chip-label">{s.label}</span>
              {activo ? <span className="cp-ajustes-sound-chip-check" aria-hidden="true">✓</span> : null}
            </button>
          );
        })}
      </div>
    );

    const renderVibrationToggle = (enabled, onChange, id) => (
      <label className="cp-ajustes-toggle" htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={Boolean(enabled)}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="cp-ajustes-toggle-track" aria-hidden="true" />
        <span className="cp-ajustes-toggle-label">Vibracion activa</span>
      </label>
    );

    const renderIntensityChips = (valorActivo, onSelect, kind) => (
      <div className="cp-ajustes-vibration-grid" role="listbox" aria-label="Intensidad de vibracion">
        {VIBRATION_INTENSITY_OPTIONS.map((option) => {
          const activo = valorActivo === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="option"
              aria-selected={activo}
              className={`cp-ajustes-vibration-chip ${activo ? "active" : ""}`}
              onClick={() => {
                onSelect(option.id);
                triggerAppVibration(kind, { intensity: option.id, enabled: true });
              }}
            >
              <span className="cp-ajustes-vibration-chip-bars" aria-hidden="true">
                {Array.from({ length: 3 }).map((_, index) => (
                  <span
                    key={option.id + index}
                    className="cp-ajustes-vibration-bar"
                    style={{ height: `${6 + option.scale * 4 + index * 2}px` }}
                  />
                ))}
              </span>
              <span className="cp-ajustes-vibration-chip-label">{option.label}</span>
            </button>
          );
        })}
      </div>
    );

    const renderRhythmChips = (valorActivo, onSelect, kind, intensityId) => (
      <div className="cp-ajustes-vibration-grid cp-ajustes-vibration-grid-rhythm" role="listbox" aria-label="Ritmo de vibracion">
        {VIBRATION_RHYTHM_OPTIONS.map((option) => {
          const activo = valorActivo === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="option"
              aria-selected={activo}
              className={`cp-ajustes-vibration-chip ${activo ? "active" : ""}`}
              onClick={() => {
                onSelect(option.id);
                triggerAppVibration(kind, { rhythm: option.id, intensity: intensityId, enabled: true });
              }}
            >
              <VibrationRhythmGlyph pattern={option.pattern} />
              <span className="cp-ajustes-vibration-chip-label">{option.label}</span>
            </button>
          );
        })}
      </div>
    );

    const renderSlider = (valor, onChange, id) => {
      const pct = Math.round(valor * 100);
      return (
        <div className="cp-ajustes-volume-block">
          <div className="cp-ajustes-volume-label">
            <span>Volumen</span>
            <strong>{pct}%</strong>
          </div>
          <input
            id={id}
            type="range"
            className="cp-ajustes-range"
            min="0"
            max="1"
            step="0.05"
            value={valor}
            style={{ "--range-pct": `${pct}%` }}
            onChange={(e) => onChange(Number(e.target.value))}
          />
        </div>
      );
    };

    return (
      <div className="cp-panel-vista cp-ajustes-main">
        {renderPanelHeaderBar("Ajustes")}
        <div className="cp-ajustes-hero cp-panel-subheader">
          <div className="cp-ajustes-hero-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </div>
          <div className="cp-ajustes-hero-text">
            <p className="cp-ajustes-hero-sub">Notificaciones y tonos de videollamada</p>
          </div>
        </div>

        <div className="cp-panel-vista-scroll cp-ajustes-scroll">
          <div className="cp-ajustes-content">

            <section className="cp-ajustes-card">
              <header className="cp-ajustes-card-header">
                <span className="cp-ajustes-card-icon" aria-hidden="true">💬</span>
                <div>
                  <h4 className="cp-ajustes-card-title">Mensajes</h4>
                  <p className="cp-ajustes-card-desc">Alerta cuando llega un mensaje nuevo</p>
                </div>
              </header>
              {renderChipsSonido(
                NOTIFICATION_SOUNDS,
                audioSettings.msgSound,
                (id) => saveAudioSetting("msgSound", id),
                { kind: "message", volume: audioSettings.msgVolume, vibrateKind: "message" },
              )}
              <div className="cp-ajustes-subsection">
                <span className="cp-ajustes-subsection-label">Vibracion de mensajes</span>
                {renderVibrationToggle(
                  vibrationSettings.msgEnabled,
                  (value) => saveVibrationSetting("msgEnabled", value),
                  "ajustes-msg-vibration-enabled",
                )}
                {vibrationSettings.msgEnabled ? (
                  <>
                    <span className="cp-ajustes-mini-label">Intensidad</span>
                    {renderIntensityChips(
                      vibrationSettings.msgIntensity,
                      (id) => saveVibrationSetting("msgIntensity", id),
                      "message",
                    )}
                    <span className="cp-ajustes-mini-label">Ritmo</span>
                    {renderRhythmChips(
                      vibrationSettings.msgRhythm,
                      (id) => saveVibrationSetting("msgRhythm", id),
                      "message",
                      vibrationSettings.msgIntensity,
                    )}
                  </>
                ) : null}
              </div>
              {renderSlider(
                audioSettings.msgVolume,
                (v) => saveAudioSetting("msgVolume", v),
                "ajustes-msg-volume",
              )}
              <button type="button" className="cp-ajustes-preview-btn" onClick={playIncomingMessageSound}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
                Probar sonido de mensaje
              </button>
            </section>

            <section className="cp-ajustes-card">
              <header className="cp-ajustes-card-header">
                <span className="cp-ajustes-card-icon" aria-hidden="true">📹</span>
                <div>
                  <h4 className="cp-ajustes-card-title">Videollamadas</h4>
                  <p className="cp-ajustes-card-desc">Tonos al recibir o iniciar una llamada</p>
                </div>
              </header>

              <div className="cp-ajustes-subsection">
                <span className="cp-ajustes-subsection-label">Tono entrante</span>
                {renderChipsSonido(
                  CALL_SOUND_OPTIONS,
                  audioSettings.callIncomingSound,
                  (id) => saveAudioSetting("callIncomingSound", id),
                  { kind: "call", volume: audioSettings.callVolume },
                )}
              </div>

              <div className="cp-ajustes-subsection">
                <span className="cp-ajustes-subsection-label">Tono saliente</span>
                {renderChipsSonido(
                  CALL_SOUND_OPTIONS,
                  audioSettings.callOutgoingSound,
                  (id) => saveAudioSetting("callOutgoingSound", id),
                  { kind: "call", volume: audioSettings.callVolume },
                )}
              </div>

              <div className="cp-ajustes-subsection">
                <span className="cp-ajustes-subsection-label">Vibracion de llamadas</span>
                {renderVibrationToggle(
                  vibrationSettings.callEnabled,
                  (value) => saveVibrationSetting("callEnabled", value),
                  "ajustes-call-vibration-enabled",
                )}
                {vibrationSettings.callEnabled ? (
                  <>
                    <span className="cp-ajustes-mini-label">Intensidad</span>
                    {renderIntensityChips(
                      vibrationSettings.callIntensity,
                      (id) => saveVibrationSetting("callIntensity", id),
                      "call",
                    )}
                    <span className="cp-ajustes-mini-label">Ritmo</span>
                    {renderRhythmChips(
                      vibrationSettings.callRhythm,
                      (id) => saveVibrationSetting("callRhythm", id),
                      "call",
                      vibrationSettings.callIntensity,
                    )}
                  </>
                ) : null}
              </div>

              {renderSlider(
                audioSettings.callVolume,
                (v) => saveAudioSetting("callVolume", v),
                "ajustes-call-volume",
              )}

              <div className="cp-ajustes-preview-row">
                <button type="button" className="cp-ajustes-preview-btn" onClick={playIncomingCallTone}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
                  Probar entrante
                </button>
                <button type="button" className="cp-ajustes-preview-btn cp-ajustes-preview-btn-secondary" onClick={playOutgoingCallTone}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
                  Probar saliente
                </button>
              </div>
            </section>

          </div>
        </div>
      </div>
    );
  };

  const renderSidebarRail = () => (
    <nav className="cp-sidebar-rail" aria-label="Navegación del chat">
      <button
        type="button"
        className={`cp-sidebar-rail-btn ${tabPrincipal === "no-leidos" ? "active" : ""}`}
        title="Sin leer"
        aria-label="Sin leer"
        onClick={() => {
          setTabPrincipal("no-leidos");
          setTipoChat(null);
          setChatActual(null);
          setPerfilAbierto(false);
        }}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-6l-2 3H10l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
        {totalChatsNoLeidos > 0 ? (
          <span className="cp-sidebar-rail-badge">{totalChatsNoLeidos > 99 ? "99+" : totalChatsNoLeidos}</span>
        ) : null}
      </button>
      <button
        type="button"
        className={`cp-sidebar-rail-btn ${tabPrincipal === "chats" ? "active" : ""}`}
        title="Mensajes directos"
        aria-label="Mensajes directos"
        onClick={() => setTabPrincipal("chats")}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </button>
      <button
        type="button"
        className={`cp-sidebar-rail-btn ${tabPrincipal === "grupos" ? "active" : ""}`}
        title="Canales y grupos"
        aria-label="Canales y grupos"
        onClick={() => setTabPrincipal("grupos")}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      </button>
      <button
        type="button"
        className={`cp-sidebar-rail-btn ${tabPrincipal === "usuarios" ? "active" : ""}`}
        title="Players"
        aria-label="Players"
        onClick={() => {
          setTabPrincipal("usuarios");
          setTipoChat(null);
          setChatActual(null);
        }}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
      </button>
      <div className="cp-sidebar-rail-spacer" aria-hidden="true" />
      <button
        type="button"
        className={`cp-sidebar-rail-btn ${tabPrincipal === "historial" ? "active" : ""}`}
        title="Llamadas"
        aria-label="Llamadas"
        onClick={() => {
          setTabPrincipal("historial");
          setTipoChat(null);
          setChatActual(null);
          setPerfilAbierto(false);
        }}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.65 3.4 2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.8a16 16 0 0 0 7.29 7.29l1.06-1.06a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
      </button>
      <button
        type="button"
        className={`cp-sidebar-rail-btn ${tabPrincipal === "ajustes" ? "active" : ""}`}
        title="Ajustes"
        aria-label="Ajustes"
        onClick={() => {
          setTabPrincipal("ajustes");
          setTipoChat(null);
          setChatActual(null);
          setPerfilAbierto(false);
        }}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
      </button>
    </nav>
  );

  const renderVistaSinLeer = () => (
    <div className="cp-sin-leer cp-sin-leer-main">
      {renderPanelHeaderBar(
        "Sin leer",
        sinLeerGrupos.length > 0 ? (
          <span className="cp-sin-leer-total">
            {sinLeerGrupos.reduce((t, g) => t + (g.mensajes?.length || 0), 0)}
          </span>
        ) : null,
      )}
      {sinLeerGrupos.length > 0 ? (
        <div className="cp-sin-leer-header cp-panel-subheader">
          <div className="cp-sidebar-actions cp-panel-subheader-actions">
            <button type="button" className="cp-sidebar-action-btn cp-sidebar-action-btn--primary" onClick={marcarTodosSinLeer}>
              Marcar todos como leídos
            </button>
          </div>
        </div>
      ) : null}
      <div className="cp-sin-leer-scroll">
        {sinLeerCargando ? (
          <div className="chat-empty-pro">Cargando mensajes sin leer...</div>
        ) : sinLeerGrupos.length === 0 ? (
          <div className="cp-sin-leer-empty">
            <div className="cp-sin-leer-empty-icon">✓</div>
            <p>Estás al día</p>
            <span>No tienes mensajes pendientes por leer</span>
          </div>
        ) : (
          sinLeerGrupos.map((grupo) => {
            const clave = claveSinLeerGrupo(grupo);
            const colapsado = sinLeerColapsados[clave] === true;
            const cantidad = grupo.mensajes?.length || 0;
            const esPrivado = grupo.tipo === "privado";
            return (
              <section key={clave} className="cp-sin-leer-grupo">
                <div className="cp-sin-leer-grupo-header">
                  <button
                    type="button"
                    className="cp-sin-leer-grupo-toggle"
                    onClick={() => toggleSinLeerGrupo(clave)}
                    aria-expanded={!colapsado}
                  >
                    <svg className={`cp-sin-leer-chevron ${colapsado ? "collapsed" : ""}`} viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M9 6l6 6-6 6"/></svg>
                    <span className="cp-sin-leer-grupo-icon">{esPrivado ? "💬" : "👥"}</span>
                    <span className="cp-sin-leer-grupo-nombre">{getChatDisplayName(grupo.conversacion_nombre)}</span>
                    <span className="cp-sin-leer-grupo-count">{cantidad} mensaje{cantidad !== 1 ? "s" : ""}</span>
                  </button>
                  <button
                    type="button"
                    className="cp-sidebar-action-btn"
                    onClick={() => marcarConversacionSinLeer(grupo)}
                  >
                    Marcar como leído
                  </button>
                </div>
                {!colapsado && (grupo.mensajes || []).map((mensaje) => {
                  const autor = mensaje.de_nickname || mensaje.usuario_nickname || "Usuario";
                  const yo = user?.nickname || user?.name;
                  const texto = previewTextoSinLeer(mensaje);
                  return (
                    <article key={`${clave}-${mensaje.id}`} className="cp-sin-leer-mensaje">
                      <img
                        src={getAvatarUrl(autor)}
                        alt={autor}
                        className="cp-sin-leer-avatar"
                        onError={(e) => { e.target.src = makeInitialsAvatar(autor); }}
                      />
                      <div className="cp-sin-leer-mensaje-body">
                        <div className="cp-sin-leer-mensaje-meta">
                          <strong style={{ color: getColorForName(autor) }}>{autor === yo ? "Tú" : getChatDisplayName(autor)}</strong>
                          <span>{formatoHoraSinLeer(mensaje.fecha)}</span>
                        </div>
                        <p className="cp-sin-leer-mensaje-texto">{texto}</p>
                        {mensaje.reply_to_text ? (
                          <p className="cp-sin-leer-mensaje-reply">↳ {mensaje.reply_to_text}</p>
                        ) : null}
                        <button
                          type="button"
                          className="cp-sidebar-action-btn cp-sidebar-action-btn--primary"
                          onClick={() => abrirMensajeSinLeer(grupo, mensaje)}
                        >
                          Ver mensaje
                        </button>
                      </div>
                    </article>
                  );
                })}
              </section>
            );
          })
        )}
      </div>
    </div>
  );

  const abrirChat = async (tipo, destino, opts = {}) => {
    const { irATabChats = true, mensajeId = null } = opts;
    salirSeleccion();
    setTipoChat(tipo);
    setChatActual(destino);
    if (irATabChats) setTabPrincipal("chats");
    if (mensajeId) scrollToMensajeRef.current = mensajeId;
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

  const persistChatSections = (sections) => {
    try { localStorage.setItem("chatSidebarChatSections", JSON.stringify(sections)); } catch { /* noop */ }
  };

  const persistGrupoSections = (sections) => {
    try { localStorage.setItem("chatSidebarGrupoSections", JSON.stringify(sections)); } catch { /* noop */ }
  };

  const obtenerNombresSeccionesChats = () => {
    const nombres = new Set(sidebarChatSections);
    Object.values(chatGroups).forEach((n) => n && nombres.add(n));
    const ordenados = sidebarChatSections.filter((n) => nombres.has(n));
    [...nombres].forEach((n) => {
      if (!ordenados.includes(n)) ordenados.push(n);
    });
    return ordenados;
  };

  const obtenerNombresSeccionesGrupos = () => {
    const nombres = new Set(sidebarGrupoSections);
    Object.values(grupoGroups).forEach((n) => n && nombres.add(n));
    const ordenados = sidebarGrupoSections.filter((n) => nombres.has(n));
    [...nombres].forEach((n) => {
      if (!ordenados.includes(n)) ordenados.push(n);
    });
    return ordenados;
  };

  const ordenarClavesSeccion = (keys, alcance = "chat") => [...keys].sort((a, b) => {
    if (a === "__sin_grupo__") return 1;
    if (b === "__sin_grupo__") return -1;
    const order = alcance === "grupo" ? obtenerNombresSeccionesGrupos() : obtenerNombresSeccionesChats();
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return String(a).localeCompare(String(b), "es");
  });

  const calcPosicionMenu = (clientX, clientY, anchoEst = 248, altoEst = 360) => {
    const margin = 10;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let x = clientX;
    let y = clientY;
    if (x + anchoEst > vw - margin) x = Math.max(margin, vw - anchoEst - margin);
    if (y + altoEst > vh - margin) y = Math.max(margin, vh - altoEst - margin);
    if (x < margin) x = margin;
    if (y < margin) y = margin;
    return { x, y };
  };

  const cerrarMenuLateral = () => setMenuLateralContextual(null);

  const abrirMenuLateral = (event, payload) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const { x, y } = calcPosicionMenu(event?.clientX ?? 0, event?.clientY ?? 0);
    setMenuLateralContextual({ ...payload, x, y });
  };

  const marcarChatComoLeido = async (otroUsuario) => {
    setChatsActivos((prev) =>
      prev.map((c) => (c.otro_usuario === otroUsuario ? { ...c, mensajes_no_leidos: 0 } : c)),
    );
    try {
      await authFetch(`${SERVER_URL}/api/chat/privado/${otroUsuario}/leer`, { method: "POST" });
    } catch (_) { /* noop */ }
    cerrarMenuLateral();
  };

  const marcarSeccionComoLeida = async (nombreSeccion) => {
    const chatsEnSeccion = chatsActivos.filter((c) => chatGroups[c.otro_usuario] === nombreSeccion);
    setChatsActivos((prev) =>
      prev.map((c) => (chatGroups[c.otro_usuario] === nombreSeccion ? { ...c, mensajes_no_leidos: 0 } : c)),
    );
    await Promise.all(
      chatsEnSeccion.map((c) =>
        authFetch(`${SERVER_URL}/api/chat/privado/${c.otro_usuario}/leer`, { method: "POST" }).catch(() => {}),
      ),
    );
    cerrarMenuLateral();
  };
  
  const totalChatsNoLeidos = chatsActivos.reduce((t, c) => t + (c.mensajes_no_leidos || 0), 0);

  const agruparChats = (lista = chatsActivos, soloPlano = false) => {
    if (soloPlano) {
      return lista.length > 0 ? { __sin_grupo__: lista } : {};
    }
    const grouped = {};
    obtenerNombresSeccionesChats().forEach((name) => {
      grouped[name] = [];
    });
    lista.forEach((chat) => {
      const groupName = chatGroups[chat.otro_usuario];
      if (groupName) {
        if (!grouped[groupName]) grouped[groupName] = [];
        grouped[groupName].push(chat);
      }
    });
    const sinGrupo = lista.filter((chat) => !chatGroups[chat.otro_usuario]);
    if (sinGrupo.length > 0) grouped.__sin_grupo__ = sinGrupo;
    return grouped;
  };

  const agruparGrupos = () => {
    const grouped = {};
    obtenerNombresSeccionesGrupos().forEach((name) => {
      grouped[name] = [];
    });
    grupos.forEach((grupo) => {
      const groupName = grupoGroups[grupo.id];
      if (groupName) {
        if (!grouped[groupName]) grouped[groupName] = [];
        grouped[groupName].push(grupo);
      }
    });
    const sinGrupo = grupos.filter((grupo) => !grupoGroups[grupo.id]);
    if (sinGrupo.length > 0) grouped.__sin_grupo__ = sinGrupo;
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
    const nombre = String(carpetaNombre || "").trim();
    if (itemTipo === "chat") {
      setChatGroups((prev) => {
        const next = { ...prev };
        if (!nombre) delete next[itemId];
        else next[itemId] = nombre;
        localStorage.setItem("chatGroups", JSON.stringify(next));
        return next;
      });
    } else if (itemTipo === "grupo") {
      setGrupoGroups((prev) => {
        const next = { ...prev };
        if (!nombre) delete next[itemId];
        else next[itemId] = nombre;
        localStorage.setItem("grupoGroups", JSON.stringify(next));
        return next;
      });
    }
    if (nombre) {
      if (itemTipo === "chat") {
        setSidebarChatSections((prev) => {
          if (prev.includes(nombre)) return prev;
          const next = [...prev, nombre];
          persistChatSections(next);
          return next;
        });
      } else if (itemTipo === "grupo") {
        setSidebarGrupoSections((prev) => {
          if (prev.includes(nombre)) return prev;
          const next = [...prev, nombre];
          persistGrupoSections(next);
          return next;
        });
      }
    }
    cerrarMenuLateral();
  };

  const crearSeccionVacia = (alcance = "chat") => {
    setModalGrupoAccion({ tipo: "crear-seccion", alcance });
    setModalGrupoNombre("");
  };

  const eliminarSeccion = (nombreSeccion, alcance = "chat") => {
    const nombre = String(nombreSeccion || "").trim();
    if (!nombre) return;
    if (alcance === "grupo") {
      const newGrupoGroups = { ...grupoGroups };
      Object.keys(newGrupoGroups).forEach((key) => {
        if (newGrupoGroups[key] === nombre) delete newGrupoGroups[key];
      });
      const newSections = sidebarGrupoSections.filter((s) => s !== nombre);
      setGrupoGroups(newGrupoGroups);
      setSidebarGrupoSections(newSections);
      localStorage.setItem("grupoGroups", JSON.stringify(newGrupoGroups));
      persistGrupoSections(newSections);
    } else {
      const newChatGroups = { ...chatGroups };
      Object.keys(newChatGroups).forEach((key) => {
        if (newChatGroups[key] === nombre) delete newChatGroups[key];
      });
      const newSections = sidebarChatSections.filter((s) => s !== nombre);
      setChatGroups(newChatGroups);
      setSidebarChatSections(newSections);
      localStorage.setItem("chatGroups", JSON.stringify(newChatGroups));
      persistChatSections(newSections);
    }
    cerrarMenuLateral();
  };
  
  const crearYAsignarCarpeta = (itemId, itemTipo) => {
    setModalGrupoAccion({ tipo: 'crear', itemId, itemTipo });
    setModalGrupoNombre('');
  };
  
  const renombrarCarpeta = (carpetaNombreAntiguo, alcance = "chat") => {
    setModalGrupoAccion({ tipo: "renombrar", carpetaNombreAntiguo, alcance });
    setModalGrupoNombre(carpetaNombreAntiguo);
  };
  
  const confirmarAccionCarpeta = () => {
    if (!modalGrupoNombre.trim()) {
      showAlert('Por favor ingresa un nombre para la carpeta', 'warning');
      return;
    }
    
    if (modalGrupoAccion.tipo === "crear-seccion") {
      const nombre = modalGrupoNombre.trim();
      const alcance = modalGrupoAccion.alcance || "chat";
      if (alcance === "grupo") {
        setSidebarGrupoSections((prev) => {
          if (prev.includes(nombre)) return prev;
          const next = [...prev, nombre];
          persistGrupoSections(next);
          return next;
        });
      } else {
        setSidebarChatSections((prev) => {
          if (prev.includes(nombre)) return prev;
          const next = [...prev, nombre];
          persistChatSections(next);
          return next;
        });
      }
    } else if (modalGrupoAccion.tipo === "crear") {
      asignarACarpeta(modalGrupoAccion.itemId, modalGrupoAccion.itemTipo, modalGrupoNombre.trim());
    } else if (modalGrupoAccion.tipo === "renombrar") {
      const nombreAntiguo = modalGrupoAccion.carpetaNombreAntiguo;
      const nombreNuevo = modalGrupoNombre.trim();
      const alcance = modalGrupoAccion.alcance || "chat";

      if (alcance === "grupo") {
        const newGrupoGroups = { ...grupoGroups };
        Object.keys(newGrupoGroups).forEach((key) => {
          if (newGrupoGroups[key] === nombreAntiguo) {
            newGrupoGroups[key] = nombreNuevo;
          }
        });
        setGrupoGroups(newGrupoGroups);
        localStorage.setItem("grupoGroups", JSON.stringify(newGrupoGroups));
        setSidebarGrupoSections((prev) => {
          const next = prev.map((s) => (s === nombreAntiguo ? nombreNuevo : s));
          persistGrupoSections(next);
          return next;
        });
      } else {
        const newChatGroups = { ...chatGroups };
        Object.keys(newChatGroups).forEach((key) => {
          if (newChatGroups[key] === nombreAntiguo) {
            newChatGroups[key] = nombreNuevo;
          }
        });
        setChatGroups(newChatGroups);
        localStorage.setItem("chatGroups", JSON.stringify(newChatGroups));
        setSidebarChatSections((prev) => {
          const next = prev.map((s) => (s === nombreAntiguo ? nombreNuevo : s));
          persistChatSections(next);
          return next;
        });
      }
    }

    setModalGrupoAccion(null);
    setModalGrupoNombre("");
  };

  // Cargar secciones desde localStorage al inicio
  React.useEffect(() => {
    const savedChatGroups = localStorage.getItem("chatGroups");
    const savedGrupoGroups = localStorage.getItem("grupoGroups");
    let parsedChatGroups = {};
    let parsedGrupoGroups = {};
    if (savedChatGroups) {
      try {
        parsedChatGroups = JSON.parse(savedChatGroups);
        setChatGroups(parsedChatGroups);
      } catch (_e) { /* noop */ }
    }
    if (savedGrupoGroups) {
      try {
        parsedGrupoGroups = JSON.parse(savedGrupoGroups);
        setGrupoGroups(parsedGrupoGroups);
      } catch (_e) { /* noop */ }
    }

    const savedChatSections = localStorage.getItem("chatSidebarChatSections");
    const savedGrupoSections = localStorage.getItem("chatSidebarGrupoSections");
    if (savedChatSections && savedGrupoSections) {
      try {
        setSidebarChatSections(JSON.parse(savedChatSections));
        setSidebarGrupoSections(JSON.parse(savedGrupoSections));
      } catch (_e) { /* noop */ }
      return;
    }

    // Migrar lista unificada antigua a listas separadas
    const legacySections = JSON.parse(localStorage.getItem("chatSidebarSections") || "[]");
    const chatNames = new Set(Object.values(parsedChatGroups).filter(Boolean));
    const grupoNames = new Set(Object.values(parsedGrupoGroups).filter(Boolean));
    const chatSections = [];
    const grupoSections = [];
    const seenChat = new Set();
    const seenGrupo = new Set();

    legacySections.forEach((name) => {
      if (chatNames.has(name) && !seenChat.has(name)) {
        chatSections.push(name);
        seenChat.add(name);
      }
      if (grupoNames.has(name) && !seenGrupo.has(name)) {
        grupoSections.push(name);
        seenGrupo.add(name);
      }
    });
    chatNames.forEach((n) => {
      if (!seenChat.has(n)) {
        chatSections.push(n);
        seenChat.add(n);
      }
    });
    grupoNames.forEach((n) => {
      if (!seenGrupo.has(n)) {
        grupoSections.push(n);
        seenGrupo.add(n);
      }
    });
    legacySections.forEach((name) => {
      if (!seenChat.has(name) && !chatNames.has(name) && !grupoNames.has(name)) {
        chatSections.push(name);
        seenChat.add(name);
      }
    });

    setSidebarChatSections(chatSections);
    setSidebarGrupoSections(grupoSections);
    persistChatSections(chatSections);
    persistGrupoSections(grupoSections);
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

  const vistaPanelPrincipal = tabPrincipal === "no-leidos" || tabPrincipal === "historial" || tabPrincipal === "ajustes";

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
        <div className={`chat-pro-ventana ${(tipoChat || vistaPanelPrincipal) && window.innerWidth <= 980 ? 'mobile-chat-open' : ''}`}>
          {/* Botón volver en móvil — solo al abrir un chat */}
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
            {((!tipoChat && !vistaPanelPrincipal) || window.innerWidth > 767) && (
              <div className={`chat-sidebar ${sidebarNavVisible ? "rail-visible" : "rail-hidden"}`}>
                {/* HEADER DEL SIDEBAR */}
                <div className="chat-sidebar-header ui-surface-dark">
                  <h2 className="chat-sidebar-title">Mensajes</h2>
                  <div className="chat-sidebar-header-actions">
                    <button
                      type="button"
                      className="chat-sidebar-nav-toggle"
                      onClick={toggleSidebarNav}
                      title={sidebarNavVisible ? "Ocultar navegación" : "Mostrar navegación"}
                    >
                      {sidebarNavVisible ? (
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                      ) : (
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                      )}
                    </button>
                    <button
                      className="chat-close-btn"
                      onClick={closeChatPanel}
                      title="Cerrar chat"
                    >
                      ✕
                    </button>
                  </div>
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
                
                <div className="chat-sidebar-body">
                  {sidebarNavVisible ? renderSidebarRail() : null}
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
                        const userNickname = user?.nickname || user?.name || "";
                        const esCreadorReunion = userNickname && reunion.creador === userNickname;
                        const esInvitadoReunion = userNickname
                          && !esCreadorReunion
                          && (reunion.participantes || []).includes(userNickname);
                        
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
                            {reunion.estado === "activa" && reunion.esVideollamada ? (
                              <button
                                className="reunion-item-btn reunion-item-btn-join"
                                onClick={() => entrarReunionVideollamada(reunion)}
                                title="Entrar a la reunión"
                              >
                                ▶
                              </button>
                            ) : esProxima && esCreadorReunion ? (
                              <button
                                className="reunion-item-btn"
                                onClick={() => abrirModalReunion(reunion)}
                                title="Editar reunión"
                              >
                                ✏️
                              </button>
                            ) : esProxima && esInvitadoReunion ? (
                              <button
                                className="reunion-item-btn reunion-item-btn-solicitar"
                                onClick={() => abrirSolicitudCambioReunion(reunion, "duracion_extendida")}
                                title="Solicitar cambio de horario"
                              >
                                ⏱
                              </button>
                            ) : null}
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
                        {getChatDisplayName(displayName)}
                      </span>
                    </div>
                  );
                })}
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
                      <div className="cp-sidebar-actions">
                        <button type="button" className="cp-sidebar-action-btn" onClick={() => crearSeccionVacia("chat")}>
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                          Sección
                        </button>
                      </div>
                      {(() => {
                        const chatsPorGrupo = agruparChats();
                        const gruposOrdenados = ordenarClavesSeccion(Object.keys(chatsPorGrupo), "chat");
                        
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
                                  onContextMenu={(e) => abrirMenuLateral(e, {
                                    tipo: "chat",
                                    itemId: chat.otro_usuario,
                                    nombre: chat.otro_usuario,
                                    seccionActual: chatGroups[chat.otro_usuario] || null,
                                    noLeidos: chat.mensajes_no_leidos || 0,
                                  })}
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
                                        {getChatDisplayName(chat.otro_usuario)}
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
                                          <span className="chat-mensaje-prefijo">{getChatDisplayName(chat.otro_usuario)}:</span>
                                        )}
                                        <span className="chat-mensaje-texto">{chat.ultimo_mensaje}</span>
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              );
                            });
                          }
                          
                          // Para grupos con nombre, mostrar header desplegable
                          return (
                            <div key={groupName} className="chat-group-section cp-section">
                              <div
                                className={`cp-section-header ${isCollapsed ? "collapsed" : ""} ${tieneNoLeidos && isCollapsed ? "has-unread" : ""}`}
                                onContextMenu={(e) => abrirMenuLateral(e, { tipo: "seccion", nombre: groupName, alcance: "chat" })}
                              >
                                <button type="button" className="cp-section-toggle" onClick={() => toggleChatGroupCollapse(groupName)} aria-expanded={!isCollapsed}>
                                  <svg className="cp-section-chevron" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M9 6l6 6-6 6"/></svg>
                                </button>
                                <button type="button" className={`cp-section-title ${tieneNoLeidos && isCollapsed ? "unread-group" : ""}`} onClick={() => toggleChatGroupCollapse(groupName)}>
                                  {groupName}
                                </button>
                                <span className="cp-section-count">{chatsEnGrupo.length}</span>
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
                                    onContextMenu={(e) => abrirMenuLateral(e, {
                                      tipo: "chat",
                                      itemId: chat.otro_usuario,
                                      nombre: chat.otro_usuario,
                                      seccionActual: chatGroups[chat.otro_usuario] || null,
                                      noLeidos: chat.mensajes_no_leidos || 0,
                                    })}
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
                                          {getChatDisplayName(chat.otro_usuario)}
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
                                            <span className="chat-mensaje-prefijo">{getChatDisplayName(chat.otro_usuario)}:</span>
                                          )}
                                          <span className="chat-mensaje-texto">{chat.ultimo_mensaje}</span>
                                        </div>
                                      ) : null}
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
                        <div className="cp-sidebar-actions">
                          <button
                            type="button"
                            className="cp-sidebar-action-btn cp-sidebar-action-btn--primary"
                            onClick={() => setMostrarCrearGrupo(true)}
                          >
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            Nuevo grupo
                          </button>
                          <button type="button" className="cp-sidebar-action-btn" onClick={() => crearSeccionVacia("grupo")}>
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            Sección
                          </button>
                        </div>
                      )}
                      {/* Grupos agrupados */}
                      {(() => {
                        const agrupados = agruparGrupos(grupos);
                        const gruposOrdenados = ordenarClavesSeccion(Object.keys(agrupados), "grupo");
                        
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
                                  onContextMenu={(e) => abrirMenuLateral(e, {
                                    tipo: "grupo",
                                    itemId: g.id,
                                    nombre: g.nombre,
                                    seccionActual: grupoGroups[g.id] || null,
                                    esMiembro,
                                  })}
                                >
                                  {renderGrupoAvatar(g, {
                                    onClick: () => {
                                      if (!esMiembro) return;
                                      abrirChat("grupal", g.id);
                                    },
                                  })}
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
                                </div>
                              );
                            });
                          }
                          
                          return (
                            <div key={nombreGrupo} className="chat-group-section cp-section">
                              <div
                                className={`cp-section-header ${estaColapsado ? "collapsed" : ""} ${tieneNoLeidos ? "has-unread" : ""}`}
                                onContextMenu={(e) => abrirMenuLateral(e, { tipo: "seccion", nombre: nombreGrupo, alcance: "grupo" })}
                              >
                                <button type="button" className="cp-section-toggle" onClick={() => toggleGrupoGroupCollapse(nombreGrupo)} aria-expanded={!estaColapsado}>
                                  <svg className="cp-section-chevron" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M9 6l6 6-6 6"/></svg>
                                </button>
                                <button type="button" className={`cp-section-title ${tieneNoLeidos && estaColapsado ? "unread-group" : ""}`} onClick={() => toggleGrupoGroupCollapse(nombreGrupo)}>
                                  {nombreGrupo}
                                </button>
                                <span className="cp-section-count">{gruposEnGrupo.length}</span>
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
                                        onContextMenu={(e) => abrirMenuLateral(e, {
                                          tipo: "grupo",
                                          itemId: g.id,
                                          nombre: g.nombre,
                                          seccionActual: grupoGroups[g.id] || null,
                                          esMiembro,
                                        })}
                                      >
                                        {renderGrupoAvatar(g, {
                                          onClick: () => {
                                            if (!esMiembro) return;
                                            abrirChat("grupal", g.id);
                                          },
                                        })}
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
              </div>
            )}

            {/* PANEL PRINCIPAL - CHAT, PERFIL O VISTAS DEL MENÚ */}
            {(tipoChat || perfilAbierto || vistaPanelPrincipal) && (
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
                        <span style={{ flex: 1, textAlign: "center" }}>
                          {perfilTipo === "grupo"
                            ? (perfilData?.nombre || "Perfil del grupo")
                            : "Perfil"}
                        </span>
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
                              className={`chat-profile-tab ${perfilTab === "archivos" ? "active" : ""}`}
                              onClick={() => setPerfilTab("archivos")}
                            >
                              Compartidos
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
                            <div className="chat-group-profile-hero">
                              <div className="chat-group-profile-avatar-wrap">
                                {getGrupoFotoUrl(perfilData) ? (
                                  <img
                                    src={getGrupoFotoUrl(perfilData)}
                                    alt={perfilData?.nombre || "Grupo"}
                                    className="chat-group-profile-avatar-img"
                                    onError={(event) => {
                                      const fallback = makeGrupoAvatarFallback();
                                      if (event.currentTarget.src !== fallback) {
                                        event.currentTarget.src = fallback;
                                      }
                                    }}
                                  />
                                ) : (
                                  <div className="chat-group-profile-avatar" aria-hidden="true">👥</div>
                                )}
                                {perfilData?.es_admin && (
                                  <div className="chat-group-profile-avatar-actions">
                                    <input
                                      ref={grupoFotoInputRef}
                                      type="file"
                                      accept="image/*"
                                      className="chat-group-profile-foto-input"
                                      onChange={(e) => {
                                        const archivo = e.target.files?.[0];
                                        if (archivo) subirFotoGrupo(archivo);
                                      }}
                                    />
                                    <button
                                      type="button"
                                      className="chat-group-profile-avatar-change"
                                      disabled={subiendoFotoGrupo}
                                      onClick={() => grupoFotoInputRef.current?.click()}
                                    >
                                      {subiendoFotoGrupo ? "Subiendo…" : "Cambiar foto"}
                                    </button>
                                    {perfilData?.foto && (
                                      <button
                                        type="button"
                                        className="chat-group-profile-avatar-remove"
                                        disabled={subiendoFotoGrupo}
                                        onClick={quitarFotoGrupo}
                                      >
                                        Quitar
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="chat-group-profile-hero-body">
                                <div className="chat-group-profile-badges">
                                  <span className={`grupo-badge ${perfilData?.es_publico ? "publico" : "privado"}`}>
                                    {perfilData?.es_publico ? "Público" : "Privado"}
                                  </span>
                                  <span className="chat-group-profile-count">
                                    {perfilGrupoMiembros.length} miembro{perfilGrupoMiembros.length === 1 ? "" : "s"}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  className="chat-group-profile-members-link"
                                  onClick={() => setPerfilTab("miembros")}
                                >
                                  Ver miembros
                                </button>
                              </div>
                            </div>

                            <div style={{ marginBottom: "24px", borderBottom: "1px solid var(--chat-border)", paddingBottom: "16px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--chat-text)" }}>Nombre del grupo</div>
                                {perfilData?.es_admin && !editandoNombreGrupo && (
                                  <button
                                    type="button"
                                    className="chat-group-profile-edit-btn"
                                    onClick={() => {
                                      setNuevoNombreGrupo(perfilData?.nombre || "");
                                      setEditandoNombreGrupo(true);
                                    }}
                                  >
                                    Editar
                                  </button>
                                )}
                              </div>
                              {editandoNombreGrupo ? (
                                <div className="chat-group-profile-edit-row">
                                  <input
                                    type="text"
                                    value={nuevoNombreGrupo}
                                    onChange={(e) => setNuevoNombreGrupo(e.target.value)}
                                    placeholder="Nombre del grupo"
                                    className="chat-group-profile-input"
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    className="chat-group-profile-save-btn"
                                    disabled={guardandoGrupoPerfil || !nuevoNombreGrupo.trim()}
                                    onClick={async () => {
                                      const grupoId = obtenerGrupoPerfilId();
                                      const nombre = nuevoNombreGrupo.trim();
                                      if (!nombre || nombre === perfilData?.nombre) {
                                        setEditandoNombreGrupo(false);
                                        return;
                                      }
                                      const ok = await guardarGrupoPerfil(grupoId, { nombre }, "Nombre actualizado");
                                      if (ok) setEditandoNombreGrupo(false);
                                    }}
                                  >
                                    Guardar
                                  </button>
                                  <button
                                    type="button"
                                    className="chat-group-profile-cancel-btn"
                                    onClick={() => {
                                      setNuevoNombreGrupo(perfilData?.nombre || "");
                                      setEditandoNombreGrupo(false);
                                    }}
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              ) : (
                                <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--chat-text)" }}>
                                  {perfilData?.nombre || "Sin nombre"}
                                </div>
                              )}
                            </div>

                            <div style={{ marginBottom: "24px", borderBottom: "1px solid var(--chat-border)", paddingBottom: "16px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--chat-text)" }}>Descripción</div>
                                {perfilData?.es_admin && !editandoDescripcion && (
                                  <button
                                    type="button"
                                    className="chat-group-profile-edit-btn"
                                    onClick={() => {
                                      setNuevaDescripcion(perfilData?.descripcion || "");
                                      setEditandoDescripcion(true);
                                    }}
                                  >
                                    Editar
                                  </button>
                                )}
                              </div>
                              {editandoDescripcion ? (
                                <div className="chat-group-profile-edit-col">
                                  <textarea
                                    value={nuevaDescripcion}
                                    onChange={(e) => setNuevaDescripcion(e.target.value)}
                                    placeholder="Agregar una descripción"
                                    className="chat-group-profile-textarea"
                                    autoFocus
                                  />
                                  <div className="chat-group-profile-edit-actions">
                                    <button
                                      type="button"
                                      className="chat-group-profile-save-btn"
                                      disabled={guardandoGrupoPerfil}
                                      onClick={async () => {
                                        const grupoId = obtenerGrupoPerfilId();
                                        const descripcion = nuevaDescripcion.trim();
                                        if (descripcion === (perfilData?.descripcion || "")) {
                                          setEditandoDescripcion(false);
                                          return;
                                        }
                                        const ok = await guardarGrupoPerfil(
                                          grupoId,
                                          { descripcion: descripcion || null },
                                          "Descripción actualizada",
                                        );
                                        if (ok) setEditandoDescripcion(false);
                                      }}
                                    >
                                      Guardar
                                    </button>
                                    <button
                                      type="button"
                                      className="chat-group-profile-cancel-btn"
                                      onClick={() => {
                                        setNuevaDescripcion(perfilData?.descripcion || "");
                                        setEditandoDescripcion(false);
                                      }}
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ fontSize: "0.9rem", color: "var(--chat-muted)", lineHeight: 1.5 }}>
                                  {perfilData?.descripcion || "Sin descripción"}
                                </div>
                              )}
                            </div>

                            {/* Administrado por */}
                            <div style={{ marginBottom: "24px", borderBottom: "1px solid var(--chat-border)", paddingBottom: "16px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--chat-text)" }}>Administrado por</div>
                                  <span style={{ fontSize: "0.75rem", color: "var(--chat-muted)", cursor: "help" }} title="Los administradores pueden editar nombre, descripción y foto del grupo">ⓘ</span>
                                </div>
                                {perfilData?.es_admin && (
                                  <button
                                    type="button"
                                    className="chat-group-profile-edit-btn"
                                    onClick={() => setGestionandoAdminsGrupo((prev) => !prev)}
                                  >
                                    {gestionandoAdminsGrupo ? "Cerrar" : "Gestionar"}
                                  </button>
                                )}
                              </div>
                              <div style={{ fontSize: "0.9rem", color: "var(--azul-primario)", lineHeight: 1.5 }}>
                                {obtenerAdminsGrupoVisibles(perfilData).map((admin, idx, lista) => (
                                  <span key={admin}>
                                    {admin}
                                    {admin === perfilData?.creado_por ? " (creador)" : ""}
                                    {idx < lista.length - 1 ? ", " : ""}
                                  </span>
                                ))}
                              </div>
                              {gestionandoAdminsGrupo && perfilData?.es_admin && (
                                <div className="chat-group-profile-admins-manage">
                                  <div className="chat-group-profile-admins-hint">
                                    Los administradores delegados pueden editar las opciones del grupo.
                                  </div>
                                  {perfilGrupoMiembros
                                    .filter((nickname) => nickname !== perfilData?.creado_por)
                                    .map((nickname) => {
                                      const esAdminDelegado = perfilGrupoAdmins.includes(nickname);
                                      const usuario = usuariosCOPMEC.find((u) => (u.nickname || u.name) === nickname);
                                      return (
                                        <div key={nickname} className="chat-group-profile-admin-row">
                                          <div className="chat-group-profile-admin-info">
                                            <img
                                              src={getAvatarUrl(usuario)}
                                              alt={nickname}
                                              className="chat-avatar"
                                              style={{ width: "32px", height: "32px" }}
                                            />
                                            <span>{nickname}</span>
                                          </div>
                                          <button
                                            type="button"
                                            className={`chat-group-profile-admin-toggle ${esAdminDelegado ? "is-admin" : ""}`}
                                            onClick={() => toggleAdminGrupoMiembro(nickname, !esAdminDelegado)}
                                          >
                                            {esAdminDelegado ? "Quitar admin" : "Hacer admin"}
                                          </button>
                                        </div>
                                      );
                                    })}
                                  {perfilGrupoMiembros.filter((nickname) => nickname !== perfilData?.creado_por).length === 0 && (
                                    <div className="chat-empty-pro">No hay otros miembros para delegar</div>
                                  )}
                                </div>
                              )}
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

                            {/* Acciones del grupo */}
                            <div className="chat-group-profile-actions">
                              {(perfilData?.es_creador || esAdmin) && (
                                <button
                                  type="button"
                                  className="chat-group-profile-danger-btn chat-group-profile-danger-btn--solid"
                                  onClick={eliminarGrupo}
                                >
                                  Eliminar grupo
                                </button>
                              )}
                              <button
                                type="button"
                                className="chat-group-profile-danger-btn"
                                onClick={async () => {
                                  if (await showConfirm("Dejar el grupo", `¿Estás seguro de que quieres dejar el grupo "${perfilData?.nombre}"?`) === true) {
                                    try {
                                      const userDisplayName = user?.nickname || user?.name;
                                      const grupoId = obtenerGrupoPerfilId();
                                      await authFetch(`${SERVER_URL}/api/chat/grupos/${grupoId}/miembros/${userDisplayName}`, {
                                        method: "DELETE",
                                      });
                                      showAlert("Has dejado el grupo", "success");
                                      cerrarPerfilUsuario();
                                      await recargarListaGrupos();
                                      if (tipoChat === "grupal" && String(chatActual) === String(grupoId)) {
                                        setTipoChat(null);
                                        setChatActual(null);
                                      }
                                    } catch (_err) {
                                      showAlert("Error al dejar el grupo", "error");
                                    }
                                  }
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
                        {!perfilCargando && !perfilError && perfilTab === "archivos" && (perfilTipo === "usuario" || perfilTipo === "grupo") && (
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
                              userNickname={userNickname}
                              onEditar={abrirModalReunion}
                              onEliminar={eliminarReunion}
                              onIniciar={iniciarReunionVideollamada}
                              onSolicitarCambio={abrirSolicitudCambioReunion}
                              onAgregarParticipantes={abrirModalAgregarParticipantesReunion}
                              onCopiarEnlace={copiarEnlaceInvitacionReunion}
                              onSolicitarUnirse={solicitarUnirseReunion}
                            />
                          );
                        })()}
                        {!perfilCargando && !perfilError && perfilTab === "miembros" && perfilTipo === "grupo" && (
                          <div className="chat-profile-files" style={{ padding: "16px" }}>
                            <div className="chat-group-members-toolbar">
                              <div>
                                <strong>{perfilGrupoMiembros.length}</strong>
                                <span> miembro{perfilGrupoMiembros.length === 1 ? "" : "s"}</span>
                              </div>
                              {perfilData?.es_admin ? (
                                <button
                                  type="button"
                                  className="chat-group-add-member-btn"
                                  onClick={() => abrirModalAgregarMiembros(obtenerGrupoPerfilId())}
                                >
                                  + Agregar miembro
                                </button>
                              ) : null}
                            </div>
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
                                    <div className="chat-member-row">
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
                                          type="button"
                                          className={`chat-member-options-btn${menuAbierto ? " is-open" : ""}`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (menuAbierto) {
                                              setMenuMiembroAbierto(null);
                                              setMenuMiembroPosicion(null);
                                              setSubmenuRestriccionAbierto(null);
                                            } else {
                                              const rect = e.currentTarget.getBoundingClientRect();
                                              setMenuMiembroPosicion(calcularPosicionMenuMiembro(rect));
                                              setMenuMiembroAbierto(nickname);
                                              setSubmenuRestriccionAbierto(null);
                                            }
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
                                      const grupoId = obtenerGrupoPerfilId();
                                      const nuevoEstado = !perfilData?.es_publico;
                                      await guardarGrupoPerfil(
                                        grupoId,
                                        { es_publico: nuevoEstado },
                                        `Grupo ${nuevoEstado ? "público" : "privado"}`,
                                      );
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
                  ) : tabPrincipal === "no-leidos" ? (
                    renderVistaSinLeer()
                  ) : tabPrincipal === "historial" ? (
                    renderVistaHistorial()
                  ) : tabPrincipal === "ajustes" ? (
                    renderVistaAjustes()
                  ) : tipoChat ? (
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
                                    if (chatActual && chatActual !== userNickname && !isAxoAiChatNick(chatActual)) {
                                      abrirPerfilUsuario(chatActual);
                                    }
                                  }}
                                  title="Ver información y archivos"
                                  type="button"
                                >
                                  <strong style={{ color: getColorForName(chatActual || "Usuario") }}>
                                    {getChatDisplayName(chatActual)}
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
                              {!isAxoAiChatNick(chatActual) && (
                              <button
                                className="chat-header-icon-btn"
                                onClick={() => abrirModalReunion()}
                                title="Crear reunión"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                              </button>
                              )}
                              {!isAxoAiChatNick(chatActual) && (
                              <button
                                className="chat-header-icon-btn"
                                onClick={abrirVideollamada}
                                title="Videollamada"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                              </button>
                              )}
                              <button
                                className="chat-delete-btn"
                                onClick={limpiarChat}
                                title="Borrar conversación"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                              </button>
                            </div>
                          </>
                        ) : tipoChat === "grupal" ? (() => {
                          const grupoActivo = Array.isArray(grupos)
                            ? grupos.find((g) => String(g.id) === String(chatActual))
                            : null;
                          const puedeGestionarGrupo = Boolean(grupoActivo?.es_admin);
                          return (
                          <>
                            <div className="chat-header-left">
                              {renderGrupoAvatar(grupoActivo, { className: "grupo-icon grupo-icon-header" })}
                              <span className="chat-header-title">
                                <button
                                  type="button"
                                  className="chat-header-name-button"
                                  onClick={() => abrirPerfilGrupo(chatActual, "acerca")}
                                  title="Ver perfil del grupo"
                                >
                                  <strong style={{ color: getColorForName(chatActual || "Grupo") }}>
                                    {(Array.isArray(grupos) && grupos.find((g) => String(g.id) === String(chatActual))?.nombre) ||
                                      "Grupo"}
                                  </strong>
                                </button>
                              </span>
                            </div>
                            <div className="chat-header-actions">
                              <button
                                type="button"
                                className="chat-header-icon-btn"
                                onClick={() => abrirModalReunion()}
                                title="Crear reunión"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                              </button>
                              <button
                                type="button"
                                className="chat-header-icon-btn"
                                onClick={() => abrirPerfilGrupo(chatActual, "miembros")}
                                title="Miembros del grupo"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                              </button>
                              <button
                                className="chat-header-icon-btn"
                                onClick={abrirVideollamada}
                                title="Videollamada"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                              </button>
                              {puedeGestionarGrupo ? (
                                <button
                                  className="chat-add-member-btn"
                                  onClick={() => abrirModalAgregarMiembros(chatActual)}
                                  title="Agregar miembro"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                                </button>
                              ) : null}
                            </div>
                          </>
                          );
                        })() : null}
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
                        {reunionActivaEnChat && !callActivo ? (
                          <div className="chat-reunion-activa-banner">
                            <div>
                              <strong>Reunión activa</strong>
                              <span>{reunionActivaEnChat.titulo}</span>
                            </div>
                            <button type="button" className="chat-reunion-entrar-btn" onClick={() => entrarReunionVideollamada(reunionActivaEnChat)}>
                              Entrar a la videollamada
                            </button>
                          </div>
                        ) : null}

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

                          const fechaClaveActual = claveFechaMensajeChat(m.fecha);
                          const fechaClaveAnterior = i > 0
                            ? claveFechaMensajeChat(mensajesActuales[i - 1]?.fecha)
                            : "";
                          const mostrarSeparadorFecha = Boolean(
                            fechaClaveActual && fechaClaveActual !== fechaClaveAnterior,
                          );
                          const etiquetaSeparadorFecha = mostrarSeparadorFecha
                            ? etiquetaFechaMensajeChat(m.fecha)
                            : "";

                          return (
                            <React.Fragment key={msgKey}>
                              {mostrarSeparadorFecha ? (
                                <div
                                  className="chat-date-divider"
                                  role="separator"
                                  aria-label={etiquetaSeparadorFecha}
                                >
                                  <span>{etiquetaSeparadorFecha}</span>
                                </div>
                              ) : null}
                            <div
                              id={mensajeId ? `msg-${mensajeId}` : undefined}
                              className={`${esMio ? "msg-row msg-row-out" : "msg-row msg-row-in"}${mensajeResaltadoId === mensajeId ? " msg-resaltado-prioritario" : ""}`}
                            >
                              {!esMio && (
                                <img
                                  src={getAvatarUrl(otroNickname)}
                                  alt={getChatDisplayName(otroNickname)}
                                  className="chat-avatar msg-avatar"
                                  onError={(e) => {
                                    e.target.src = makeInitialsAvatar(getChatDisplayName(otroNickname) || '?');
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
                                    {esMio ? "Tú" : getChatDisplayName(otroNickname)}
                                  </div>
                                )}
                                {tipoChat !== "privado" && !esMio && (
                                  <div className="msg-usuario-nombre">
                                    {getChatDisplayName(otroNickname)}
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
                                          return <ChatAudioMessage src={urlAudio} />;
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
                            </React.Fragment>
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
                            <button className="audio-rec-cancel" onClick={cancelarGrabacionVoz} title="Cancelar">
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
                            onClick={isRecording ? () => detenerGrabacionVoz(true) : iniciarGrabacionVoz}
                            title={isRecording ? "Detener y enviar nota de voz" : "Nota de voz"}
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
                          <button
                            onClick={enviarMensaje}
                            className={`chat-btn-enviar ${isRecording ? "grabando" : ""}`}
                            title={isRecording ? "Detener y enviar nota de voz" : "Enviar"}
                          >
                            ➤
                          </button>
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
                  ) : null}
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

      {callActivo && !callOverlayMinimized && (
        <div className="call-overlay">
          <div ref={callWindowRef} className={`call-window ${callExpanded ? "call-window-expanded" : ""}`}>
            <div className="call-header">
              <div className="call-title">
                Videollamada {tipoChat === "grupal" ? "Grupal" : "Privada"}
              </div>
              <div className="call-header-actions">
                <button className="call-close" onClick={() => { setCallOverlayMinimized(true); solicitarPiPLlamada(); }} title="Minimizar llamada">
                  —
                </button>
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
                  <PlayerPickerList
                    key={`call-invite-${callRoomRef.current || "room"}`}
                    items={callInvitePickerItems}
                    selected={Object.entries(callInviteSelection).filter(([, on]) => on).map(([nick]) => nick)}
                    onToggle={(nickname, checked) => {
                      setCallInviteSelection((current) => ({
                        ...current,
                        [nickname]: checked,
                      }));
                    }}
                    variant="dark"
                    searchPlaceholder="Buscar player para invitar..."
                    emptyMessage="No hay players disponibles para invitar."
                    getAvatarUrl={getAvatarUrl}
                    makeInitialsAvatar={makeInitialsAvatar}
                    getColorForName={getColorForName}
                  />
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
                  title={callFacingMode === "user" ? "Cambiar a cámara trasera" : "Cambiar a cámara frontal"}
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
        const grupoPerfilId = obtenerGrupoPerfilId();
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
              <div className="chat-member-menu-list">
                {puedoGestionar && !esCreador && (
                  <>
                    <button
                      type="button"
                      className="chat-member-menu-item"
                      onClick={async (e) => {
                        e.stopPropagation();
                        cerrarMenuMiembro();
                        try {
                          await authFetch(`${SERVER_URL}/api/chat/grupos/${grupoPerfilId}/miembros/${nickname}/admin`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ es_admin: !esAdmin }),
                          });
                          abrirPerfilGrupo(grupoPerfilId, "miembros");
                          showAlert(esAdmin ? "Administrador removido" : "Administrador agregado", "success");
                        } catch (_err) {
                          showAlert("Error gestionando administrador", "error");
                        }
                      }}
                    >
                      <span>{esAdmin ? "❌ Remover admin" : "⭐ Hacer admin"}</span>
                    </button>
                    <div className="chat-member-menu-restrict-wrap">
                      <button
                        type="button"
                        className="chat-member-menu-item chat-member-menu-item--submenu-trigger"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSubmenuRestriccionAbierto(submenuAbierto ? null : nickname);
                        }}
                      >
                        <span>{tieneRestriccionIndefinida ? "✅ Permitir" : "🔒 Restringir"}</span>
                        <span className="chat-member-menu-chevron">{submenuAbierto ? "▲" : "▼"}</span>
                      </button>
                      {submenuAbierto && (
                        <div className="chat-member-menu-submenu" onClick={(e) => e.stopPropagation()}>
                          {tieneRestriccionIndefinida ? (
                            <button
                              type="button"
                              className="chat-member-menu-item"
                              onClick={async (e) => {
                                e.stopPropagation();
                                cerrarMenuMiembro();
                                try {
                                  await authFetch(`${SERVER_URL}/api/chat/grupos/${grupoPerfilId}/miembros/${nickname}/restringir`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ duracion_minutos: null, remover: true }),
                                  });
                                  abrirPerfilGrupo(grupoPerfilId, "miembros");
                                  showAlert("Restricción removida", "success");
                                } catch (_err) {
                                  showAlert("Error removiendo restricción", "error");
                                }
                              }}
                            >
                              <span>✅ Permitir mensaje</span>
                            </button>
                          ) : (
                            ["5 min", "10 min", "15 min", "30 min", "1 hora", "24 horas", "Indefinido"].map((opcion) => {
                              let minutos = null;
                              if (opcion === "5 min") minutos = 5;
                              else if (opcion === "10 min") minutos = 10;
                              else if (opcion === "15 min") minutos = 15;
                              else if (opcion === "30 min") minutos = 30;
                              else if (opcion === "1 hora") minutos = 60;
                              else if (opcion === "24 horas") minutos = 24 * 60;
                              return (
                                <button
                                  key={opcion}
                                  type="button"
                                  className="chat-member-menu-item"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    cerrarMenuMiembro();
                                    try {
                                      await authFetch(`${SERVER_URL}/api/chat/grupos/${grupoPerfilId}/miembros/${nickname}/restringir`, {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ duracion_minutos: minutos }),
                                      });
                                      abrirPerfilGrupo(grupoPerfilId, "miembros");
                                      showAlert(`Restricción aplicada: ${opcion}`, "success");
                                    } catch (_err) {
                                      showAlert("Error aplicando restricción", "error");
                                    }
                                  }}
                                >
                                  <span>{opcion}</span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="chat-member-menu-item danger"
                      onClick={async (e) => {
                        e.stopPropagation();
                        cerrarMenuMiembro();
                        if (await showConfirm("Eliminar miembro", `¿Eliminar a ${nickname} del grupo?`) === true) {
                          try {
                            await authFetch(`${SERVER_URL}/api/chat/grupos/${grupoPerfilId}/miembros/${nickname}`, { method: "DELETE" });
                            abrirPerfilGrupo(grupoPerfilId, "miembros");
                            showAlert("Miembro eliminado del grupo", "success");
                          } catch (_err) {
                            showAlert("Error eliminando miembro", "error");
                          }
                        }
                      }}
                    >
                      <span>🗑️ Eliminar</span>
                    </button>
                    <div className="chat-member-menu-divider" />
                  </>
                )}
                {perfilData?.es_creador && !esCreador && (
                  <>
                    <button
                      type="button"
                      className="chat-member-menu-item"
                      onClick={async (e) => {
                        e.stopPropagation();
                        cerrarMenuMiembro();
                        if (await showConfirm("Transferir propiedad", `¿Transferir la propiedad del grupo a ${nickname}?`) === true) {
                          try {
                            await authFetch(`${SERVER_URL}/api/chat/grupos/${grupoPerfilId}/transferir`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ nuevo_creador: nickname }),
                            });
                            abrirPerfilGrupo(grupoPerfilId, "miembros");
                            showAlert("Propiedad transferida", "success");
                          } catch (_err) {
                            showAlert("Error transfiriendo propiedad", "error");
                          }
                        }
                      }}
                    >
                      <span>👑 Transferir propiedad</span>
                    </button>
                    <div className="chat-member-menu-divider" />
                  </>
                )}
                <button
                  type="button"
                  className="chat-member-menu-item"
                  onClick={(e) => { e.stopPropagation(); cerrarMenuMiembro(); abrirPerfilUsuario(nickname); }}
                >
                  <span>👤 Ver perfil</span>
                </button>
                <button
                  type="button"
                  className="chat-member-menu-item"
                  onClick={(e) => { e.stopPropagation(); cerrarMenuMiembro(); abrirChat("privado", nickname); }}
                >
                  <span>💬 Enviar mensaje</span>
                </button>
              </div>
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
              {emojiReacciones.map((emoji) => (
                <button
                  key={`menu-${menuMensaje.msgKey}-${emoji}`}
                  className={`msg-reaccion-btn ${reacciones[menuMensaje.msgKey]?.[emoji] ? "active" : ""}`}
                  onClick={() => { toggleReaccion(menuMensaje.msgKey, emoji); cerrarMenuMensaje(); }}
                  title={emoji}
                >
                  <span className="cp-emoji-native" role="img" aria-label={emoji}>{emoji}</span>
                </button>
              ))}
              <button
                type="button"
                className="msg-reaccion-btn msg-reaccion-btn-more"
                onClick={() => { setMenuEmojiAbierto((prev) => !prev); }}
                title="Más emojis"
              >
                <CpMenuIcon type="plus" />
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
            <div className="msg-menu-list cp-msg-menu-list">
              <button type="button" className="cp-menu-row" onClick={() => { responderMensaje(menuMensaje.mensaje, menuMensaje.otroNickname); cerrarMenuMensaje(); }}>
                <span className="cp-menu-row-icon"><CpMenuIcon type="reply" /></span>
                <span className="cp-menu-row-label">Responder</span>
              </button>
              <button type="button" className="cp-menu-row" onClick={() => { copiarMensaje(menuMensaje.mensaje?.mensaje || menuMensaje.mensaje?.archivo_nombre || ""); cerrarMenuMensaje(); }}>
                <span className="cp-menu-row-icon"><CpMenuIcon type="copy" /></span>
                <span className="cp-menu-row-label">Copiar</span>
              </button>
              <button type="button" className="cp-menu-row" onClick={() => { setReenviarMensaje(menuMensaje.mensaje); setMostrarReenvio(true); cerrarMenuMensaje(); }}>
                <span className="cp-menu-row-icon"><CpMenuIcon type="forward" /></span>
                <span className="cp-menu-row-label">Reenviar</span>
              </button>
              <button type="button" className="cp-menu-row" onClick={() => { if (mensajeFijado?.id === menuMensaje.mensaje?.id) desfijarMensaje(); else fijarMensaje(menuMensaje.mensaje); cerrarMenuMensaje(); }}>
                <span className="cp-menu-row-icon cp-menu-row-icon-pin"><CpMenuIcon type="pin" /></span>
                <span className="cp-menu-row-label">{mensajeFijado?.id === menuMensaje.mensaje?.id ? "Desfijar" : "Fijar"}</span>
              </button>
              <button type="button" className="cp-menu-row" onClick={() => { toggleDestacarMensaje(menuMensaje.mensaje); cerrarMenuMensaje(); }}>
                <span className="cp-menu-row-icon"><CpMenuIcon type="star" /></span>
                <span className="cp-menu-row-label">Destacar</span>
              </button>
              <div className="cp-context-menu-divider" />
              <button type="button" className="cp-menu-row" onClick={() => { activarSeleccion(menuMensaje.mensaje); cerrarMenuMensaje(); }}>
                <span className="cp-menu-row-icon"><CpMenuIcon type="select" /></span>
                <span className="cp-menu-row-label">Seleccionar</span>
              </button>
              {menuMensaje.esMio && !editandoMensaje ? (
                <button type="button" className="cp-menu-row" onClick={() => { iniciarEdicion(menuMensaje.mensaje); cerrarMenuMensaje(); }}>
                  <span className="cp-menu-row-icon"><CpMenuIcon type="edit" /></span>
                  <span className="cp-menu-row-label">Editar</span>
                </button>
              ) : null}
              {menuMensaje.mensaje?.archivo_url ? (
                <button type="button" className="cp-menu-row" onClick={() => { abrirArchivoPrivado(menuMensaje.mensaje); cerrarMenuMensaje(); }}>
                  <span className="cp-menu-row-icon"><CpMenuIcon type="download" /></span>
                  <span className="cp-menu-row-label">Guardar como</span>
                </button>
              ) : null}
              <button type="button" className="cp-menu-row" onClick={() => { mostrarInfoMensaje(menuMensaje.mensaje); cerrarMenuMensaje(); }}>
                <span className="cp-menu-row-icon"><CpMenuIcon type="info" /></span>
                <span className="cp-menu-row-label">Info del mensaje</span>
              </button>
              <div className="cp-context-menu-divider" />
              <button type="button" className="cp-menu-row danger" onClick={() => { eliminarMensaje(menuMensaje.mensaje); cerrarMenuMensaje(); }}>
                <span className="cp-menu-row-icon"><CpMenuIcon type="trash" /></span>
                <span className="cp-menu-row-label">Eliminar</span>
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
                  <h3>
                    Agregar miembros
                    {(() => {
                      const grupo = Array.isArray(grupos)
                        ? grupos.find((g) => String(g.id) === String(grupoAgregarMiembros))
                        : null;
                      return grupo?.nombre ? ` · ${grupo.nombre}` : "";
                    })()}
                  </h3>
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
                  <PlayerPickerList
                    key={`grupo-add-${grupoAgregarMiembros}`}
                    items={grupoAgregarPickerItems}
                    mode="action"
                    onItemAction={async (item) => {
                      await agregarMiembroAGrupo(grupoAgregarMiembros, item.nickname);
                    }}
                    searchPlaceholder="Buscar player para agregar..."
                    emptyMessage="No hay usuarios disponibles para agregar"
                    getAvatarUrl={getAvatarUrl}
                    makeInitialsAvatar={makeInitialsAvatar}
                    getColorForName={getColorForName}
                  />
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

                <div className="reunion-form-group">
                  <label>Duración estimada</label>
                  <select
                    className="reunion-input"
                    value={reunionForm.duracionMinutos}
                    onChange={(e) => setReunionForm({ ...reunionForm, duracionMinutos: Number(e.target.value) })}
                  >
                    <option value={30}>30 minutos</option>
                    <option value={60}>1 hora</option>
                    <option value={90}>1 hora 30 min</option>
                    <option value={120}>2 horas</option>
                    <option value={180}>3 horas</option>
                  </select>
                </div>
              </div>

              {(verificandoConflictosReunion || reunionConflictos.length > 0) && (
                <div className={`reunion-conflictos-panel ${reunionConflictos.length ? "con-conflictos" : ""}`}>
                  {verificandoConflictosReunion ? (
                    <span>Verificando disponibilidad de participantes...</span>
                  ) : (
                    <>
                      <strong>Conflicto de horario (ventana de 1 hora)</strong>
                      <ul>
                        {reunionConflictos.map((c) => (
                          <li key={`${c.nickname}-${c.reunionId}`}>
                            <strong>{c.nickname}</strong> ya tiene &quot;{c.titulo}&quot; a las {c.hora}
                            {" "}(~{c.duracionMinutos} min). No podrá asistir si la nueva reunión termina después de esa hora.
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
              
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
              
              {(tipoChat === "grupal" || tipoChat === "privado") && (
                <div className="reunion-form-group">
                  <label>{tipoChat === "grupal" ? "Participantes (opcional)" : "Invitar tambien a (opcional)"}</label>

                  <PlayerPickerChips
                    selected={reunionForm.participantes}
                    items={reunionPickerItems}
                    onRemove={(nickname) => {
                      setReunionForm((current) => ({
                        ...current,
                        participantes: current.participantes.filter((p) => p !== nickname),
                      }));
                    }}
                    getAvatarUrl={getAvatarUrl}
                    makeInitialsAvatar={makeInitialsAvatar}
                  />

                  <PlayerPickerList
                    key={`reunion-pick-${modalReunionAbierto}`}
                    items={reunionPickerItems}
                    selected={reunionForm.participantes}
                    onToggle={(nickname, checked) => {
                      setReunionForm((current) => ({
                        ...current,
                        participantes: checked
                          ? Array.from(new Set([...current.participantes, nickname]))
                          : current.participantes.filter((p) => p !== nickname),
                      }));
                    }}
                    searchPlaceholder="Buscar player para la reunion..."
                    emptyMessage="No hay players disponibles."
                    getAvatarUrl={getAvatarUrl}
                    makeInitialsAvatar={makeInitialsAvatar}
                    getColorForName={getColorForName}
                  />
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
              {reunionEditando?.id && reunionEditando.creador === (user?.nickname || user?.name) ? (
                <button
                  type="button"
                  className="reunion-btn-enlace"
                  onClick={() => copiarEnlaceInvitacionReunion(reunionEditando)}
                >
                  🔗 Copiar enlace
                </button>
              ) : null}
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
                disabled={reunionConflictos.length > 0 || verificandoConflictosReunion}
              >
                {reunionEditando ? 'Actualizar' : 'Crear'} reunión
              </button>
            </div>
          </div>
        </div>
      )}

      {reunionSolicitudModal?.reunion && (
        <div className="chat-modal-reunion-backdrop" onClick={() => setReunionSolicitudModal(null)}>
          <div className="chat-modal-reunion reunion-solicitud-modal" onClick={(e) => e.stopPropagation()}>
            <div className="chat-modal-reunion-header">
              <h3>Solicitar cambio de horario</h3>
              <button type="button" className="modal-close-btn" onClick={() => setReunionSolicitudModal(null)}>✕</button>
            </div>
            <div className="chat-modal-reunion-body">
              <p className="reunion-solicitud-intro">
                Reunión: <strong>{reunionSolicitudModal.reunion.titulo}</strong>
                {" "}({reunionSolicitudModal.reunion.fecha} a las {reunionSolicitudModal.reunion.hora})
              </p>
              <div className="reunion-form-group">
                <label>Motivo</label>
                <select
                  className="reunion-input"
                  value={reunionSolicitudModal.motivo || "duracion_extendida"}
                  onChange={(e) => setReunionSolicitudModal((current) => ({ ...current, motivo: e.target.value }))}
                >
                  <option value="duracion_extendida">Durará más de 1 hora</option>
                  <option value="conflicto">Tengo otro compromiso en ese horario</option>
                </select>
              </div>
              {reunionSolicitudModal.motivo === "duracion_extendida" ? (
                <div className="reunion-form-group">
                  <label>Duración estimada real</label>
                  <select
                    className="reunion-input"
                    value={reunionSolicitudDuracion}
                    onChange={(e) => setReunionSolicitudDuracion(Number(e.target.value))}
                  >
                    <option value={90}>1 hora 30 min</option>
                    <option value={120}>2 horas</option>
                    <option value={150}>2 horas 30 min</option>
                    <option value={180}>3 horas</option>
                    <option value={240}>4 horas</option>
                  </select>
                </div>
              ) : null}
              <div className="reunion-form-group">
                <label>Mensaje para el creador (opcional)</label>
                <textarea
                  className="reunion-textarea"
                  rows="3"
                  value={reunionSolicitudMensaje}
                  onChange={(e) => setReunionSolicitudMensaje(e.target.value)}
                  placeholder="Explica por qué necesitas cambiar el horario..."
                />
              </div>
            </div>
            <div className="chat-modal-reunion-actions">
              <button type="button" className="reunion-btn-cancelar" onClick={() => setReunionSolicitudModal(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="reunion-btn-guardar"
                onClick={() => solicitarCambioReunion({
                  reunion: reunionSolicitudModal.reunion,
                  motivo: reunionSolicitudModal.motivo,
                  mensaje: reunionSolicitudMensaje,
                  duracionEstimadaMinutos: reunionSolicitudModal.motivo === "duracion_extendida" ? reunionSolicitudDuracion : null,
                })}
              >
                Enviar solicitud
              </button>
            </div>
          </div>
        </div>
      )}

      {modalAgregarParticipantesReunion && (
        <div className="chat-modal-reunion-backdrop" onClick={() => setModalAgregarParticipantesReunion(null)}>
          <div className="chat-modal-reunion" onClick={(e) => e.stopPropagation()}>
            <div className="chat-modal-reunion-header">
              <h3>Agregar participantes</h3>
              <button type="button" className="modal-close-btn" onClick={() => setModalAgregarParticipantesReunion(null)}>✕</button>
            </div>
            <div className="chat-modal-reunion-body">
              <p className="reunion-solicitud-intro">
                Reunión: <strong>{modalAgregarParticipantesReunion.titulo}</strong>
              </p>
              <p className="reunion-solicitud-intro">
                Se enviará el enlace de invitación por mensaje privado a cada persona agregada.
              </p>
              <div className="reunion-form-group">
                <PlayerPickerChips
                  selected={participantesNuevosReunion}
                  items={agregarParticipantesPickerItems}
                  onRemove={(nickname) => {
                    setParticipantesNuevosReunion((current) => current.filter((p) => p !== nickname));
                  }}
                  getAvatarUrl={getAvatarUrl}
                  makeInitialsAvatar={makeInitialsAvatar}
                />
                <PlayerPickerList
                  items={agregarParticipantesPickerItems}
                  selected={participantesNuevosReunion}
                  onToggle={(nickname, checked) => {
                    setParticipantesNuevosReunion((current) => (
                      checked
                        ? Array.from(new Set([...current, nickname]))
                        : current.filter((p) => p !== nickname)
                    ));
                  }}
                  searchPlaceholder="Buscar player para agregar..."
                  emptyMessage="No hay más players disponibles."
                  getAvatarUrl={getAvatarUrl}
                  makeInitialsAvatar={makeInitialsAvatar}
                  getColorForName={getColorForName}
                />
              </div>
              <button
                type="button"
                className="reunion-btn-enlace reunion-btn-enlace-block"
                onClick={() => copiarEnlaceInvitacionReunion(modalAgregarParticipantesReunion)}
              >
                🔗 Copiar enlace para invitados externos
              </button>
            </div>
            <div className="chat-modal-reunion-actions">
              <button type="button" className="reunion-btn-cancelar" onClick={() => setModalAgregarParticipantesReunion(null)}>
                Cancelar
              </button>
              <button type="button" className="reunion-btn-guardar" onClick={agregarParticipantesReunion}>
                Agregar y notificar
              </button>
            </div>
          </div>
        </div>
      )}

      {menuLateralContextual && (
        <div className="cp-menu-backdrop" onClick={cerrarMenuLateral}>
          <div
            className="cp-context-menu cp-context-menu-floating"
            style={{ left: menuLateralContextual.x, top: menuLateralContextual.y }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
            {menuLateralContextual.tipo === "seccion" && (
              <>
                <div className="cp-context-menu-label">{menuLateralContextual.nombre}</div>
                {menuLateralContextual.alcance !== "grupo" ? (
                  <button type="button" className="cp-menu-row" onClick={() => { marcarSeccionComoLeida(menuLateralContextual.nombre); }}>
                    <span className="cp-menu-row-icon"><CpMenuIcon type="check" /></span>
                    <span className="cp-menu-row-label">Marcar todo como leído</span>
                  </button>
                ) : null}
                {menuLateralContextual.alcance !== "grupo" ? <div className="cp-context-menu-divider" /> : null}
                <div className="cp-context-menu-label">Administrar sección</div>
                <button type="button" className="cp-menu-row" onClick={() => { renombrarCarpeta(menuLateralContextual.nombre, menuLateralContextual.alcance); cerrarMenuLateral(); }}>
                  <span className="cp-menu-row-icon"><CpMenuIcon type="rename" /></span>
                  <span className="cp-menu-row-label">Cambiar nombre</span>
                </button>
                <button type="button" className="cp-menu-row" onClick={() => { crearSeccionVacia(menuLateralContextual.alcance); cerrarMenuLateral(); }}>
                  <span className="cp-menu-row-icon"><CpMenuIcon type="plus" /></span>
                  <span className="cp-menu-row-label">Crear una nueva sección</span>
                </button>
                <button type="button" className="cp-menu-row" onClick={() => { setModalAdminSeccion({ nombre: menuLateralContextual.nombre, alcance: menuLateralContextual.alcance }); cerrarMenuLateral(); }}>
                  <span className="cp-menu-row-icon"><CpMenuIcon type="admin" /></span>
                  <span className="cp-menu-row-label">Administrar conversaciones</span>
                </button>
                <div className="cp-context-menu-divider" />
                <button
                  type="button"
                  className="cp-menu-row danger"
                  onClick={async () => {
                    const nombre = menuLateralContextual.nombre;
                    cerrarMenuLateral();
                    if (await showConfirm(`¿Eliminar la sección "${nombre}"? Los ${menuLateralContextual.alcance === "grupo" ? "grupos" : "chats"} no se borran.`, "Eliminar sección") === true) {
                      eliminarSeccion(nombre, menuLateralContextual.alcance);
                    }
                  }}
                >
                  <span className="cp-menu-row-icon"><CpMenuIcon type="trash" /></span>
                  <span className="cp-menu-row-label">Eliminar sección</span>
                </button>
              </>
            )}
            {menuLateralContextual.tipo === "chat" && (
              <>
                <div className="cp-context-menu-label">{menuLateralContextual.nombre}</div>
                <button type="button" className="cp-menu-row" onClick={() => { abrirChat("privado", menuLateralContextual.itemId); cerrarMenuLateral(); }}>
                  <span className="cp-menu-row-icon"><CpMenuIcon type="chat" /></span>
                  <span className="cp-menu-row-label">Abrir chat</span>
                </button>
                <button type="button" className="cp-menu-row" onClick={() => { abrirPerfilUsuario(menuLateralContextual.itemId); cerrarMenuLateral(); }}>
                  <span className="cp-menu-row-icon"><CpMenuIcon type="user" /></span>
                  <span className="cp-menu-row-label">Ver perfil</span>
                </button>
                {menuLateralContextual.noLeidos > 0 ? (
                  <button type="button" className="cp-menu-row" onClick={() => marcarChatComoLeido(menuLateralContextual.itemId)}>
                    <span className="cp-menu-row-icon"><CpMenuIcon type="check" /></span>
                    <span className="cp-menu-row-label">Marcar como leído</span>
                  </button>
                ) : null}
                <div className="cp-context-menu-divider" />
                <div className="cp-context-menu-label">Organizar</div>
                <button type="button" className="cp-menu-row" onClick={() => { crearYAsignarCarpeta(menuLateralContextual.itemId, "chat"); cerrarMenuLateral(); }}>
                  <span className="cp-menu-row-icon"><CpMenuIcon type="plus" /></span>
                  <span className="cp-menu-row-label">Crear sección</span>
                </button>
                {obtenerNombresSeccionesChats().map((seccion) => (
                  <button key={`ctx-chat-${menuLateralContextual.itemId}-${seccion}`} type="button" className="cp-menu-row" onClick={() => asignarACarpeta(menuLateralContextual.itemId, "chat", seccion)}>
                    <span className="cp-menu-row-icon"><CpMenuIcon type="folder" /></span>
                    <span className="cp-menu-row-label">Mover a {seccion}</span>
                  </button>
                ))}
                {menuLateralContextual.seccionActual ? (
                  <button type="button" className="cp-menu-row" onClick={() => asignarACarpeta(menuLateralContextual.itemId, "chat", null)}>
                    <span className="cp-menu-row-icon"><CpMenuIcon type="remove" /></span>
                    <span className="cp-menu-row-label">Quitar de sección</span>
                  </button>
                ) : null}
              </>
            )}
            {menuLateralContextual.tipo === "grupo" && (
              <>
                <div className="cp-context-menu-label">Grupo</div>
                {menuLateralContextual.esMiembro ? (
                  <button type="button" className="cp-menu-row" onClick={() => { abrirChat("grupal", menuLateralContextual.itemId); cerrarMenuLateral(); }}>
                    <span className="cp-menu-row-icon"><CpMenuIcon type="chat" /></span>
                    <span className="cp-menu-row-label">Abrir grupo</span>
                  </button>
                ) : null}
                <button type="button" className="cp-menu-row" onClick={() => { abrirPerfilGrupo(menuLateralContextual.itemId, "acerca"); cerrarMenuLateral(); }}>
                  <span className="cp-menu-row-icon"><CpMenuIcon type="users" /></span>
                  <span className="cp-menu-row-label">Perfil del grupo</span>
                </button>
                <div className="cp-context-menu-divider" />
                <div className="cp-context-menu-label">Organizar</div>
                <button type="button" className="cp-menu-row" onClick={() => { crearYAsignarCarpeta(menuLateralContextual.itemId, "grupo"); cerrarMenuLateral(); }}>
                  <span className="cp-menu-row-icon"><CpMenuIcon type="plus" /></span>
                  <span className="cp-menu-row-label">Crear sección</span>
                </button>
                {obtenerNombresSeccionesGrupos().map((seccion) => (
                  <button key={`ctx-grupo-${menuLateralContextual.itemId}-${seccion}`} type="button" className="cp-menu-row" onClick={() => asignarACarpeta(menuLateralContextual.itemId, "grupo", seccion)}>
                    <span className="cp-menu-row-icon"><CpMenuIcon type="folder" /></span>
                    <span className="cp-menu-row-label">Mover a {seccion}</span>
                  </button>
                ))}
                {menuLateralContextual.seccionActual ? (
                  <button type="button" className="cp-menu-row" onClick={() => asignarACarpeta(menuLateralContextual.itemId, "grupo", null)}>
                    <span className="cp-menu-row-icon"><CpMenuIcon type="remove" /></span>
                    <span className="cp-menu-row-label">Quitar de sección</span>
                  </button>
                ) : null}
              </>
            )}
          </div>
        </div>
      )}

      {modalAdminSeccion && (
        <div className="cp-menu-backdrop" onClick={() => setModalAdminSeccion(null)}>
          <div className="cp-admin-seccion-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Sección · {modalAdminSeccion.nombre}</h3>
            <p className="cp-admin-seccion-hint">
              {modalAdminSeccion.alcance === "grupo" ? "Grupos en esta sección" : "Chats en esta sección"}
            </p>
            <div className="cp-admin-seccion-list">
              {modalAdminSeccion.alcance !== "grupo" && chatsActivos.filter((c) => chatGroups[c.otro_usuario] === modalAdminSeccion.nombre).map((c) => (
                <div key={`admin-chat-${c.otro_usuario}`} className="cp-admin-seccion-item">
                  <span>{c.otro_usuario}</span>
                  <button type="button" onClick={() => asignarACarpeta(c.otro_usuario, "chat", null)}>Quitar</button>
                </div>
              ))}
              {modalAdminSeccion.alcance === "grupo" && grupos.filter((g) => grupoGroups[g.id] === modalAdminSeccion.nombre).map((g) => (
                <div key={`admin-grupo-${g.id}`} className="cp-admin-seccion-item">
                  <span>{g.nombre}</span>
                  <button type="button" onClick={() => asignarACarpeta(g.id, "grupo", null)}>Quitar</button>
                </div>
              ))}
            </div>
            <button type="button" className="cp-admin-seccion-close" onClick={() => setModalAdminSeccion(null)}>Cerrar</button>
          </div>
        </div>
      )}

      {modalGrupoAccion && (
        <div className="modal-carpeta-overlay" onClick={() => setModalGrupoAccion(null)}>
          <div className="modal-carpeta-content" onClick={(e) => e.stopPropagation()}>
            <h3>
              {modalGrupoAccion.tipo === "crear-seccion"
                ? (modalGrupoAccion.alcance === "grupo" ? "Nueva sección de grupos" : "Nueva sección de chats")
                : modalGrupoAccion.tipo === "crear"
                  ? (modalGrupoAccion.itemTipo === "grupo" ? "Nueva sección de grupos" : "Nueva sección de chats")
                  : (modalGrupoAccion.alcance === "grupo" ? "Renombrar sección de grupos" : "Renombrar sección de chats")}
            </h3>
            <input
              type="text"
              placeholder="Nombre de la sección"
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
                {modalGrupoAccion.tipo === "renombrar" ? "Renombrar" : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}

      {callActivo && callOverlayMinimized && (
        <button type="button" className="call-floating-widget" onClick={restaurarVistaLlamada} title="Volver a la videollamada">
          <video ref={callFloatingVideoRef} className="call-floating-widget-video" muted autoPlay playsInline />
          <span className="call-floating-widget-label">Volver a la llamada</span>
        </button>
      )}

      {pendingCallRestore && !callActivo ? (
        <button type="button" className="call-rejoin-fab" onClick={reingresarLlamadaGuardada}>
          Reingresar a videollamada
        </button>
      ) : null}

    </>
  );
}

