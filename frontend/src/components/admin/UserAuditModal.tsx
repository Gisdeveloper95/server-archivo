import { useState, useEffect, useMemo } from 'react';
import {
  X,
  History,
  Filter,
  Calendar,
  Activity,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Download,
  Upload,
  Trash2,
  Edit,
  Folder,
  File,
  Copy,
  Scissors,
  LogIn,
  LogOut,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  FileText,
  BarChart3,
  Archive,
  Loader2,
} from 'lucide-react';
import JSZip from 'jszip';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  ShadingType,
} from 'docx';
import type { AuditLog, AuditAction } from '../../types/user';
import { usersApi } from '../../api/users';

interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
}

interface UserAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
}

const actionLabels: Record<string, string> = {
  login: 'Inicio de Sesión',
  logout: 'Cierre de Sesión',
  upload: 'Subir Archivo',
  download: 'Descargar',
  delete: 'Eliminar',
  rename: 'Renombrar',
  create_folder: 'Crear Carpeta',
  move: 'Mover',
  copy: 'Copiar',
};

const actionStyles: Record<string, { bg: string; text: string; icon: any }> = {
  login: { bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-800 dark:text-green-200', icon: LogIn },
  logout: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-100', icon: LogOut },
  upload: { bg: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-800 dark:text-blue-200', icon: Upload },
  download: { bg: 'bg-purple-100', text: 'text-purple-800 dark:text-purple-200', icon: Download },
  delete: { bg: 'bg-red-100 dark:bg-red-900/50', text: 'text-red-800 dark:text-red-200', icon: Trash2 },
  rename: { bg: 'bg-yellow-100', text: 'text-yellow-800 dark:text-yellow-200', icon: Edit },
  create_folder: { bg: 'bg-indigo-100', text: 'text-indigo-800', icon: Folder },
  move: { bg: 'bg-orange-100', text: 'text-orange-800', icon: Scissors },
  copy: { bg: 'bg-cyan-100', text: 'text-cyan-800', icon: Copy },
};

export const UserAuditModal = ({ isOpen, onClose, user }: UserAuditModalProps) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [expandedLog, setExpandedLog] = useState<number | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 20;

  // Filtros
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [filterSuccess, setFilterSuccess] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadAuditLogs();
    }
  }, [isOpen]);

  // Reload when filters change
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
      loadAuditLogs();
    }
  }, [selectedActions, filterSuccess, startDate, endDate]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      setError('');

      const params: any = {};
      if (selectedActions.length === 1) params.action = selectedActions[0];
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (filterSuccess === 'success') params.success = true;
      if (filterSuccess === 'error') params.success = false;

      const response = await usersApi.getAuditLogs(user.id, params);
      let results = (response as any).data || response || [];

      // Filter multiple actions client-side if needed
      if (selectedActions.length > 1) {
        results = results.filter((log: AuditLog) => selectedActions.includes(log.action));
      }

      setLogs(results);
    } catch (err: any) {
      setError(err.message || 'Error al cargar auditoría');
    } finally {
      setLoading(false);
    }
  };

  // Statistics
  const statistics = useMemo(() => {
    const stats = {
      total: logs.length,
      successful: 0,
      failed: 0,
      byAction: {} as Record<string, number>,
    };

    logs.forEach(log => {
      if (log.success) stats.successful++;
      else stats.failed++;
      stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
    });

    return stats;
  }, [logs]);

  // Pagination
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * logsPerPage;
    return logs.slice(start, start + logsPerPage);
  }, [logs, currentPage]);

  const totalPages = Math.ceil(logs.length / logsPerPage);

  const toggleAction = (action: string) => {
    if (selectedActions.includes(action)) {
      setSelectedActions(selectedActions.filter(a => a !== action));
    } else {
      setSelectedActions([...selectedActions, action]);
    }
  };

  const clearFilters = () => {
    setSelectedActions([]);
    setFilterSuccess('');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = selectedActions.length > 0 || filterSuccess || startDate || endDate;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const getActionBadge = (action: string) => {
    const style = actionStyles[action] || { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-100', icon: Activity };
    const Icon = style.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
        <Icon className="w-3.5 h-3.5" />
        {actionLabels[action] || action}
      </span>
    );
  };

  // Generate CSV content
  const generateCSV = (): string => {
    const headers = ['Fecha', 'Acción', 'Archivo/Ruta', 'Tamaño', 'Estado', 'IP', 'Error', 'Detalles'];
    const rows = logs.map(log => [
      formatDate(log.timestamp),
      actionLabels[log.action] || log.action,
      log.target_path || log.target_name || '',
      log.file_size ? formatFileSize(log.file_size) : '',
      log.success ? 'Exitoso' : 'Error',
      log.ip_address || '',
      log.error_message || '',
      log.details ? JSON.stringify(log.details) : '',
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
  };

  // Generate HTML report
  const generateHTML = (): string => {
    const reportDate = new Date().toLocaleString('es-CO');
    const userName = `${user.first_name} ${user.last_name}`.trim() || user.username;

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte de Auditoría - ${userName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; background: #f5f5f5; padding: 20px; color: #333; }
    .container { max-width: 1400px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #4f46e5, #6366f1); color: white; padding: 30px; }
    .header h1 { font-size: 24px; margin-bottom: 8px; }
    .header p { opacity: 0.9; font-size: 14px; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; padding: 20px; background: #fafafa; border-bottom: 1px solid #eee; }
    .stat-card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); text-align: center; }
    .stat-value { font-size: 32px; font-weight: 700; color: #4f46e5; }
    .stat-label { font-size: 13px; color: #666; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-card.success .stat-value { color: #22c55e; }
    .stat-card.error .stat-value { color: #ef4444; }
    .filters { padding: 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
    .filters-title { font-weight: 600; margin-bottom: 12px; color: #475569; display: flex; align-items: center; gap: 8px; }
    .filter-row { display: flex; gap: 20px; flex-wrap: wrap; }
    .filter-group { display: flex; flex-direction: column; gap: 4px; }
    .filter-group label { font-size: 12px; color: #64748b; text-transform: uppercase; }
    .filter-group input, .filter-group select { padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 14px; }
    .actions-filter { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
    .action-btn { padding: 6px 12px; border-radius: 20px; border: none; cursor: pointer; font-size: 12px; font-weight: 500; transition: all 0.2s; }
    .action-btn.active { opacity: 1; transform: scale(1.05); }
    .action-btn.inactive { opacity: 0.5; }
    .action-login { background: #dcfce7; color: #166534; }
    .action-logout { background: #f3f4f6; color: #374151; }
    .action-upload { background: #dbeafe; color: #1e40af; }
    .action-download { background: #f3e8ff; color: #6b21a8; }
    .action-delete { background: #fee2e2; color: #991b1b; }
    .action-rename { background: #fef3c7; color: #92400e; }
    .action-create_folder { background: #e0e7ff; color: #3730a3; }
    .action-move { background: #ffedd5; color: #9a3412; }
    .action-copy { background: #cffafe; color: #0e7490; }
    .table-container { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f8fafc; padding: 14px 16px; text-align: left; font-weight: 600; color: #475569; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; position: sticky; top: 0; }
    td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; font-size: 14px; vertical-align: top; }
    tr:hover { background: #f8fafc; }
    .badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .badge-success { background: #dcfce7; color: #166534; }
    .badge-error { background: #fee2e2; color: #991b1b; }
    .badge-login { background: #dcfce7; color: #166534; }
    .badge-logout { background: #f3f4f6; color: #374151; }
    .badge-upload { background: #dbeafe; color: #1e40af; }
    .badge-download { background: #f3e8ff; color: #6b21a8; }
    .badge-delete { background: #fee2e2; color: #991b1b; }
    .badge-rename { background: #fef3c7; color: #92400e; }
    .badge-create_folder { background: #e0e7ff; color: #3730a3; }
    .badge-move { background: #ffedd5; color: #9a3412; }
    .badge-copy { background: #cffafe; color: #0e7490; }
    .path { font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace; font-size: 12px; color: #64748b; word-break: break-all; max-width: 400px; }
    .error-msg { color: #dc2626; font-size: 12px; margin-top: 4px; }
    .details { margin-top: 8px; padding: 10px; background: #f8fafc; border-radius: 6px; font-size: 12px; }
    .details-rename { background: #fffbeb; border-left: 3px solid #f59e0b; }
    .details-move, .details-copy { background: #eff6ff; border-left: 3px solid #3b82f6; }
    .details-delete { background: #fef2f2; border-left: 3px solid #ef4444; }
    .footer { padding: 20px; text-align: center; color: #94a3b8; font-size: 12px; background: #f8fafc; }
    .no-data { text-align: center; padding: 60px 20px; color: #94a3b8; }
    .no-data svg { width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.5; }
    @media print { body { background: white; padding: 0; } .container { box-shadow: none; } .filters { display: none; } }
    @media (max-width: 768px) { .stats { grid-template-columns: repeat(2, 1fr); } th, td { padding: 10px 8px; font-size: 12px; } }
  </style>
  <script>
    let currentFilters = { actions: [], success: '', startDate: '', endDate: '' };

    function toggleAction(action) {
      const idx = currentFilters.actions.indexOf(action);
      if (idx > -1) currentFilters.actions.splice(idx, 1);
      else currentFilters.actions.push(action);
      applyFilters();
    }

    function applyFilters() {
      const rows = document.querySelectorAll('tbody tr');
      const successFilter = document.getElementById('successFilter')?.value || '';
      const startDate = document.getElementById('startDate')?.value || '';
      const endDate = document.getElementById('endDate')?.value || '';

      document.querySelectorAll('.action-btn').forEach(btn => {
        const action = btn.dataset.action;
        btn.classList.toggle('active', currentFilters.actions.includes(action));
        btn.classList.toggle('inactive', currentFilters.actions.length > 0 && !currentFilters.actions.includes(action));
      });

      rows.forEach(row => {
        const action = row.dataset.action;
        const success = row.dataset.success;
        const date = row.dataset.date;

        let show = true;
        if (currentFilters.actions.length > 0 && !currentFilters.actions.includes(action)) show = false;
        if (successFilter && success !== successFilter) show = false;
        if (startDate && date < startDate) show = false;
        if (endDate && date > endDate) show = false;

        row.style.display = show ? '' : 'none';
      });

      updateStats();
    }

    function updateStats() {
      const visibleRows = document.querySelectorAll('tbody tr:not([style*="display: none"])');
      let total = 0, success = 0, error = 0;
      visibleRows.forEach(row => {
        total++;
        if (row.dataset.success === 'true') success++;
        else error++;
      });
      document.getElementById('statTotal').textContent = total;
      document.getElementById('statSuccess').textContent = success;
      document.getElementById('statError').textContent = error;
    }

    function clearFilters() {
      currentFilters = { actions: [], success: '', startDate: '', endDate: '' };
      document.getElementById('successFilter').value = '';
      document.getElementById('startDate').value = '';
      document.getElementById('endDate').value = '';
      applyFilters();
    }
  </script>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 Reporte de Auditoría</h1>
      <p><strong>Usuario:</strong> ${userName} (${user.username})</p>
      <p><strong>Generado:</strong> ${reportDate}</p>
    </div>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-value" id="statTotal">${statistics.total}</div>
        <div class="stat-label">Total Acciones</div>
      </div>
      <div class="stat-card success">
        <div class="stat-value" id="statSuccess">${statistics.successful}</div>
        <div class="stat-label">Exitosas</div>
      </div>
      <div class="stat-card error">
        <div class="stat-value" id="statError">${statistics.failed}</div>
        <div class="stat-label">Con Error</div>
      </div>
      ${Object.entries(statistics.byAction)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([action, count]) => `
      <div class="stat-card">
        <div class="stat-value">${count}</div>
        <div class="stat-label">${actionLabels[action] || action}</div>
      </div>`).join('')}
    </div>

    <div class="filters">
      <div class="filters-title">
        🔍 Filtros Interactivos
        <button onclick="clearFilters()" style="margin-left: auto; padding: 6px 12px; border: none; background: #e2e8f0; border-radius: 6px; cursor: pointer; font-size: 12px;">Limpiar</button>
      </div>
      <div class="filter-row">
        <div class="filter-group">
          <label>Estado</label>
          <select id="successFilter" onchange="applyFilters()">
            <option value="">Todos</option>
            <option value="true">Solo exitosas</option>
            <option value="false">Solo errores</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Desde</label>
          <input type="date" id="startDate" onchange="applyFilters()" />
        </div>
        <div class="filter-group">
          <label>Hasta</label>
          <input type="date" id="endDate" onchange="applyFilters()" />
        </div>
      </div>
      <div class="actions-filter">
        ${Object.entries(actionLabels).map(([key, label]) => `
          <button class="action-btn action-${key}" data-action="${key}" onclick="toggleAction('${key}')">${label}</button>
        `).join('')}
      </div>
    </div>

    <div class="table-container">
      ${logs.length === 0 ? `
      <div class="no-data">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
        <p>No hay registros de auditoría</p>
      </div>
      ` : `
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Acción</th>
            <th>Estado</th>
            <th>Archivo / Ruta</th>
            <th>Tamaño</th>
            <th>IP</th>
          </tr>
        </thead>
        <tbody>
          ${logs.map(log => {
            const dateStr = new Date(log.timestamp).toISOString().split('T')[0];
            let detailsHtml = '';

            if (log.action === 'rename' && log.details) {
              detailsHtml = `<div class="details details-rename">
                <strong>Renombrado:</strong><br/>
                De: <code>${log.details.old_name || 'N/A'}</code><br/>
                A: <code>${log.details.new_name || log.target_name || 'N/A'}</code>
              </div>`;
            } else if ((log.action === 'move' || log.action === 'copy') && log.details) {
              detailsHtml = `<div class="details details-${log.action}">
                <strong>${log.action === 'move' ? 'Movido' : 'Copiado'}:</strong><br/>
                Origen: <code>${log.details.source_path || log.target_path || 'N/A'}</code><br/>
                Destino: <code>${log.details.dest_path || 'N/A'}</code>
              </div>`;
            } else if (log.action === 'delete' && log.details?.deleted_items?.length > 0) {
              detailsHtml = `<div class="details details-delete">
                <strong>Eliminados ${log.details.deleted_items.length} elementos</strong>
                ${log.details.total_size_formatted ? ` (${log.details.total_size_formatted})` : ''}
              </div>`;
            }

            return `
          <tr data-action="${log.action}" data-success="${log.success}" data-date="${dateStr}">
            <td>${formatDate(log.timestamp)}</td>
            <td><span class="badge badge-${log.action}">${actionLabels[log.action] || log.action}</span></td>
            <td><span class="badge ${log.success ? 'badge-success' : 'badge-error'}">${log.success ? '✓ Exitoso' : '✗ Error'}</span></td>
            <td>
              <div class="path">${log.target_name || log.target_path || '-'}</div>
              ${log.target_name && log.target_path ? `<div class="path" style="margin-top: 4px; opacity: 0.7;">${log.target_path}</div>` : ''}
              ${log.error_message ? `<div class="error-msg">⚠️ ${log.error_message}</div>` : ''}
              ${detailsHtml}
            </td>
            <td>${log.file_size ? formatFileSize(log.file_size) : '-'}</td>
            <td style="font-family: monospace; font-size: 12px;">${log.ip_address || '-'}</td>
          </tr>`;
          }).join('')}
        </tbody>
      </table>
      `}
    </div>

    <div class="footer">
      <p>Reporte generado automáticamente por NetApp Bridge IGAC</p>
      <p>Fecha de generación: ${reportDate}</p>
    </div>
  </div>
</body>
</html>`;
  };

  // Generate Word document
  const generateWord = async (): Promise<Blob> => {
    const userName = `${user.first_name} ${user.last_name}`.trim() || user.username;
    const reportDate = new Date().toLocaleString('es-CO');

    // Helper to create table cell with borders
    const createCell = (text: string, isHeader = false, width?: number) => {
      return new TableCell({
        children: [new Paragraph({
          children: [new TextRun({
            text,
            bold: isHeader,
            size: isHeader ? 22 : 20,
          })],
        })],
        width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
        shading: isHeader ? { fill: 'E8E8E8', type: ShadingType.CLEAR } : undefined,
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
          left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
          right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
        },
      });
    };

    // Statistics table
    const statsTable = new Table({
      rows: [
        new TableRow({
          children: [
            createCell('Total', true, 25),
            createCell('Exitosas', true, 25),
            createCell('Con Error', true, 25),
            createCell('Tasa de Éxito', true, 25),
          ],
        }),
        new TableRow({
          children: [
            createCell(String(statistics.total), false, 25),
            createCell(String(statistics.successful), false, 25),
            createCell(String(statistics.failed), false, 25),
            createCell(statistics.total > 0 ? `${Math.round((statistics.successful / statistics.total) * 100)}%` : '0%', false, 25),
          ],
        }),
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
    });

    // Actions breakdown table
    const actionsRows = Object.entries(statistics.byAction)
      .sort((a, b) => b[1] - a[1])
      .map(([action, count]) => new TableRow({
        children: [
          createCell(actionLabels[action] || action, false, 50),
          createCell(String(count), false, 25),
          createCell(statistics.total > 0 ? `${Math.round((count / statistics.total) * 100)}%` : '0%', false, 25),
        ],
      }));

    const actionsTable = new Table({
      rows: [
        new TableRow({
          children: [
            createCell('Acción', true, 50),
            createCell('Cantidad', true, 25),
            createCell('Porcentaje', true, 25),
          ],
        }),
        ...actionsRows,
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
    });

    // Logs table (first 100)
    const logsToExport = logs.slice(0, 100);
    const logsRows = logsToExport.map(log => {
      let details = '';
      if (log.action === 'rename' && log.details) {
        details = `De: ${log.details.old_name || 'N/A'} → A: ${log.details.new_name || log.target_name || 'N/A'}`;
      } else if ((log.action === 'move' || log.action === 'copy') && log.details) {
        details = `Destino: ${log.details.dest_path || 'N/A'}`;
      } else if (log.action === 'delete' && log.details?.deleted_items?.length > 0) {
        details = `${log.details.deleted_items.length} elementos eliminados`;
      }

      return new TableRow({
        children: [
          createCell(formatDate(log.timestamp), false, 18),
          createCell(actionLabels[log.action] || log.action, false, 12),
          createCell(log.success ? 'Exitoso' : 'Error', false, 10),
          createCell(log.target_name || log.target_path || '-', false, 30),
          createCell(log.file_size ? formatFileSize(log.file_size) : '-', false, 10),
          createCell(details || (log.error_message ? `Error: ${log.error_message}` : '-'), false, 20),
        ],
      });
    });

    const logsTable = new Table({
      rows: [
        new TableRow({
          children: [
            createCell('Fecha', true, 18),
            createCell('Acción', true, 12),
            createCell('Estado', true, 10),
            createCell('Archivo/Ruta', true, 30),
            createCell('Tamaño', true, 10),
            createCell('Detalles', true, 20),
          ],
        }),
        ...logsRows,
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Title
          new Paragraph({
            children: [new TextRun({
              text: 'REPORTE DE AUDITORÍA DE USUARIO',
              bold: true,
              size: 36,
              color: '4F46E5',
            })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),

          // User info
          new Paragraph({
            children: [new TextRun({
              text: `Usuario: ${userName} (${user.username})`,
              size: 24,
            })],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({
              text: `Fecha del reporte: ${reportDate}`,
              size: 24,
            })],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({
              text: `Período: ${startDate || 'Inicio'} - ${endDate || 'Actual'}`,
              size: 24,
            })],
            spacing: { after: 400 },
          }),

          // Statistics Section
          new Paragraph({
            text: 'RESUMEN ESTADÍSTICO',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          statsTable,

          // Actions Breakdown
          new Paragraph({
            text: 'DESGLOSE POR TIPO DE ACCIÓN',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          actionsTable,

          // Detailed Logs
          new Paragraph({
            text: `REGISTRO DETALLADO DE ACTIVIDAD (${logsToExport.length} de ${logs.length} registros)`,
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          logsTable,

          // Footer
          new Paragraph({
            children: [new TextRun({
              text: '\n\nReporte generado automáticamente por NetApp Bridge IGAC',
              size: 18,
              italics: true,
              color: '888888',
            })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 600 },
          }),
        ],
      }],
    });

    return await Packer.toBlob(doc);
  };

  // Export complete report as ZIP
  const exportReport = async () => {
    if (logs.length === 0) return;

    setExporting(true);
    try {
      const zip = new JSZip();
      const dateStr = new Date().toISOString().split('T')[0];
      const baseFileName = `auditoria_${user.username}_${dateStr}`;

      // Add CSV
      const csvContent = generateCSV();
      zip.file(`${baseFileName}.csv`, '\ufeff' + csvContent);

      // Add HTML
      const htmlContent = generateHTML();
      zip.file(`${baseFileName}.html`, htmlContent);

      // Add Word document
      const wordBlob = await generateWord();
      zip.file(`${baseFileName}.docx`, wordBlob);

      // Generate and download ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${baseFileName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating report:', err);
      setError('Error al generar el reporte');
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-7xl w-full max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-5 rounded-t-xl flex-shrink-0">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <History className="w-7 h-7" />
              <div>
                <h3 className="text-xl font-bold">Historial de Auditoría</h3>
                <p className="text-indigo-100 text-sm">
                  {user.first_name} {user.last_name} ({user.username})
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportReport}
                disabled={logs.length === 0 || exporting}
                className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800/20 hover:bg-white dark:bg-gray-800/30 rounded-lg transition-colors text-sm disabled:opacity-50"
              >
                {exporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Archive className="w-4 h-4" />
                )}
                {exporting ? 'Generando...' : 'Exportar Reporte'}
              </button>
              <button
                onClick={onClose}
                className="text-white hover:bg-white dark:bg-gray-800/20 rounded-lg p-2 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="bg-gray-50 dark:bg-gray-900 border-b px-5 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-gray-500 dark:text-gray-400 dark:text-gray-500" />
                <span className="text-sm text-gray-600 dark:text-gray-300">Total:</span>
                <span className="font-bold text-gray-900 dark:text-white">{statistics.total}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-600 dark:text-gray-300">Exitosas:</span>
                <span className="font-bold text-green-600 dark:text-green-400">{statistics.successful}</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-gray-600 dark:text-gray-300">Con Error:</span>
                <span className="font-bold text-red-600 dark:text-red-400">{statistics.failed}</span>
              </div>
            </div>

            {/* Top actions */}
            <div className="flex items-center gap-2">
              {Object.entries(statistics.byAction)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 4)
                .map(([action, count]) => (
                  <span
                    key={action}
                    className={`text-xs px-2 py-1 rounded-full ${actionStyles[action]?.bg || 'bg-gray-100 dark:bg-gray-700'} ${actionStyles[action]?.text || 'text-gray-700 dark:text-gray-200'}`}
                  >
                    {actionLabels[action]}: {count}
                  </span>
                ))}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="border-b px-5 py-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:text-white"
            >
              <Filter className="w-4 h-4" />
              Filtros
              {hasActiveFilters && (
                <span className="bg-indigo-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {selectedActions.length + (filterSuccess ? 1 : 0) + (startDate ? 1 : 0) + (endDate ? 1 : 0)}
                </span>
              )}
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:text-red-300 flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  Limpiar
                </button>
              )}
              <button
                onClick={loadAuditLogs}
                disabled={loading}
                className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="space-y-4">
              {/* Action checkboxes */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-wide">
                  Acciones ({selectedActions.length > 0 ? selectedActions.length + ' seleccionadas' : 'Todas'})
                </label>
                <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
                  {Object.entries(actionLabels).map(([key, label]) => {
                    const style = actionStyles[key];
                    const Icon = style?.icon || Activity;
                    const isSelected = selectedActions.includes(key);
                    return (
                      <label
                        key={key}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-all text-xs
                          ${isSelected
                            ? `${style?.bg || 'bg-gray-100 dark:bg-gray-700'} ${style?.text || 'text-gray-700 dark:text-gray-200'} ring-2 ring-offset-1 ring-indigo-400`
                            : 'bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700'
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleAction(key)}
                          className="sr-only"
                        />
                        <Icon className="w-3.5 h-3.5" />
                        <span className="truncate">{label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Date and success filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1 uppercase tracking-wide">
                    Desde
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1 uppercase tracking-wide">
                    Hasta
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1 uppercase tracking-wide">
                    Estado
                  </label>
                  <select
                    value={filterSuccess}
                    onChange={(e) => setFilterSuccess(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Todos</option>
                    <option value="success">Solo exitosas</option>
                    <option value="error">Solo con errores</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 italic">
                    Los filtros se aplican automáticamente
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-y-auto p-5">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-14 h-14 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-300 text-lg font-medium">No hay registros de auditoría</p>
              <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm mt-2">
                {hasActiveFilters
                  ? 'Intenta ajustar los filtros'
                  : 'El usuario no ha realizado acciones registradas'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {paginatedLogs.map((log) => (
                <div
                  key={log.id}
                  className={`border rounded-lg transition-all ${
                    log.success
                      ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                      : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 hover:border-red-400'
                  }`}
                >
                  {/* Log Header */}
                  <div
                    className="p-3 flex items-center gap-3 cursor-pointer"
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  >
                    {/* Success/Fail Icon */}
                    {log.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                    )}

                    {/* Action Badge */}
                    <div className="flex-shrink-0">
                      {getActionBadge(log.action)}
                    </div>

                    {/* Path/Name */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {log.target_name || log.target_path || '-'}
                      </p>
                      {log.target_name && log.target_path && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-mono truncate">
                          {log.target_path}
                        </p>
                      )}
                    </div>

                    {/* Size */}
                    {log.file_size && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 flex-shrink-0 hidden sm:block">
                        {formatFileSize(log.file_size)}
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 flex-shrink-0">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">{formatDate(log.timestamp)}</span>
                      <span className="md:hidden">
                        {new Date(log.timestamp).toLocaleDateString('es-CO')}
                      </span>
                    </div>

                    {/* Expand Button */}
                    <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 rounded transition-colors flex-shrink-0">
                      {expandedLog === log.id ? (
                        <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                      )}
                    </button>
                  </div>

                  {/* Expanded Details */}
                  {expandedLog === log.id && (
                    <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                      <div className="pt-3 space-y-3 text-sm">
                        {/* Basic info */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {log.ip_address && (
                            <div>
                              <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wide">IP</span>
                              <p className="font-mono text-gray-900 dark:text-white">{log.ip_address}</p>
                            </div>
                          )}
                          {log.file_size && (
                            <div>
                              <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wide">Tamaño</span>
                              <p className="font-medium text-gray-900 dark:text-white">{formatFileSize(log.file_size)}</p>
                            </div>
                          )}
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wide">Fecha completa</span>
                            <p className="text-gray-900 dark:text-white">{formatDate(log.timestamp)}</p>
                          </div>
                        </div>

                        {/* User Agent */}
                        {log.user_agent && (
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wide">Navegador</span>
                            <p className="text-xs text-gray-600 dark:text-gray-300 truncate">{log.user_agent}</p>
                          </div>
                        )}

                        {/* Error message */}
                        {log.error_message && (
                          <div className="bg-red-100 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg p-3">
                            <span className="text-xs text-red-600 dark:text-red-400 uppercase tracking-wide font-semibold">Error</span>
                            <p className="text-red-800 dark:text-red-200 mt-1">{log.error_message}</p>
                          </div>
                        )}

                        {/* Rename details */}
                        {log.action === 'rename' && log.details && (
                          <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
                            <span className="text-xs text-yellow-700 dark:text-yellow-300 uppercase tracking-wide font-semibold">Renombrado</span>
                            <div className="mt-2 space-y-1">
                              <p className="text-sm">
                                <span className="text-red-600 dark:text-red-400 font-medium">De:</span>{' '}
                                <span className="font-mono bg-white dark:bg-gray-800 px-1 rounded">{log.details.old_name || 'N/A'}</span>
                              </p>
                              <p className="text-sm">
                                <span className="text-green-600 dark:text-green-400 font-medium">A:</span>{' '}
                                <span className="font-mono bg-white dark:bg-gray-800 px-1 rounded">{log.details.new_name || log.target_name || 'N/A'}</span>
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Move/Copy details */}
                        {(log.action === 'move' || log.action === 'copy') && log.details && (
                          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                            <span className="text-xs text-blue-700 dark:text-blue-300 uppercase tracking-wide font-semibold">
                              {log.action === 'move' ? 'Movido' : 'Copiado'}
                            </span>
                            <div className="mt-2 space-y-2">
                              <div>
                                <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Origen:</span>
                                <p className="font-mono text-xs bg-white dark:bg-gray-800 p-1 rounded break-all">
                                  {log.details.source_path || log.target_path || 'N/A'}
                                </p>
                              </div>
                              <div>
                                <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Destino:</span>
                                <p className="font-mono text-xs bg-white dark:bg-gray-800 p-1 rounded break-all">
                                  {log.details.dest_path || 'N/A'}
                                </p>
                              </div>
                              {log.details.is_directory && (
                                <div className="flex items-center gap-2 text-xs text-indigo-700">
                                  <Folder className="w-3.5 h-3.5" />
                                  <span>Directorio ({log.details.file_count || 0} archivos)</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Delete details */}
                        {log.action === 'delete' && log.details && log.details.deleted_items && log.details.deleted_items.length > 0 && (
                          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-red-700 dark:text-red-300 uppercase tracking-wide font-semibold flex items-center gap-1">
                                <Trash2 className="w-3.5 h-3.5" />
                                Contenido eliminado ({log.details.deleted_items.length} elementos)
                              </span>
                              {log.details.total_size_formatted && (
                                <span className="text-xs text-red-600 dark:text-red-400">{log.details.total_size_formatted}</span>
                              )}
                            </div>
                            <div className="max-h-40 overflow-y-auto bg-white dark:bg-gray-800 rounded border border-red-100 p-2">
                              {log.details.deleted_items.slice(0, 20).map((item: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-2 text-xs py-1 border-b border-red-50 last:border-0">
                                  {item.is_directory ? (
                                    <Folder className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                                  ) : (
                                    <File className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                  )}
                                  <span className="font-mono text-gray-800 dark:text-gray-100 truncate flex-1" title={item.path}>
                                    {item.name}
                                  </span>
                                  {!item.is_directory && item.size > 0 && (
                                    <span className="text-gray-500 dark:text-gray-400 dark:text-gray-500 flex-shrink-0">
                                      {formatFileSize(item.size)}
                                    </span>
                                  )}
                                </div>
                              ))}
                              {log.details.deleted_items.length > 20 && (
                                <div className="text-xs text-red-600 dark:text-red-400 mt-2 text-center">
                                  ... y {log.details.deleted_items.length - 20} elementos más
                                </div>
                              )}
                            </div>
                            {log.details.stats_by_extension && Object.keys(log.details.stats_by_extension).length > 0 && (
                              <div className="mt-2 pt-2 border-t border-red-200 dark:border-red-700 text-xs">
                                <span className="text-red-800 dark:text-red-200 font-medium">Por extensión: </span>
                                <span className="text-red-700 dark:text-red-300">
                                  {Object.entries(log.details.stats_by_extension)
                                    .sort((a: any, b: any) => b[1] - a[1])
                                    .slice(0, 5)
                                    .map(([ext, count]: [string, any]) => `${ext} (${count})`)
                                    .join(', ')}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Generic details JSON */}
                        {log.details &&
                          !['rename', 'move', 'copy'].includes(log.action) &&
                          !(log.action === 'delete' && log.details.deleted_items) &&
                          Object.keys(log.details).length > 0 && (
                          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                            <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wide">Detalles adicionales</span>
                            <pre className="mt-2 text-xs text-gray-800 dark:text-gray-100 overflow-x-auto bg-white dark:bg-gray-800 p-2 rounded border">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with Pagination */}
        <div className="p-4 border-t bg-gray-50 dark:bg-gray-900 rounded-b-xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Mostrando{' '}
              <span className="font-semibold">
                {logs.length > 0 ? (currentPage - 1) * logsPerPage + 1 : 0}
              </span>
              {' - '}
              <span className="font-semibold">
                {Math.min(currentPage * logsPerPage, logs.length)}
              </span>
              {' de '}
              <span className="font-semibold">{logs.length}</span> registros
            </p>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-300 px-2">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
