import { useMemo, useState } from "react";

function parseParticipantes(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseFechaHora(reunion) {
  return new Date(`${reunion?.fecha || ""}T${reunion?.hora || "00:00"}`);
}

function reunionYaPaso(reunion) {
  const estado = String(reunion?.estado || "programada").toLowerCase();
  if (estado === "cancelada" || estado === "finalizada") return true;
  const duracionMin = Number(reunion?.duracionMinutos) > 0 ? Number(reunion.duracionMinutos) : 60;
  const inicio = parseFechaHora(reunion);
  if (Number.isNaN(inicio.getTime())) return false;
  const fin = new Date(inicio.getTime() + duracionMin * 60 * 1000);
  return fin.getTime() <= Date.now();
}

function clasificarReuniones(lista) {
  const pendientes = [];
  const historial = [];
  (Array.isArray(lista) ? lista : []).forEach((reunion) => {
    if (reunionYaPaso(reunion)) historial.push(reunion);
    else pendientes.push(reunion);
  });
  const sortAsc = (a, b) => parseFechaHora(a) - parseFechaHora(b);
  const sortDesc = (a, b) => sortAsc(b, a);
  pendientes.sort(sortAsc);
  historial.sort(sortDesc);
  return { pendientes, historial };
}

function ReunionCard({
  reunion,
  userKey,
  soloLectura,
  onEditar,
  onEliminar,
  onIniciar,
  onSolicitarCambio,
  onAgregarParticipantes,
  onCopiarEnlace,
  onSolicitarUnirse,
}) {
  const fechaHora = parseFechaHora(reunion);
  const fechaLabel = Number.isNaN(fechaHora.getTime())
    ? `${reunion.fecha || ""} ${reunion.hora || ""}`.trim()
    : fechaHora.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });
  const esActiva = String(reunion.estado || "").toLowerCase() === "activa";
  const esCancelada = String(reunion.estado || "").toLowerCase() === "cancelada";
  const esFinalizada = String(reunion.estado || "").toLowerCase() === "finalizada";
  const creadorKey = String(reunion.creador || "").trim().toLowerCase();
  const esCreador = userKey && creadorKey === userKey;
  const participantes = parseParticipantes(reunion.participantes);
  const esInvitado = userKey && !esCreador && participantes.some(
    (p) => String(p || "").trim().toLowerCase() === userKey,
  );
  const esExterno = userKey && !esCreador && !esInvitado;

  return (
    <article
      key={reunion.id || `${reunion.fecha}-${reunion.hora}-${reunion.titulo}`}
      className={`reunion-perfil-card ${esActiva ? "activa" : ""} ${esCancelada || esFinalizada ? "pasada" : ""}`}
    >
      <div className="reunion-perfil-card-head">
        <strong>{reunion.titulo || "Reunion"}</strong>
        {esActiva ? <span className="chip primary">Activa</span> : null}
        {esCancelada ? <span className="chip muted">Cancelada</span> : null}
        {esFinalizada ? <span className="chip muted">Finalizada</span> : null}
      </div>
      <p className="reunion-perfil-meta">
        {fechaLabel}
        {" - "}
        {reunion.hora}
        {reunion.duracionMinutos ? ` (${reunion.duracionMinutos} min)` : ""}
      </p>
      {reunion.lugar ? <p className="reunion-perfil-meta">Lugar: {reunion.lugar}</p> : null}
      {reunion.esVideollamada ? <p className="reunion-perfil-meta">Videollamada</p> : null}
      {reunion.descripcion ? <p className="reunion-perfil-desc">{reunion.descripcion}</p> : null}
      {!soloLectura ? (
        <div className="reunion-perfil-actions">
          {reunion.esVideollamada && onIniciar && (esCreador || esInvitado) && !reunionYaPaso(reunion) ? (
            <button type="button" className="reunion-btn-guardar" onClick={() => onIniciar(reunion)}>
              {esActiva ? "Entrar" : "Iniciar videollamada"}
            </button>
          ) : null}
          {esCreador && onCopiarEnlace ? (
            <button type="button" className="reunion-btn-enlace" onClick={() => onCopiarEnlace(reunion)}>
              Copiar enlace
            </button>
          ) : null}
          {esCreador && onAgregarParticipantes ? (
            <button type="button" className="reunion-btn-cancelar" onClick={() => onAgregarParticipantes(reunion)}>
              Agregar participantes
            </button>
          ) : null}
          {esCreador && onEditar ? (
            <button type="button" className="reunion-btn-cancelar" onClick={() => onEditar(reunion)}>
              Editar
            </button>
          ) : null}
          {esCreador && onEliminar ? (
            <button type="button" className="reunion-btn-eliminar" onClick={() => onEliminar(reunion.id)}>
              Eliminar
            </button>
          ) : null}
          {esInvitado && onSolicitarCambio ? (
            <button
              type="button"
              className="reunion-btn-solicitar"
              onClick={() => onSolicitarCambio(reunion, "duracion_extendida")}
            >
              Solicitar cambio de horario
            </button>
          ) : null}
          {esExterno && onSolicitarUnirse ? (
            <button
              type="button"
              className="reunion-btn-solicitar"
              onClick={() => onSolicitarUnirse(reunion)}
            >
              Solicitar unirme
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export default function ReunionesPerfilUsuario({
  reuniones = [],
  pendientes: pendientesProp,
  historial: historialProp,
  userNickname = "",
  soloLectura = false,
  onEditar,
  onEliminar,
  onIniciar,
  onSolicitarCambio,
  onAgregarParticipantes,
  onCopiarEnlace,
  onSolicitarUnirse,
}) {
  const [seccion, setSeccion] = useState("pendientes");
  const userKey = String(userNickname || "").trim().toLowerCase();

  const { pendientes, historial } = useMemo(() => {
    if (Array.isArray(pendientesProp) || Array.isArray(historialProp)) {
      return {
        pendientes: Array.isArray(pendientesProp) ? pendientesProp : [],
        historial: Array.isArray(historialProp) ? historialProp : [],
      };
    }
    return clasificarReuniones(reuniones);
  }, [historialProp, pendientesProp, reuniones]);

  const listaVisible = seccion === "historial" ? historial : pendientes;
  const emptyLabel = seccion === "historial"
    ? "No hay reuniones en el historial"
    : "No hay reuniones pendientes";

  return (
    <div className="reuniones-perfil-wrap">
      <div className="reuniones-perfil-tabs">
        <button
          type="button"
          className={`reuniones-perfil-tab ${seccion === "pendientes" ? "active" : ""}`}
          onClick={() => setSeccion("pendientes")}
        >
          Pendientes
          {pendientes.length ? ` (${pendientes.length})` : ""}
        </button>
        <button
          type="button"
          className={`reuniones-perfil-tab ${seccion === "historial" ? "active" : ""}`}
          onClick={() => setSeccion("historial")}
        >
          Historial
          {historial.length ? ` (${historial.length})` : ""}
        </button>
      </div>

      {!listaVisible.length ? (
        <div className="chat-empty-pro reuniones-perfil-empty">
          {emptyLabel}
        </div>
      ) : (
        <div className="reuniones-perfil-list">
          {listaVisible.map((reunion) => (
            <ReunionCard
              key={reunion.id || `${reunion.fecha}-${reunion.hora}-${reunion.titulo}`}
              reunion={reunion}
              userKey={userKey}
              soloLectura={soloLectura}
              onEditar={onEditar}
              onEliminar={onEliminar}
              onIniciar={onIniciar}
              onSolicitarCambio={onSolicitarCambio}
              onAgregarParticipantes={onAgregarParticipantes}
              onCopiarEnlace={onCopiarEnlace}
              onSolicitarUnirse={onSolicitarUnirse}
            />
          ))}
        </div>
      )}
    </div>
  );
}
