import { useState } from "react";
import { SpanishDateInput } from "../../../components/SpanishDateInput";
import { formatDateDisplayEs } from "../../../utils/dateLocaleEs";
import "./DateCell.css";

export function DateCell({ value, onCommit }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");

  function commit(nextValue = draft) {
    onCommit(nextValue);
    setEditing(false);
  }

  if (!editing) {
    return (
      <button type="button" className="date-inline-button" onClick={() => setEditing(true)}>
        {value ? formatDateDisplayEs(value) : "--/--/----"}
      </button>
    );
  }

  return (
    <SpanishDateInput
      className="date-inline-picker"
      value={draft}
      onChange={(event) => {
        setDraft(event.target.value);
        commit(event.target.value);
      }}
      placeholder="Seleccionar fecha"
    />
  );
}
