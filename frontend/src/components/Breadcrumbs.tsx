import { ChevronRight, Home } from 'lucide-react';
import type { Breadcrumb } from '../types';

interface BreadcrumbsProps {
  breadcrumbs?: Breadcrumb[];
  onNavigate: (path: string) => void;
  onHome?: () => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ breadcrumbs = [], onNavigate, onHome }) => {
  const handleHomeClick = () => {
    if (onHome) {
      onHome();
    } else {
      onNavigate('');
    }
  };

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 overflow-x-auto pb-2">
      <button
        onClick={handleHomeClick}
        className="flex items-center px-2 py-1 rounded-md hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors shadow-sm dark:shadow-gray-900/30"
        title="Ir a inicio"
      >
        <Home className="w-4 h-4" />
      </button>

      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;

        return (
          <div key={index} className="flex items-center space-x-2">
            <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            {isLast ? (
              // Último breadcrumb: no clickeable, estilo diferente
              <span className="text-gray-900 dark:text-white font-medium whitespace-nowrap cursor-default px-2 py-1">
                {crumb.name}
              </span>
            ) : (
              // Breadcrumbs anteriores: clickeables con sombra
              <button
                onClick={() => onNavigate(crumb.path)}
                className="px-2 py-1 rounded-md hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors whitespace-nowrap shadow-sm dark:shadow-gray-900/30"
              >
                {crumb.name}
              </button>
            )}
          </div>
        );
      })}
    </nav>
  );
};
