const DEFAULT_DURATION_MIN = 60;

export function parseReunionDateTime(fecha, hora) {
  const datePart = String(fecha || "").trim();
  const timePart = String(hora || "00:00").trim();
  const [hh, mm] = timePart.split(":").map((v) => Number(v));
  const base = new Date(`${datePart}T00:00:00`);
  if (Number.isNaN(base.getTime())) return null;
  base.setHours(Number.isFinite(hh) ? hh : 0, Number.isFinite(mm) ? mm : 0, 0, 0);
  return base;
}

export function getReunionDurationMinutes(reunion) {
  const raw = Number(reunion?.duracionMinutos ?? reunion?.duracion_minutos);
  if (Number.isFinite(raw) && raw > 0) return Math.min(raw, 480);
  return DEFAULT_DURATION_MIN;
}

/**
 * Regla de negocio:
 * - Si la nueva reunion empieza ANTES de otra, hay conflicto si su fin invade la hora de inicio de la otra.
 * - Si empieza a la misma hora o despues, no bloquea (ej. nueva 4:30 con existente 4:00 = permitido).
 */
export function reunionesSeSolapan(inicioNueva, duracionNuevaMin, inicioExistente, duracionExistenteMin) {
  if (!inicioNueva || !inicioExistente) return false;
  const durNueva = duracionNuevaMin > 0 ? duracionNuevaMin : DEFAULT_DURATION_MIN;
  const _duracionExistente = duracionExistenteMin > 0 ? duracionExistenteMin : DEFAULT_DURATION_MIN;
  const finNueva = new Date(inicioNueva.getTime() + durNueva * 60000);
  void _duracionExistente;

  if (inicioNueva.getTime() < inicioExistente.getTime()) {
    return finNueva.getTime() > inicioExistente.getTime();
  }
  return false;
}

export function buscarConflictosReunion({
  fecha,
  hora,
  duracionMinutos = DEFAULT_DURATION_MIN,
  participantes = [],
  creador = "",
  reuniones = [],
  excluirReunionId = null,
}) {
  const inicioNueva = parseReunionDateTime(fecha, hora);
  if (!inicioNueva) return [];

  const personas = Array.from(new Set(
    [creador, ...participantes].map((p) => String(p || "").trim()).filter(Boolean),
  ));

  const conflictos = [];
  const vistos = new Set();

  reuniones.forEach((reunion) => {
    if (!reunion || reunion.estado === "cancelada") return;
    if (excluirReunionId != null && String(reunion.id) === String(excluirReunionId)) return;
    if (String(reunion.fecha) !== String(fecha)) return;

    const inicioExistente = parseReunionDateTime(reunion.fecha, reunion.hora);
    if (!inicioExistente) return;

    const durExist = getReunionDurationMinutes(reunion);
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

export function formatConflictosMensaje(conflictos) {
  if (!conflictos.length) return "";
  const lineas = conflictos.map((c) => (
    `- ${c.nickname} ya tiene "${c.titulo}" el ${c.fecha} a las ${c.hora} (aprox. ${c.duracionMinutos} min)`
  ));
  return `No se puede crear la reunion por conflicto de horario (ventana de 1 hora):\n${lineas.join("\n")}`;
}
