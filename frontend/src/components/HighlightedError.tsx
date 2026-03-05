/**
 * Componente para resaltar palabras sugeridas del diccionario en verde oscuro
 * Detecta palabras entre comillas simples ('palabra') y las resalta
 */
import React from 'react';

interface HighlightedErrorProps {
  text: string;
  className?: string;
}

/**
 * Resalta las palabras entre comillas simples en verde oscuro
 * Ejemplo: "'inf' no está en el diccionario" -> la palabra 'inf' se resalta en verde
 */
export const HighlightedError: React.FC<HighlightedErrorProps> = ({ text, className = '' }) => {
  // Regex para encontrar palabras entre comillas simples
  const parts = text.split(/('[\w\d_-]+')/g);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        // Si la parte está entre comillas simples, resaltarla en verde
        if (part.startsWith("'") && part.endsWith("'")) {
          const word = part.slice(1, -1); // Remover las comillas
          return (
            <span
              key={index}
              className="text-green-700 dark:text-green-300 font-semibold"
              style={{ color: '#15803d' }} // green-700 para asegurar consistencia
            >
              '{word}'
            </span>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};

/**
 * Hook para procesar una lista de errores y resaltar las palabras sugeridas
 */
export const useHighlightedErrors = (errors: string[]) => {
  return errors.map((error, idx) => (
    <HighlightedError key={idx} text={error} />
  ));
};

export default HighlightedError;
