import { useCallback, useEffect, useState } from 'react';
import { Icon } from '../components/Icon.jsx';
import { LoadingIndicator } from '../components/LoadingIndicator.jsx';
import {
  DataPanel,
  ReadOnlyField,
  ErrorNotice,
  PageHeading,
  Pager,
  SuccessNotice,
  TableState,
} from '../components/DataUI.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { usePagedData } from '../hooks/usePagedData.js';
import {
  createMovimientoApi,
  listApi,
  listMovimientosApi,
  listOpcionesApi,
  PAGE_LIMIT,
} from '../services/catalogosApi.js';
import {
  fechaLocal,
  movimientoPayload,
  puedeRegistrarMovimiento,
  puedeVerMovimientos,
  TIPOS_MOVIMIENTO,
  etiquetaTipo,
} from '../utils/catalogos.js';
import { ROLES } from '../utils/access.js';

export function InventariosPage() {
  const { api, usuario } = useAuth();
  const encargado = usuario.rol === ROLES.ENCARGADO;
  const verMovimientos = puedeVerMovimientos(usuario.rol);
  const [vista, setVista] = useState('existencias');
  const [desde, setDesde] = useState(0);
  const [filtroSucursal, setFiltroSucursal] = useState(
    encargado ? String(usuario.id_sucursal) : '',
  );
  const [filtroMedicamento, setFiltroMedicamento] = useState('');
  const [sucursales, setSucursales] = useState([]);
  const [medicamentos, setMedicamentos] = useState([]);
  const [errorOpciones, setErrorOpciones] = useState('');
  const [cargandoOpciones, setCargandoOpciones] = useState(true);
  const [revisionOpciones, setRevisionOpciones] = useState(0);
  const [panel, setPanel] = useState(false);
  const [form, setForm] = useState({
    id_sucursal: String(usuario.id_sucursal || ''),
    id_medicamento: '',
    tipo: 'INICIAL',
    cantidad: '1',
    motivo: '',
  });
  const [errorForm, setErrorForm] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const abort = new AbortController();
    setErrorOpciones('');
    setCargandoOpciones(true);
    Promise.all([
      listOpcionesApi(api, 'sucursales', { signal: abort.signal }),
      listOpcionesApi(api, 'medicamentos', { signal: abort.signal }),
    ])
      .then(([suc, med]) => {
        if (!abort.signal.aborted) {
          setSucursales(suc);
          setMedicamentos(med);
          setCargandoOpciones(false);
        }
      })
      .catch((err) => {
        if (!abort.signal.aborted) {
          setErrorOpciones(err.message || 'No se pudieron consultar los catálogos.');
          setCargandoOpciones(false);
        }
      });
    return () => abort.abort();
  }, [api, revisionOpciones]);

  const cargar = useCallback(
    (opts) => {
      const filter = {
        ...(filtroSucursal ? { id_sucursal: filtroSucursal } : {}),
        ...(filtroMedicamento ? { id_medicamento: filtroMedicamento } : {}),
      };
      return vista === 'existencias'
        ? listApi(api, 'inventarios', filter, opts)
        : listMovimientosApi(api, filter, opts);
    },
    [api, filtroSucursal, filtroMedicamento, vista],
  );
  const { filas, cargando, error, refrescar } = usePagedData(cargar, { desde });

  function cambiarVista(nueva) {
    setVista(nueva);
    setDesde(0);
  }
  function abrirForm() {
    const suc = String(usuario.id_sucursal || '');
    const med = filtroMedicamento || '';
    setForm({ id_sucursal: suc, id_medicamento: med, tipo: 'INICIAL', cantidad: '1', motivo: '' });
    setErrorForm('');
    setMensaje('');
    setPanel(true);
  }
  async function registrar(event) {
    event.preventDefault();
    if (guardando) return;
    setErrorForm('');
    setMensaje('');
    try {
      const data = movimientoPayload(form, usuario);
      setGuardando(true);
      await createMovimientoApi(api, data);
      setPanel(false);
      setMensaje(
        `Movimiento de inventario registrado correctamente (${etiquetaTipo(data.tipo, TIPOS_MOVIMIENTO)}).`,
      );
      setVista('existencias');
      setDesde(0);
      refrescar();
    } catch (err) {
      setErrorForm(err.message || 'No fue posible registrar el movimiento.');
    } finally {
      setGuardando(false);
    }
  }
  const sucursalesParaElegir = encargado
    ? sucursales.filter((s) => Number(s.id_sucursal) === Number(usuario.id_sucursal))
    : sucursales;
  const farmaciaPropia = sucursales.find(
    (s) => Number(s.id_sucursal) === Number(usuario.id_sucursal),
  );
  const disponibles = filas.reduce((sum, row) => sum + (Number(row.cantidad_disponible) || 0), 0);
  return (
    <div className="page-stack">
      <PageHeading
        eyebrow="CONTROL DE EXISTENCIAS"
        title="Inventarios"
        description="Existencias y reservas reales por sucursal. Los registros se consultan en Oracle a través del backend."
        action={
          encargado && (
            <button className="button button--primary" type="button" onClick={abrirForm}>
              <Icon name="boxes" size={17} /> Registrar movimiento
            </button>
          )
        }
      />
      <SuccessNotice message={mensaje} onClose={() => setMensaje('')} />
      <ErrorNotice message={errorOpciones} retry={() => setRevisionOpciones((v) => v + 1)} />
      {cargandoOpciones && <LoadingIndicator inline label="Cargando sucursales y medicamentos…" />}
      <section className="data-card">
        <div className="data-tabbar" role="tablist" aria-label="Vistas de inventario">
          <button
            type="button"
            role="tab"
            aria-selected={vista === 'existencias'}
            className={vista === 'existencias' ? 'data-tab data-tab--selected' : 'data-tab'}
            onClick={() => cambiarVista('existencias')}
          >
            Existencias
          </button>
          {verMovimientos && (
            <button
              type="button"
              role="tab"
              aria-selected={vista === 'movimientos'}
              className={vista === 'movimientos' ? 'data-tab data-tab--selected' : 'data-tab'}
              onClick={() => cambiarVista('movimientos')}
            >
              Historial de movimientos
            </button>
          )}
        </div>
        <div className="data-toolbar data-toolbar--wrap">
          {encargado ? (
            <ReadOnlyField
              label="Sucursal"
              compact
              value={farmaciaPropia?.nombre || `Sucursal ID ${usuario.id_sucursal}`}
            />
          ) : (
            <label className="data-field data-field--compact">
              <span>Sucursal</span>
              <select
                value={filtroSucursal}
                disabled={Boolean(errorOpciones) || cargandoOpciones}
                onChange={(e) => {
                  setFiltroSucursal(e.target.value);
                  setDesde(0);
                }}
              >
                <option value="">Todas las sucursales</option>
                {sucursalesParaElegir.map((s) => (
                  <option key={s.id_sucursal} value={s.id_sucursal}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="data-field data-field--compact">
            <span>Medicamento</span>
            <select
              value={filtroMedicamento}
              disabled={Boolean(errorOpciones) || cargandoOpciones}
              onChange={(e) => {
                setFiltroMedicamento(e.target.value);
                setDesde(0);
              }}
            >
              <option value="">Todos los medicamentos</option>
              {medicamentos.map((m) => (
                <option value={m.id_medicamento} key={m.id_medicamento}>
                  {m.codigo} · {m.nombre}
                </option>
              ))}
            </select>
          </label>
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
        {vista === 'existencias' ? (
          <>
            {!cargando && !error && (
              <div className="inventory-page-summary">
                <span>
                  Filas de esta página: <strong>{filas.length}</strong>
                </span>
                <span>
                  Unidades disponibles en esta página:{' '}
                  <strong>{disponibles.toLocaleString('es-GT')}</strong>
                </span>
              </div>
            )}
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Sucursal</th>
                    <th>Medicamento</th>
                    <th>Presentación</th>
                    <th className="number-cell">Existente</th>
                    <th className="number-cell">Reservado</th>
                    <th className="number-cell">Disponible</th>
                  </tr>
                </thead>
                <tbody>
                  {!cargando &&
                    !error &&
                    filas.map((row) => (
                      <tr key={`${row.id_sucursal}-${row.id_medicamento}`}>
                        <td>
                          <strong>{row.sucursal}</strong>
                          <small className="table-subtext">{row.codigo_sucursal}</small>
                        </td>
                        <td>
                          <strong>{row.medicamento}</strong>
                          <small className="table-subtext">{row.codigo_medicamento}</small>
                        </td>
                        <td>{row.presentacion}</td>
                        <td className="number-cell">{row.cantidad_existente}</td>
                        <td className="number-cell">{row.cantidad_reservada}</td>
                        <td className="number-cell">
                          <strong
                            className={
                              Number(row.cantidad_disponible) === 0
                                ? 'text-warning'
                                : 'text-positive'
                            }
                          >
                            {row.cantidad_disponible}
                          </strong>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Sucursal</th>
                  <th>Medicamento</th>
                  <th>Tipo</th>
                  <th className="number-cell">Cantidad</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {!cargando &&
                  !error &&
                  filas.map((row) => (
                    <tr key={row.id_movimiento}>
                      <td>{fechaLocal(row.fecha_movimiento)}</td>
                      <td>{row.sucursal}</td>
                      <td>{row.medicamento}</td>
                      <td>
                        <span className="mono-tag">{row.tipo}</span>
                      </td>
                      <td className="number-cell">{row.cantidad}</td>
                      <td>{row.motivo || '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
        <TableState
          loading={cargando}
          error={error}
          length={filas.length}
          emptyMessage={
            vista === 'existencias'
              ? 'No hay existencias para los filtros seleccionados.'
              : 'No se encontraron movimientos para los filtros seleccionados.'
          }
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
      {!encargado && (
        <div className="inline-tip">
          <Icon name="lock" size={18} />
          <span>
            Tu rol permite consultar existencias{verMovimientos ? ' e historial' : ''}. Solo los
            encargados pueden registrar inventario inicial o ajustes en su propia sucursal.
          </span>
        </div>
      )}
      {panel && encargado && (
        <DataPanel
          title="Registrar movimiento"
          subtitle="Los movimientos iniciales crean una nueva fila; los ajustes requieren inventario ya registrado."
          onClose={() => {
            if (!guardando) setPanel(false);
          }}
          locked={guardando}
        >
          <form className="data-form" onSubmit={registrar}>
            <div className="data-form-grid">
              <ReadOnlyField
                label="Sucursal"
                value={farmaciaPropia?.nombre || `Sucursal ${usuario.id_sucursal}`}
              />
              <label className="data-field">
                <span>Medicamento *</span>
                <select
                  value={form.id_medicamento}
                  onChange={(e) => setForm((f) => ({ ...f, id_medicamento: e.target.value }))}
                  required
                  disabled={!medicamentos.length || Boolean(errorOpciones) || cargandoOpciones}
                >
                  <option value="">Selecciona un medicamento</option>
                  {medicamentos
                    .filter((m) => m.activo === 'S')
                    .map((m) => (
                      <option key={m.id_medicamento} value={m.id_medicamento}>
                        {m.codigo} · {m.nombre}
                      </option>
                    ))}
                </select>
              </label>
              <label className="data-field">
                <span>Tipo *</span>
                <select
                  value={form.tipo}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      tipo: e.target.value,
                      motivo: e.target.value === 'INICIAL' ? '' : f.motivo,
                    }))
                  }
                >
                  {TIPOS_MOVIMIENTO.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="data-field">
                <span>Cantidad de unidades *</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  max="9999999999"
                  value={form.cantidad}
                  onChange={(e) => setForm((f) => ({ ...f, cantidad: e.target.value }))}
                  required
                />
              </label>
              <label className="data-field data-field--wide">
                <span>Motivo {form.tipo === 'INICIAL' ? '(opcional)' : '*'}</span>
                <textarea
                  rows={3}
                  maxLength={250}
                  value={form.motivo}
                  onChange={(e) => setForm((f) => ({ ...f, motivo: e.target.value }))}
                  placeholder={
                    form.tipo === 'INICIAL'
                      ? 'Inventario de apertura'
                      : 'Describe el motivo del ajuste'
                  }
                  required={form.tipo !== 'INICIAL'}
                />
              </label>
            </div>
            <div className="data-advice">
              <Icon name="info" size={17} />
              <span>
                Si el medicamento ya tiene inventario en esta farmacia, usa un ajuste. Las salidas
                nunca podrán descontar unidades reservadas. Las reglas se validan nuevamente en el
                backend.
              </span>
            </div>
            <ErrorNotice message={errorForm} />
            <div className="data-form-actions">
              <button
                type="button"
                className="button button--secondary"
                disabled={guardando}
                onClick={() => setPanel(false)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="button button--primary"
                disabled={guardando || Boolean(errorOpciones) || !medicamentos.length}
              >
                {guardando ? 'Registrando…' : 'Confirmar movimiento'}
              </button>
            </div>
          </form>
        </DataPanel>
      )}
    </div>
  );
}
