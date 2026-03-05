/**
 * Modal para crear carpetas con validación y soporte de IA
 */
import React, { useState, useCallback, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Loader2, FolderPlus, Sparkles } from 'lucide-react';
import { fileOpsApi } from '../api/fileOps';
import type { SuggestNameResponse } from '../api/fileOps';
import { CharacterCounter } from './CharacterCounter';
import { HighlightedError } from './HighlightedError';
import { useAuthStore } from '../store/authStore';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
  onCreateComplete: () => void;
}

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  isOpen,
  onClose,
  currentPath,
  onCreateComplete,
}) => {
  const { user } = useAuthStore();
  const [folderName, setFolderName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [pathInfo, setPathInfo] = useState<{ available_chars: number; path_length: number; full_path_preview?: string } | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<SuggestNameResponse | null>(null);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [useDictionaryRules, setUseDictionaryRules] = useState(true); // Default: use dictionary

  // Determinar si el usuario puede saltarse validación de diccionario
  // Usa las exenciones calculadas del backend (incluye rol + permisos individuales)
  const canBypassDictionary = user?.naming_exemptions?.exempt_from_naming_rules ??
                              (user?.role === 'admin' || user?.role === 'superadmin');

  // Load path info when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('Loading path info for:', currentPath);
      fileOpsApi.getPathInfo(currentPath, '')
        .then((info) => {
          console.log('Path info received:', info);
          setPathInfo(info);
        })
        .catch((err) => console.error('Error loading path info:', err));
    }
  }, [isOpen, currentPath]);

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    setFolderName('');
    setValidationErrors([]);
    setValidationWarnings([]);
    setIsCreating(false);
    setPathInfo(null);
    setAiSuggestion(null);
    setIsLoadingSuggestion(false);
    setIsValidating(false);
    setUseDictionaryRules(true); // Reset to default
    onClose();
  }, [onClose]);

  // Debounced validation effect - espera 500ms después de que el usuario deja de escribir
  useEffect(() => {
    if (!folderName.trim()) {
      setValidationErrors([]);
      setValidationWarnings([]);
      setIsValidating(false);
      return;
    }

    setIsValidating(true);
    const timeoutId = setTimeout(async () => {
      try {
        const validation = await fileOpsApi.validateName({
          name: folderName,
          current_path: currentPath,
          extension: '', // No extension for folders
        });

        setValidationErrors(validation.errors || []);
        setValidationWarnings(validation.warnings || []);
      } catch (error: any) {
        console.error('Error validando nombre:', error);
        setValidationErrors([error.response?.data?.error || 'Error al validar nombre']);
      } finally {
        setIsValidating(false);
      }
    }, 300); // Espera 300ms después de que el usuario deja de escribir

    return () => clearTimeout(timeoutId);
  }, [folderName, currentPath]);

  // Handle name change (solo actualiza el estado, la validación se hace con debounce)
  const handleNameChange = (value: string) => {
    setFolderName(value);
    // La validación se dispara automáticamente por el useEffect de arriba
  };

  // Get AI suggestion
  const handleGetAiSuggestion = async () => {
    if (!folderName.trim()) {
      setValidationErrors(['Ingrese un nombre base antes de solicitar sugerencia']);
      return;
    }

    setIsLoadingSuggestion(true);
    try {
      const suggestion = await fileOpsApi.suggestName({
        original_name: folderName,
        current_path: currentPath,
        extension: '', // No extension for folders
        use_dictionary: useDictionaryRules, // Pass user preference
      });

      setAiSuggestion(suggestion);

      // Optionally auto-apply the suggestion
      if (suggestion.suggested_name) {
        handleNameChange(suggestion.suggested_name);
        // La validación se disparará automáticamente por el useEffect
      }
    } catch (error: any) {
      console.error('Error obteniendo sugerencia:', error);
      setValidationErrors([error.response?.data?.error || 'Error al obtener sugerencia de IA']);
    } finally {
      setIsLoadingSuggestion(false);
    }
  };

  // Handle create folder
  const handleCreate = async () => {
    if (!folderName.trim() || validationErrors.length > 0) return;

    setIsCreating(true);
    try {
      await fileOpsApi.createFolder(currentPath, folderName);

      // Success - close modal and refresh
      onCreateComplete();
      handleClose();
    } catch (error: any) {
      console.error('Error creando carpeta:', error);
      setValidationErrors([error.response?.data?.error || 'Error al crear carpeta']);
    } finally {
      setIsCreating(false);
    }
  };

  // Calculate path info for character counter
  const getCurrentLength = () => {
    if (!pathInfo) {
      console.log('getCurrentLength: pathInfo is null');
      return 0;
    }
    // path_length ya incluye la ruta base + currentPath + separador
    // Solo agregamos la longitud del folderName
    const length = pathInfo.path_length + (folderName ? folderName.length : 0);
    console.log('getCurrentLength:', { path_length: pathInfo.path_length, folderNameLength: folderName.length, total: length });
    return length;
  };

  const getAvailableChars = () => {
    if (!pathInfo) {
      console.log('getAvailableChars: pathInfo is null');
      return 260;
    }
    // available_chars ya contempla la ruta base + currentPath + separador
    // Restamos solo la longitud del nombre actual
    const available = pathInfo.available_chars - (folderName ? folderName.length : 0);
    console.log('getAvailableChars:', { available_chars: pathInfo.available_chars, folderNameLength: folderName.length, available });
    return available;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-gray-900/50 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <FolderPlus className="w-6 h-6" />
            Crear Nueva Carpeta
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 dark:text-gray-200 transition-colors"
            disabled={isCreating}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Current Path Display - Full Windows format */}
          <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded border border-gray-200 dark:border-gray-700">
            <span className="font-medium text-gray-600 dark:text-gray-300">Ubicación: </span>
            <span className="font-mono break-all">
              {pathInfo?.full_path_preview || `\\\\repositorio\\DirGesCat\\2510SP\\H_Informacion_Consulta\\Sub_Proy\\${currentPath.replace(/\//g, '\\')}`}
            </span>
          </div>

          {/* Folder Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Nombre de la carpeta:
            </label>
            <div className="relative">
              <input
                type="text"
                value={folderName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ingrese el nombre de la carpeta..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                disabled={isCreating}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && folderName.trim() && validationErrors.length === 0 && !isValidating) {
                    handleCreate();
                  }
                }}
              />
              {isValidating && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
              Use solo términos del diccionario oficial separados por guión bajo (_)
              {isValidating && <span className="text-blue-600 dark:text-blue-400 ml-2">• Validando...</span>}
            </p>
          </div>

          {/* Dictionary Enforcement Checkbox - Only for exempt users */}
          {canBypassDictionary && (
            <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useDictionaryRules}
                  onChange={(e) => setUseDictionaryRules(e.target.checked)}
                  className="mt-1 w-4 h-4 text-purple-600 dark:text-purple-400 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-purple-500 focus:ring-2"
                  disabled={isCreating || isLoadingSuggestion}
                />
                <div className="flex-1">
                  <span className="font-semibold text-purple-900 dark:text-purple-100">
                    Usar reglas del diccionario con IA
                  </span>
                  <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                    Cuando está activado, la IA solo sugerirá nombres usando términos del diccionario oficial.
                    Cuando está desactivado, la IA puede usar cualquier palabra apropiada.
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 italic">
                    Como usuario {user?.role === 'superadmin' ? 'superadmin' : 'admin'}, puedes elegir si aplicar las reglas del diccionario.
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* AI Suggestion Button */}
          <button
            onClick={handleGetAiSuggestion}
            disabled={isLoadingSuggestion || isCreating || !folderName.trim()}
            className="w-full py-2 px-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:from-purple-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingSuggestion ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Sugerir con IA (Opcional)
              </>
            )}
          </button>

          {/* AI Suggestion Display - Enhanced */}
          {aiSuggestion && (
            <div className={`rounded-lg p-4 border ${
              aiSuggestion.valid
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 dark:border-green-600'
                : aiSuggestion.errors.length > 0
                  ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-300 dark:border-red-600'
                  : 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300'
            }`}>
              <div className="flex items-start gap-3">
                {aiSuggestion.valid ? (
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                ) : aiSuggestion.errors.length > 0 ? (
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="font-semibold text-gray-800 dark:text-gray-100">Sugerencia IA</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      aiSuggestion.valid
                        ? 'bg-green-200 text-green-800 dark:text-green-200'
                        : aiSuggestion.errors.length > 0
                          ? 'bg-red-200 text-red-800 dark:text-red-200'
                          : 'bg-yellow-200 text-yellow-800 dark:text-yellow-200'
                    }`}>
                      {aiSuggestion.valid ? 'VÁLIDO' : aiSuggestion.errors.length > 0 ? 'ERRORES' : 'ADVERTENCIAS'}
                    </span>
                  </div>
                  <p className={`text-sm font-mono px-3 py-2 rounded border ${
                    aiSuggestion.valid
                      ? 'bg-white dark:bg-gray-800 border-green-200 dark:border-green-700'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}>
                    {aiSuggestion.suggested_name}
                  </p>

                  {/* Transformaciones realizadas */}
                  {aiSuggestion.warnings.length > 0 && (
                    <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                      <span className="font-medium">Transformaciones:</span>
                      <ul className="mt-1 space-y-0.5 list-disc list-inside text-xs">
                        {aiSuggestion.warnings.slice(0, 5).map((w, i) => (
                          <li key={i} className="text-gray-500 dark:text-gray-400 dark:text-gray-500">{w}</li>
                        ))}
                        {aiSuggestion.warnings.length > 5 && (
                          <li className="text-gray-400 dark:text-gray-500 italic">...y {aiSuggestion.warnings.length - 5} más</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Metadata */}
                  {aiSuggestion.metadata && (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300">
                        {aiSuggestion.metadata.original_length} → {aiSuggestion.metadata.suggested_length} caracteres
                      </span>
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300">
                        {aiSuggestion.metadata.available_chars} caracteres disponibles
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Character Counter */}
          {folderName && (
            <CharacterCounter
              currentLength={getCurrentLength()}
              maxLength={260}
              available={getAvailableChars()}
            />
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-800 dark:text-red-200 mb-2">Errores de validación:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {validationErrors.map((error, idx) => (
                      <li key={idx} className="text-red-700 dark:text-red-300 text-sm">
                        <HighlightedError text={error} />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Validation Info - Transformaciones aplicadas (estilo sutil) */}
          {validationWarnings.length > 0 && validationErrors.length === 0 && (
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-slate-400 dark:text-slate-500 dark:text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-slate-600 dark:text-slate-300 text-sm mb-1">Transformaciones aplicadas:</p>
                  <ul className="space-y-0.5">
                    {validationWarnings.map((warning, idx) => (
                      <li key={idx} className="text-slate-500 dark:text-slate-400 text-xs">{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-semibold mb-1">Reglas para nombres de carpetas:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Solo use términos del diccionario oficial</li>
                  <li>Separe términos con guión bajo (_)</li>
                  <li>No use espacios, puntos o caracteres especiales</li>
                  <li>El nombre completo debe respetar el límite de 260 caracteres</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 dark:bg-gray-900">
          <button
            onClick={handleClose}
            disabled={isCreating}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={!folderName.trim() || validationErrors.length > 0 || isCreating || isValidating}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creando...
              </>
            ) : isValidating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Validando...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Crear Carpeta
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
