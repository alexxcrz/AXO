const CALL_SESSION_KEY = "copmec_call_session_v1";
const MAX_AGE_MS = 2 * 60 * 60 * 1000;

export function persistCallSession(session) {
  if (!session?.room) return;
  try {
    sessionStorage.setItem(CALL_SESSION_KEY, JSON.stringify({
      ...session,
      ts: Date.now(),
    }));
  } catch {
    /* noop */
  }
}

export function readCallSession() {
  try {
    const raw = sessionStorage.getItem(CALL_SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.room) return null;
    if (Date.now() - Number(data.ts || 0) > MAX_AGE_MS) {
      sessionStorage.removeItem(CALL_SESSION_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function clearCallSession() {
  try {
    sessionStorage.removeItem(CALL_SESSION_KEY);
  } catch {
    /* noop */
  }
}
