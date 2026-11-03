import { useCallback, useMemo, useState } from 'react';
import { DataPanel, ReadOnlyField, ErrorNotice, PageHeading, Pager, SuccessNotice, TableState } from '../components/DataUI.jsx';
import { Icon } from '../components/Icon.jsx';
import { ConfirmacionEscritura, ResumenAdmin, SucursalFiltro, useResumenAdmin, useSucursalesAdmin } from '../components/AdminUI.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { usePagedData } from '../hooks/usePagedData.js';
import { PAGE_LIMIT } from '../services/catalogosApi.js';
import { listAdministracionApi, registrarActivoApi, actualizarActivoApi } from '../services/administracionApi.js';
import { activoPayload, cambioActivoPayload, monedaGTQ, puedeEscribirAdministracion } from '../utils/administracion.js';
import { fechaLocal } from '../utils/catalogos.js';

const KPI = [{ key: 'valor_total', label: 'Valor de activos vigentes' }, { key: 'cantidad_activos', label: 'Activos vigentes', moneda: false }];
const EMPTY = id => ({ id_sucursal: String(id ?? ''), codigo: '', descripcion: '', valor: '', estado: 'VIGENTE' });

export function ActivosPage() {
  const { api, usuario } = useAuth();
  const { sucursales, propia, admin, error: errorSuc, reintentar } = useSucursalesAdmin();
  const [idSucursal, setIdSucursal] = useState(admin ? '' : String(usuario.id_sucursal));
  const [estado, setEstado] = useState('');
  const [desde, setDesde] = useState(0);
  const [revResumen, setRevResumen] = useState(0);
  const [panel, setPanel] = useState(null);
  const [form, setForm] = useState(EMPTY(usuario.id_sucursal));
  const [errorForm, setErrorForm] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const filtrosLista = useMemo(() => ({ ...(idSucursal ? { id_sucursal: idSucursal } : {}), ...(estado ? { estado } : {}) }), [idSucursal, estado]);
  // El valor total solicitado por el proyecto se refiere únicamente a activos VIGENTES,
  // independientemente del estado que esté filtrado en el listado de abajo.
  const filtrosResumen = useMemo(() => ({ ...(idSucursal ? { id_sucursal: idSucursal } : {}) }), [idSucursal]);
  const cargar = useCallback(opts => listAdministracionApi(api, 'activos', filtrosLista, opts), [api, filtrosLista]);
  const { filas, cargando, error, refrescar } = usePagedData(cargar, { desde });
  const resumen = useResumenAdmin(api, 'activos', filtrosResumen, revResumen);

  function cambioFiltro(set, value) { set(value); setDesde(0); }
  function refrescarTodo() { refrescar(); setRevResumen(v=>v+1); }
  function nuevo() { setPanel('nuevo'); setForm(EMPTY(usuario.id_sucursal)); setErrorForm(''); }
  function editar(reg) {
    setPanel({ id: reg.id_activo, id_sucursal: reg.id_sucursal, codigo: reg.codigo });
    setForm({ descripcion: reg.descripcion, valor: String(reg.valor), estado: reg.estado }); setErrorForm('');
  }
  async function guardar(event) {
    event.preventDefault();
    if (guardando || admin) return;
    setErrorForm('');
    try {
      const creando = panel === 'nuevo';
      if (!creando && !puedeEscribirAdministracion(usuario, panel.id_sucursal)) throw new Error('No puedes editar activos de otra sucursal.');
      const payload = creando ? activoPayload(form, usuario) : cambioActivoPayload(form);
      setGuardando(true);
      if (creando) await registrarActivoApi(api, payload);
      else await actualizarActivoApi(api, panel.id, payload);
      setPanel(null); setMensaje(creando ? 'Activo registrado y auditado.' : 'Activo actualizado; el cambio se conserva en auditoría.');
      setDesde(0); refrescarTodo();
    } catch (e) { setErrorForm(e.message || 'No fue posible guardar el activo.'); }
    finally { setGuardando(false); }
  }
  return <div className="page-stack">
    <PageHeading eyebrow="CONTROL PATRIMONIAL" title="Activos fijos" description="Registro y valoración declarada de activos por sucursal, sin cálculo contable de depreciación." action={!admin && <button type="button" className="button button--primary" onClick={nuevo}><Icon name="briefcase" size={18}/> Nuevo activo</button>}/>
    <SuccessNotice message={mensaje} onClose={()=>setMensaje('')}/><ErrorNotice message={errorSuc} retry={reintentar}/>
    <ResumenAdmin titulo="Valor de activos fijos" subtitulo="La valoración corresponde siempre a los activos vigentes, aunque el listado se filtre por estado." {...resumen} valores={KPI}/>
    <section className="data-card"><div className="data-toolbar data-toolbar--wrap">
      <SucursalFiltro admin={admin} sucursales={sucursales} propia={propia} idPropia={usuario.id_sucursal} valor={idSucursal} onChange={v=>cambioFiltro(setIdSucursal,v)}/>
      <label className="data-field data-field--compact"><span>Estado del listado</span><select value={estado} onChange={e=>cambioFiltro(setEstado,e.target.value)}><option value="">Todos</option><option value="VIGENTE">Vigentes</option><option value="BAJA">Dados de baja</option></select></label>
      <button className="button button--secondary" type="button" disabled={cargando} onClick={refrescarTodo}><Icon name="refresh" size={16}/> Actualizar</button>
    </div><ErrorNotice message={error} retry={refrescarTodo}/>
    <div className="table-wrap"><table className="data-table"><thead><tr><th>Código</th><th>Descripción</th><th>Sucursal</th><th>Estado</th><th className="number-cell">Valor</th><th>Acción</th></tr></thead>
    <tbody>{!cargando && !error && filas.map(reg => <tr key={reg.id_activo}><td><span className="mono-tag">{reg.codigo}</span></td><td><strong>{reg.descripcion}</strong><small className="table-subtext">Registrado: {fechaLocal(reg.fecha_registro)}</small></td><td>{reg.sucursal || reg.id_sucursal}</td><td><span className={reg.estado === 'VIGENTE' ? 'data-tag data-tag--ok' : 'data-tag data-tag--muted'}>{reg.estado === 'VIGENTE' ? 'Vigente' : 'Baja'}</span></td><td className="number-cell"><strong>{monedaGTQ(reg.valor)}</strong></td><td>{!admin && puedeEscribirAdministracion(usuario, reg.id_sucursal) ? <button type="button" className="table-action" onClick={()=>editar(reg)}>Editar</button> : <span className="muted">Solo lectura</span>}</td></tr>)}</tbody></table></div>
    <TableState loading={cargando} error={error} length={filas.length} emptyMessage="No hay activos para los filtros seleccionados."/>
    {!error && <Pager desde={desde} limite={PAGE_LIMIT} count={filas.length} onPageChange={setDesde} disabled={cargando}/>}</section>
    {admin && <div className="inline-tip"><Icon name="lock" size={18}/><span>El administrador consulta la valoración de activos; únicamente el encargado de cada sucursal puede registrar o modificar sus activos.</span></div>}
    {panel !== null && !admin && <DataPanel title={panel === 'nuevo' ? 'Registrar activo fijo' : `Editar activo fijo #${panel.id}`} subtitle="El valor es el monto declarado; no se calcula depreciación." onClose={()=>!guardando && setPanel(null)} locked={guardando}>
      <form className="data-form" onSubmit={guardar}><div className="data-form-grid">
        {panel === 'nuevo' && <><ReadOnlyField label="Sucursal" value={propia?.nombre || `Sucursal ${usuario.id_sucursal}`}/>
        <label className="data-field"><span>Código *</span><input required maxLength={30} value={form.codigo} onChange={e=>setForm(f=>({...f,codigo:e.target.value}))} placeholder="ACT-001"/></label></>}
        {panel !== 'nuevo' && <><ReadOnlyField label="Código del activo" value={panel.codigo}/><ReadOnlyField label="Sucursal" value={propia?.nombre || `Sucursal ${usuario.id_sucursal}`}/></>}
        <label className="data-field data-field--wide"><span>Descripción *</span><input required maxLength={200} value={form.descripcion} onChange={e=>setForm(f=>({...f,descripcion:e.target.value}))} placeholder="Ej. Equipo de cómputo"/></label>
        <label className="data-field"><span>Valor (GTQ) *</span><input required type="text" inputMode="decimal" placeholder="1500.00" value={form.valor} onChange={e=>setForm(f=>({...f,valor:e.target.value}))}/></label>
        {panel !== 'nuevo' && <label className="data-field"><span>Estado *</span><select value={form.estado} onChange={e=>setForm(f=>({...f,estado:e.target.value}))}><option value="VIGENTE">Vigente</option><option value="BAJA">Baja</option></select></label>}
      </div><ConfirmacionEscritura mensaje="La modificación del valor, descripción o estado conservará evidencia anterior y posterior en la auditoría."/><ErrorNotice message={errorForm}/><div className="data-form-actions"><button className="button button--secondary" type="button" disabled={guardando} onClick={()=>setPanel(null)}>Cancelar</button><button className="button button--primary" type="submit" disabled={guardando}>{guardando ? 'Guardando…' : panel === 'nuevo' ? 'Registrar activo' : 'Guardar cambios'}</button></div></form>
    </DataPanel>}
  </div>;
}
