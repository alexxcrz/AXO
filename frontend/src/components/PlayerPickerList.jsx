import React, { useMemo, useState } from "react";
import "./PlayerPickerList.css";

function normalizeSearch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function PlayerPickerList({
  items = [],
  selected = [],
  onToggle,
  onItemAction,
  mode = "checkbox",
  variant = "light",
  searchPlaceholder = "Buscar player...",
  emptyMessage = "No hay players disponibles.",
  noResultsMessage = "Ningun player coincide con la busqueda.",
  getAvatarUrl,
  makeInitialsAvatar,
  getColorForName,
  className = "",
}) {
  const [search, setSearch] = useState("");
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const filtered = useMemo(() => {
    const query = normalizeSearch(search);
    if (!query) return items;
    return items.filter((item) => {
      const haystack = [
        item.nickname,
        item.name,
        item.subtitle,
        item.area,
        item.jobTitle,
      ].map(normalizeSearch).join(" ");
      return haystack.includes(query);
    });
  }, [items, search]);

  const resolveAvatar = (item) => {
    if (!getAvatarUrl) return "";
    return getAvatarUrl({
      photo: item.photo,
      id: item.id,
      nickname: item.nickname || item.name,
    });
  };

  return (
    <div className={`player-picker ${variant === "dark" ? "player-picker--dark" : "player-picker--light"} ${className}`.trim()}>
      <div className="player-picker-search-wrap">
        <input
          type="search"
          className="player-picker-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
        />
        <span className="player-picker-search-count">
          {filtered.length}
          /
          {items.length}
        </span>
      </div>

      <div className="player-picker-list" role="list">
        {!items.length ? (
          <p className="player-picker-empty">{emptyMessage}</p>
        ) : !filtered.length ? (
          <p className="player-picker-empty">{noResultsMessage}</p>
        ) : (
          filtered.map((item) => {
            const key = item.id || item.nickname;
            const label = item.nickname || item.name || "Usuario";
            const isSelected = selectedSet.has(item.nickname);
            const rowClass = `player-picker-row ${isSelected ? "is-selected" : ""}`;

            if (mode === "action") {
              return (
                <button
                  key={key}
                  type="button"
                  className={`${rowClass} player-picker-row--action`}
                  onClick={() => onItemAction?.(item)}
                >
                  <img
                    src={resolveAvatar(item)}
                    alt={label}
                    className="player-picker-avatar"
                    onError={(event) => {
                      if (makeInitialsAvatar) {
                        event.currentTarget.src = makeInitialsAvatar(label);
                      }
                    }}
                  />
                  <span className="player-picker-text">
                    <strong style={getColorForName ? { color: getColorForName(label) } : undefined}>
                      {label}
                    </strong>
                    {item.name && item.name !== item.nickname ? (
                      <small>{item.name}</small>
                    ) : null}
                    {item.subtitle ? <small>{item.subtitle}</small> : null}
                  </span>
                  <span className="player-picker-action" aria-hidden="true">+</span>
                </button>
              );
            }

            return (
              <label key={key} className={rowClass}>
                <input
                  type="checkbox"
                  className="player-picker-checkbox"
                  checked={isSelected}
                  onChange={(event) => onToggle?.(item.nickname, event.target.checked)}
                />
                <img
                  src={resolveAvatar(item)}
                  alt={label}
                  className="player-picker-avatar"
                  onError={(event) => {
                    if (makeInitialsAvatar) {
                      event.currentTarget.src = makeInitialsAvatar(label);
                    }
                  }}
                />
                <span className="player-picker-text">
                  <strong style={getColorForName ? { color: getColorForName(label) } : undefined}>
                    {label}
                  </strong>
                  {item.name && item.name !== item.nickname ? (
                    <small>{item.name}</small>
                  ) : null}
                  {item.subtitle ? <small>{item.subtitle}</small> : null}
                </span>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}

export function PlayerPickerChips({
  selected = [],
  items = [],
  onRemove,
  getAvatarUrl,
  makeInitialsAvatar,
  variant = "light",
}) {
  if (!selected.length) return null;

  const map = new Map(items.map((item) => [item.nickname, item]));

  return (
    <div className={`player-picker-chips ${variant === "dark" ? "player-picker-chips--dark" : ""}`}>
      {selected.map((nickname) => {
        const item = map.get(nickname) || { nickname, name: nickname };
        const label = item.nickname || item.name || nickname;
        return (
          <span key={nickname} className="player-picker-chip">
            <img
              src={getAvatarUrl?.({
                photo: item.photo,
                id: item.id,
                nickname: label,
              })}
              alt=""
              className="player-picker-chip-avatar"
              onError={(event) => {
                if (makeInitialsAvatar) {
                  event.currentTarget.src = makeInitialsAvatar(label);
                }
              }}
            />
            <span>{label}</span>
            {onRemove ? (
              <button type="button" className="player-picker-chip-remove" onClick={() => onRemove(nickname)} aria-label={`Quitar ${label}`}>
                x
              </button>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}
