import { useCallback, useEffect, useRef, useState } from 'react';
import { DataPanel, ReadOnlyField, ErrorNotice, PageHeading, Pager, SuccessNotice, TableState } from '../components/DataUI.jsx';
import { Icon } from '../components/Icon.jsx';
import { LoadingIndicator } from '../components/LoadingIndicator.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { usePagedData } from '../hooks/usePagedData.js';
import { listOpcionesApi, PAGE_LIMIT } from '../services/catalogosApi.js';
import {
  listTransferenciasApi, getTransferenciaApi, createTransferenciaApi,
  dispatchTransferenciaApi, receiveTransferenciaApi
} from '../services/transferenciasApi.js';
import { fechaLocal } from '../utils/catalogos.js';
import { ROLES } from '../utils/access.js';
import { useConfirmation } from '../components/ConfirmDialog.jsx';
import {
  ESTADOS_TRANSFERENCIA, ETIQUETAS_TRANSFERENCIA, accionPermitida,
  puedeCrearTransferencia, puedeConsultarDetalle, transferenciaPayload
} from '../utils/transferencias.js';

const NUEVA_LINEA = id => ({ key: id, id_medicamento: '', cantidad: '1' });

function Estado({ valor }) {
  const clases = {
    REGISTRADA: 'transfer-tag--registered', EN_TRANSITO: 'transfer-tag--transit', RECIBIDA: 'transfer-tag--received'
  };
  return <span className={`transfer-tag ${clases[valor] || ''}`}>{ETIQUETAS_TRANSFERENCIA[valor] || valor}</span>;
}

function DetalleTransferencia({ detalle, cargando, error, operando, onClose, onRetry, onAccion, usuario }) {
  return <DataPanel title={detalle ? `Transferencia #${detalle.id_transferencia}` : 'Detalle de transferencia'}
    subtitle="Los medicamentos se descuentan del origen al despachar y se agregan al destino al recibir."
    onClose={() => { if (!operando) onClose(); }} readOnly locked={operando}>
    <ErrorNotice message={error} retry={onRetry}/>
    {cargando && <LoadingIndicator label="Consultando detalle de transferencia…"/>}
    {!cargando && detalle && <>
      <div className="transfer-detail-grid">
        <div className="transfer-detail-cell"><span>Estado</span><Estado valor={detalle.estado}/></div>
        <div className="transfer-detail-cell"><span>Origen</span><strong>{detalle.nombre_origen}</strong><small>ID {detalle.id_sucursal_origen}</small></div>
        <div className="transfer-detail-cell"><span>Destino</span><strong>{detalle.nombre_destino}</strong><small>ID {detalle.id_sucursal_destino}</small></div>
        <div className="transfer-detail-cell"><span>Registrada</span><strong>{fechaLocal(detalle.fecha_registro)}</strong></div>
        <div className="transfer-detail-cell"><span>Despachada</span><strong>{fechaLocal(detalle.fecha_despacho)}</strong></div>
        <div className="transfer-detail-cell"><span>Recibida</span><strong>{fechaLocal(detalle.fecha_recepcion)}</strong></div>
      </div>
      <div className="transfer-detail-table-heading"><h3>Medicamentos incluidos</h3><span>{detalle.detalles?.length ?? 0} renglón(es)</span></div>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Código</th><th>Medicamento</th><th className="number-cell">Cantidad</th></tr></thead>
        <tbody>{detalle.detalles?.map(item => <tr key={item.id_detalle_transferencia}><td><span className="mono-tag">{item.codigo_medicamento}</span></td><td><strong>{item.medicamento}</strong></td><td className="number-cell">{item.cantidad}</td></tr>)}</tbody></table></div>
      <div className="data-advice"><Icon name="info" size={17}/><span>La transferencia queda registrada en la auditoría. La operación de cambio de estado se valida nuevamente en el servidor antes de modificar inventarios.</span></div>
      <div className="data-form-actions">
        <button type="button" disabled={operando} className="button button--secondary" onClick={onClose}>Cerrar</button>
        {accionPermitida(usuario, detalle) === 'despachar' && <button type="button" className="button button--primary" disabled={operando} onClick={() => onAccion('despachar')}><Icon name="truck" size={17}/>{operando ? 'Procesando…' : 'Confirmar despacho'}</button>}
        {accionPermitida(usuario, detalle) === 'recibir' && <button type="button" className="button button--primary" disabled={operando} onClick={() => onAccion('recibir')}><Icon name="check" size={17}/>{operando ? 'Procesando…' : 'Confirmar recepción'}</button>}
      </div>
    </>}
  </DataPanel>;
}

