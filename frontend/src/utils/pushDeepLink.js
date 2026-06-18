const STORAGE_KEY = "axo_pending_push";

export function buildPushDeepLinkUrl(data = {}) {
  const params = new URLSearchParams();
  const type = String(data.type || "").trim();
  if (!type) return "/";
  params.set("axo_push", type);
  if (data.fromNickname) params.set("from", data.fromNickname);
  if (data.groupId != null) params.set("groupId", String(data.groupId));
  if (data.room) params.set("room", data.room);
  const caller = data.callerName || data.caller;
  if (caller) params.set("caller", caller);
  if (data.reunionId != null) params.set("reunionId", String(data.reunionId));
  if (data.action) params.set("action", data.action);
  if (data.chatTipo) params.set("chatTipo", data.chatTipo);
  if (data.chatId != null) params.set("chatId", String(data.chatId));
  if (data.targetPage) params.set("page", String(data.targetPage).replace(/^\//, ""));
  else if (data.url && data.url !== "/") params.set("page", String(data.url).replace(/^\//, ""));
  return `/?${params.toString()}`;
}

export function parsePushFromSearch(search = "") {
  const params = new URLSearchParams(search);
  if (!params.has("axo_push")) return null;
  const type = params.get("axo_push");
  const data = {
    type,
    action: params.get("action") || "default",
  };
  const from = params.get("from");
  if (from) data.fromNickname = from;
  const groupId = params.get("groupId");
  if (groupId) data.groupId = groupId;
  const room = params.get("room");
  if (room) data.room = room;
  const caller = params.get("caller");
  if (caller) {
    data.caller = caller;
    data.callerName = caller;
  }
  const reunionId = params.get("reunionId");
  if (reunionId) data.reunionId = Number(reunionId);
  const chatTipo = params.get("chatTipo");
  if (chatTipo) data.chatTipo = chatTipo;
  const chatId = params.get("chatId");
  if (chatId) data.chatId = chatId;
  const page = params.get("page");
  if (page) data.url = `/${page}`;
  return data;
}

export function stashPendingPush(data) {
  if (!data?.type) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* noop */
  }
}

export function consumePendingPush() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(STORAGE_KEY);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearPushQueryFromUrl() {
  if (!window.location.search.includes("axo_push=")) return;
  const next = `${window.location.pathname}${window.location.hash || ""}`;
  window.history.replaceState({}, "", next);
}
