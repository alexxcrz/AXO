export default function ReunionesPerfilUsuario({
  reuniones = [],
  userNickname = "",
  onEditar,
  onEliminar,
  onIniciar,
  onSolicitarCambio,
  onAgregarParticipantes,
  onCopiarEnlace,
  onSolicitarUnirse,
}) {
  const proximas = [...reuniones]
    .filter((r) => r.estado === "programada" || r.estado === "activa")
    .sort((a, b) => {
      const fa = new Date(`${a.fecha}T${a.hora || "00:00"}`);
      const fb = new Date(`${b.fecha}T${b.hora || "00:00"}`);
      return fa - fb;
    });

  if (!proximas.length) {
    return (
      <div className="chat-empty-pro">
        No tienes reuniones programadas
      </div>
    );
  }

  return (
    <div className="reuniones-perfil-list">
      {proximas.map((reunion) => {
        const fechaHora = new Date(`${reunion.fecha}T${reunion.hora || "00:00"}`);
        const esActiva = reunion.estado === "activa";
        const esCreador = userNickname && reunion.creador === userNickname;
        const esInvitado = userNickname
          && !esCreador
          && (reunion.participantes || []).includes(userNickname);
        const esExterno = userNickname
          && !esCreador
          && !esInvitado;
        return (
          <article key={reunion.id} className={`reunion-perfil-card ${esActiva ? "activa" : ""}`}>
            <div className="reunion-perfil-card-head">
              <strong>{reunion.titulo}</strong>
              {esActiva ? <span className="chip primary">Activa</span> : null}
            </div>
            <p className="reunion-perfil-meta">
              {fechaHora.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })}
              {" - "}
              {reunion.hora}
              {reunion.duracionMinutos ? ` (${reunion.duracionMinutos} min)` : ""}
            </p>
            {reunion.lugar ? <p className="reunion-perfil-meta">Lugar: {reunion.lugar}</p> : null}
            {reunion.esVideollamada ? <p className="reunion-perfil-meta">Videollamada</p> : null}
            {reunion.descripcion ? <p className="reunion-perfil-desc">{reunion.descripcion}</p> : null}
            <div className="reunion-perfil-actions">
              {reunion.esVideollamada && onIniciar && (esCreador || esInvitado) ? (
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
          </article>
        );
      })}
    </div>
  );
}
