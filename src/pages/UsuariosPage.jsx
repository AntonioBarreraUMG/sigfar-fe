import { useCallback, useEffect, useState } from 'react';
import {
  DataPanel,
  ErrorNotice,
  Field,
  PageHeading,
  Pager,
  ReadOnlyField,
  SuccessNotice,
  TableState,
} from '../components/DataUI.jsx';
import { LoadingIndicator } from '../components/LoadingIndicator.jsx';
import { useConfirmation } from '../components/ConfirmDialog.jsx';
import { Icon } from '../components/Icon.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { usePagedData } from '../hooks/usePagedData.js';
import { PAGE_LIMIT } from '../services/catalogosApi.js';
import {
  crearUsuarioApi,
  listarUsuariosApi,
  modificarUsuarioApi,
  restablecerClaveApi,
  sucursalesParaUsuariosApi,
} from '../services/usuariosApi.js';
import { ROLES, ROLE_LABELS } from '../utils/access.js';

const BLANK = {
  nombre: '',
  correo: '',
  rol: ROLES.ENCARGADO,
  id_sucursal: '',
  activo: 'S',
  clave: '',
};
const ROLES_LIST = [ROLES.ADMIN, ROLES.ENCARGADO, ROLES.COORD];

export function UsuariosPage() {
  const { api, usuario } = useAuth();
  const [desde, setDesde] = useState(0);
  const [rol, setRol] = useState('');
  const [activo, setActivo] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [clave, setClave] = useState('');
  const [sucursales, setSucursales] = useState([]);
  const [cargandoSucursales, setCargandoSucursales] = useState(false);
  const [errorSucursales, setErrorSucursales] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');
  const [mensaje, setMensaje] = useState('');
  const { requestConfirmation, confirmationModal } = useConfirmation();

  const cargar = useCallback(
    (opts) => listarUsuariosApi(api, { rol, activo }, opts),
    [api, rol, activo],
  );
  const { filas, cargando, error, refrescar } = usePagedData(cargar, { desde, limite: PAGE_LIMIT });

  useEffect(() => {
    if (!modal || (modal.tipo !== 'crear' && modal.tipo !== 'editar')) return;
    const controller = new AbortController();
    setCargandoSucursales(true);
    setErrorSucursales('');
    sucursalesParaUsuariosApi(api, { signal: controller.signal })
      .then((rows) => {
        if (!controller.signal.aborted) setSucursales(rows);
      })
      .catch((err) => {
        if (!controller.signal.aborted)
          setErrorSucursales(err.message || 'No se pudieron cargar las sucursales.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargandoSucursales(false);
      });
    return () => controller.abort();
  }, [api, modal?.tipo, modal?.id]);

  function abrirNuevo() {
    setModal({ tipo: 'crear' });
    setForm({ ...BLANK });
    setErrorForm('');
    setMensaje('');
  }
  function abrirEditar(row) {
    setModal({ tipo: 'editar', id: row.id_usuario });
    setForm({
      nombre: row.nombre,
      correo: row.correo,
      rol: row.rol,
      id_sucursal: row.id_sucursal === null ? '' : String(row.id_sucursal),
      activo: row.activo,
      clave: '',
    });
    setErrorForm('');
    setMensaje('');
  }
  function abrirClave(row) {
    setModal({ tipo: 'clave', id: row.id_usuario, nombre: row.nombre });
    setClave('');
    setErrorForm('');
    setMensaje('');
  }
  function cerrar() {
    if (!guardando) {
      setModal(null);
      setErrorForm('');
    }
  }
  function cambiar(campo, valor) {
    setForm((current) => ({
      ...current,
      [campo]: valor,
      ...(campo === 'rol' && valor !== ROLES.ENCARGADO ? { id_sucursal: '' } : {}),
    }));
  }

  async function guardar(event) {
    event.preventDefault();
    if (guardando || !modal || !['crear', 'editar'].includes(modal.tipo)) return;
    setErrorForm('');
    try {
      if (form.rol === ROLES.ENCARGADO && !form.id_sucursal)
        throw new Error('Selecciona la sucursal del encargado.');
      if (form.rol === ROLES.ENCARGADO && (cargandoSucursales || errorSucursales))
        throw new Error('No se pueden validar las sucursales.');
      const data = {
        nombre: form.nombre.trim(),
        correo: form.correo.trim().toLowerCase(),
        rol: form.rol,
        id_sucursal: form.rol === ROLES.ENCARGADO ? Number(form.id_sucursal) : null,
        activo: form.activo,
      };
      if (modal.tipo === 'crear') data.clave = form.clave;
      if (
        modal.tipo === 'editar' &&
        modal.id === usuario.id_usuario &&
        (data.rol !== ROLES.ADMIN || data.activo !== 'S')
      ) {
        throw new Error(
          'No puedes desactivar tu cuenta ni cambiar tu propio rol de administrador.',
        );
      }
      setGuardando(true);
      if (modal.tipo === 'crear') await crearUsuarioApi(api, data);
      else await modificarUsuarioApi(api, modal.id, data);
      setModal(null);
      setMensaje(
        modal.tipo === 'crear'
          ? 'Usuario creado correctamente.'
          : 'Usuario actualizado correctamente.',
      );
      setDesde(0);
      refrescar();
    } catch (err) {
      setErrorForm(err.message || 'No se pudo guardar el usuario.');
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(row) {
    const habilitar = row.activo !== 'S';
    if (row.id_usuario === usuario.id_usuario && !habilitar) {
      setMensaje('');
      setErrorForm('No puedes desactivar tu propia cuenta.');
      return;
    }
    const confirmado = await requestConfirmation({
      title: habilitar ? 'Activar cuenta' : 'Desactivar cuenta',
      message: `${habilitar ? 'Activar' : 'Desactivar'} la cuenta de ${row.nombre} (${row.correo})? ${habilitar ? '' : 'No podrá autenticarse ni realizar nuevas operaciones.'}`,
      confirmText: habilitar ? 'Activar cuenta' : 'Desactivar cuenta',
      danger: !habilitar,
    });
    if (!confirmado) return;
    setMensaje('');
    setErrorForm('');
    setGuardando(true);
    try {
      await modificarUsuarioApi(api, row.id_usuario, { activo: habilitar ? 'S' : 'N' });
      setMensaje(`Cuenta ${habilitar ? 'activada' : 'desactivada'} correctamente.`);
      refrescar();
    } catch (err) {
      setErrorForm(err.message || 'No se pudo cambiar el estado.');
    } finally {
      setGuardando(false);
    }
  }

  async function restablecer(event) {
    event.preventDefault();
    if (guardando || modal?.tipo !== 'clave') return;
    setErrorForm('');
    if (clave.length < 12 || clave.length > 128) {
      setErrorForm('La contraseña debe tener entre 12 y 128 caracteres.');
      return;
    }
    const confirmado = await requestConfirmation({
      title: 'Restablecer contraseña',
      message: `¿Cambiar la contraseña de ${modal.nombre}? La contraseña anterior dejará de permitir nuevos inicios de sesión.`,
      confirmText: 'Restablecer contraseña',
      danger: true,
    });
    if (!confirmado) return;
    setGuardando(true);
    try {
      await restablecerClaveApi(api, modal.id, clave);
      setClave('');
      setModal(null);
      setMensaje('Contraseña restablecida correctamente.');
    } catch (err) {
      setErrorForm(err.message || 'No fue posible restablecer la contraseña.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow="SEGURIDAD Y ACCESO"
        title="Usuarios"
        description="Administración de cuentas, roles y sucursales autorizadas."
        action={
          <button type="button" className="button button--primary" onClick={abrirNuevo}>
            <Icon name="user" size={18} /> Nuevo usuario
          </button>
        }
      />
      <SuccessNotice message={mensaje} onClose={() => setMensaje('')} />
      <ErrorNotice message={!modal ? errorForm : ''} />
      <section className="data-card">
        <div className="data-toolbar data-toolbar--wrap">
          <label className="data-field data-field--compact">
            <span>Rol</span>
            <select
              value={rol}
              onChange={(e) => {
                setRol(e.target.value);
                setDesde(0);
              }}
            >
              <option value="">Todos</option>
              {ROLES_LIST.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </label>
          <label className="data-field data-field--compact">
            <span>Estado</span>
            <select
              value={activo}
              onChange={(e) => {
                setActivo(e.target.value);
                setDesde(0);
              }}
            >
              <option value="">Todos</option>
              <option value="S">Activos</option>
              <option value="N">Inactivos</option>
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
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Sucursal</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {!cargando &&
                !error &&
                filas.map((row) => (
                  <tr key={row.id_usuario}>
                    <td>
                      <strong>{row.nombre}</strong>
                      <small className="table-subtext">ID #{row.id_usuario}</small>
                    </td>
                    <td>{row.correo}</td>
                    <td>{ROLE_LABELS[row.rol] || row.rol}</td>
                    <td>{row.sucursal_nombre || 'Sin sucursal asignada'}</td>
                    <td>
                      <span
                        className={`data-tag ${row.activo === 'S' ? 'data-tag--ok' : 'data-tag--muted'}`}
                      >
                        {row.activo === 'S' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div className="usuarios-actions">
                        <button
                          className="table-action"
                          type="button"
                          disabled={guardando}
                          onClick={() => abrirEditar(row)}
                        >
                          Editar
                        </button>
                        <button
                          className="table-action"
                          type="button"
                          disabled={guardando}
                          onClick={() => abrirClave(row)}
                        >
                          Clave
                        </button>
                        <button
                          className="table-action"
                          type="button"
                          disabled={guardando || row.id_usuario === usuario.id_usuario}
                          onClick={() => cambiarEstado(row)}
                        >
                          {row.activo === 'S' ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
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
          emptyMessage="No hay usuarios con estos filtros."
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
      {modal && ['crear', 'editar'].includes(modal.tipo) && (
        <DataPanel
          title={modal.tipo === 'crear' ? 'Registrar usuario' : 'Editar usuario'}
          subtitle="El acceso depende del rol y de la sucursal asignada."
          locked={guardando}
          onClose={cerrar}
        >
          <form className="data-form" onSubmit={guardar}>
            <div className="data-form-grid">
              {modal.tipo === 'editar' && (
                <ReadOnlyField label="ID de usuario" value={`#${modal.id}`} />
              )}
              <Field
                label="Nombre *"
                name="nombre"
                maxLength={120}
                required
                value={form.nombre}
                onChange={cambiar}
              />
              <Field
                label="Correo electrónico *"
                name="correo"
                type="email"
                maxLength={150}
                required
                value={form.correo}
                onChange={cambiar}
              />
              <label className="data-field">
                <span>Rol *</span>
                <select
                  value={form.rol}
                  onChange={(e) => cambiar('rol', e.target.value)}
                  disabled={modal.id === usuario.id_usuario}
                >
                  {ROLES_LIST.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </label>
              {form.rol === ROLES.ENCARGADO && (
                <label className="data-field">
                  <span>Sucursal asignada *</span>
                  <select
                    required
                    disabled={cargandoSucursales || Boolean(errorSucursales)}
                    value={form.id_sucursal}
                    onChange={(e) => cambiar('id_sucursal', e.target.value)}
                  >
                    <option value="">Seleccionar sucursal</option>
                    {sucursales.map((s) => (
                      <option
                        key={s.id_sucursal}
                        value={s.id_sucursal}
                        disabled={
                          s.activa !== 'S' && String(s.id_sucursal) !== String(form.id_sucursal)
                        }
                      >
                        {s.nombre} — {s.municipio}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="data-field">
                <span>Estado</span>
                <select
                  value={form.activo}
                  disabled={modal.id === usuario.id_usuario}
                  onChange={(e) => cambiar('activo', e.target.value)}
                >
                  <option value="S">Activo</option>
                  <option value="N">Inactivo</option>
                </select>
              </label>
              {modal.tipo === 'crear' && (
                <Field
                  label="Contraseña inicial *"
                  name="clave"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  required
                  value={form.clave}
                  onChange={cambiar}
                />
              )}
            </div>
            {form.rol === ROLES.ENCARGADO && cargandoSucursales && (
              <LoadingIndicator inline label="Cargando sucursales…" />
            )}
            <ErrorNotice message={errorSucursales} />
            <ErrorNotice message={errorForm} />
            <div className="data-form-actions">
              <button
                type="button"
                className="button button--secondary"
                disabled={guardando}
                onClick={cerrar}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="button button--primary"
                disabled={
                  guardando ||
                  (form.rol === ROLES.ENCARGADO && (cargandoSucursales || Boolean(errorSucursales)))
                }
              >
                {guardando ? 'Guardando…' : 'Guardar usuario'}
              </button>
            </div>
          </form>
        </DataPanel>
      )}
      {modal?.tipo === 'clave' && (
        <DataPanel
          title="Restablecer contraseña"
          subtitle={`Cuenta: ${modal.nombre}`}
          locked={guardando}
          onClose={cerrar}
        >
          <form className="data-form" onSubmit={restablecer}>
            <ReadOnlyField label="Usuario" value={modal.nombre} />
            <div className="data-form-grid">
              <Field
                label="Nueva contraseña *"
                name="clave"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
                value={clave}
                onChange={(_, value) => setClave(value)}
              />
            </div>
            <p className="usuarios-help">
              Debe contener entre 12 y 128 caracteres. Se almacena como hash seguro; no se mostrará
              después de guardar.
            </p>
            <ErrorNotice message={errorForm} />
            <div className="data-form-actions">
              <button
                className="button button--secondary"
                type="button"
                disabled={guardando}
                onClick={cerrar}
              >
                Cancelar
              </button>
              <button className="button button--primary" type="submit" disabled={guardando}>
                {guardando ? 'Guardando…' : 'Restablecer'}
              </button>
            </div>
          </form>
        </DataPanel>
      )}
      {confirmationModal}
    </div>
  );
}