export function TransferenciasPage() {
  const { api, usuario } = useAuth();
  const { requestConfirmation, confirmationModal } = useConfirmation();
  const encargado = puedeCrearTransferencia(usuario);
  const admin = usuario.rol === ROLES.ADMIN;
  const [desde, setDesde] = useState(0);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroSucursal, setFiltroSucursal] = useState('');
  const [sucursales, setSucursales] = useState([]);
  const [medicamentos, setMedicamentos] = useState([]);
  const [errorOpciones, setErrorOpciones] = useState('');
  const [cargandoOpciones, setCargandoOpciones] = useState(true);
  const [revisionOpciones, setRevisionOpciones] = useState(0);
  const [panel, setPanel] = useState(null);
  const [idSeleccionado, setIdSeleccionado] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState('');
  const [revisionDetalle, setRevisionDetalle] = useState(0);
  const [operando, setOperando] = useState(false);
  const [form, setForm] = useState(null);
  const [errorForm, setErrorForm] = useState('');
  const [mensaje, setMensaje] = useState('');
  const siguienteLinea = useRef(2);

  // Los encargados reciben únicamente su sucursal desde /sucursales.
  // La selección de otra sucursal se realiza por ID, y se valida en el backend.
  useEffect(() => {
    const abort = new AbortController();
    setErrorOpciones(''); setCargandoOpciones(true);
    Promise.all([
      listOpcionesApi(api, 'sucursales', { signal: abort.signal }),
      listOpcionesApi(api, 'medicamentos', { signal: abort.signal })
    ]).then(([suc, med]) => {
      if (!abort.signal.aborted) { setSucursales(suc); setMedicamentos(med); setCargandoOpciones(false); }
    }).catch(e => {
      if (!abort.signal.aborted) { setErrorOpciones(e.message || 'No se pudieron cargar las opciones.'); setCargandoOpciones(false); }
    });
    return () => abort.abort();
  }, [api, revisionOpciones]);

  const cargar = useCallback(opts => listTransferenciasApi(api, {
    estado: filtroEstado,
    ...(admin ? { id_sucursal: filtroSucursal } : {})
  }, opts), [api, filtroEstado, filtroSucursal, admin]);
  const { filas, cargando, error, refrescar } = usePagedData(cargar, { desde });

  useEffect(() => {
    if (panel !== 'detalle' || !idSeleccionado) return undefined;
    const abort = new AbortController();
    setDetalle(null); setCargandoDetalle(true); setErrorDetalle('');
    getTransferenciaApi(api, idSeleccionado, { signal: abort.signal }).then(data => {
      if (abort.signal.aborted) return;
      if (!puedeConsultarDetalle(usuario, data)) {
        setErrorDetalle('No tienes autorización para consultar esta transferencia.');
      } else setDetalle(data);
      setCargandoDetalle(false);
    }).catch(e => {
      if (!abort.signal.aborted) { setErrorDetalle(e.message || 'Error al cargar detalle.'); setCargandoDetalle(false); }
    });
    return () => abort.abort();
  }, [api, usuario, panel, idSeleccionado, revisionDetalle]);

  function abrirNuevo() {
    if (!encargado) return;
    siguienteLinea.current = 2;
    setForm({ id_sucursal_origen: String(usuario.id_sucursal), id_sucursal_destino: '', detalles: [NUEVA_LINEA(1)] });
    setErrorForm(''); setMensaje(''); setPanel('nuevo');
  }
  function abrirDetalle(id) {
    setErrorDetalle(''); setIdSeleccionado(id); setDetalle(null); setPanel('detalle');
    setRevisionDetalle(v => v + 1);
  }
  function cambiarLinea(key, prop, value) {
    setForm(f => ({ ...f, detalles: f.detalles.map(d => d.key === key ? { ...d, [prop]: value } : d) }));
  }
  function agregarLinea() {
    setForm(f => f.detalles.length >= 50 ? f : {
      ...f, detalles: [...f.detalles, NUEVA_LINEA(siguienteLinea.current++)]
    });
  }
  function quitarLinea(key) {
    setForm(f => f.detalles.length <= 1 ? f : { ...f, detalles: f.detalles.filter(d => d.key !== key) });
  }

  async function registrar(event) {
    event.preventDefault();
    if (operando || !encargado) return;
    setErrorForm('');
    try {
      const values = transferenciaPayload(form, usuario, medicamentos);
      setOperando(true);
      const created = await createTransferenciaApi(api, values);
      setMensaje(`Transferencia #${created.id_transferencia} registrada. Todavía no modifica inventarios; el encargado de origen debe despacharla.`);
      setPanel(null); setForm(null); setDesde(0); refrescar();
      abrirDetalle(created.id_transferencia);
    } catch (e) { setErrorForm(e.message || 'No fue posible registrar la transferencia.'); }
    finally { setOperando(false); }
  }

  async function cambiarEstado(accion) {
    if (!detalle || operando || accionPermitida(usuario, detalle) !== accion) return;
    const texto = accion === 'despachar'
      ? '¿Confirmas el despacho? Se descontarán inmediatamente las cantidades del inventario de origen.'
      : '¿Confirmas la recepción? Se sumarán las cantidades al inventario de destino.';
    if (!await requestConfirmation({ title: accion === 'despachar' ? 'Confirmar despacho' : 'Confirmar recepción', message: texto, confirmText: accion === 'despachar' ? 'Despachar medicamentos' : 'Confirmar recepción' })) return;
    setErrorDetalle(''); setOperando(true);
    try {
      const updated = accion === 'despachar'
        ? await dispatchTransferenciaApi(api, detalle.id_transferencia)
        : await receiveTransferenciaApi(api, detalle.id_transferencia);
      setDetalle(updated);
      setMensaje(accion === 'despachar' ? 'Transferencia despachada. Los medicamentos están en tránsito.' : 'Transferencia recibida. El inventario del destino ha sido actualizado.');
      refrescar();
    } catch (e) {
      setErrorDetalle(e.message || 'No fue posible completar la operación. Refresca para verificar el estado.');
    } finally { setOperando(false); }
  }

  const propias = sucursales.find(s => Number(s.id_sucursal) === Number(usuario.id_sucursal));
  const medicamentosActivos = medicamentos.filter(m => m.activo === 'S');
  return <div className="page-stack">
    <PageHeading eyebrow="MOVIMIENTO ENTRE FARMACIAS" title="Transferencias"
      description="Registro, despacho y recepción de medicamentos entre sucursales, con cambios de inventario auditables."
      action={encargado && <button className="button button--primary" type="button" onClick={abrirNuevo}><Icon name="arrows" size={18}/> Nueva transferencia</button>}/>
    <SuccessNotice message={mensaje} onClose={() => setMensaje('')}/>
    <ErrorNotice message={errorOpciones} retry={() => setRevisionOpciones(v => v + 1)}/>
    {cargandoOpciones && <LoadingIndicator inline label="Cargando sucursales y medicamentos…"/>}
    <section className="data-card">
      <div className="data-toolbar data-toolbar--wrap">
        <label className="data-field data-field--compact"><span>Estado</span><select value={filtroEstado} onChange={e => { setFiltroEstado(e.target.value); setDesde(0); }}>
          <option value="">Todos los estados</option>
          {ESTADOS_TRANSFERENCIA.map(t => <option key={t} value={t}>{ETIQUETAS_TRANSFERENCIA[t]}</option>)}
        </select></label>
        {admin && <label className="data-field data-field--compact"><span>Sucursal participante</span><select value={filtroSucursal} onChange={e => { setFiltroSucursal(e.target.value); setDesde(0); }} disabled={Boolean(errorOpciones) || cargandoOpciones}>
          <option value="">Todas las sucursales</option>
          {sucursales.map(s => <option key={s.id_sucursal} value={s.id_sucursal}>{s.codigo} · {s.nombre}</option>)}
        </select></label>}
        <button type="button" className="button button--secondary" onClick={refrescar} disabled={cargando}><Icon name="refresh" size={16}/> Actualizar</button>
      </div>
      <ErrorNotice message={error} retry={refrescar}/>
      {!cargando && !error && <div className="inventory-page-summary"><span>Transferencias en esta página: <strong>{filas.length}</strong></span>{encargado && <span>Farmacia asignada: <strong>{propias?.nombre || `ID ${usuario.id_sucursal}`}</strong></span>}</div>}
      <div className="table-wrap"><table className="data-table"><thead><tr><th>N.º</th><th>Origen</th><th>Destino</th><th>Estado</th><th>Registro</th><th>Despacho</th><th>Recepción</th><th>Detalle</th></tr></thead>
        <tbody>{!cargando && !error && filas.map(row => <tr key={row.id_transferencia}>
          <td><strong>#{row.id_transferencia}</strong></td><td><strong>{row.nombre_origen}</strong><small className="table-subtext">ID {row.id_sucursal_origen}</small></td>
          <td><strong>{row.nombre_destino}</strong><small className="table-subtext">ID {row.id_sucursal_destino}</small></td>
          <td><Estado valor={row.estado}/></td><td>{fechaLocal(row.fecha_registro)}</td><td>{fechaLocal(row.fecha_despacho)}</td><td>{fechaLocal(row.fecha_recepcion)}</td>
          <td><button className="table-action" type="button" onClick={() => abrirDetalle(row.id_transferencia)}>Consultar</button></td>
        </tr>)}</tbody></table></div>
      <TableState loading={cargando} error={error} length={filas.length} emptyMessage="No se encontraron transferencias para el filtro seleccionado."/>
      {!error && <Pager desde={desde} limite={PAGE_LIMIT} count={filas.length} onPageChange={setDesde} disabled={cargando}/>}
    </section>
    {admin && <div className="inline-tip"><Icon name="lock" size={18}/><span>El administrador puede consultar todas las transferencias, pero el despacho y la recepción corresponden únicamente a los encargados de las sucursales involucradas.</span></div>}
    {encargado && <div className="inline-tip"><Icon name="info" size={18}/><span>Solo puedes despachar desde tu farmacia y recibir en ella. Para transferir a una sucursal sin historial, ingresa su ID de catálogo; el backend valida que exista y esté activa.</span></div>}
    {panel === 'detalle' && <DetalleTransferencia detalle={detalle} cargando={cargandoDetalle} error={errorDetalle} operando={operando} usuario={usuario}
      onClose={() => { if (!operando) setPanel(null); }} onRetry={() => setRevisionDetalle(v => v + 1)} onAccion={cambiarEstado}/>}
    {confirmationModal}
    {panel === 'nuevo' && encargado && <DataPanel title="Nueva transferencia" subtitle="Primero registra la solicitud. No habrá salida de inventario hasta que se confirme el despacho." onClose={() => { if (!operando) setPanel(null); }} locked={operando}>
      <form className="data-form" onSubmit={registrar}>
        <div className="data-form-grid">
          <ReadOnlyField label="Sucursal origen" value={propias ? `${propias.nombre} (ID ${usuario.id_sucursal})` : `Mi sucursal · ID ${usuario.id_sucursal}`}/>
          <label className="data-field"><span>ID sucursal destino *</span><input type="number" inputMode="numeric" min="1" max="9999999999" step="1" placeholder="Ej. 2" required value={form.id_sucursal_destino}
            onChange={e => setForm(f => ({ ...f, id_sucursal_destino: e.target.value }))}/></label>
        </div>
        <div className="data-advice"><Icon name="info" size={17}/><span>Tu rol solo puede consultar su propia sucursal. Solicita al administrador el ID del destino en el catálogo de Sucursales; el servidor rechazará un ID inexistente o inactivo.</span></div>
        <div className="transfer-lines-heading"><h3>Medicamentos a transferir</h3><span>Máximo 50 renglones</span></div>
        <div className="transfer-lines">
          {form.detalles.map((linea, i) => <div className="transfer-line" key={linea.key}>
            <label className="data-field"><span>Medicamento {i+1} *</span><select value={linea.id_medicamento} required disabled={Boolean(errorOpciones) || cargandoOpciones} onChange={e => cambiarLinea(linea.key, 'id_medicamento', e.target.value)}>
              <option value="">Selecciona un medicamento</option>
              {medicamentosActivos.map(m => <option key={m.id_medicamento} value={m.id_medicamento}>{m.codigo} · {m.nombre}</option>)}
            </select></label>
            <label className="data-field"><span>Cantidad *</span><input type="number" min="1" max="9999999999" step="1" value={linea.cantidad} required onChange={e => cambiarLinea(linea.key, 'cantidad', e.target.value)}/></label>
            <button type="button" className="button button--secondary transfer-remove" disabled={form.detalles.length === 1 || operando} onClick={() => quitarLinea(linea.key)} aria-label={`Eliminar medicamento ${i+1}`}><Icon name="close" size={17}/> Quitar</button>
          </div>)}
        </div>
        <button type="button" className="button button--secondary transfer-add" disabled={form.detalles.length >= 50 || operando} onClick={agregarLinea}>+ Agregar medicamento</button>
        <ErrorNotice message={errorForm}/>
        <div className="data-form-actions">
          <button type="button" className="button button--secondary" disabled={operando} onClick={() => setPanel(null)}>Cancelar</button>
          <button type="submit" className="button button--primary" disabled={operando || cargandoOpciones || Boolean(errorOpciones) || !medicamentosActivos.length}>{operando ? 'Registrando…' : 'Registrar transferencia'}</button>
        </div>
      </form>
    </DataPanel>}
  </div>;
}
