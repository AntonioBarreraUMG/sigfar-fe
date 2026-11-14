import { useEffect, useState } from 'react';
import { PAGE_LIMIT } from '../services/catalogosApi.js';

// Paginación remota con cancelación al cambiar de filtros y actualización tras escribir.
export function usePagedData(loader, { desde = 0, limite = PAGE_LIMIT } = {}) {
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    setCargando(true);
    setError('');
    loader({ desde, limite, signal: abort.signal })
      .then((rows) => {
        if (!abort.signal.aborted) {
          setFilas(rows);
          setCargando(false);
        }
      })
      .catch((err) => {
        if (!abort.signal.aborted) {
          setFilas([]);
          setError(err.message || 'No se pudieron cargar los datos.');
          setCargando(false);
        }
      });
    return () => abort.abort();
  }, [loader, desde, limite, revision]);
  return { filas, cargando, error, refrescar: () => setRevision((v) => v + 1) };
}
