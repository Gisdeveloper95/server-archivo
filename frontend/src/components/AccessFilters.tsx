import { useMemo, useState, useEffect } from 'react';
import { Filter, X, ChevronDown } from 'lucide-react';
import {
  DEPARTAMENTOS,
  FUENTES_FINANCIACION,
  ETAPAS_OPERATIVAS,
  parseAccessPath,
  getMunicipiosPorDepartamento,
  type ParsedAccessPath
} from '../data/divipola';

interface Access {
  id: number;
  base_path: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  granted_at: string;
  notes?: string;
}

interface FilterValues {
  departamento: string;
  municipio: string;
  fuente: string;
  etapa: string;
}

interface AccessFiltersProps {
  accesses: Access[];
  onFilteredAccessesChange: (filtered: Access[]) => void;
}

export const AccessFilters = ({ accesses, onFilteredAccessesChange }: AccessFiltersProps) => {
  const [filters, setFilters] = useState<FilterValues>({
    departamento: '',
    municipio: '',
    fuente: '',
    etapa: ''
  });

  const [isExpanded, setIsExpanded] = useState(true);

  // Parsear todas las rutas y extraer información
  const parsedAccesses = useMemo(() => {
    return accesses.map(access => ({
      access,
      parsed: parseAccessPath(access.base_path)
    }));
  }, [accesses]);

  // Solo considerar accesos filtrables (rutas de 01_actualiz_catas)
  const filterableAccesses = useMemo(() => {
    return parsedAccesses.filter(pa => pa.parsed.isFilterable);
  }, [parsedAccesses]);

  // Si no hay accesos filtrables, no mostrar filtros
  const hasFilterableAccesses = filterableAccesses.length > 0;

  // Obtener opciones únicas disponibles para cada filtro (en cascada)
  const availableOptions = useMemo(() => {
    // Departamentos únicos de todos los accesos filtrables
    const departamentos = new Map<string, string>();
    const municipios = new Map<string, string>();
    const fuentes = new Map<string, string>();
    const etapas = new Map<string, string>();

    // Filtrar progresivamente según los filtros seleccionados
    filterableAccesses.forEach(({ parsed }) => {
      // Siempre agregar departamentos disponibles
      if (parsed.codigoDepartamento) {
        departamentos.set(parsed.codigoDepartamento, parsed.nombreDepartamento || parsed.codigoDepartamento);
      }

      // Municipios: solo si coincide el departamento (o no hay filtro de departamento)
      if (!filters.departamento || parsed.codigoDepartamento === filters.departamento) {
        if (parsed.codigoMunicipio && parsed.codigoDepartamento) {
          const key = `${parsed.codigoDepartamento}-${parsed.codigoMunicipio}`;
          municipios.set(key, parsed.nombreMunicipio || parsed.codigoMunicipio);
        }

        // Fuentes: solo si coincide departamento Y municipio (o no hay filtros)
        if (!filters.municipio || parsed.codigoMunicipio === filters.municipio) {
          if (parsed.fuente) {
            fuentes.set(parsed.fuente, parsed.nombreFuente || parsed.fuente);
          }

          // Etapas: solo si coincide todo lo anterior
          if (!filters.fuente || parsed.fuente === filters.fuente) {
            if (parsed.etapa) {
              etapas.set(parsed.etapa, parsed.nombreEtapa || parsed.etapa);
            }
          }
        }
      }
    });

    return {
      departamentos: Array.from(departamentos.entries())
        .map(([codigo, nombre]) => ({ codigo, nombre }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),
      municipios: Array.from(municipios.entries())
        .map(([key, nombre]) => ({
          codigo: key.split('-')[1],
          nombre
        }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),
      fuentes: Array.from(fuentes.entries())
        .map(([codigo, nombre]) => ({ codigo, nombre }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),
      etapas: Array.from(etapas.entries())
        .map(([codigo, nombre]) => ({ codigo, nombre }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    };
  }, [filterableAccesses, filters.departamento, filters.municipio, filters.fuente]);

  // Aplicar filtros
  const filteredAccesses = useMemo(() => {
    // Si no hay filtros activos, retornar todos
    if (!filters.departamento && !filters.municipio && !filters.fuente && !filters.etapa) {
      return accesses;
    }

    return parsedAccesses
      .filter(({ parsed }) => {
        // Si no es filtrable, mostrar siempre (otros tipos de accesos)
        if (!parsed.isFilterable) return true;

        // Aplicar cada filtro
        if (filters.departamento && parsed.codigoDepartamento !== filters.departamento) {
          return false;
        }
        if (filters.municipio && parsed.codigoMunicipio !== filters.municipio) {
          return false;
        }
        if (filters.fuente && parsed.fuente !== filters.fuente) {
          return false;
        }
        if (filters.etapa && parsed.etapa !== filters.etapa) {
          return false;
        }
        return true;
      })
      .map(({ access }) => access);
  }, [accesses, parsedAccesses, filters]);

  // Notificar cambios al padre
  useEffect(() => {
    onFilteredAccessesChange(filteredAccesses);
  }, [filteredAccesses, onFilteredAccessesChange]);

  // Handler para cambio de filtro
  const handleFilterChange = (field: keyof FilterValues, value: string) => {
    setFilters(prev => {
      const newFilters = { ...prev, [field]: value };

      // Reset filtros dependientes (cascada)
      if (field === 'departamento') {
        newFilters.municipio = '';
        newFilters.fuente = '';
        newFilters.etapa = '';
      } else if (field === 'municipio') {
        newFilters.fuente = '';
        newFilters.etapa = '';
      } else if (field === 'fuente') {
        newFilters.etapa = '';
      }

      return newFilters;
    });
  };

  // Limpiar todos los filtros
  const clearFilters = () => {
    setFilters({
      departamento: '',
      municipio: '',
      fuente: '',
      etapa: ''
    });
  };

  // Verificar si hay filtros activos
  const hasActiveFilters = filters.departamento || filters.municipio || filters.fuente || filters.etapa;

  // No renderizar si no hay accesos filtrables
  if (!hasFilterableAccesses) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-4 border border-gray-200 dark:border-gray-700">
      {/* Header colapsable */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span className="font-medium text-gray-900 dark:text-white">
            Filtrar Accesos
          </span>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs rounded-full">
              {[filters.departamento, filters.municipio, filters.fuente, filters.etapa].filter(Boolean).length} activos
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Filtros */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
            {/* Departamento */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Departamento
              </label>
              <select
                value={filters.departamento}
                onChange={(e) => handleFilterChange('departamento', e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos los departamentos</option>
                {availableOptions.departamentos.map(d => (
                  <option key={d.codigo} value={d.codigo}>
                    {d.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Municipio */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Municipio
              </label>
              <select
                value={filters.municipio}
                onChange={(e) => handleFilterChange('municipio', e.target.value)}
                disabled={!filters.departamento}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Todos los municipios</option>
                {availableOptions.municipios.map(m => (
                  <option key={m.codigo} value={m.codigo}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Fuente de financiación */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Fuente
              </label>
              <select
                value={filters.fuente}
                onChange={(e) => handleFilterChange('fuente', e.target.value)}
                disabled={!filters.municipio}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Todas las fuentes</option>
                {availableOptions.fuentes.map(f => (
                  <option key={f.codigo} value={f.codigo}>
                    {f.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Etapa operativa */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Etapa
              </label>
              <select
                value={filters.etapa}
                onChange={(e) => handleFilterChange('etapa', e.target.value)}
                disabled={!filters.fuente}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Todas las etapas</option>
                {availableOptions.etapas.map(e => (
                  <option key={e.codigo} value={e.codigo}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Resumen y botón limpiar */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Mostrando {filteredAccesses.length} de {accesses.length} accesos
              </span>
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AccessFilters;
