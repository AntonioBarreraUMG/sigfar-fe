import departamentosMunicipios from '../data/departamentos-municipios.json';

// Catálogo estático proporcionado para SIGFAR. Sin búsqueda, sugerencias ni dependencias externas.
const DEPARTAMENTOS = Object.keys(departamentosMunicipios);
export function municipiosDe(departamento) {
  return departamentosMunicipios[departamento] || [];
}

export function UbicacionSelect({
  departamento = '',
  municipio = '',
  onDepartamentoChange,
  onMunicipioChange,
  disabled = false,
  required = true,
  sufijo = '',
}) {
  const municipios = municipiosDe(departamento);
  // Si un registro histórico contiene un valor ajeno al catálogo, conservarlo visible al editar.
  const departamentoAnterior = departamento && !DEPARTAMENTOS.includes(departamento);
  const municipioAnterior = municipio && !municipios.includes(municipio);
  return (
    <>
      <label className="data-field">
        <span>
          Departamento{sufijo} {required ? '*' : ''}
        </span>
        <select
          value={departamento}
          required={required}
          disabled={disabled}
          onChange={(event) => onDepartamentoChange(event.target.value)}
        >
          <option value="">Selecciona un departamento</option>
          {departamentoAnterior && (
            <option value={departamento}>{departamento} (dato anterior)</option>
          )}
          {DEPARTAMENTOS.map((nombre) => (
            <option key={nombre} value={nombre}>
              {nombre}
            </option>
          ))}
        </select>
      </label>
      <label className="data-field">
        <span>
          Municipio{sufijo} {required ? '*' : ''}
        </span>
        <select
          value={municipio}
          required={required}
          disabled={disabled || !departamento || departamentoAnterior}
          onChange={(event) => onMunicipioChange(event.target.value)}
        >
          <option value="">
            {departamento ? 'Selecciona un municipio' : 'Selecciona primero un departamento'}
          </option>
          {municipioAnterior && <option value={municipio}>{municipio} (dato anterior)</option>}
          {municipios.map((nombre) => (
            <option key={nombre} value={nombre}>
              {nombre}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
