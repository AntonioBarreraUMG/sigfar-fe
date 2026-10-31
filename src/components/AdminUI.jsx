import { useEffect, useState } from 'react';
import { DataPanel, ErrorNotice } from './DataUI.jsx';
import { Icon } from './Icon.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { listOpcionesApi } from '../services/catalogosApi.js';
import { resumenAdministracionApi } from '../services/administracionApi.js';
import { monedaGTQ } from '../utils/administracion.js';
import { ROLES } from '../utils/access.js';

export function useSucursalesAdmin() {
  const { api, usuario } = useAuth();
  const [sucursales, setSucursales] = useState([]);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    listOpcionesApi(api, 'sucursales', { signal: controller.signal }).then(rows => {
      if (!controller.signal.aborted) setSucursales(rows);
    }).catch(e => {
      if (!controller.signal.aborted) setError(e.message || 'No fue posible cargar las sucursales.');
    });
    return () => controller.abort();
  }, [api, revision]);
  const admin = usuario.rol === ROLES.ADMIN;
  return { sucursales, admin, error, reintentar: () => setRevision(v => v+1),
    propia: sucursales.find(s => Number(s.id_sucursal) === Number(usuario.id_sucursal)) };
}

export function SucursalFiltro({ admin, sucursales, propia, valor, onChange, idPropia, disabled = false }) {
  return <label className="data-field data-field--compact"><span>Sucursal</span>
    {admin ? <select value={valor} onChange={e => onChange(e.target.value)} disabled={disabled}>
      <option value="">Todas las sucursales</option>
      {sucursales.map(s => <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre} (ID {s.id_sucursal})</option>)}
    </select> : <input value={propia?.nombre || `Sucursal ID ${idPropia ?? '—'}`} readOnly aria-label="Sucursal asignada"/>}
  </label>;
}

export function AdminKpis({ datos, valores }) {
  return <div className="admin-kpis">
    {valores.map(({ label, key, moneda = true }) => <div className="admin-kpi" key={key}>
      <span>{label}</span><strong>{datos ? (moneda ? monedaGTQ(datos[key]) : Number(datos[key] || 0).toLocaleString('es-GT')) : '—'}</strong>
    </div>)}
  </div>;
}

export function useResumenAdmin(api, modulo, filtros, revision = 0) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  // Cada pantalla pasa filtros estabilizados mediante useMemo / useCallback.
  useEffect(() => {
    const abort = new AbortController();
    setDatos(null); setCargando(true); setError('');
    resumenAdministracionApi(api, modulo, filtros, { signal: abort.signal }).then(res => {
      if (!abort.signal.aborted) { setDatos(res); setCargando(false); }
    }).catch(e => {
      if (!abort.signal.aborted) { setError(e.message || 'Error al consultar resumen.'); setCargando(false); }
    });
    return () => abort.abort();
  }, [api, modulo, filtros, revision]);
  return { datos, cargando, error };
}

export function ResumenAdmin({ titulo, cargando, error, datos, valores, subtitulo }) {
  return <section className="data-card admin-summary" aria-label={titulo}>
    <div className="admin-summary-title"><div><h2>{titulo}</h2>{subtitulo && <p>{subtitulo}</p>}</div>
      {cargando && <span className="admin-loading">Actualizando…</span>}
    </div>
    <ErrorNotice message={error}/>
    <AdminKpis datos={datos?.totales ?? null} valores={valores}/>
    {datos?.por_sucursal?.length > 0 && <details className="admin-summary-breakdown"><summary>Ver desglose por sucursal</summary>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Sucursal</th>{valores.map(v => <th key={v.key} className="number-cell">{v.label}</th>)}</tr></thead>
      <tbody>{datos.por_sucursal.map(row => <tr key={row.id_sucursal}><td>{row.sucursal}</td>{valores.map(v => <td key={v.key} className="number-cell">{v.moneda === false ? Number(row[v.key]||0).toLocaleString('es-GT') : monedaGTQ(row[v.key])}</td>)}</tr>)}</tbody></table></div>
    </details>}
  </section>;
}

export function ConfirmacionEscritura({ mensaje }) {
  return <div className="data-advice"><Icon name="info" size={17}/><span>{mensaje || 'La operación quedará registrada en la auditoría del backend.'}</span></div>;
}

export function AdminForm({ title, subtitle, onClose, children }) {
  return <DataPanel title={title} subtitle={subtitle} onClose={onClose}>{children}</DataPanel>;
}
