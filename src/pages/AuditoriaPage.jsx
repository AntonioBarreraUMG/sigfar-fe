import { useEffect, useState } from 'react';
import { DataPanel, ErrorNotice, PageHeading, TableState } from '../components/DataUI.jsx';
import { Icon } from '../components/Icon.jsx';
import { useSucursalesAdmin } from '../components/AdminUI.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { listarAuditoriaApi, resumenAuditoriaApi, detalleAuditoriaApi, LIMITE_AUDITORIA } from '../services/auditoriaApi.js';
import { fechaLocal } from '../utils/catalogos.js';
import {
  FILTROS_VACIOS_AUDITORIA, puedeVerAuditoria, paginasAuditoria,
  rangoAuditoria, textoSnapshot, sucursalAuditoria, validarFiltrosAuditoria
} from '../utils/auditoria.js';

const ESTADO_INICIAL = { datos: [], total: 0, cargando: true, error: '' };

function ResumenAuditoria({ estado }) {
  const { datos, cargando, error } = estado;
  const entidades = Array.isArray(datos?.por_entidad) ? datos.por_entidad : [];
  const sucursales = Array.isArray(datos?.por_sucursal) ? datos.por_sucursal : [];
  return <section className="data-card audit-summary" aria-label="Resumen de auditoría">
    <div className="admin-summary-title"><div><h2>Resumen de operaciones</h2><p>Los totales corresponden a los filtros aplicados y se calculan en Oracle XE.</p></div>
      {cargando && <span className="admin-loading" role="status">Actualizando…</span>}
    </div>
    <ErrorNotice message={error}/>
    <div className="audit-total"><span>Total de operaciones</span><strong>{error || !datos ? '—' : Number(datos.total ?? 0).toLocaleString('es-GT')}</strong></div>
    <div className="audit-breakdowns">
      <details><summary>Operaciones por entidad ({entidades.length})</summary>
        {entidades.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Entidad</th><th className="number-cell">Cantidad</th></tr></thead><tbody>{entidades.map((f, index) => <tr key={`${f.entidad}-${index}`}><td><span className="mono-tag">{f.entidad}</span></td><td className="number-cell">{Number(f.cantidad).toLocaleString('es-GT')}</td></tr>)}</tbody></table></div> : <p className="audit-empty">Sin operaciones para estos filtros.</p>}
      </details>
      <details><summary>Operaciones por sucursal ({sucursales.length})</summary>
        {sucursales.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Sucursal</th><th className="number-cell">Cantidad</th></tr></thead><tbody>{sucursales.map((f, index) => <tr key={`${f.id_sucursal ?? 'global'}-${index}`}><td>{sucursalAuditoria(f.sucursal, f.id_sucursal)}</td><td className="number-cell">{Number(f.cantidad).toLocaleString('es-GT')}</td></tr>)}</tbody></table></div> : <p className="audit-empty">Sin operaciones para estos filtros.</p>}
      </details>
    </div>
  </section>;
}

function DetalleAuditoria({ api, id, onClose }) {
  const [reintento, setReintento] = useState(0);
  const [estado, setEstado] = useState({ datos: null, cargando: true, error: '' });
  useEffect(() => {
    const abort = new AbortController();
    setEstado({ datos: null, cargando: true, error: '' });
    detalleAuditoriaApi(api, id, { signal: abort.signal })
      .then(datos => { if (!abort.signal.aborted) setEstado({ datos, cargando: false, error: '' }); })
      .catch(e => { if (!abort.signal.aborted) setEstado({ datos: null, cargando: false, error: e.message || 'No fue posible consultar el detalle.' }); });
    return () => abort.abort();
  }, [api, id, reintento]);
  const d = estado.datos;
  return <DataPanel title={`Registro de auditoría #${id}`} subtitle="Historial de solo lectura; no es posible modificar ni eliminar este registro." onClose={onClose}>
    {estado.cargando && <p className="audit-loading" role="status">Consultando detalle…</p>}
    <ErrorNotice message={estado.error} retry={() => setReintento(n => n+1)}/>
    {d && <>
      <dl className="admin-detail-list">
        <div><dt>Fecha y hora</dt><dd>{fechaLocal(d.fecha_evento)}</dd></div>
        <div><dt>Usuario</dt><dd>{d.usuario || `Usuario #${d.id_usuario}`}{d.correo_usuario && <small>{d.correo_usuario}</small>}</dd></div>
        <div><dt>Sucursal</dt><dd>{sucursalAuditoria(d.sucursal, d.id_sucursal)}</dd></div>
        <div><dt>Acción</dt><dd>{d.accion}</dd></div>
        <div><dt>Entidad</dt><dd>{d.entidad}</dd></div>
        <div><dt>ID de registro afectado</dt><dd>#{d.id_registro}</dd></div>
      </dl>
      <div className="audit-snapshots">
        <section aria-label="Datos anteriores"><h3>Datos anteriores</h3><pre className="audit-snapshot">{textoSnapshot(d.datos_anteriores)}</pre></section>
        <section aria-label="Datos nuevos"><h3>Datos nuevos</h3><pre className="audit-snapshot">{textoSnapshot(d.datos_nuevos)}</pre></section>
      </div>
    </>}
    <div className="data-form-actions"><button className="button button--secondary" type="button" onClick={onClose}>Cerrar detalle</button></div>
  </DataPanel>;
}

