import { useCallback, useState } from 'react';
import { Icon } from '../components/Icon.jsx';
import { DataPanel, ReadOnlyField, ErrorNotice, Field, PageHeading, Pager, StatusLabel, SuccessNotice, TableState } from '../components/DataUI.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { usePagedData } from '../hooks/usePagedData.js';
import { listApi, PAGE_LIMIT, saveCatalogoApi } from '../services/catalogosApi.js';
import { puedeAdministrarCatalogos, sucursalPayload, TIPOS_SUCURSAL, etiquetaTipo } from '../utils/catalogos.js';

const EMPTY = { codigo: '', nombre: '', tipo: 'CENTRO_COMERCIAL', departamento: '', municipio: '', direccion: '', tiempo_entrega_min: '45', activa: 'S' };
export function SucursalesPage() {
  const { api, usuario } = useAuth();
  const admin = puedeAdministrarCatalogos(usuario.rol);
  const [desde, setDesde] = useState(0);
  const [activa, setActiva] = useState('');
  const [panel, setPanel] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');
  const [mensaje, setMensaje] = useState('');
  const cargar = useCallback(opts => listApi(api, 'sucursales', { activa }, opts), [api, activa]);
  const { filas, cargando, error, refrescar } = usePagedData(cargar, { desde, limite: PAGE_LIMIT });

  function abrirEditar(row) {
    setPanel(row.id_sucursal); setForm({ ...row, tiempo_entrega_min: String(row.tiempo_entrega_min) });
    setErrorForm(''); setMensaje('');
  }
  function abrirNuevo() { setPanel('nuevo'); setForm({ ...EMPTY }); setErrorForm(''); setMensaje(''); }
  function cerrar() { if (!guardando) { setPanel(null); setErrorForm(''); } }
  function cambiar(field, value) { setForm(v => ({ ...v, [field]: value })); }
  async function guardar(event) {
    event.preventDefault();
    if (guardando) return;
    setErrorForm(''); setMensaje('');
    try {
      const data = sucursalPayload(form);
      setGuardando(true);
      await saveCatalogoApi(api, 'sucursales', data, panel === 'nuevo' ? null : panel);
      setPanel(null); setMensaje(panel === 'nuevo' ? 'Sucursal registrada correctamente.' : 'Sucursal actualizada correctamente.');
      setDesde(0); refrescar();
    } catch (err) { setErrorForm(err.message || 'No se pudo guardar la sucursal.'); }
    finally { setGuardando(false); }
  }
  return <div className="page-stack">
    <PageHeading eyebrow="ESTRUCTURA ORGANIZACIONAL" title="Sucursales" description="Puntos de venta registrados en la base de datos centralizada." action={admin && <button type="button" className="button button--primary" onClick={abrirNuevo}><Icon name="store" size={18}/> Nueva sucursal</button>} />
    <SuccessNotice message={mensaje} onClose={() => setMensaje('')}/>
    <section className="data-card"><div className="data-toolbar"><label className="data-field data-field--compact"><span>Estado</span><select value={activa} onChange={e => { setActiva(e.target.value); setDesde(0); }}><option value="">Todas</option><option value="S">Activas</option><option value="N">Inactivas</option></select></label><button type="button" className="button button--secondary" onClick={refrescar} disabled={cargando}><Icon name="refresh" size={16}/> Actualizar</button></div>
      <ErrorNotice message={error} retry={refrescar}/>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Código</th><th>Sucursal</th><th>Tipo</th><th>Ubicación</th><th>Entrega</th><th>Estado</th>{admin && <th>Acción</th>}</tr></thead><tbody>{!cargando && !error && filas.map(row => <tr key={row.id_sucursal}><td><span className="mono-tag">{row.codigo}</span></td><td><strong>{row.nombre}</strong><small className="table-subtext">{row.direccion}</small></td><td>{etiquetaTipo(row.tipo, TIPOS_SUCURSAL)}</td><td>{row.municipio}, {row.departamento}</td><td>{row.tiempo_entrega_min} min</td><td><StatusLabel active={row.activa === 'S'}/></td>{admin && <td><button type="button" className="table-action" onClick={() => abrirEditar(row)}>Editar</button></td>}</tr>)}</tbody></table></div>
      <TableState loading={cargando} error={error} length={filas.length} emptyMessage="No hay sucursales con este estado."/>
      {!error && <Pager desde={desde} limite={PAGE_LIMIT} count={filas.length} onPageChange={setDesde} disabled={cargando}/>}</section>
    {!admin && <div className="inline-tip"><Icon name="lock" size={18}/><span>Consulta habilitada para tu rol. La administración de sucursales corresponde al administrador central.</span></div>}
    {panel !== null && admin && <DataPanel title={panel === 'nuevo' ? 'Registrar sucursal' : 'Editar sucursal'} subtitle="El tiempo estimado se usa para coordinar las entregas de medicamentos." onClose={cerrar} locked={guardando}>
      <form onSubmit={guardar} className="data-form"><div className="data-form-grid">
        <Field label="Código *" name="codigo" value={form.codigo} onChange={cambiar} maxLength={20} required/>
        <Field label="Nombre *" name="nombre" value={form.nombre} onChange={cambiar} maxLength={120} required/>
        <label className="data-field"><span>Tipo de establecimiento *</span><select value={form.tipo} onChange={e => cambiar('tipo', e.target.value)}>{TIPOS_SUCURSAL.map(t => <option value={t.value} key={t.value}>{t.label}</option>)}</select></label>
        <Field label="Departamento *" name="departamento" value={form.departamento} onChange={cambiar} maxLength={80} required/>
        <Field label="Municipio *" name="municipio" value={form.municipio} onChange={cambiar} maxLength={80} required/>
        <Field label="Tiempo de entrega (minutos) *" name="tiempo_entrega_min" type="number" min={1} max={99999} step={1} value={form.tiempo_entrega_min} onChange={cambiar} required/>
        <Field label="Dirección *" name="direccion" value={form.direccion} onChange={cambiar} maxLength={250} required/>
        <label className="data-field"><span>Estado</span><select value={form.activa} onChange={e => cambiar('activa', e.target.value)}><option value="S">Activa</option><option value="N">Inactiva</option></select></label>
      </div><ErrorNotice message={errorForm}/><div className="data-form-actions"><button type="button" className="button button--secondary" disabled={guardando} onClick={cerrar}>Cancelar</button><button type="submit" className="button button--primary" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar sucursal'}</button></div></form>
    </DataPanel>}
  </div>;
}
