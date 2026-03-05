/**
 * Componente para mostrar contador de caracteres disponibles
 */
import React from 'react';

interface CharacterCounterProps {
  currentLength: number;
  maxLength: number;
  available: number;
  className?: string;
}

export const CharacterCounter: React.FC<CharacterCounterProps> = ({
  currentLength,
  maxLength,
  available,
  className = '',
}) => {
  // Calcular porcentaje usado
  const percentUsed = (currentLength / maxLength) * 100;

  // Determinar color según el porcentaje
  const getColor = () => {
    if (percentUsed >= 95) return 'text-red-600 dark:text-red-400';
    if (percentUsed >= 80) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getBarColor = () => {
    if (percentUsed >= 95) return 'bg-red-500';
    if (percentUsed >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Texto del contador */}
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-700 dark:text-gray-200">
          Caracteres: <span className={`font-semibold ${getColor()}`}>{currentLength}</span> / {maxLength}
        </span>
        <span className={`font-semibold ${getColor()}`}>
          {available >= 0 ? `${available} disponibles` : `¡Excede por ${Math.abs(available)}!`}
        </span>
      </div>

      {/* Barra de progreso */}
      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-2.5 rounded-full transition-all duration-300 ${getBarColor()}`}
          style={{ width: `${Math.min(percentUsed, 100)}%` }}
        />
      </div>

      {/* Advertencia si está cerca del límite */}
      {percentUsed >= 80 && (
        <p className={`text-xs ${percentUsed >= 95 ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
          {percentUsed >= 95
            ? '⚠️ ¡Límite de caracteres excedido!'
            : '⚠️ Cerca del límite de caracteres'}
        </p>
      )}
    </div>
  );
};
