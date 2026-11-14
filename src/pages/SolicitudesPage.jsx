import { UbicacionSelect } from '../components/UbicacionSelect.jsx';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DataPanel,
  ReadOnlyField,
  ErrorNotice,
  PageHeading,
  Pager,
  SuccessNotice,
  TableState,
} from '../components/DataUI.jsx';
import { Icon } from '../components/Icon.jsx';
import { LoadingIndicator } from '../components/LoadingIndicator.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { usePagedData } from '../hooks/usePagedData.js';
import { listOpcionesApi, PAGE_LIMIT } from '../services/catalogosApi.js';
import {
  listSolicitudesApi,
  getSolicitudApi,
  createSolicitudApi,
  disponibilidadApi,
  opcionesSolicitudApi,
  confirmarSolicitudApi,
  despacharSolicitudApi,
  entregarSolicitudApi,
  cancelarSolicitudApi,
} from '../services/solicitudesApi.js';
import { ROLES } from '../utils/access.js';
import { useConfirmation } from '../components/ConfirmDialog.jsx';
import { fechaLocal } from '../utils/catalogos.js';
import {
  ESTADOS_SOLICITUD,
  ETIQUETAS_SOLICITUD,
  accionSolicitud,
  confirmacionPayload,
  disponibilidadPayload,
  puedeCrearSolicitud,
  puedeVerOpciones,
  solicitudPayload,
  tiempoEstimadoEtiqueta,
} from '../utils/solicitudes.js';

const NUEVA_LINEA = (key) => ({ key, id_medicamento: '', cantidad: '1' });
const SOLICITUD_VACIA = () => ({
  cliente_nombre: '',
  cliente_telefono: '',
  departamento_entrega: '',
  municipio_entrega: '',
  direccion_entrega: '',
  detalles: [NUEVA_LINEA(1)],
});

const MENSAJES_ACCION = {
  despachar:
    '¿Confirmas el despacho? Las reservas pasarán a consumidas y las unidades se descontarán del inventario.',
  entregar: '¿Confirmas que los medicamentos ya fueron entregados al cliente?',
  cancelar:
    '¿Confirmas la cancelación? Si existe una reserva activa, se liberará sin despachar medicamentos.',
};
const MENSAJES_EXITO = {
  confirmar:
    'Solicitud confirmada. El inventario quedó reservado y se calculó el tiempo estimado de entrega.',
  despachar:
    'Solicitud despachada. Se consumieron las reservas y se registró la salida de inventario.',
  entregar: 'Entrega completada y registrada para auditoría.',
  cancelar: 'Solicitud cancelada. Las reservas activas, si existían, fueron liberadas.',
};

