export function buildReunionInviteUrl(token) {
  if (!token) return "";
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/reunion/join/${token}`;
}

export function formatMensajeInvitacionReunion(reunion, url) {
  const lineas = [
    `Invitacion a reunion: ${reunion.titulo}`,
    `Fecha: ${reunion.fecha} a las ${reunion.hora}`,
  ];
  if (reunion.duracionMinutos) lineas.push(`Duracion estimada: ${reunion.duracionMinutos} min`);
  if (reunion.lugar) lineas.push(`Lugar: ${reunion.lugar}`);
  if (reunion.esVideollamada) lineas.push("Videollamada");
  lineas.push("");
  lineas.push(`Enlace para unirse: ${url}`);
  lineas.push("Puedes entrar como invitado sin cuenta del sistema cuando la reunion este activa.");
  return lineas.join("\n");
}
