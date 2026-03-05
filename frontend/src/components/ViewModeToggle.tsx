/**
 * Toggle para cambiar entre vista de Lista y vista de Árbol
 * Estilo OneDrive
 */
import { List, GitBranch } from 'lucide-react';

export type ViewMode = 'list' | 'tree';

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export const ViewModeToggle = ({ viewMode, onViewModeChange }: ViewModeToggleProps) => {
  return (
    <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
      <button
        onClick={() => onViewModeChange('list')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          viewMode === 'list'
            ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:text-white'
        }`}
        title="Vista de lista"
      >
        <List className="w-4 h-4" />
        <span className="hidden sm:inline">Lista</span>
      </button>
      <button
        onClick={() => onViewModeChange('tree')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          viewMode === 'tree'
            ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:text-white'
        }`}
        title="Vista de árbol"
      >
        <GitBranch className="w-4 h-4" />
        <span className="hidden sm:inline">Árbol</span>
      </button>
    </div>
  );
};
