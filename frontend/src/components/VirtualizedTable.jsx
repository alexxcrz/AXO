import { FixedSizeList as List } from "react-window";
import React from "react";

/**
 * Componente de tabla virtualizada para listas largas
 * Optimiza el rendimiento renderizando solo las filas visibles
 * @param {Object} props
 * @param {Array} props.rows - Array de datos a renderizar
 * @param {Function} props.renderRow - Función que renderiza cada fila: (row, index, style) => JSX
 * @param {number} props.rowHeight - Altura de cada fila en píxeles (default: 40)
 * @param {number} props.maxHeight - Altura máxima del contenedor (default: 400)
 * @param {string} props.className - Clase CSS para el contenedor
 */
export const VirtualizedTable = React.memo(function VirtualizedTable({
  rows,
  renderRow,
  rowHeight = 40,
  maxHeight = 400,
  className = "",
  overscanCount = 5,
}) {
  if (!rows || rows.length === 0) {
    return <div className={className} style={{ padding: "1rem", textAlign: "center", color: "#666" }}>No hay datos</div>;
  }

  // Si hay pocas filas, renderiza normalmente sin virtualización
  if (rows.length <= 20) {
    return (
      <div className={className} style={{ maxHeight, overflowY: "auto" }}>
        {rows.map((row, index) => (
          <div key={row.id || index} style={{ height: rowHeight }}>
            {renderRow(row, index, { height: rowHeight, width: "100%" })}
          </div>
        ))}
      </div>
    );
  }

  // Para muchas filas, usa virtualización
  return (
    <List
      height={maxHeight}
      itemCount={rows.length}
      itemSize={rowHeight}
      width="100%"
      overscanCount={overscanCount}
      className={className}
    >
      {({ index, style }) => (
        <div style={style}>
          {renderRow(rows[index], index, style)}
        </div>
      )}
    </List>
  );
});

VirtualizedTable.displayName = "VirtualizedTable";