export function AuditoriaPage() {
  const { api, usuario } = useAuth();
  const { sucursales, error: errorSucursales, reintentar: reintentarSucursales } = useSucursalesAdmin();
  const [draft, setDraft] = useState({ ...FILTROS_VACIOS_AUDITORIA });
  const [aplicados, setAplicados] = useState({});
  const [errorFiltros, setErrorFiltros] = useState('');
  const [desde, setDesde] = useState(0);
  const [revision, setRevision] = useState(0);
  const [detalleId, setDetalleId] = useState(null);
  const [lista, setLista] = useState(ESTADO_INICIAL);
  const [resumen, setResumen] = useState({ datos: null, cargando: true, error: '' });
  const autorizado = puedeVerAuditoria(usuario?.rol);

  useEffect(() => {
    if (!autorizado) return undefined;
    const abort = new AbortController();
    setLista({ datos: [], total: 0, cargando: true, error: '' });
    listarAuditoriaApi(api, aplicados, { desde, limite: LIMITE_AUDITORIA, signal: abort.signal })
      .then(resultado => {
        if (abort.signal.aborted) return;
        if (!Array.isArray(resultado?.datos) || !Number.isSafeInteger(Number(resultado?.total)) || Number(resultado.total) < 0) {
          throw new Error('La API devolvió un listado de auditoría inválido.');
        }
        setLista({ datos: resultado.datos, total: Number(resultado.total), cargando: false, error: '' });
      })
      .catch(e => { if (!abort.signal.aborted) setLista({ datos: [], total: 0, cargando: false, error: e.message || 'No fue posible consultar la auditoría.' }); });
    return () => abort.abort();
  }, [api, autorizado, aplicados, desde, revision]);

  useEffect(() => {
    if (!autorizado) return undefined;
    const abort = new AbortController();
    setResumen({ datos: null, cargando: true, error: '' });
    resumenAuditoriaApi(api, aplicados, { signal: abort.signal })
      .then(datos => {
        if (abort.signal.aborted) return;
        if (!datos || !Array.isArray(datos.por_entidad) || !Array.isArray(datos.por_sucursal)) {
          throw new Error('La API devolvió un resumen de auditoría inválido.');
        }
        setResumen({ datos, cargando: false, error: '' });
      })
      .catch(e => { if (!abort.signal.aborted) setResumen({ datos: null, cargando: false, error: e.message || 'Error al obtener el resumen.' }); });
    return () => abort.abort();
  }, [api, autorizado, aplicados, revision]);

  if (!autorizado) return <div className="data-message data-message--error" role="alert">Acceso restringido al administrador central.</div>;

  function aplicar(event) {
    event.preventDefault();
    try {
      const filtros = validarFiltrosAuditoria(draft);
      setErrorFiltros(''); setDesde(0); setDetalleId(null); setAplicados(filtros);
      setRevision(n => n+1); // incluso si se vuelven a aplicar exactamente los mismos filtros
    } catch (e) { setErrorFiltros(e.message || 'Filtros inválidos.'); }
  }
  function limpiar() {
    setDraft({ ...FILTROS_VACIOS_AUDITORIA }); setAplicados({}); setDesde(0); setDetalleId(null);
    setErrorFiltros(''); setRevision(n => n+1);
  }
  const totalPaginas = paginasAuditoria(lista.total, LIMITE_AUDITORIA);
  const paginaActual = Math.floor(desde / LIMITE_AUDITORIA) + 1;
  return <div className="page-stack">
    <PageHeading eyebrow="CONTROL CENTRALIZADO" title="Auditoría de operaciones" description="Consulta histórica de actividades registradas por usuario, sucursal y tipo de operación. Solo lectura para el administrador central." action={<button type="button" className="button button--secondary" onClick={() => setRevision(n=>n+1)}><Icon name="refresh" size={17}/> Actualizar</button>}/>
    <section className="data-card" aria-label="Filtros de auditoría">
      <form className="audit-filters" onSubmit={aplicar}>
        <div className="audit-filters-heading"><h2>Filtrar registros</h2><p>Introduce únicamente los criterios que necesites; los filtros se aplican al historial y al resumen.</p></div>
        <div className="audit-filter-grid">
          <label className="data-field"><span>Sucursal</span><select value={draft.id_sucursal} onChange={e=>setDraft(d=>({...d,id_sucursal:e.target.value}))}><option value="">Todas (incluye operaciones globales)</option>{sucursales.map(s=><option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre} · ID {s.id_sucursal}</option>)}</select></label>
          <label className="data-field"><span>Usuario (ID)</span><input type="number" min="1" step="1" placeholder="Cualquier usuario" value={draft.id_usuario} onChange={e=>setDraft(d=>({...d,id_usuario:e.target.value}))}/></label>
          <label className="data-field"><span>Entidad</span><input type="text" maxLength={60} placeholder="Ej.: TRANSFERENCIA" value={draft.entidad} onChange={e=>setDraft(d=>({...d,entidad:e.target.value.toUpperCase()}))}/></label>
          <label className="data-field"><span>Acción</span><input type="text" maxLength={40} placeholder="Ej.: CREAR" value={draft.accion} onChange={e=>setDraft(d=>({...d,accion:e.target.value.toUpperCase()}))}/></label>
          <label className="data-field"><span>ID del registro afectado</span><input type="number" min="1" step="1" value={draft.id_registro} onChange={e=>setDraft(d=>({...d,id_registro:e.target.value}))} placeholder="Cualquiera"/></label>
          <label className="data-field"><span>Fecha desde</span><input type="date" value={draft.fecha_desde} onChange={e=>setDraft(d=>({...d,fecha_desde:e.target.value}))}/></label>
          <label className="data-field"><span>Fecha hasta</span><input type="date" value={draft.fecha_hasta} onChange={e=>setDraft(d=>({...d,fecha_hasta:e.target.value}))}/></label>
        </div>
        <ErrorNotice message={errorSucursales} retry={reintentarSucursales}/>
        <ErrorNotice message={errorFiltros}/>
        <div className="audit-filter-actions"><button className="button button--secondary" type="button" onClick={limpiar}>Limpiar filtros</button><button className="button button--primary" type="submit"><Icon name="search" size={17}/> Aplicar filtros</button></div>
      </form>
    </section>
    <ResumenAuditoria estado={resumen}/>
    <section className="data-card" aria-label="Historial de auditoría">
      <div className="audit-history-heading"><div><h2>Historial de operaciones</h2><p>Ordenado del registro más reciente al más antiguo.</p></div><span className="audit-count">{lista.cargando || lista.error ? '—' : lista.total.toLocaleString('es-GT')} registros</span></div>
      <ErrorNotice message={lista.error} retry={() => setRevision(n => n+1)}/>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Fecha</th><th>Sucursal</th><th>Usuario</th><th>Entidad</th><th>Acción</th><th>Registro</th><th>Detalle</th></tr></thead>
        <tbody>{!lista.cargando && !lista.error && lista.datos.map(f=><tr key={f.id_auditoria}><td>{fechaLocal(f.fecha_evento)}</td><td>{sucursalAuditoria(f.sucursal,f.id_sucursal)}</td><td>{f.usuario || `Usuario ID ${f.id_usuario}`}<small className="table-subtext">ID {f.id_usuario}</small></td><td><span className="mono-tag">{f.entidad}</span></td><td><span className="audit-action-tag">{f.accion}</span></td><td>#{f.id_registro}</td><td><button type="button" className="table-action" onClick={()=>setDetalleId(f.id_auditoria)}>Ver detalle</button></td></tr>)}</tbody>
      </table></div>
      <TableState loading={lista.cargando} error={lista.error} length={lista.datos.length} emptyMessage="No hay registros de auditoría para los filtros aplicados."/>
      {!lista.cargando && !lista.error && <div className="pager"><span>Registros {rangoAuditoria(desde,lista.datos.length)} de {lista.total.toLocaleString('es-GT')} · Página {paginaActual} de {Math.max(totalPaginas,1)}</span><div><button type="button" onClick={()=>{setDetalleId(null);setDesde(x=>Math.max(0,x-LIMITE_AUDITORIA));}} disabled={desde===0}>Anterior</button><button type="button" onClick={()=>{setDetalleId(null);setDesde(x=>x+LIMITE_AUDITORIA);}} disabled={desde+LIMITE_AUDITORIA>=lista.total}>Siguiente</button></div></div>}
    </section>
    <div className="inline-tip"><Icon name="lock" size={18}/><span>La auditoría no permite editar ni eliminar registros. Los valores anteriores y posteriores se muestran exclusivamente si el backend los conservó.</span></div>
    {detalleId != null && <DetalleAuditoria key={detalleId} id={detalleId} api={api} onClose={()=>setDetalleId(null)}/>}
  </div>;
}
