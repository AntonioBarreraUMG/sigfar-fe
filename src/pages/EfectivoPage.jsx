import { useCallback, useMemo, useState } from 'react';
import { DataPanel, ErrorNotice, PageHeading, Pager, SuccessNotice, TableState } from '../components/DataUI.jsx';
import { Icon } from '../components/Icon.jsx';
import { ConfirmacionEscritura, ResumenAdmin, SucursalFiltro, useResumenAdmin, useSucursalesAdmin } from '../components/AdminUI.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { usePagedData } from '../hooks/usePagedData.js';
import { PAGE_LIMIT } from '../services/catalogosApi.js';
import { listAdministracionApi, registrarEfectivoApi } from '../services/administracionApi.js';
import { efectivoPayload, monedaGTQ } from '../utils/administracion.js';
import { fechaLocal } from '../utils/catalogos.js';

const EMPTY = id => ({ id_sucursal: String(id ?? ''), tipo: 'INGRESO', concepto: '', monto: '' });
const KPI = [
  { key: 'ingresos', label: 'Ingresos' },
  { key: 'egresos', label: 'Egresos' },
  { key: 'flujo_neto', label: 'Flujo neto' },
  { key: 'cantidad_movimientos', label: 'Movimientos', moneda: false }
];

export function EfectivoPage() {
  const { api, usuario } = useAuth();
  const { sucursales, propia, admin, error: errorSuc, reintentar } = useSucursalesAdmin();
  const [idSucursal, setIdSucursal] = useState(admin ? '' : String(usuario.id_sucursal));
  const [tipo, setTipo] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [desde, setDesde] = useState(0);
  const [revResumen, setRevResumen] = useState(0);
  const [panel, setPanel] = useState(false);
  const [form, setForm] = useState(EMPTY(usuario.id_sucursal));
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [seleccionado, setSeleccionado] = useState(null);
  const filtros = useMemo(() => ({
    ...(idSucursal ? { id_sucursal: idSucursal } : {}), ...(tipo ? { tipo } : {}),
    ...(fechaDesde ? { fecha_desde: fechaDesde } : {}), ...(fechaHasta ? { fecha_hasta: fechaHasta } : {})
  }), [idSucursal, tipo, fechaDesde, fechaHasta]);
  const cargar = useCallback(opts => listAdministracionApi(api, 'efectivo', filtros, opts), [api, filtros]);
  const { filas, cargando, error, refrescar } = usePagedData(cargar, { desde });
  const resumen = useResumenAdmin(api, 'efectivo', filtros, revResumen);

  function cambioFiltro(set, value) { set(value); setDesde(0); }
  function refrescarTodo() { refrescar(); setRevResumen(n => n+1); }
  function iniciar() { setErrorForm(''); setPanel(true); setSeleccionado(null); setForm(EMPTY(usuario.id_sucursal)); }
  async function registrar(event) {
    event.preventDefault();
    if (guardando || admin) return;
    setErrorForm('');
    try {
      const payload = efectivoPayload(form, usuario);
      setGuardando(true);
      await registrarEfectivoApi(api, payload);
      setPanel(false); setMensaje('Movimiento de efectivo registrado y auditado.'); setDesde(0); refrescarTodo();
    } catch (e) { setErrorForm(e.message || 'No fue posible registrar el movimiento.'); }
    finally { setGuardando(false); }
  }
  return <div className="page-stack">
    <PageHeading eyebrow="CONTROL FINANCIERO" title="Movimientos de efectivo" description="Ingresos, egresos y flujo neto registrado por sucursal. No representa una conciliación bancaria ni un saldo de caja físico." action={!admin && <button type="button" className="button button--primary" onClick={iniciar}><Icon name="wallet" size={18}/> Nuevo movimiento</button>}/>
    <SuccessNotice message={mensaje} onClose={() => setMensaje('')}/>
    <ErrorNotice message={errorSuc} retry={reintentar}/>
    <ResumenAdmin titulo="Resumen de efectivo" subtitulo="Los totales se calculan en Oracle con los filtros aplicados." {...resumen} valores={KPI}/>
    <section className="data-card">
      <div className="data-toolbar data-toolbar--wrap">
        <SucursalFiltro admin={admin} sucursales={sucursales} propia={propia} idPropia={usuario.id_sucursal} valor={idSucursal} onChange={v=>cambioFiltro(setIdSucursal,v)}/>
        <label className="data-field data-field--compact"><span>Tipo</span><select value={tipo} onChange={e=>cambioFiltro(setTipo,e.target.value)}><option value="">Ingresos y egresos</option><option value="INGRESO">Ingresos</option><option value="EGRESO">Egresos</option></select></label>
        <label className="data-field data-field--compact"><span>Desde</span><input type="date" value={fechaDesde} onChange={e=>cambioFiltro(setFechaDesde,e.target.value)}/></label>
        <label className="data-field data-field--compact"><span>Hasta</span><input type="date" value={fechaHasta} onChange={e=>cambioFiltro(setFechaHasta,e.target.value)}/></label>
        <button type="button" className="button button--secondary" disabled={cargando} onClick={refrescarTodo}><Icon name="refresh" size={16}/> Actualizar</button>
      </div>
      <ErrorNotice message={error} retry={refrescarTodo}/>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Fecha</th><th>Sucursal</th><th>Tipo</th><th>Concepto</th><th className="number-cell">Monto</th><th>Acción</th></tr></thead>
        <tbody>{!cargando && !error && filas.map(f => <tr key={f.id_movimiento_efectivo}><td>{fechaLocal(f.fecha_movimiento)}</td><td>{f.sucursal || f.id_sucursal}</td><td><span className={f.tipo==='INGRESO' ? 'admin-type admin-type--income':'admin-type admin-type--expense'}>{f.tipo}</span></td><td>{f.concepto}</td><td className="number-cell"><strong>{monedaGTQ(f.monto)}</strong></td><td><button className="table-action" type="button" onClick={()=>setSeleccionado(f)}>Ver detalle</button></td></tr>)}</tbody>
      </table></div>
      <TableState loading={cargando} error={error} length={filas.length} emptyMessage="No se encontraron movimientos de efectivo."/>
      {!error && <Pager desde={desde} limite={PAGE_LIMIT} count={filas.length} onPageChange={setDesde} disabled={cargando}/>}
    </section>
    {admin && <div className="inline-tip"><Icon name="lock" size={18}/><span>La cuenta del administrador central puede consultar y auditar el flujo de efectivo, pero no registrar movimientos.</span></div>}
    {seleccionado && <DataPanel title={`Movimiento de efectivo #${seleccionado.id_movimiento_efectivo}`} subtitle="Registro histórico de solo lectura." onClose={()=>setSeleccionado(null)}>
      <dl className="admin-detail-list"><div><dt>Sucursal</dt><dd>{seleccionado.sucursal || seleccionado.id_sucursal}</dd></div><div><dt>Tipo</dt><dd>{seleccionado.tipo}</dd></div><div><dt>Concepto</dt><dd>{seleccionado.concepto}</dd></div><div><dt>Monto</dt><dd>{monedaGTQ(seleccionado.monto)}</dd></div><div><dt>Fecha</dt><dd>{fechaLocal(seleccionado.fecha_movimiento)}</dd></div><div><dt>Usuario (ID)</dt><dd>{seleccionado.id_usuario}</dd></div></dl>
      <div className="data-form-actions"><button className="button button--secondary" type="button" onClick={()=>setSeleccionado(null)}>Cerrar</button></div>
    </DataPanel>}
    {panel && !admin && <DataPanel title="Registrar movimiento de efectivo" subtitle="Una vez guardado no se modifica ni elimina; quedará en el historial." onClose={()=>!guardando && setPanel(false)}>
      <form className="data-form" onSubmit={registrar}><div className="data-form-grid">
        <label className="data-field"><span>Sucursal</span><input readOnly value={propia?.nombre || `Sucursal ${usuario.id_sucursal}`}/></label>
        <label className="data-field"><span>Tipo *</span><select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))}><option value="INGRESO">Ingreso</option><option value="EGRESO">Egreso</option></select></label>
        <label className="data-field data-field--wide"><span>Concepto *</span><input required maxLength={250} value={form.concepto} onChange={e=>setForm(f=>({...f,concepto:e.target.value}))} placeholder="Ej. Ingreso registrado en sucursal"/></label>
        <label className="data-field"><span>Monto (GTQ) *</span><input required type="text" inputMode="decimal" placeholder="125.50" value={form.monto} onChange={e=>setForm(f=>({...f,monto:e.target.value}))}/></label>
      </div><ConfirmacionEscritura mensaje="Se registrará el importe como movimiento histórico, sin realizar cobros ni movimientos bancarios."/><ErrorNotice message={errorForm}/><div className="data-form-actions"><button className="button button--secondary" type="button" disabled={guardando} onClick={()=>setPanel(false)}>Cancelar</button><button className="button button--primary" type="submit" disabled={guardando}>{guardando?'Registrando…':'Registrar movimiento'}</button></div></form>
    </DataPanel>}
  </div>;
}
