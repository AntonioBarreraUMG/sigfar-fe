import { useCallback, useState } from 'react';
import { Icon } from '../components/Icon.jsx';
import { DataPanel, ReadOnlyField, ErrorNotice, Field, PageHeading, Pager, StatusLabel, SuccessNotice, TableState } from '../components/DataUI.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { usePagedData } from '../hooks/usePagedData.js';
import { listApi, PAGE_LIMIT, saveCatalogoApi } from '../services/catalogosApi.js';
import { medicamentoPayload, puedeAdministrarCatalogos } from '../utils/catalogos.js';

const EMPTY = { codigo: '', nombre: '', presentacion: '', activo: 'S' };
export function MedicamentosPage() {
  const { api, usuario } = useAuth();
  const admin = puedeAdministrarCatalogos(usuario.rol);
  const [desde, setDesde] = useState(0);
  const [activo, setActivo] = useState('');
  const [panel, setPanel] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errorForm, setErrorForm] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const cargar = useCallback(opts => listApi(api, 'medicamentos', { activo }, opts), [api, activo]);
  const { filas, cargando, error, refrescar } = usePagedData(cargar, { desde });
  function editar(row) { setPanel(row.id_medicamento); setForm({ ...row }); setErrorForm(''); setMensaje(''); }
  function nuevo() { setPanel('nuevo'); setForm({ ...EMPTY }); setErrorForm(''); setMensaje(''); }
  function cerrar() { if (!guardando) setPanel(null); }
  async function guardar(event) {
    event.preventDefault();
    if (guardando) return;
    setErrorForm(''); setMensaje('');
    try {
      const data = medicamentoPayload(form);
      setGuardando(true);
      await saveCatalogoApi(api, 'medicamentos', data, panel === 'nuevo' ? null : panel);
      setMensaje(panel === 'nuevo' ? 'Medicamento registrado correctamente.' : 'Medicamento actualizado correctamente.');
      setPanel(null); setDesde(0); refrescar();
    } catch (err) { setErrorForm(err.message || 'No se pudo guardar.'); }
    finally { setGuardando(false); }
  }
  return <div className="page-stack">
    <PageHeading eyebrow="CATÁLOGO FARMACÉUTICO" title="Medicamentos" description="Catálogo único de medicamentos y presentaciones utilizado por todas las farmacias." action={admin && <button type="button" onClick={nuevo} className="button button--primary"><Icon name="pill" size={18}/> Nuevo medicamento</button>} />
    <SuccessNotice message={mensaje} onClose={() => setMensaje('')}/>
    <section className="data-card"><div className="data-toolbar"><label className="data-field data-field--compact"><span>Estado</span><select value={activo} onChange={e => { setActivo(e.target.value); setDesde(0); }}><option value="">Todos</option><option value="S">Activos</option><option value="N">Inactivos</option></select></label><button className="button button--secondary" onClick={refrescar} disabled={cargando} type="button"><Icon name="refresh" size={16}/> Actualizar</button></div>
    <ErrorNotice message={error} retry={refrescar}/><div className="table-wrap"><table className="data-table"><thead><tr><th>Código</th><th>Medicamento</th><th>Presentación</th><th>Estado</th>{admin && <th>Acción</th>}</tr></thead><tbody>{!cargando && !error && filas.map(row => <tr key={row.id_medicamento}><td><span className="mono-tag">{row.codigo}</span></td><td><strong>{row.nombre}</strong></td><td>{row.presentacion}</td><td><StatusLabel active={row.activo === 'S'}/></td>{admin && <td><button type="button" className="table-action" onClick={() => editar(row)}>Editar</button></td>}</tr>)}</tbody></table></div>
    <TableState loading={cargando} error={error} length={filas.length}/>{!error && <Pager desde={desde} limite={PAGE_LIMIT} count={filas.length} onPageChange={setDesde} disabled={cargando}/>}</section>
    {!admin && <div className="inline-tip"><Icon name="lock" size={18}/><span>El catálogo está disponible para consulta. Solo el administrador central puede cambiarlo.</span></div>}
    {panel !== null && admin && <DataPanel title={panel === 'nuevo' ? 'Nuevo medicamento' : 'Editar medicamento'} subtitle="Esta etapa no maneja lotes, caducidades ni precios comerciales." onClose={cerrar} locked={guardando}><form onSubmit={guardar} className="data-form"><div className="data-form-grid">
      <Field label="Código *" name="codigo" maxLength={30} value={form.codigo} onChange={(k,v) => setForm(f => ({ ...f, [k]: v }))} required/>
      <Field label="Nombre *" name="nombre" maxLength={150} value={form.nombre} onChange={(k,v) => setForm(f => ({ ...f, [k]: v }))} required/>
      <Field label="Presentación *" name="presentacion" maxLength={100} value={form.presentacion} onChange={(k,v) => setForm(f => ({ ...f, [k]: v }))} required/>
      <label className="data-field"><span>Estado</span><select value={form.activo} onChange={e => setForm(f => ({ ...f, activo: e.target.value }))}><option value="S">Activo</option><option value="N">Inactivo</option></select></label>
    </div><ErrorNotice message={errorForm}/><div className="data-form-actions"><button className="button button--secondary" onClick={cerrar} type="button" disabled={guardando}>Cancelar</button><button className="button button--primary" type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar medicamento'}</button></div></form></DataPanel>}
  </div>;
}