function EtiquetaEstado({ estado }) {
  return (
    <span className={`solicitud-tag solicitud-tag--${String(estado || '').toLowerCase()}`}>
      {ETIQUETAS_SOLICITUD[estado] || estado || '—'}
    </span>
  );
}
function Renglones({ detalles, setDetalles, medicamentos, disabled, nuevaClave }) {
  const activos = medicamentos.filter((m) => m.activo === 'S');
  function cambiar(key, campo, value) {
    setDetalles((old) => old.map((d) => (d.key === key ? { ...d, [campo]: value } : d)));
  }
  return (
    <div className="solicitud-renglones">
      <div className="transfer-lines-heading">
        <h3>Medicamentos solicitados</h3>
        <span>Máximo 20 medicamentos distintos</span>
      </div>
      {detalles.map((d, index) => (
        <div className="transfer-line" key={d.key}>
          <label className="data-field">
            <span>Medicamento {index + 1} *</span>
            <select
              required
              value={d.id_medicamento}
              disabled={disabled}
              onChange={(e) => cambiar(d.key, 'id_medicamento', e.target.value)}
            >
              <option value="">Seleccionar medicamento</option>
              {activos.map((m) => (
                <option key={m.id_medicamento} value={m.id_medicamento}>
                  {m.codigo} · {m.nombre} ({m.presentacion})
                </option>
              ))}
            </select>
          </label>
          <label className="data-field">
            <span>Cantidad *</span>
            <input
              type="number"
              min="1"
              max="9999999999"
              step="1"
              required
              disabled={disabled}
              value={d.cantidad}
              onChange={(e) => cambiar(d.key, 'cantidad', e.target.value)}
            />
          </label>
          <button
            type="button"
            className="button button--secondary transfer-remove"
            disabled={disabled || detalles.length <= 1}
            onClick={() => setDetalles((old) => old.filter((x) => x.key !== d.key))}
            aria-label={`Quitar medicamento ${index + 1}`}
          >
            <Icon name="close" size={16} /> Quitar
          </button>
        </div>
      ))}
      <button
        type="button"
        className="button button--secondary transfer-add"
        disabled={disabled || detalles.length >= 20}
        onClick={() => setDetalles((old) => [...old, NUEVA_LINEA(nuevaClave())])}
      >
        + Agregar medicamento
      </button>
    </div>
  );
}
function TablaOpciones({ opciones, seleccion, onSeleccion, disponible = true }) {
  if (!opciones?.length)
    return (
      <div className="data-advice">
        <Icon name="info" size={17} />
        <span>
          No existen farmacias activas con cobertura e inventario suficiente para todos los
          medicamentos solicitados.
        </span>
      </div>
    );
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {onSeleccion && <th>Elegir</th>}
            <th>Sucursal</th>
            <th>Ubicación</th>
            <th>Entrega estimada</th>
          </tr>
        </thead>
        <tbody>
          {opciones.map((s) => (
            <tr key={s.id_sucursal}>
              {onSeleccion && (
                <td>
                  <input
                    type="radio"
                    name="sucursal-confirmar"
                    value={s.id_sucursal}
                    checked={String(seleccion) === String(s.id_sucursal)}
                    disabled={!disponible}
                    onChange={() => onSeleccion(String(s.id_sucursal))}
                    aria-label={`Elegir ${s.nombre}`}
                  />
                </td>
              )}
              <td>
                <strong>{s.nombre}</strong>
                <small className="table-subtext">
                  {s.codigo} · ID {s.id_sucursal}
                </small>
              </td>
              <td>
                {s.municipio}, {s.departamento}
              </td>
              <td>{tiempoEstimadoEtiqueta(s.tiempo_entrega_min)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetalleSolicitud({
  detalle,
  cargando,
  error,
  onReintentar,
  usuario,
  opciones,
  cargandoOpciones,
  errorOpciones,
  confirmacion,
  setConfirmacion,
  operando,
  onAccion,
  onCerrar,
}) {
  const acciones = accionSolicitud(usuario, detalle);
  const puedeElegir = acciones.includes('confirmar');
  return (
    <DataPanel
      title={detalle ? `Solicitud #${detalle.id_solicitud}` : 'Detalle de solicitud'}
      subtitle="Las reservas se efectúan al confirmar; las existencias disminuyen únicamente al despachar."
      onClose={() => {
        if (!operando) onCerrar();
      }}
      locked={operando}
    >
      <ErrorNotice message={error} retry={onReintentar} />
      {cargando && <LoadingIndicator label="Consultando detalle de solicitud…" />}
      {!cargando && detalle && (
        <>
          <div className="sigfar-readonly-notice">
            <Icon name="lock" size={16} />
            <span>
              Los datos registrados de la solicitud son de solo lectura. La asignación y las
              acciones se realizan únicamente con los controles autorizados.
            </span>
          </div>
          <div className="transfer-detail-grid">
            <div className="transfer-detail-cell">
              <span>Estado</span>
              <EtiquetaEstado estado={detalle.estado} />
            </div>
            <div className="transfer-detail-cell">
              <span>Cliente</span>
              <strong>{detalle.cliente_nombre}</strong>
              <small>{detalle.cliente_telefono}</small>
            </div>
            <div className="transfer-detail-cell">
              <span>Farmacia asignada</span>
              <strong>{detalle.sucursal_asignada || 'Pendiente de asignar'}</strong>
              <small>
                {detalle.id_sucursal_asignada
                  ? `ID ${detalle.id_sucursal_asignada}`
                  : 'Sin asignar'}
              </small>
            </div>
            <div className="transfer-detail-cell">
              <span>Ubicación de entrega</span>
              <strong>
                {detalle.municipio_entrega}, {detalle.departamento_entrega}
              </strong>
              <small>{detalle.direccion_entrega}</small>
            </div>
            <div className="transfer-detail-cell">
              <span>Forma de pago</span>
              <strong>{detalle.forma_pago || 'Pendiente de definir'}</strong>
            </div>
            <div className="transfer-detail-cell">
              <span>Entrega tardía</span>
              <strong>{detalle.tardia === 'S' ? 'Sí' : 'No'}</strong>
            </div>
            <div className="transfer-detail-cell">
              <span>Solicitud registrada</span>
              <strong>{fechaLocal(detalle.fecha_solicitud)}</strong>
            </div>
            <div className="transfer-detail-cell">
              <span>Confirmación</span>
              <strong>{fechaLocal(detalle.fecha_confirmacion)}</strong>
            </div>
            <div className="transfer-detail-cell">
              <span>Entrega estimada</span>
              <strong>{fechaLocal(detalle.fecha_estimada_entrega)}</strong>
            </div>
            <div className="transfer-detail-cell">
              <span>Despacho</span>
              <strong>{fechaLocal(detalle.fecha_despacho)}</strong>
            </div>
            <div className="transfer-detail-cell">
              <span>Entrega real</span>
              <strong>{fechaLocal(detalle.fecha_entrega_real)}</strong>
            </div>
          </div>
          <div className="transfer-detail-table-heading">
            <h3>Medicamentos y reservas</h3>
            <span>{detalle.detalles?.length ?? 0} renglón(es)</span>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Medicamento</th>
                  <th className="number-cell">Cantidad</th>
                  <th>Reserva</th>
                </tr>
              </thead>
              <tbody>
                {detalle.detalles?.map((d) => (
                  <tr key={d.id_detalle_solicitud}>
                    <td>
                      <strong>{d.medicamento}</strong>
                      <small className="table-subtext">{d.codigo_medicamento}</small>
                    </td>
                    <td className="number-cell">{d.cantidad}</td>
                    <td>{d.estado_reserva || 'Sin reserva'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {puedeVerOpciones(usuario) && detalle.estado === 'PENDIENTE' && (
            <section className="solicitud-opciones" aria-label="Opciones para atender la solicitud">
              <div className="transfer-lines-heading">
                <h3>Farmacias elegibles</h3>
                <span>Se verifica la disponibilidad al confirmar</span>
              </div>
              {cargandoOpciones && (
                <LoadingIndicator label="Consultando existencias por municipio…" />
              )}
              <ErrorNotice message={errorOpciones} retry={onReintentar} />
              {!cargandoOpciones && !errorOpciones && (
                <TablaOpciones
                  opciones={opciones}
                  seleccion={confirmacion.id_sucursal}
                  onSeleccion={
                    puedeElegir
                      ? (value) => setConfirmacion((c) => ({ ...c, id_sucursal: value }))
                      : null
                  }
                  disponible={!operando}
                />
              )}
              {puedeElegir && !cargandoOpciones && !errorOpciones && Boolean(opciones?.length) && (
                <label className="data-field solicitud-pago">
                  <span>Forma de pago informada al cliente</span>
                  <select
                    disabled={operando}
                    value={confirmacion.forma_pago}
                    onChange={(e) => setConfirmacion((c) => ({ ...c, forma_pago: e.target.value }))}
                  >
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TARJETA">Tarjeta</option>
                  </select>
                </label>
              )}
            </section>
          )}
          <div className="data-advice">
            <Icon name="info" size={17} />
            <span>
              El backend registra cada transición en auditoría. No se realizan cobros electrónicos
              ni seguimiento GPS.
            </span>
          </div>
          <div className="data-form-actions solicitud-actions">
            <button
              type="button"
              className="button button--secondary"
              disabled={operando}
              onClick={onCerrar}
            >
              Cerrar
            </button>
            {acciones.includes('cancelar') && (
              <button
                type="button"
                className="button button--secondary"
                disabled={operando}
                onClick={() => onAccion('cancelar')}
              >
                Cancelar solicitud
              </button>
            )}
            {acciones.includes('confirmar') && (
              <button
                type="button"
                className="button button--primary"
                disabled={
                  operando ||
                  cargandoOpciones ||
                  Boolean(errorOpciones) ||
                  !confirmacion.id_sucursal ||
                  !opciones?.length
                }
                onClick={() => onAccion('confirmar')}
              >
                Confirmar y reservar
              </button>
            )}
            {acciones.includes('despachar') && (
              <button
                type="button"
                className="button button--primary"
                disabled={operando}
                onClick={() => onAccion('despachar')}
              >
                Confirmar despacho
              </button>
            )}
            {acciones.includes('entregar') && (
              <button
                type="button"
                className="button button--primary"
                disabled={operando}
                onClick={() => onAccion('entregar')}
              >
                Registrar entrega
              </button>
            )}
          </div>
        </>
      )}
    </DataPanel>
  );
}

export function SolicitudesPage() {
  const { requestConfirmation, confirmationModal } = useConfirmation();
  const { api, usuario } = useAuth();
  const coordinador = puedeCrearSolicitud(usuario);
  const consultarOpciones = puedeVerOpciones(usuario);
  const encargado = usuario.rol === ROLES.ENCARGADO;
  const [estado, setEstado] = useState('');
  const [filtroSucursal, setFiltroSucursal] = useState('');
  const [desde, setDesde] = useState(0);
  const [sucursales, setSucursales] = useState([]);
  const [medicamentos, setMedicamentos] = useState([]);
  const [errorCatalogos, setErrorCatalogos] = useState('');
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);
  const [revisionCatalogos, setRevisionCatalogos] = useState(0);
  const [panel, setPanel] = useState(null);
  const [idSeleccionado, setIdSeleccionado] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState('');
  const [revisionDetalle, setRevisionDetalle] = useState(0);
  const [opcionesDetalle, setOpcionesDetalle] = useState(null);
  const [cargandoOpciones, setCargandoOpciones] = useState(false);
  const [errorOpciones, setErrorOpciones] = useState('');
  const [confirmacion, setConfirmacion] = useState({ id_sucursal: '', forma_pago: 'EFECTIVO' });
  const [form, setForm] = useState(SOLICITUD_VACIA);
  const [opcionesPrevias, setOpcionesPrevias] = useState(null);
  const [cargandoPrevias, setCargandoPrevias] = useState(false);
  const [errorForm, setErrorForm] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [operando, setOperando] = useState(false);
  const siguienteLinea = useRef(2);

  useEffect(() => {
    if (encargado) {
      setCargandoCatalogos(false);
      return undefined;
    }
    const abort = new AbortController();
    setErrorCatalogos('');
    setCargandoCatalogos(true);
    Promise.all([
      listOpcionesApi(api, 'sucursales', { signal: abort.signal }),
      ...(coordinador ? [listOpcionesApi(api, 'medicamentos', { signal: abort.signal })] : []),
    ])
      .then(([suc, med]) => {
        if (!abort.signal.aborted) {
          setSucursales(suc);
          if (med) setMedicamentos(med);
          setCargandoCatalogos(false);
        }
      })
      .catch((e) => {
        if (!abort.signal.aborted) {
          setErrorCatalogos(e.message || 'No se pudieron cargar los catálogos.');
          setCargandoCatalogos(false);
        }
      });
    return () => abort.abort();
  }, [api, coordinador, encargado, revisionCatalogos]);

  const filtros = useMemo(
    () => ({
      estado,
      ...(encargado ? {} : { id_sucursal: filtroSucursal }),
    }),
    [estado, filtroSucursal, encargado],
  );
  const cargar = useCallback((opts) => listSolicitudesApi(api, filtros, opts), [api, filtros]);
  const { filas, cargando, error, refrescar } = usePagedData(cargar, { desde });

  useEffect(() => {
    if (panel !== 'detalle' || !idSeleccionado) return undefined;
    const abort = new AbortController();
    setCargandoDetalle(true);
    setErrorDetalle('');
    setDetalle(null);
    setOpcionesDetalle(null);
    setCargandoOpciones(false);
    setErrorOpciones('');
    setConfirmacion({ id_sucursal: '', forma_pago: 'EFECTIVO' });
    (async () => {
      try {
        const data = await getSolicitudApi(api, idSeleccionado, { signal: abort.signal });
        if (abort.signal.aborted) return;
        setDetalle(data);
        setCargandoDetalle(false);
        if (consultarOpciones && data.estado === 'PENDIENTE') {
          setCargandoOpciones(true);
          try {
            const res = await opcionesSolicitudApi(api, idSeleccionado, { signal: abort.signal });
            if (!abort.signal.aborted) setOpcionesDetalle(res.opciones || []);
          } catch (e) {
            if (!abort.signal.aborted)
              setErrorOpciones(e.message || 'No se pudieron obtener las sucursales elegibles.');
          } finally {
            if (!abort.signal.aborted) setCargandoOpciones(false);
          }
        }
      } catch (e) {
        if (!abort.signal.aborted) {
          setErrorDetalle(e.message || 'No fue posible consultar la solicitud.');
          setCargandoDetalle(false);
        }
      }
    })();
    return () => abort.abort();
  }, [api, panel, idSeleccionado, revisionDetalle, consultarOpciones]);

  function abrirNuevo() {
    if (!coordinador) return;
    setPanel('nuevo');
    setForm(SOLICITUD_VACIA());
    setOpcionesPrevias(null);
    setErrorForm('');
    setMensaje('');
    siguienteLinea.current = 2;
  }
  function abrirDetalle(id) {
    setPanel('detalle');
    setIdSeleccionado(id);
    setErrorDetalle('');
    setOpcionesDetalle(null);
    setRevisionDetalle((v) => v + 1);
  }
  function cambiarForm(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setOpcionesPrevias(null);
    setErrorForm('');
  }
  function cambiarDetalles(fn) {
    setForm((f) => ({ ...f, detalles: fn(f.detalles) }));
    setOpcionesPrevias(null);
    setErrorForm('');
  }
  async function previsualizar() {
    if (!coordinador || operando || cargandoPrevias) return;
    setErrorForm('');
    setOpcionesPrevias(null);
    try {
      const values = disponibilidadPayload(form, medicamentos);
      setCargandoPrevias(true);
      const data = await disponibilidadApi(api, values);
      setOpcionesPrevias(data.opciones || []);
    } catch (e) {
      setErrorForm(e.message || 'No fue posible consultar la disponibilidad.');
    } finally {
      setCargandoPrevias(false);
    }
  }
  async function registrar(event) {
    event.preventDefault();
    if (!coordinador || operando || cargandoPrevias) return;
    setErrorForm('');
    try {
      const values = solicitudPayload(form, medicamentos, usuario);
      setOperando(true);
      const created = await createSolicitudApi(api, values);
      setPanel(null);
      setMensaje(
        `Solicitud #${created.id_solicitud} registrada. Está pendiente de asignar y confirmar una farmacia.`,
      );
      setDesde(0);
      refrescar();
      abrirDetalle(created.id_solicitud);
    } catch (e) {
      setErrorForm(e.message || 'No fue posible registrar la solicitud.');
    } finally {
      setOperando(false);
    }
  }
  async function realizarAccion(accion) {
    if (operando || !detalle || !accionSolicitud(usuario, detalle).includes(accion)) return;
    let confirmar = null;
    try {
      if (accion === 'confirmar') {
        confirmar = confirmacionPayload(confirmacion, opcionesDetalle, usuario, detalle);
        if (
          !(await requestConfirmation({
            title: 'Confirmar solicitud y reservas',
            message:
              '¿Confirmas la farmacia y la forma de pago seleccionadas? El inventario se reservará.',
            confirmText: 'Confirmar y reservar',
          }))
        )
          return;
      } else if (
        !(await requestConfirmation({
          title:
            accion === 'cancelar'
              ? 'Cancelar solicitud'
              : accion === 'despachar'
                ? 'Confirmar despacho'
                : 'Registrar entrega',
          message: MENSAJES_ACCION[accion],
          confirmText:
            accion === 'cancelar'
              ? 'Cancelar solicitud'
              : accion === 'despachar'
                ? 'Despachar'
                : 'Registrar entrega',
          danger: accion === 'cancelar',
        }))
      )
        return;
    } catch (e) {
      setErrorDetalle(e.message || 'Selección inválida.');
      return;
    }
    setOperando(true);
    setErrorDetalle('');
    try {
      let updated;
      switch (accion) {
        case 'confirmar':
          updated = await confirmarSolicitudApi(api, detalle.id_solicitud, confirmar);
          break;
        case 'despachar':
          updated = await despacharSolicitudApi(api, detalle.id_solicitud);
          break;
        case 'entregar':
          updated = await entregarSolicitudApi(api, detalle.id_solicitud);
          break;
        case 'cancelar':
          updated = await cancelarSolicitudApi(api, detalle.id_solicitud);
          break;
        default:
          return;
      }
      setDetalle(updated);
      setMensaje(MENSAJES_EXITO[accion]);
      refrescar();
      setRevisionDetalle((v) => v + 1);
    } catch (e) {
      setErrorDetalle(
        e.message || 'La operación no pudo completarse. Actualiza para verificar el estado.',
      );
    } finally {
      setOperando(false);
    }
  }

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow="COORDINACIÓN DE MEDICAMENTOS"
        title="Solicitudes y entregas"
        description="Consulta de disponibilidad por municipio, reservas, despacho y seguimiento hasta la entrega al cliente."
        action={
          coordinador && (
            <button className="button button--primary" type="button" onClick={abrirNuevo}>
              <Icon name="truck" size={18} /> Nueva solicitud
            </button>
          )
        }
      />
      <SuccessNotice message={mensaje} onClose={() => setMensaje('')} />
      {!encargado && (
        <>
          <ErrorNotice message={errorCatalogos} retry={() => setRevisionCatalogos((v) => v + 1)} />
          {cargandoCatalogos && <LoadingIndicator inline label="Cargando catálogos…" />}
        </>
      )}
      <section className="data-card">
        <div className="data-toolbar data-toolbar--wrap">
          <label className="data-field data-field--compact">
            <span>Estado</span>
            <select
              value={estado}
              onChange={(e) => {
                setEstado(e.target.value);
                setDesde(0);
              }}
            >
              <option value="">Todos</option>
              {ESTADOS_SOLICITUD.map((e) => (
                <option key={e} value={e}>
                  {ETIQUETAS_SOLICITUD[e]}
                </option>
              ))}
            </select>
          </label>
          {!encargado && (
            <label className="data-field data-field--compact">
              <span>Farmacia asignada</span>
              <select
                value={filtroSucursal}
                onChange={(e) => {
                  setFiltroSucursal(e.target.value);
                  setDesde(0);
                }}
              >
                <option value="">Todas (incluidas pendientes)</option>
                {sucursales.map((s) => (
                  <option key={s.id_sucursal} value={s.id_sucursal}>
                    {s.nombre} · ID {s.id_sucursal}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            type="button"
            className="button button--secondary"
            disabled={cargando}
            onClick={refrescar}
          >
            <Icon name="refresh" size={16} /> Actualizar
          </button>
        </div>
        <ErrorNotice message={error} retry={refrescar} />
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Solicitud</th>
                <th>Cliente</th>
                <th>Destino</th>
                <th>Farmacia</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {!cargando &&
                !error &&
                filas.map((s) => (
                  <tr key={s.id_solicitud}>
                    <td>
                      <strong>#{s.id_solicitud}</strong>
                    </td>
                    <td>
                      <strong>{s.cliente_nombre}</strong>
                      <small className="table-subtext">{s.cliente_telefono}</small>
                    </td>
                    <td>
                      {s.municipio_entrega}, {s.departamento_entrega}
                    </td>
                    <td>{s.sucursal_asignada || 'Sin asignar'}</td>
                    <td>
                      <EtiquetaEstado estado={s.estado} />
                      {s.tardia === 'S' && (
                        <small className="solicitud-tardia">Fuera del tiempo estimado</small>
                      )}
                    </td>
                    <td>{fechaLocal(s.fecha_solicitud)}</td>
                    <td>
                      <button
                        type="button"
                        className="table-action"
                        onClick={() => abrirDetalle(s.id_solicitud)}
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <TableState
          loading={cargando}
          error={error}
          length={filas.length}
          emptyMessage="No hay solicitudes para estos filtros."
        />
        {!error && (
          <Pager
            desde={desde}
            limite={PAGE_LIMIT}
            count={filas.length}
            onPageChange={setDesde}
            disabled={cargando}
          />
        )}
      </section>
      {encargado && (
        <div className="inline-tip">
          <Icon name="lock" size={18} />
          <span>
            Solo puedes consultar las solicitudes asignadas a tu sucursal. Puedes despacharlas y
            registrar su entrega cuando corresponda.
          </span>
        </div>
      )}
      {usuario.rol === ROLES.ADMIN && (
        <div className="inline-tip">
          <Icon name="info" size={18} />
          <span>
            El administrador consulta todas las solicitudes, pero no puede confirmarlas,
            despacharlas ni entregarlas.
          </span>
        </div>
      )}
      {panel === 'detalle' && (
        <DetalleSolicitud
          detalle={detalle}
          cargando={cargandoDetalle}
          error={errorDetalle}
          onReintentar={() => setRevisionDetalle((v) => v + 1)}
          usuario={usuario}
          opciones={opcionesDetalle}
          cargandoOpciones={cargandoOpciones}
          errorOpciones={errorOpciones}
          confirmacion={confirmacion}
          setConfirmacion={setConfirmacion}
          operando={operando}
          onAccion={realizarAccion}
          onCerrar={() => {
            if (!operando) setPanel(null);
          }}
        />
      )}
      {confirmationModal}
      {panel === 'nuevo' && coordinador && (
        <DataPanel
          title="Registrar solicitud"
          subtitle="Se creará una solicitud pendiente. Solo al confirmarla se reservará inventario."
          onClose={() => {
            if (!operando && !cargandoPrevias) setPanel(null);
          }}
          locked={operando || cargandoPrevias}
        >
          <form className="data-form" onSubmit={registrar}>
            <div className="data-form-grid">
              <label className="data-field">
                <span>Nombre del cliente *</span>
                <input
                  required
                  maxLength={120}
                  disabled={operando || cargandoPrevias}
                  value={form.cliente_nombre}
                  onChange={(e) => cambiarForm('cliente_nombre', e.target.value)}
                />
              </label>
              <label className="data-field">
                <span>Teléfono *</span>
                <input
                  required
                  maxLength={20}
                  disabled={operando || cargandoPrevias}
                  value={form.cliente_telefono}
                  onChange={(e) => cambiarForm('cliente_telefono', e.target.value)}
                />
              </label>
              <UbicacionSelect
                departamento={form.departamento_entrega}
                municipio={form.municipio_entrega}
                disabled={operando || cargandoPrevias}
                onDepartamentoChange={(value) => {
                  setForm((f) => ({ ...f, departamento_entrega: value, municipio_entrega: '' }));
                  setOpcionesPrevias(null);
                  setErrorForm('');
                }}
                onMunicipioChange={(value) => cambiarForm('municipio_entrega', value)}
              />
              <label className="data-field data-field--wide">
                <span>Dirección de entrega *</span>
                <textarea
                  required
                  maxLength={250}
                  disabled={operando || cargandoPrevias}
                  rows={2}
                  value={form.direccion_entrega}
                  onChange={(e) => cambiarForm('direccion_entrega', e.target.value)}
                />
              </label>
            </div>
            <Renglones
              detalles={form.detalles}
              setDetalles={cambiarDetalles}
              medicamentos={medicamentos}
              disabled={operando || cargandoPrevias}
              nuevaClave={() => siguienteLinea.current++}
            />
            <div className="solicitud-consulta">
              <button
                type="button"
                className="button button--secondary"
                disabled={
                  operando ||
                  cargandoPrevias ||
                  Boolean(errorCatalogos) ||
                  cargandoCatalogos ||
                  !medicamentos.length
                }
                onClick={previsualizar}
              >
                <Icon name="eye" size={17} />
                {cargandoPrevias ? 'Consultando…' : 'Consultar disponibilidad'}
              </button>
              <span>Esta consulta no reserva medicamentos ni crea una solicitud.</span>
            </div>
            {cargandoPrevias && <LoadingIndicator inline label="Comprobando disponibilidad…" />}
            {opcionesPrevias && (
              <section aria-label="Resultado de disponibilidad">
                <div className="transfer-lines-heading">
                  <h3>Farmacias elegibles actualmente</h3>
                  <span>{opcionesPrevias.length} resultado(s)</span>
                </div>
                <TablaOpciones opciones={opcionesPrevias} />
              </section>
            )}
            <ErrorNotice message={errorForm} />
            <div className="data-form-actions">
              <button
                type="button"
                className="button button--secondary"
                disabled={operando || cargandoPrevias}
                onClick={() => setPanel(null)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="button button--primary"
                disabled={
                  operando ||
                  cargandoPrevias ||
                  Boolean(errorCatalogos) ||
                  cargandoCatalogos ||
                  !medicamentos.length
                }
              >
                {operando ? 'Registrando…' : 'Registrar solicitud pendiente'}
              </button>
            </div>
          </form>
        </DataPanel>
      )}
    </div>
  );
}
