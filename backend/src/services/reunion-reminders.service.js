import { prismaChat as prisma } from "../config/prisma-chat.js";
import { sendPushToNick } from "./push.service.js";

const REMINDER_MINUTES = 15;
const sentReminderKeys = new Set();

function parseReunionDateTime(fecha, hora) {
  const datePart = String(fecha || "").trim();
  const timePart = String(hora || "00:00").trim();
  const [hh, mm] = timePart.split(":").map((v) => Number(v));
  const base = new Date(`${datePart}T00:00:00`);
  if (Number.isNaN(base.getTime())) return null;
  base.setHours(Number.isFinite(hh) ? hh : 0, Number.isFinite(mm) ? mm : 0, 0, 0);
  return base;
}

function reminderKey(reunionId, kind) {
  return `${reunionId}:${kind}`;
}

async function tickReunionReminders() {
  if (!prisma?.chatReunion) return;

  const rows = await prisma.chatReunion.findMany({
    where: { estado: "programada" },
    take: 500,
  });

  const now = Date.now();

  for (const row of rows) {
    const inicio = parseReunionDateTime(row.fecha, row.hora);
    if (!inicio) continue;

    const diffMin = (inicio.getTime() - now) / 60000;
    if (diffMin < REMINDER_MINUTES - 1 || diffMin > REMINDER_MINUTES + 1) continue;

    const key = reminderKey(row.id, "15min");
    if (sentReminderKeys.has(key)) continue;
    sentReminderKeys.add(key);

    const titulo = row.titulo || "Reunion";
    const payload = {
      type: "reunion_reminder",
      reunionId: row.id,
      titulo,
      fecha: row.fecha,
      hora: row.hora,
      esVideollamada: Boolean(row.esVideollamada),
      chatTipo: row.chatTipo,
      chatId: row.chatId,
      minutosRestantes: Math.round(diffMin),
      url: "/",
    };

    await sendPushToNick(
      row.creador,
      {
        ...payload,
        title: "Reunion en 15 minutos",
        body: `"${titulo}" empieza a las ${row.hora}. Puedes editarla, posponerla o eliminarla.`,
        tag: `reunion-reminder-${row.id}`,
      },
      { skipIfOnline: false },
    ).catch(() => {});
  }
}

export function startReunionReminderPoller(intervalMs = 60_000) {
  const run = () => {
    tickReunionReminders().catch((err) => {
      console.debug("[reunion_reminders] tick error:", err?.message);
    });
  };
  run();
  const timer = setInterval(run, intervalMs);
  timer.unref?.();
  return timer;
}
