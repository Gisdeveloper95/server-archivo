/**
 * DeleteConfirmModal - Modal de confirmación para eliminar archivos/directorios
 * Muestra lista detallada de lo que se eliminará con progreso de escaneo
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Trash2, AlertTriangle, Loader2, Folder, File,
  ChevronDown, ChevronRight, Download, Database, Map,
  FileText, CheckCircle, XCircle
} from 'lucide-react';
import { fileOpsApi } from '../api/fileOps';
import { FileIcon } from './FileIcon';
import type { FileItem } from '../types';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemToDelete: FileItem | null;
  onDeleteComplete: () => void;
}

type ScanState = 'idle' | 'scanning' | 'scanned' | 'deleting' | 'deleted' | 'error';

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  itemToDelete,
  onDeleteComplete,
}) => {
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [scanResult, setScanResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteResult, setDeleteResult] = useState<any>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['directories', 'files']));
  const [searchFilter, setSearchFilter] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen && itemToDelete) {
      setScanState('idle');
      setScanResult(null);
      setError(null);
      setDeleteResult(null);
      setSearchFilter('');
      setExpandedSections(new Set(['files']));

      // Start scanning immediately
      startScan();
    }
  }, [isOpen, itemToDelete?.path]);

  const startScan = async () => {
    if (!itemToDelete) return;

    setScanState('scanning');
    setError(null);

    try {
      const result = await fileOpsApi.previewDelete(itemToDelete.path);
      setScanResult(result);
      setScanState('scanned');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al escanear el directorio');
      setScanState('error');
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    setScanState('deleting');
    setError(null);

    try {
      const result = await fileOpsApi.delete(itemToDelete.path, true);
      setDeleteResult(result);
      setScanState('deleted');

      // Wait a moment to show success, then close
      setTimeout(() => {
        onDeleteComplete();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al eliminar');
      setScanState('error');
    }
  };

  const handleClose = () => {
    if (scanState === 'deleting') return; // Don't allow closing while deleting
    onClose();
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!scanResult?.summary?.items) return [];

    const items = scanResult.summary.items;
    if (!searchFilter) return items;

    const lowerFilter = searchFilter.toLowerCase();
    return items.filter((item: any) =>
      item.name.toLowerCase().includes(lowerFilter) ||
      item.path.toLowerCase().includes(lowerFilter)
    );
  }, [scanResult?.summary?.items, searchFilter]);

  // Group items by type for display
  const groupedItems = useMemo(() => {
    if (!filteredItems.length) return { directories: [], files: [] };

    return {
      directories: filteredItems.filter((i: any) => i.is_directory),
      files: filteredItems.filter((i: any) => !i.is_directory),
    };
  }, [filteredItems]);

  // Base path for Windows format
  const WINDOWS_BASE_PATH = '\\\\repositorio\\DirGesCat\\2510SP\\H_Informacion_Consulta\\Sub_Proy';

  // Convert relative path to Windows format
  const toWindowsPath = (relativePath: string): string => {
    // Remove leading slash if present
    const cleanPath = relativePath.replace(/^\//, '');
    // Convert forward slashes to backslashes and prepend base path
    const windowsRelative = cleanPath.replace(/\//g, '\\');
    return `${WINDOWS_BASE_PATH}\\${windowsRelative}`;
  };

  // Generate CSV content for download
  const generateReport = () => {
    if (!scanResult?.summary) return;

    // UTF-8 BOM for proper Latin character encoding in Excel
    const BOM = '\uFEFF';

    const lines = [
      // Header with all relevant columns
      'Nombre,Ruta Relativa,Ruta Windows,Tipo,Extension,Tamaño (bytes),Tamaño Formateado,Fecha Modificacion,Es Directorio,Es Agrupado,Tipo Agrupacion',
    ];

    for (const item of scanResult.summary.items) {
      // Escape quotes in names and paths
      const escapeCsv = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;

      lines.push([
        escapeCsv(item.name),
        escapeCsv(item.path),
        escapeCsv(toWindowsPath(item.path)),
        escapeCsv(item.type),
        escapeCsv(item.extension || ''),
        item.size || 0,
        escapeCsv(item.size_formatted || ''),
        escapeCsv(item.modified || ''),
        item.is_directory ? 'Si' : 'No',
        item.is_grouped ? 'Si' : 'No',
        escapeCsv(item.grouped_type || ''),
      ].join(','));
    }

    // Add summary section at the end
    lines.push('');
    lines.push('--- RESUMEN ---');
    lines.push(`Total Items Mostrados,${scanResult.summary.total_items_display}`);
    lines.push(`Total Items Reales,${scanResult.summary.total_items_real}`);
    lines.push(`Total Archivos,${scanResult.summary.total_files_real}`);
    lines.push(`Total Directorios,${scanResult.summary.total_directories_real}`);
    lines.push(`Tamaño Total,${scanResult.summary.total_size_formatted}`);
    lines.push(`Tamaño Total (bytes),${scanResult.summary.total_size_bytes}`);
    lines.push(`Grupos Geoespaciales,${scanResult.summary.geospatial_groups_count}`);
    lines.push(`Tiempo de Escaneo,${scanResult.summary.scan_time_seconds?.toFixed(2)}s`);
    lines.push(`Fecha de Reporte,${new Date().toISOString()}`);
    lines.push(`Directorio Eliminado,"${itemToDelete?.name}"`);
    lines.push(`Ruta Windows Eliminada,"${toWindowsPath(itemToDelete?.path || '')}"`);

    // Add extension statistics
    if (scanResult.summary.top_extensions && Object.keys(scanResult.summary.top_extensions).length > 0) {
      lines.push('');
      lines.push('--- ESTADISTICAS POR EXTENSION ---');
      lines.push('Extension,Cantidad');
      for (const [ext, count] of Object.entries(scanResult.summary.top_extensions)) {
        lines.push(`"${ext}",${count}`);
      }
    }

    const content = BOM + lines.join('\r\n'); // Use Windows line endings
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte_eliminacion_${itemToDelete?.name || 'directorio'}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-full">
              <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Confirmar Eliminación
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                {itemToDelete?.name}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={scanState === 'deleting'}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400 dark:text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Scanning State */}
          {scanState === 'scanning' && (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <Loader2 className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-spin mb-4" />
              <p className="text-lg font-medium text-gray-700 dark:text-gray-200">Escaneando directorio...</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-2">
                Analizando contenido para mostrar resumen detallado
              </p>
              <div className="w-64 h-2 bg-gray-200 dark:bg-gray-600 rounded-full mt-4 overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          )}

          {/* Error State */}
          {scanState === 'error' && (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="p-4 bg-red-100 dark:bg-red-900/50 rounded-full mb-4">
                <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-lg font-medium text-red-700 dark:text-red-300">Error</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 text-center max-w-md">{error}</p>
              <button
                onClick={startScan}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* Deleted State */}
          {scanState === 'deleted' && (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="p-4 bg-green-100 dark:bg-green-900/50 rounded-full mb-4">
                <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-lg font-medium text-green-700 dark:text-green-300">Eliminado Exitosamente</p>
              {deleteResult?.deleted_items_count && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                  {deleteResult.deleted_items_count} elementos eliminados
                  {deleteResult.total_size_formatted && ` (${deleteResult.total_size_formatted})`}
                </p>
              )}
            </div>
          )}

          {/* Deleting State */}
          {scanState === 'deleting' && (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <Loader2 className="w-12 h-12 text-red-600 dark:text-red-400 animate-spin mb-4" />
              <p className="text-lg font-medium text-gray-700 dark:text-gray-200">Eliminando...</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-2">
                Por favor espere, esto puede tomar unos momentos
              </p>
            </div>
          )}

          {/* Scanned State - Show Results */}
          {scanState === 'scanned' && scanResult && (
            <>
              {/* Warning Banner - Different based on trash_info */}
              {scanResult.trash_info?.will_go_to_trash === false ? (
                <div className="bg-red-100 dark:bg-red-900/50 border-b-4 border-red-500 px-4 py-4 flex items-start gap-3">
                  <div className="p-2 bg-red-200 rounded-full">
                    <AlertTriangle className="w-6 h-6 text-red-700 dark:text-red-300" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-red-800 dark:text-red-200">
                      ⚠️ ELIMINACIÓN PERMANENTE - NO IRÁ A LA PAPELERA
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      {scanResult.trash_info.reason}
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-2 font-medium">
                      Esta acción <strong>NO SE PUEDE DESHACER</strong>. Los archivos se eliminarán
                      definitivamente sin posibilidad de recuperación desde la papelera.
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                      Límite de papelera: {scanResult.trash_info.max_item_size_formatted} |
                      Tamaño a eliminar: {scanResult.trash_info.total_size_formatted || scanResult.summary?.total_size_formatted}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-700 px-4 py-3 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      Los archivos se moverán a la papelera
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                      Podrás restaurar los archivos desde la papelera durante el período de retención.
                      El registro completo quedará en la auditoría del sistema.
                    </p>
                  </div>
                </div>
              )}

              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {scanResult.summary.total_items_display}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Items a eliminar</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {scanResult.summary.total_directories_display}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Carpetas</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {scanResult.summary.total_files_display}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Archivos</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {scanResult.summary.total_size_formatted}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Tamaño total</p>
                </div>
              </div>

              {/* Geospatial Groups Info */}
              {scanResult.summary.geospatial_groups_count > 0 && (
                <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 border-b border-blue-100 flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm text-blue-800 dark:text-blue-200">
                    {scanResult.summary.geospatial_groups_count} grupo(s) geoespacial(es) detectado(s)
                    (GDB, Shapefile, etc.) - Se reportan como unidad única
                  </span>
                </div>
              )}

              {/* Real vs Display count info */}
              {scanResult.summary.has_more && (
                <div className="px-4 py-2 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300">
                  Mostrando {scanResult.summary.total_items_display} items agrupados.
                  Total real: {scanResult.summary.total_items_real} archivos
                  (los componentes de formatos geoespaciales se agrupan para simplificar la vista)
                </div>
              )}

              {/* Search and Download */}
              <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Buscar en la lista..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
                <button
                  onClick={generateReport}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:bg-gray-600 rounded-lg transition-colors"
                  title="Descargar reporte CSV"
                >
                  <Download className="w-4 h-4" />
                  Descargar Reporte
                </button>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto">
                {/* Directories Section */}
                {groupedItems.directories.length > 0 && (
                  <div className="border-b border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() => toggleSection('directories')}
                      className="w-full flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 transition-colors"
                    >
                      {expandedSections.has('directories') ? (
                        <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400 dark:text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400 dark:text-gray-500" />
                      )}
                      <Folder className="w-4 h-4 text-yellow-500" />
                      <span className="font-medium text-sm text-gray-700 dark:text-gray-200">
                        Carpetas ({groupedItems.directories.length})
                      </span>
                    </button>
                    {expandedSections.has('directories') && (
                      <div className="divide-y divide-gray-50 dark:divide-gray-700">
                        {groupedItems.directories.map((item: any, idx: number) => (
                          <div
                            key={`dir-${idx}`}
                            className="flex items-center gap-3 px-4 py-2 pl-10 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900"
                          >
                            <Folder className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {item.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 truncate">
                                {item.path}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Files Section */}
                {groupedItems.files.length > 0 && (
                  <div>
                    <button
                      onClick={() => toggleSection('files')}
                      className="w-full flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 transition-colors"
                    >
                      {expandedSections.has('files') ? (
                        <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400 dark:text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400 dark:text-gray-500" />
                      )}
                      <FileText className="w-4 h-4 text-blue-500" />
                      <span className="font-medium text-sm text-gray-700 dark:text-gray-200">
                        Archivos ({groupedItems.files.length})
                      </span>
                    </button>
                    {expandedSections.has('files') && (
                      <div className="divide-y divide-gray-50 dark:divide-gray-700">
                        {groupedItems.files.map((item: any, idx: number) => (
                          <div
                            key={`file-${idx}`}
                            className="flex items-center gap-3 px-4 py-2 pl-10 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900"
                          >
                            <div className="flex-shrink-0">
                              {item.grouped_type === 'geodatabase' ? (
                                <Database className="w-4 h-4 text-purple-500" />
                              ) : item.grouped_type === 'shapefile_main' ? (
                                <Map className="w-4 h-4 text-green-500" />
                              ) : (
                                <FileIcon extension={item.extension} isDirectory={false} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {item.name}
                                </p>
                                {item.is_grouped && (
                                  <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 dark:text-purple-300 rounded">
                                    {item.grouped_type === 'geodatabase' ? 'GDB' : 'SHP'}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 truncate">
                                {item.path}
                              </p>
                            </div>
                            <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                              {item.size_formatted}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Empty state */}
                {filteredItems.length === 0 && searchFilter && (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400 dark:text-gray-500">
                    <p>No se encontraron items que coincidan con "{searchFilter}"</p>
                  </div>
                )}
              </div>

              {/* Scan time */}
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 text-right">
                Escaneo completado en {scanResult.scan_time_seconds?.toFixed(2) || scanResult.summary.scan_time_seconds?.toFixed(2)}s
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {scanState === 'scanned' && (
          <div className={`flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 ${
            scanResult?.trash_info?.will_go_to_trash === false ? 'bg-red-50 dark:bg-red-900/30' : 'bg-gray-50 dark:bg-gray-900'
          }`}>
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:bg-gray-600 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              className={`flex items-center gap-2 px-6 py-2 text-white rounded-lg transition-colors ${
                scanResult?.trash_info?.will_go_to_trash === false
                  ? 'bg-red-700 hover:bg-red-800 ring-2 ring-red-300'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              {scanResult?.trash_info?.will_go_to_trash === false
                ? `⚠️ ELIMINAR PERMANENTEMENTE ${scanResult?.summary?.total_items_display || ''} elementos`
                : `Eliminar ${scanResult?.summary?.total_items_display || ''} elementos`
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
