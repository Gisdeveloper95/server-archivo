/**
 * Componente de alerta profesional para validaciones de nombres de archivo
 * Muestra errores, advertencias y si el usuario puede saltarse las validaciones
 */
import React from 'react';
import { AlertCircle, Info, CheckCircle } from 'lucide-react';
import { HighlightedError } from './HighlightedError';

interface ValidationAlertProps {
  errors: string[];
  warnings: string[];
  canBypassDictionary?: boolean;
  userRole?: string;
  showDictionaryInfo?: boolean;
}

export const ValidationAlert: React.FC<ValidationAlertProps> = ({
  errors,
  warnings,
  canBypassDictionary = false,
  userRole = 'consultation',
  showDictionaryInfo = true,
}) => {
  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;

  if (!hasErrors && !hasWarnings) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Errors Display */}
      {hasErrors && (
        <div className="bg-red-50 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-600 rounded-lg p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-red-900 text-lg mb-2 flex items-center gap-2">
                ⛔ Errores de Validación
              </h4>
              <ul className="space-y-2">
                {errors.map((error, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-red-700 dark:text-red-300 font-bold mt-0.5">•</span>
                    <span className="text-red-800 dark:text-red-200 text-sm leading-relaxed">
                      <HighlightedError text={error} />
                    </span>
                  </li>
                ))}
              </ul>
              {canBypassDictionary && hasErrors && errors.some(e => e.toLowerCase().includes('diccionario')) && (
                <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-700">
                  <p className="text-red-900 text-sm font-semibold flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Debe corregir estos errores antes de continuar.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Warnings Display - Styled as helpful info, not alarming */}
      {hasWarnings && !hasErrors && (
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-slate-700 text-sm mb-1">
                Transformaciones aplicadas:
              </h4>
              <ul className="space-y-0.5">
                {warnings.map((warning, idx) => (
                  <li key={idx} className="text-slate-600 dark:text-slate-300 text-xs">
                    {warning}
                  </li>
                ))}
              </ul>

              {/* Dictionary Bypass Information - Solo mostrar si es relevante */}
              {showDictionaryInfo && warnings.some(w => w.toLowerCase().includes('diccionario')) && (
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  {canBypassDictionary ? (
                    <p className="text-slate-600 dark:text-slate-300 text-xs flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span>Su rol permite usar este nombre.</span>
                    </p>
                  ) : (
                    <p className="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      <span>Use "Sugerir con IA" para nombres optimizados.</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Character Limits Info - Solo si no hay nada que mostrar y showDictionaryInfo está activo */}
      {/* Removido: Esta info era redundante y creaba confusión */}
    </div>
  );
};

