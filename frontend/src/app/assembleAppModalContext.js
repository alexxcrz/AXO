/** Agrupa bindings de modales en secciones legibles para App.jsx */
export function assembleAppModalContext({
  core,
  pause,
  board,
  catalog,
  boardTools,
  user,
  inventory,
}) {
  return {
    ...core,
    ...pause,
    ...board,
    ...catalog,
    ...boardTools,
    ...user,
    ...inventory,
  };
}
