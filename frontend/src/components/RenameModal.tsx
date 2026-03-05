/**
 * Modal para renombrar archivos/carpetas con integración de IA
 * Usa SmartNamingService para validación inteligente con reglas IGAC
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Loader2,
  Edit3,
  BookOpen,
  AlertTriangle,
  Info,
  ShieldCheck,
  Brain,
} from 'lucide-react';
import { filesApi, type SmartRenameResponse, type PartAnalysis } from '../api/files';
import { fileOpsApi } from '../api/fileOps';
import { CharacterCounter } from './CharacterCounter';
import { HighlightedError } from './HighlightedError';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from './Toast';

interface RenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
  itemToRename: {
    name: string;
    path: string;
    isDirectory: boolean;
  } | null;
  onRenameComplete: () => void;
}

// Componente para mostrar el análisis visual de cada parte del nombre
const PartAnalysisDisplay: React.FC<{ parts: PartAnalysis[] }> = ({ parts }) => {
  if (!parts || parts.length === 0) return null;

  const getPartColor = (part: PartAnalysis) => {
    switch (part.source) {
      case 'dictionary':
        return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 border-green-300 dark:border-green-600';
      case 'preserved':
        return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-600';
      case 'ai_candidate':
        return 'bg-yellow-100 text-yellow-800 dark:text-yellow-200 border-yellow-300';
      case 'removed':
        return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 border-red-300 dark:border-red-600 line-through';
      case 'warning':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600';
    }
  };

  const getPartIcon = (part: PartAnalysis) => {
    switch (part.type) {
      case 'dictionary':
        return <BookOpen className="w-3 h-3" />;
      case 'number':
      case 'date':
      case 'cadastral_code':
        return <span className="text-xs font-mono">#</span>;
      case 'proper_name':
        return <span className="text-xs">👤</span>;
      case 'standard_english':
        return <span className="text-xs">EN</span>;
      case 'connector':
      case 'generic':
        return <AlertTriangle className="w-3 h-3" />;
      default:
        return <Brain className="w-3 h-3" />;
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 mt-3">
      <p className="text-xs text-gray-600 dark:text-gray-300 mb-2 font-medium">Análisis de partes:</p>
      <div className="flex flex-wrap gap-1.5">
        {parts.map((part, idx) => (
          <span
            key={idx}
            className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded border ${getPartColor(part)}`}
            title={part.meaning || `Tipo: ${part.type}`}
          >
            {getPartIcon(part)}
            <span className="font-mono">{part.value}</span>
            {part.meaning && (
              <span className="text-[10px] opacity-70">({part.meaning.slice(0, 20)}...)</span>
            )}
          </span>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-gray-500 dark:text-gray-400 dark:text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-green-300"></span> Diccionario
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-blue-300"></span> Preservado
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-yellow-300"></span> Requiere IA
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-red-300"></span> Removido
        </span>
      </div>
    </div>
  );
};

// Componente de alertas de validación mejorado
const SmartValidationAlert: React.FC<{
  errors: string[];
  warnings: string[];
  formatChanges: string[];
  isExempt: boolean;
  usedAi: boolean;
}> = ({ errors, warnings, formatChanges, isExempt, usedAi }) => {
  if (errors.length === 0 && warnings.length === 0 && formatChanges.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Cambios de formato aplicados */}
      {formatChanges.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Cambios de formato aplicados:</p>
              <ul className="mt-1 text-xs text-blue-700 dark:text-blue-300 list-disc list-inside">
                {formatChanges.map((change, idx) => (
                  <li key={idx}>{change}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Errores */}
      {errors.length > 0 && (
        <div className={`rounded-lg p-3 ${isExempt ? 'bg-orange-50 border border-orange-200' : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700'}`}>
          <div className="flex items-start gap-2">
            <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isExempt ? 'text-orange-600' : 'text-red-600 dark:text-red-400'}`} />
            <div>
              <p className={`text-sm font-medium ${isExempt ? 'text-orange-800' : 'text-red-800 dark:text-red-200'}`}>
                {isExempt ? 'Advertencias (usuario exento):' : 'Errores de validación:'}
              </p>
              <ul className={`mt-1 text-xs list-disc list-inside ${isExempt ? 'text-orange-700' : 'text-red-700 dark:text-red-300'}`}>
                {errors.map((error, idx) => (
                  <li key={idx}><HighlightedError text={error} /></li>
                ))}
              </ul>
              {isExempt && (
                <p className="text-xs text-orange-600 mt-2 italic flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Como usuario exento, puedes continuar a pesar de estos errores.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transformaciones aplicadas (estilo informativo sutil) */}
      {warnings.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-slate-400 dark:text-slate-500 dark:text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-300">Transformaciones aplicadas:</p>
              <ul className="mt-1 text-xs text-slate-500 dark:text-slate-400 list-disc list-inside">
                {warnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Indicador de IA */}
      {usedAi && (
        <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-2">
          <p className="text-xs text-purple-700 dark:text-purple-300 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Nombre generado con asistencia de IA
          </p>
        </div>
      )}
    </div>
  );
};

export const RenameModal: React.FC<RenameModalProps> = ({
  isOpen,
  onClose,
  currentPath,
  itemToRename,
  onRenameComplete,
}) => {
  const { user } = useAuthStore();
  const toast = useToast();
  const [newName, setNewName] = useState('');
  const [smartResult, setSmartResult] = useState<SmartRenameResponse | null>(null);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [formatChanges, setFormatChanges] = useState<string[]>([]);
  const [partsAnalysis, setPartsAnalysis] = useState<PartAnalysis[]>([]);
  const [isExempt, setIsExempt] = useState(false);

  // Initialize with current name when modal opens
  useEffect(() => {
    if (isOpen && itemToRename) {
      if (itemToRename.isDirectory) {
        setNewName(itemToRename.name);
      } else {
        // For files, remove extension
        const nameWithoutExt =
          itemToRename.name.substring(0, itemToRename.name.lastIndexOf('.')) || itemToRename.name;
        setNewName(nameWithoutExt);
      }
      setSmartResult(null);
      setValidationErrors([]);
      setValidationWarnings([]);
      setFormatChanges([]);
      setPartsAnalysis([]);

      // Check user exemptions
      filesApi.getNamingExemptions().then((res) => {
        if (res.success) {
          setIsExempt(res.exemptions.exempt_from_naming_rules);
        }
      }).catch(() => {
        // Default to check by role
        setIsExempt(user?.role === 'admin' || user?.role === 'superadmin');
      });
    }
  }, [isOpen, itemToRename, user]);

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    setNewName('');
    setSmartResult(null);
    setValidationErrors([]);
    setValidationWarnings([]);
    setFormatChanges([]);
    setPartsAnalysis([]);
    setIsLoadingSuggestion(false);
    setIsValidating(false);
    setIsRenaming(false);
    onClose();
  }, [onClose]);

  // Get file extension
  const getFileExtension = () => {
    if (!itemToRename || itemToRename.isDirectory) return '';
    return itemToRename.name.substring(itemToRename.name.lastIndexOf('.'));
  };

  // Get Smart AI suggestion
  const handleGetSmartSuggestion = async () => {
    if (!itemToRename) return;

    setIsLoadingSuggestion(true);
    try {
      const nameWithoutExt = itemToRename.isDirectory
        ? itemToRename.name
        : itemToRename.name.substring(0, itemToRename.name.lastIndexOf('.')) || itemToRename.name;

      const result = await filesApi.smartRename({
        name: nameWithoutExt + getFileExtension(),
        current_path: currentPath,
      });

      setSmartResult(result);
      setNewName(result.suggested_base);
      setValidationErrors(result.errors || []);
      setValidationWarnings(result.warnings || []);
      setFormatChanges(result.format_changes || []);
      setPartsAnalysis(result.parts_analysis || []);
    } catch (error: any) {
      console.error('Error obteniendo sugerencia inteligente:', error);
      setValidationErrors([error.response?.data?.error || 'Error al obtener sugerencia']);
    } finally {
      setIsLoadingSuggestion(false);
    }
  };

  // Validate new name with smart validation
  const handleNameChange = async (value: string) => {
    setNewName(value);

    if (!value.trim() || !itemToRename) {
      setValidationErrors([]);
      setValidationWarnings([]);
      setFormatChanges([]);
      setPartsAnalysis([]);
      return;
    }

    // Debounce validation
    setIsValidating(true);
    try {
      const extension = itemToRename.isDirectory ? '' : getFileExtension();

      const result = await filesApi.smartValidate({
        name: value + extension,
        current_path: currentPath,
      });

      setValidationErrors(result.errors || []);
      setValidationWarnings(result.warnings || []);
      setFormatChanges(result.format_changes || []);
      setPartsAnalysis(result.parts_analysis || []);
    } catch (error: any) {
      console.error('Error validando nombre:', error);
      setValidationErrors([error.response?.data?.error || 'Error al validar nombre']);
    } finally {
      setIsValidating(false);
    }
  };

  // Handle rename
  const handleRename = async () => {
    if (!itemToRename || !newName.trim()) return;

    // Si hay errores de validación y el usuario NO está exento, bloquear
    if (validationErrors.length > 0 && !isExempt) return;

    setIsRenaming(true);
    try {
      const extension = itemToRename.isDirectory ? '' : getFileExtension();
      const finalName = `${newName}${extension}`;

      await fileOpsApi.rename({
        old_path: itemToRename.path,
        new_name: finalName,
      });

      toast.success(`"${itemToRename.name}" renombrado a "${finalName}" exitosamente`);
      onRenameComplete();
      handleClose();
    } catch (error: any) {
      console.error('Error renombrando:', error);
      setValidationErrors([error.response?.data?.error || 'Error al renombrar']);
    } finally {
      setIsRenaming(false);
    }
  };

  // Calculate path info for character counter
  const getCurrentLength = () => {
    if (!itemToRename) return 0;
    const extension = itemToRename.isDirectory ? '' : getFileExtension();
    const fullPath = `${currentPath}/${newName}${extension}`;
    return fullPath.length;
  };

  const getAvailableChars = () => {
    return 260 - getCurrentLength();
  };

  if (!isOpen || !itemToRename) return null;

  const isFile = !itemToRename.isDirectory;
  const originalNameWithoutExt = isFile
    ? itemToRename.name.substring(0, itemToRename.name.lastIndexOf('.')) || itemToRename.name
    : itemToRename.name;

  const canRename =
    newName.trim() &&
    (validationErrors.length === 0 || isExempt) &&
    !isRenaming &&
    newName !== originalNameWithoutExt;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-gray-900/50 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Edit3 className="w-6 h-6" />
            Renombrar {itemToRename.isDirectory ? 'Carpeta' : 'Archivo'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 dark:text-gray-200 transition-colors"
            disabled={isRenaming}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* User Exemption Badge */}
          {isExempt && (
            <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <div>
                <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                  Usuario con exenciones activas
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400">
                  Puedes nombrar archivos sin restricciones de diccionario ni límites
                </p>
              </div>
            </div>
          )}

          {/* Current Name Display */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Nombre actual:</p>
            <p className="text-lg font-semibold text-gray-800 dark:text-gray-100 break-all">{itemToRename.name}</p>
          </div>

          {/* New Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Nuevo nombre{isFile ? ' (sin extensión)' : ''}:
            </label>
            <div className="relative">
              <input
                type="text"
                value={newName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={originalNameWithoutExt}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                disabled={isRenaming}
                autoFocus
              />
              {isValidating && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400 dark:text-gray-500" />
                </div>
              )}
            </div>
            {isFile && (
              <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
                Extensión: <span className="font-semibold">{getFileExtension()}</span>
              </p>
            )}
          </div>

          {/* Smart AI Suggestion Button */}
          <button
            onClick={handleGetSmartSuggestion}
            disabled={isLoadingSuggestion || isRenaming}
            className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-semibold flex items-center justify-center gap-2 hover:from-purple-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingSuggestion ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generando sugerencia con IA...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Sugerir nombre inteligente (IGAC + IA)
              </>
            )}
          </button>

          {/* Smart Result Display */}
          {smartResult && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 dark:text-gray-100 mb-2">Nombre sugerido:</p>
                  <p className="text-lg font-mono bg-white dark:bg-gray-800 px-3 py-2 rounded border border-purple-200 dark:border-purple-700">
                    {smartResult.suggested_name}
                  </p>

                  {/* Parts Analysis */}
                  <PartAnalysisDisplay parts={smartResult.parts_analysis} />

                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-3 italic">
                    💡 Puede editar el nombre en el campo <strong>"Nuevo nombre"</strong> que está más arriba
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Character Counter */}
          <CharacterCounter
            currentLength={getCurrentLength()}
            maxLength={260}
            available={getAvailableChars()}
          />

          {/* Smart Validation Alerts */}
          <SmartValidationAlert
            errors={validationErrors}
            warnings={validationWarnings}
            formatChanges={formatChanges}
            isExempt={isExempt}
            usedAi={smartResult?.used_ai || false}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 dark:bg-gray-900">
          <button
            onClick={handleClose}
            disabled={isRenaming}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={handleRename}
            disabled={!canRename}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isRenaming ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Renombrando...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Renombrar
              </>
            )}
          </button>
        </div>
      </div>
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
    </div>
  );
};
