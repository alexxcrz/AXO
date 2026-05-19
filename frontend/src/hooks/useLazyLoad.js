import { useCallback, useRef, useState } from "react";

/**
 * Hook para lazy-load una función costosa
 * Evita cargar la función hasta que sea necesaria
 * @param {Function} loader - Función async que retorna el módulo/función a cargar
 * @returns {[isLoading, error, execute]} - Estado, error, y función para ejecutar
 */
export function useLazyLoad(loader) {
  const loadedRef = useRef(null);
  const loadingRef = useRef(false);

  const execute = useCallback(
    async (...args) => {
      // Si ya está cargado, úsalo directamente
      if (loadedRef.current) {
        return loadedRef.current(...args);
      }

      // Si ya se está cargando, espera
      if (loadingRef.current) {
        while (!loadedRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        return loadedRef.current(...args);
      }

      // Inicia la carga
      loadingRef.current = true;
      try {
        const module = await loader();
        loadedRef.current = module;
        return loadedRef.current(...args);
      } catch (error) {
        loadingRef.current = false;
        throw error;
      }
    },
    [loader]
  );

  return execute;
}

/**
 * Hook para cargar dinámicamente módulos en demanda
 * Útil para jsPDF, ExcelJS, etc que no se usan siempre
 * @param {Function} importFn - Import dinámico: () => import("module")
 * @returns {Object} Estado con {data, loading, error}
 */
export function useDynamicImport(importFn) {
  const [state, setState] = useState({
    data: null,
    loading: false,
    error: null,
  });

  const load = useCallback(async () => {
    if (state.data) return state.data; // Ya cargado
    if (state.loading) return null; // En progreso
    if (state.error) return null; // Error anterior

    setState((prev) => ({ ...prev, loading: true }));
    try {
      const data = await importFn();
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      setState((prev) => ({ ...prev, error, loading: false }));
      throw error;
    }
  }, [state.data, state.loading, state.error]);

  return { ...state, load };
}
