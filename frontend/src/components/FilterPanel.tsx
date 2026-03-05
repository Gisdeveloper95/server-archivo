import { Filter, X } from 'lucide-react';
import { useState } from 'react';

interface FilterPanelProps {
  extensions: string[];
  years: number[];
  months: number[];
  onFilterChange: (filters: {
    extension?: string;
    year?: number;
    month?: number;
  }) => void;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const FilterPanel: React.FC<FilterPanelProps> = ({
  extensions,
  years,
  months,
  onFilterChange,
}) => {
  const [extension, setExtension] = useState('');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');

  const handleApply = () => {
    onFilterChange({
      extension: extension || undefined,
      year: year ? parseInt(year) : undefined,
      month: month ? parseInt(month) : undefined,
    });
  };

  const handleClear = () => {
    setExtension('');
    setYear('');
    setMonth('');
    onFilterChange({});
  };

  const hasFilters = extension || year || month;

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 mb-4">
      <div className="flex items-center space-x-2 mb-3">
        <Filter className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        <h3 className="font-medium text-gray-900 dark:text-white">Filtros</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Extension filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Extensión
          </label>
          <select
            value={extension}
            onChange={(e) => setExtension(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
          >
            <option value="">Todas</option>
            {extensions.map((ext) => (
              <option key={ext} value={ext}>
                .{ext}
              </option>
            ))}
          </select>
        </div>

        {/* Year filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Año
          </label>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
          >
            <option value="">Todos</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* Month filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Mes
          </label>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
          >
            <option value="">Todos</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {MONTH_NAMES[m - 1]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex space-x-2">
        <button
          onClick={handleApply}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Aplicar Filtros
        </button>
        {hasFilters && (
          <button
            onClick={handleClear}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-colors flex items-center space-x-2"
          >
            <X className="w-4 h-4" />
            <span>Limpiar</span>
          </button>
        )}
      </div>
    </div>
  );
};
