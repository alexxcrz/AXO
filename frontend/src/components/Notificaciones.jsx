import { Bell, Pin, X } from "lucide-react";
import { useEffect, useState } from "react";
import { formatNotificationTimestamp } from "../utils/utilidades.jsx";

function AppToastStack({ toasts, onDismiss, onPin }) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = globalThis.setInterval(() => setNowMs(Date.now()), 100);
    return () => globalThis.clearInterval(timer);
  }, []);

  function getProgress(toast) {
    if (!toast?.createdAt || !toast?.durationMs) return 0;
    const elapsed = Math.max(0, nowMs - toast.createdAt);
    return Math.max(0, Math.min(1, elapsed / toast.durationMs));
  }

  if (!toasts.length) return null;

  return (
    <div className="app-toast-stack" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <article
          key={toast.id}
          className={`app-toast ${toast.tone === "danger" ? "danger" : toast.tone === "warning" ? "warning" : "success"} ${toast.isClosing ? "closing" : ""} ${toast.pinned ? "pinned" : ""}`.trim()}
          onClick={() => onPin?.(toast.id)}
          title={toast.pinned ? "Aviso fijado" : "Clic para fijar este aviso"}
        >
          <p>{toast.message}</p>
          <button
            type="button"
            className={`app-toast-close ${toast.pinned ? "is-pinned" : ""}`.trim()}
            onClick={(event) => {
              event.stopPropagation();
              onDismiss(toast.id);
            }}
            aria-label={toast.pinned ? "Cerrar aviso fijado" : "Cerrar aviso"}
            title={toast.pinned ? "Cerrar aviso fijado" : "Cerrar aviso"}
          >
            <svg className="app-toast-timer" viewBox="0 0 22 22" aria-hidden="true">
              <circle cx="11" cy="11" r="9" className="app-toast-timer-track" />
              <circle
                cx="11"
                cy="11"
                r="9"
                className="app-toast-timer-progress"
                style={{ strokeDashoffset: `${56.55 * (1 - (toast.pinned ? 1 : getProgress(toast)))}` }}
              />
            </svg>
            {toast.pinned ? <Pin size={11} className="app-toast-pin-indicator" aria-hidden="true" /> : null}
            <X size={15} />
          </button>
        </article>
      ))}
    </div>
  );
}

function AppNotificationCenter({ unreadNotifications, readNotifications, unreadCount, attentionTick, activeTab, isOpen, onToggle, onTabChange, onDeleteAllRead, onMarkAllRead, onDeleteNotification, onOpenNotification }) {
  const visibleNotifications = activeTab === "read" ? readNotifications : unreadNotifications;
  const [isAttentionActive, setIsAttentionActive] = useState(false);

  useEffect(() => {
    if (!attentionTick) return undefined;
    setIsAttentionActive(true);
    const timer = globalThis.setTimeout(() => setIsAttentionActive(false), 1450);
    return () => globalThis.clearTimeout(timer);
  }, [attentionTick]);

  return (
    <div className={`app-notification-center${isOpen ? " open" : ""}`}>
      <button type="button" className={`app-notification-trigger ${unreadCount ? "has-unread" : ""} ${isAttentionActive ? "is-attention" : ""}`.trim()} onClick={onToggle} aria-label="Abrir alertas" aria-expanded={isOpen}>
        <Bell size={20} strokeWidth={2.35} className="app-notification-bell-icon" aria-hidden="true" />
        {unreadCount ? <span className="app-notification-badge">{Math.min(unreadCount, 99)}</span> : null}
      </button>
      {isOpen ? (
        <section className="app-notification-panel" aria-label="Centro de alertas">
          <div className="app-notification-panel-header">
            <strong>Alertas</strong>
            <div style={{ display: "flex", gap: "0.55rem", alignItems: "center" }}>
              {activeTab === "unread" && unreadNotifications.length ? <button type="button" className="app-notification-action" onClick={onMarkAllRead}>Marcar todo leído</button> : null}
              {activeTab === "read" && readNotifications.length ? <button type="button" className="app-notification-action" onClick={onDeleteAllRead}>Borrar todo</button> : null}
            </div>
          </div>
          <div className="app-notification-tabs" role="tablist" aria-label="Filtros de alertas">
            <button type="button" role="tab" aria-selected={activeTab === "unread"} className={activeTab === "unread" ? "app-notification-tab active" : "app-notification-tab"} onClick={() => onTabChange("unread")}>Sin leer</button>
            <button type="button" role="tab" aria-selected={activeTab === "read"} className={activeTab === "read" ? "app-notification-tab active" : "app-notification-tab"} onClick={() => onTabChange("read")}>Leidas</button>
          </div>
          <div className="app-notification-list">
            {visibleNotifications.map((notification) => (
              <article key={notification.id} className={`app-notification-item ${notification.tone === "danger" ? "danger" : "success"} ${notification.isUnread ? "unread" : ""} ${notification.isLocked ? "locked" : ""} ${activeTab === "read" && !notification.isLocked ? "deletable" : ""}`.trim()}>
                <button type="button" className="app-notification-open" onClick={() => onOpenNotification(notification)}>
                  <div className="app-notification-item-header">
                    <strong>{notification.title}</strong>
                    <span>{formatNotificationTimestamp(notification.timestamp)}</span>
                  </div>
                  <p>{notification.message}</p>
                  {notification.meta ? <small>{notification.meta}</small> : null}
                </button>
                {activeTab === "read" && !notification.isLocked ? (
                  <div className="app-notification-delete-wrap">
                    <button type="button" className="app-notification-delete" onClick={() => onDeleteNotification(notification.id)} aria-label="Eliminar notificación">
                      <X size={14} />
                    </button>
                  </div>
                  
                ) : null}
              </article>
            ))}
            {visibleNotifications.length ? null : <p className="subtle-line app-notification-empty">{activeTab === "read" ? "No hay notificaciones leidas guardadas." : "No hay alertas sin leer."}</p>}
          </div>
        </section>
      ) : null}
    </div>
  );
}


export { AppToastStack, AppNotificationCenter };
