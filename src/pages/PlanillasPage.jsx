import { useCallback, useMemo, useState } from 'react';
import { DataPanel, ReadOnlyField, ErrorNotice, PageHeading, Pager, SuccessNotice, TableState } from '../components/DataUI.jsx';
import { Icon } from '../components/Icon.jsx';
import { ConfirmacionEscritura, ResumenAdmin, SucursalFiltro, useResumenAdmin, useSucursalesAdmin } from '../components/AdminUI.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { usePagedData } from '../hooks/usePagedData.js';
import { PAGE_LIMIT } from '../services/catalogosApi.js';
import { listAdministracionApi, registrarPlanillaApi, corregirPlanillaApi } from '../services/administracionApi.js';
import { planillaPayload, correccionPlanillaPayload, monedaGTQ, puedeEscribirAdministracion } from '../utils/administracion.js';
import { fechaLocal } from '../utils/catalogos.js';

const KPI = [{ key: 'total_planilla', label: 'Gastos de planilla' }, { key: 'periodos_registrados', label: 'Registros de período', moneda: false }];
const EMPTY = id => ({ id_sucursal: String(id ?? ''), periodo: '', monto_total: '' });

export function PlanillasPage() {
  const { api, usuario } = useAuth();
  const { sucursales, propia, admin, error: errorSuc, reintentar } = useSucursalesAdmin();
  const [idSucursal, setIdSucursal] = useState(admin ? '' : String(usuario.id_sucursal));
  const [periodoDesde, setPeriodoDesde] = useState('');
  const [periodoHasta, setPeriodoHasta] = useState('');
  const [desde, setDesde] = useState(0);
  const [revResumen, setRevResumen] = useState(0);
  const [form, setForm] = useState(EMPTY(usuario.id_sucursal));
  const [panel, setPanel] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');
  const [mensaje, setMensaje] = useState('');
  const filtros = useMemo(() => ({
    ...(idSucursal ? { id_sucursal: idSucursal } : {}),
    ...(periodoDesde ? { periodo_desde: periodoDesde } : {}),
    ...(periodoHasta ? { periodo_hasta: periodoHasta } : {})
  }), [idSucursal, periodoDesde, periodoHasta]);
  const cargar = useCallback(opts => listAdministracionApi(api, 'planillas', filtros, opts), [api, filtros]);
  const { filas, cargando, error, refrescar } = usePagedData(cargar, { desde });
  const resumen = useResumenAdmin(api, 'planillas', filtros, revResumen);
  function cambiarFiltro(set, value) { set(value); setDesde(0); }
  function refrescarTodo() { refrescar(); setRevResumen(v=>v+1); }
  function nuevo() { setPanel('nuevo'); setForm(EMPTY(usuario.id_sucursal)); setErrorForm(''); }
  function editar(registro) { setPanel({ id: registro.id_gasto_planilla, id_sucursal: registro.id_sucursal, periodo: registro.periodo }); setForm({ monto_total: String(registro.monto_total) }); setErrorForm(''); }
  async function guardar(e) {
    e.preventDefault();
    if (guardando || admin) return;
    setErrorForm('');
    try {
      const creando = panel === 'nuevo';
      const body = creando ? planillaPayload(form, usuario) : correccionPlanillaPayload(form);
      if (!creando && !puedeEscribirAdministracion(usuario, panel.id_sucursal)) throw new Error('Solo puedes corregir la planilla de tu sucursal.');
      setGuardando(true);
      if (creando) await registrarPlanillaApi(api, body);
      else await corregirPlanillaApi(api, panel.id, body);
      setPanel(null); setMensaje(creando ? 'Gasto de planilla registrado y auditado.' : 'Monto de planilla corregido; el historial de cambios se conserva.');
      setDesde(0); refrescarTodo();
    } catch (err) { setErrorForm(err.message || 'No fue posible guardar la planilla.'); }
    finally { setGuardando(false); }
  }
  return <div className="page-stack">
    <PageHeading eyebrow="GASTOS ADMINISTRATIVOS" title="Gastos de planilla" description="Registro consolidado por sucursal y período. No calcula nóminas individuales, prestaciones ni descuentos." action={!admin && <button className="button button--primary" type="button" onClick={nuevo}><Icon name="receipt" size={18}/> Registrar período</button>}/>
    <SuccessNotice message={mensaje} onClose={()=>setMensaje('')}/><ErrorNotice message={errorSuc} retry={reintentar}/>
    <ResumenAdmin titulo="Resumen de gastos de planilla" subtitulo="Suma de montos reportados por período según los filtros." {...resumen} valores={KPI}/>
    <section className="data-card"><div className="data-toolbar data-toolbar--wrap">
      <SucursalFiltro admin={admin} sucursales={sucursales} propia={propia} idPropia={usuario.id_sucursal} valor={idSucursal} onChange={v=>cambiarFiltro(setIdSucursal,v)}/>
      <label className="data-field data-field--compact"><span>Período desde</span><input type="month" value={periodoDesde} onChange={e=>cambiarFiltro(setPeriodoDesde,e.target.value)}/></label>
      <label className="data-field data-field--compact"><span>Período hasta</span><input type="month" value={periodoHasta} onChange={e=>cambiarFiltro(setPeriodoHasta,e.target.value)}/></label>
      <button className="button button--secondary" type="button" disabled={cargando} onClick={refrescarTodo}><Icon name="refresh" size={16}/> Actualizar</button>
    </div><ErrorNotice message={error} retry={refrescarTodo}/>
    <div className="table-wrap"><table className="data-table"><thead><tr><th>Período</th><th>Sucursal</th><th className="number-cell">Gasto reportado</th><th>Registrado</th><th>Acción</th></tr></thead>
      <tbody>{!cargando && !error && filas.map(reg => <tr key={reg.id_gasto_planilla}><td><strong>{reg.periodo}</strong></td><td>{reg.sucursal || reg.id_sucursal}</td><td className="number-cell"><strong>{monedaGTQ(reg.monto_total)}</strong></td><td>{fechaLocal(reg.fecha_registro)}</td><td>{!admin && puedeEscribirAdministracion(usuario, reg.id_sucursal) ? <button type="button" className="table-action" onClick={()=>editar(reg)}>Corregir monto</button> : <span className="muted">Solo lectura</span>}</td></tr>)}</tbody>
    </table></div><TableState loading={cargando} error={error} length={filas.length} emptyMessage="No hay gastos de planilla para este período."/>
    {!error && <Pager desde={desde} limite={PAGE_LIMIT} count={filas.length} onPageChange={setDesde} disabled={cargando}/>}</section>
    {admin && <div className="inline-tip"><Icon name="lock" size={18}/><span>El administrador puede consultar los gastos consolidados de toda la empresa; solamente los encargados registran o corrigen montos de su sucursal.</span></div>}
    {panel !== null && !admin && <DataPanel title={panel === 'nuevo' ? 'Registrar gasto de planilla' : `Corregir planilla #${panel.id}`} subtitle={panel === 'nuevo' ? 'Se permite un registro por período y sucursal.' : `Período ${panel.periodo}. Solo puede modificarse el monto registrado.`} onClose={()=>!guardando && setPanel(null)} locked={guardando}>
      <form className="data-form" onSubmit={guardar}><div className="data-form-grid">
        {panel === 'nuevo' && <><ReadOnlyField label="Sucursal" value={propia?.nombre || `Sucursal ${usuario.id_sucursal}`}/>
        <label className="data-field"><span>Período *</span><input type="month" required value={form.periodo} onChange={e=>setForm(f=>({...f,periodo:e.target.value}))}/></label></>}
        {panel !== 'nuevo' && <><ReadOnlyField label="Sucursal" value={propia?.nombre || `Sucursal ${usuario.id_sucursal}`}/><ReadOnlyField label="Período" value={panel.periodo}/></>}
        <label className="data-field"><span>Monto de planilla (GTQ) *</span><input required inputMode="decimal" type="text" placeholder="1250.00" value={form.monto_total} onChange={e=>setForm(f=>({...f,monto_total:e.target.value}))}/></label>
      </div><ConfirmacionEscritura mensaje={panel === 'nuevo' ? 'El gasto quedará registrado para la sucursal y el período indicados.' : 'La corrección registrará los valores anteriores y nuevos en auditoría.'}/><ErrorNotice message={errorForm}/><div className="data-form-actions"><button type="button" className="button button--secondary" disabled={guardando} onClick={()=>setPanel(null)}>Cancelar</button><button type="submit" className="button button--primary" disabled={guardando}>{guardando ? 'Guardando…' : panel === 'nuevo' ? 'Registrar planilla' : 'Guardar corrección'}</button></div></form>
    </DataPanel>}
  </div>;
}
