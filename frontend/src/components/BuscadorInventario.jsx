import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { normalizeKey, formatInventoryLookupLabel, findInventoryItemByQuery } from "../utils/utilidades.jsx";

function resolveSelectedInventoryItem(items, value) {
  const availableItems = Array.isArray(items) ? items : [];
  if (!availableItems.length || value === null || value === undefined) return null;

  if (typeof value === "object") {
    const objectQuery = value.id || value.code || value.sku || value.name || "";
    return findInventoryItemByQuery(availableItems, String(objectQuery || "").trim()) || null;
  }

  const rawValue = String(value || "").trim();
  if (!rawValue) return null;

  const directMatch = availableItems.find((item) => String(item?.id || "").trim() === rawValue);
  if (directMatch) return directMatch;

  const parsedCandidates = [rawValue];
  if ((rawValue.startsWith("{") && rawValue.endsWith("}")) || (rawValue.startsWith("[") && rawValue.endsWith("]"))) {
    try {
      const parsed = JSON.parse(rawValue);
      if (Array.isArray(parsed)) {
        parsed.forEach((entry) => {
          if (entry && typeof entry === "object") {
            parsedCandidates.push(entry.id, entry.code, entry.sku, entry.name);
          }
        });
      } else if (parsed && typeof parsed === "object") {
        parsedCandidates.push(parsed.id, parsed.code, parsed.sku, parsed.name);
      }
    } catch {
      // Ignore malformed JSON payloads.
    }
  }

  for (const candidate of parsedCandidates) {
    const match = findInventoryItemByQuery(availableItems, String(candidate || "").trim());
    if (match) return match;
  }

  return null;
}

function InventoryLookupInput({ inventoryItems, value, onChange, placeholder, disabled, style, title }) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState(null);
  const shellRef = useRef(null);
  const inputRef = useRef(null);
  const selectedItem = useMemo(
    () => resolveSelectedInventoryItem(inventoryItems, value),
    [inventoryItems, value],
  );

  useEffect(() => {
    if (selectedItem) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery(formatInventoryLookupLabel(selectedItem));
      return;
    }
    if (!isOpen) {
      setQuery("");
    }
  }, [isOpen, selectedItem]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = normalizeKey(query);
    if (!normalizedQuery) return [];

    return (inventoryItems || [])
      .filter((item) => {
        const haystack = [item.code, item.name, item.presentation]
          .map((part) => normalizeKey(part))
          .join(" ");
        return haystack.includes(normalizedQuery);
      })
      .slice(0, 8);
  }, [inventoryItems, query]);

  useEffect(() => {
    if (!isOpen || !shellRef.current) return undefined;

    function updateDropdownPosition() {
      const rect = shellRef.current?.getBoundingClientRect();
      if (!rect) return;

      const estimatedHeight = Math.min(260, Math.max(56, filteredItems.length * 58 + 12));
      const viewportSpaceBelow = globalThis.innerHeight - rect.bottom;
      const shouldOpenAbove = viewportSpaceBelow < estimatedHeight && rect.top > estimatedHeight;

      setDropdownStyle({
        position: "fixed",
        left: rect.left,
        width: rect.width,
        top: shouldOpenAbove ? Math.max(12, rect.top - estimatedHeight - 4) : rect.bottom + 4,
      });
    }

    updateDropdownPosition();
    globalThis.addEventListener("resize", updateDropdownPosition, { passive: true });
    globalThis.addEventListener("scroll", updateDropdownPosition, { capture: true, passive: true });
    return () => {
      globalThis.removeEventListener("resize", updateDropdownPosition);
      globalThis.removeEventListener("scroll", updateDropdownPosition, { capture: true });
    };
  }, [filteredItems.length, isOpen]);

  function commitItem(item) {
    setQuery(formatInventoryLookupLabel(item));
    onChange(item.id);
    setIsOpen(false);
  }

  function clearSelection() {
    setQuery("");
    onChange("");
    setIsOpen(false);
    globalThis.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function resolveQuery() {
    const nextQuery = query.trim();
    if (!nextQuery) {
      onChange("");
      setIsOpen(false);
      return;
    }

    const exactMatch = findInventoryItemByQuery(inventoryItems, nextQuery);
    if (exactMatch) {
      commitItem(exactMatch);
      return;
    }

    if (filteredItems.length === 1 && normalizeKey(filteredItems[0].code).startsWith(normalizeKey(nextQuery))) {
      commitItem(filteredItems[0]);
      return;
    }

    onChange("");
    setIsOpen(false);
  }

  return (
    <div ref={shellRef} className="inventory-lookup-shell" style={style} title={title}>
      {selectedItem ? (
        <div className={`inventory-lookup-selected ${disabled ? "disabled" : ""}`.trim()}>
          <div className="inventory-lookup-selected-copy">
            <strong>{selectedItem.code}</strong>
            <span>{selectedItem.name}</span>
            <small>{selectedItem.presentation}</small>
          </div>
          {disabled ? null : (
            <button type="button" className="inventory-lookup-clear" onClick={clearSelection} aria-label="Quitar producto seleccionado" title="Quitar producto seleccionado">
              <X size={12} />
            </button>
          )}
        </div>
      ) : (
        <input
          ref={inputRef}
          className="inventory-lookup-input"
          value={query}
          onFocus={() => setIsOpen(Boolean(query.trim()))}
          onChange={(event) => {
            const nextValue = event.target.value;
            setQuery(nextValue);

            if (!nextValue.trim()) {
              onChange("");
              setIsOpen(false);
              return;
            }

            const exactMatch = findInventoryItemByQuery(inventoryItems, nextValue);
            if (exactMatch) {
              commitItem(exactMatch);
              return;
            }

            setIsOpen(true);
          }}
          onBlur={() => globalThis.setTimeout(resolveQuery, 120)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              resolveQuery();
            }
          }}
          placeholder={placeholder || "Buscar por código o nombre"}
          disabled={disabled}
        />
      )}
      {!selectedItem && isOpen && filteredItems.length && dropdownStyle ? createPortal(
        <div className="inventory-lookup-dropdown inventory-lookup-dropdown-floating" style={dropdownStyle}>
          {filteredItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className="inventory-lookup-option"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => commitItem(item)}
            >
              <strong>{item.code}</strong>
              <span>{item.name}</span>
              <small>{item.presentation}</small>
            </button>
          ))}
        </div>,
        document.body,
      ) : null}
    </div>
  );
}


export { InventoryLookupInput };
