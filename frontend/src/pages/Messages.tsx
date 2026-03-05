/**
 * Messages - Sistema de Mensajería Completo
 *
 * Para SUPERADMIN:
 * - Pestañas: Enviar mensaje (con todas las opciones) | Conversaciones
 * - Envío masivo, por rol, tipos de mensaje, etc.
 *
 * Para USUARIOS NORMALES:
 * - Ver sus conversaciones
 * - Enviar mensajes directos a otros usuarios
 * - Crear tickets de soporte
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Layout } from '../components/Layout';
import {
  MessageSquare,
  Send,
  Plus,
  Search,
  User,
  Clock,
  ArrowLeft,
  AlertTriangle,
  Info,
  HelpCircle,
  X,
  LifeBuoy,
  ChevronRight,
  CheckCheck,
  Inbox,
  Paperclip,
  Image,
  FileText,
  Film,
  File,
  Download,
  Trash2,
  ZoomIn,
} from 'lucide-react';
import {
  notificationsApi,
  MessageThread,
  MessageThreadDetail,
  ThreadType,
  UserSearchResult,
  MessageAttachment,
} from '../api/notifications';
import { useAuthStore } from '../store/authStore';
import { MessageComposer } from '../components/Admin/MessageComposer';
import { AdminThreadList } from '../components/Admin/AdminThreadList';

// Obtener icono según tipo de archivo
const getFileIcon = (fileType: string) => {
  switch (fileType) {
    case 'image': return Image;
    case 'video': return Film;
    case 'document': return FileText;
    default: return File;
  }
};

// Componente para mostrar un adjunto en un mensaje
const AttachmentDisplay: React.FC<{
  attachment: MessageAttachment;
  isFromMe: boolean;
}> = ({ attachment, isFromMe }) => {
  const [showPreview, setShowPreview] = useState(false);
  const FileIcon = getFileIcon(attachment.file_type);

  const handleDownload = () => {
    // Usar download_url para descargar con nombre original
    const downloadUrl = attachment.download_url || attachment.file_url;
    window.open(downloadUrl, '_blank');
  };

  if (attachment.file_type === 'image') {
    return (
      <>
        <div
          className="mt-2 cursor-pointer relative group"
          onClick={() => setShowPreview(true)}
        >
          <img
            src={attachment.file_url}
            alt={attachment.original_filename}
            className="max-w-xs max-h-48 rounded-lg object-cover"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
            <ZoomIn className="w-8 h-8 text-white" />
          </div>
        </div>
        {showPreview && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setShowPreview(false)}
          >
            <div className="relative max-w-4xl max-h-[90vh]">
              <button
                onClick={() => setShowPreview(false)}
                className="absolute -top-10 right-0 text-white hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={attachment.file_url}
                alt={attachment.original_filename}
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
              />
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-black/50 rounded-b-lg flex justify-between items-center">
                <span className="text-white text-sm truncate">{attachment.original_filename}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDownload(); }}
                  className="px-3 py-1 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 text-sm flex items-center gap-1"
                >
                  <Download className="w-4 h-4" />
                  Descargar
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  if (attachment.file_type === 'video') {
    return (
      <div className="mt-2">
        <video
          src={attachment.file_url}
          controls
          className="max-w-xs max-h-48 rounded-lg"
        />
        <p className={`text-xs mt-1 ${isFromMe ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400 dark:text-gray-500'}`}>
          {attachment.original_filename} ({attachment.file_size_human})
        </p>
      </div>
    );
  }

  return (
    <div
      onClick={handleDownload}
      className={`mt-2 flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
        isFromMe ? 'bg-blue-500 hover:bg-blue-400' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:bg-gray-600'
      }`}
    >
      <FileIcon className={`w-5 h-5 ${isFromMe ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${isFromMe ? 'text-white' : 'text-gray-700 dark:text-gray-200'}`}>
          {attachment.original_filename}
        </p>
        <p className={`text-xs ${isFromMe ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400 dark:text-gray-500'}`}>
          {attachment.file_size_human}
        </p>
      </div>
      <Download className={`w-4 h-4 ${isFromMe ? 'text-white' : 'text-gray-500 dark:text-gray-400 dark:text-gray-500'}`} />
    </div>
  );
};

// Componente para previsualizar archivos seleccionados
const FilePreviewItem: React.FC<{
  file: File;
  onRemove: () => void;
}> = ({ file, onRemove }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  const FileIcon = isImage ? Image : isVideo ? Film : file.type === 'application/pdf' ? FileText : File;

  useEffect(() => {
    if (isImage || isVideo) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file, isImage, isVideo]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="relative group bg-gray-100 dark:bg-gray-700 rounded-lg p-2 flex items-center gap-2">
      {isImage && preview ? (
        <img src={preview} alt={file.name} className="w-10 h-10 object-cover rounded" />
      ) : isVideo && preview ? (
        <video src={preview} className="w-10 h-10 object-cover rounded" />
      ) : (
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center">
          <FileIcon className="w-5 h-5 text-gray-500 dark:text-gray-400 dark:text-gray-500" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700 dark:text-gray-200 truncate">{file.name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{formatSize(file.size)}</p>
      </div>
      <button
        onClick={onRemove}
        className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

// Configuración de tipos de hilo
const threadTypeConfig: Record<ThreadType, { icon: React.ElementType; label: string; color: string; bgColor: string }> = {
  warning: { icon: AlertTriangle, label: 'Advertencia', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/50' },
  info: { icon: Info, label: 'Información', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/50' },
  support: { icon: HelpCircle, label: 'Soporte', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/50' },
  direct: { icon: MessageSquare, label: 'Directo', color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100' },
};

// === COMPONENTES PARA USUARIOS NORMALES ===

// Modal para nuevo mensaje (usuarios normales)
const NewMessageModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSend: (recipientId: number, subject: string, message: string) => Promise<void>;
}> = ({ isOpen, onClose, onSend }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUser(null);
      setSubject('');
      setMessage('');
    }
  }, [isOpen]);

  const handleSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await notificationsApi.searchUsers(query);
      setSearchResults(response.results || []);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      handleSearch(value);
    }, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !message.trim()) return;

    setIsSending(true);
    try {
      await onSend(selectedUser.id, subject || 'Mensaje', message);
      onClose();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Nuevo Mensaje</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Selector de destinatario */}
          {!selectedUser ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Destinatario
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Buscar usuario..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  autoFocus
                />
              </div>

              {/* Resultados de búsqueda */}
              {isSearching && (
                <div className="mt-2 p-3 text-center text-gray-500 dark:text-gray-400 dark:text-gray-500">
                  Buscando...
                </div>
              )}

              {!isSearching && searchResults.length > 0 && (
                <div className="mt-2 border rounded-lg max-h-48 overflow-y-auto">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => setSelectedUser(user)}
                      className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 border-b last:border-b-0"
                    >
                      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-900 dark:text-white">{user.full_name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">@{user.username}</p>
                      </div>
                      <span className="ml-auto text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full capitalize">
                        {user.role}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
                <div className="mt-2 p-3 text-center text-gray-500 dark:text-gray-400 dark:text-gray-500">
                  No se encontraron usuarios
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Para
              </label>
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{selectedUser.full_name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">@{selectedUser.username}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="p-1 hover:bg-gray-200 dark:bg-gray-600 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Asunto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Asunto (opcional)
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Asunto del mensaje"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
          </div>

          {/* Mensaje */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Mensaje
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe tu mensaje..."
              rows={4}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none"
              required
            />
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!selectedUser || !message.trim() || isSending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Enviar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal para ticket de soporte
const SupportTicketModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (subject: string, message: string) => Promise<void>;
}> = ({ isOpen, onClose, onSubmit }) => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSubject('');
      setMessage('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setIsSending(true);
    try {
      await onSubmit(subject, message);
      onClose();
    } catch (error) {
      console.error('Error creating ticket:', error);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <LifeBuoy className="w-5 h-5 text-green-600 dark:text-green-400" />
            <h2 className="text-lg font-semibold">Contactar Soporte</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-3 text-sm text-green-800 dark:text-green-200">
            Tu mensaje sera enviado al equipo de soporte. Te responderemos lo antes posible.
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Asunto
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Describe brevemente tu consulta"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Mensaje
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe tu consulta o problema en detalle..."
              rows={5}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 resize-none"
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!subject.trim() || !message.trim() || isSending}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Enviar Ticket
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Item de hilo en la lista - Diseño profesional tipo Gmail/Outlook
const ThreadItem: React.FC<{
  thread: MessageThread;
  onClick: () => void;
  currentUserId: number;
}> = ({ thread, onClick, currentUserId }) => {
  const config = threadTypeConfig[thread.thread_type] || threadTypeConfig.direct;
  const Icon = config.icon;

  // Usar el campo other_participant si está disponible
  const otherParticipant = thread.other_participant;
  const displayName = otherParticipant?.full_name ||
    (thread.admin === currentUserId ? thread.user_full_name : thread.admin_full_name);
  const displayUsername = otherParticipant?.username ||
    (thread.admin === currentUserId ? thread.user_username : thread.admin_username);

  const unreadCount = thread.my_unread_count ||
    (thread.admin === currentUserId ? thread.admin_unread_count : thread.user_unread_count);

  // Obtener iniciales para avatar
  const initials = displayName
    ? displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  // Formatear fecha de forma inteligente
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Ayer';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('es-CO', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
    }
  };

  return (
    <div
      onClick={onClick}
      className={`group p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 cursor-pointer transition-all duration-200
        ${unreadCount > 0 ? 'bg-blue-50 dark:bg-blue-900/30/60 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}
    >
      <div className="flex gap-4">
        {/* Avatar con iniciales */}
        <div className="relative flex-shrink-0">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm
            ${unreadCount > 0 ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-gray-400 to-gray-500'}`}>
            {initials}
          </div>
          {/* Indicador de tipo en esquina */}
          <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white ${config.bgColor}`}>
            <Icon className={`w-2.5 h-2.5 ${config.color}`} />
          </div>
        </div>

        {/* Contenido principal */}
        <div className="flex-1 min-w-0">
          {/* Primera línea: Nombre + Fecha */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <h4 className={`text-base truncate ${unreadCount > 0 ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-200'}`}>
                {displayName}
              </h4>
              {unreadCount > 0 && (
                <span className="flex-shrink-0 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full font-bold animate-pulse">
                  {unreadCount} nuevo{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <span className={`text-xs flex-shrink-0 ${unreadCount > 0 ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-400 dark:text-gray-500'}`}>
              {formatDate(thread.last_message_at)}
            </span>
          </div>

          {/* Segunda línea: Username */}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">@{displayUsername}</p>

          {/* Tercera línea: Asunto */}
          <p className={`text-sm mt-2 truncate ${unreadCount > 0 ? 'font-semibold text-gray-800 dark:text-gray-100' : 'font-medium text-gray-600 dark:text-gray-300'}`}>
            {thread.subject}
          </p>

          {/* Cuarta línea: Preview del mensaje */}
          {thread.last_message_preview && (
            <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1 truncate italic">
              "{thread.last_message_preview}"
            </p>
          )}

          {/* Quinta línea: Metadata */}
          <div className="flex items-center gap-3 mt-3">
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md ${config.bgColor} ${config.color} font-medium`}>
              <Icon className="w-3 h-3" />
              {config.label}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {thread.message_count}
            </span>
            {thread.is_closed && (
              <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-md font-medium">
                Cerrado
              </span>
            )}
          </div>
        </div>

        {/* Flecha */}
        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 dark:text-gray-400 dark:text-gray-500 flex-shrink-0 self-center transition-colors" />
      </div>
    </div>
  );
};

// Vista de conversación
const ConversationView: React.FC<{
  thread: MessageThreadDetail;
  currentUserId: number;
  onBack: () => void;
  onReply: (message: string, files: File[]) => Promise<void>;
  onClose: () => Promise<void>;
}> = ({ thread, currentUserId, onBack, onReply, onClose }) => {
  const [replyMessage, setReplyMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const config = threadTypeConfig[thread.thread_type] || threadTypeConfig.direct;
  const Icon = config.icon;

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread.messages]);

  // Manejar pegado desde portapapeles
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }

      if (files.length > 0) {
        e.preventDefault();
        setSelectedFiles(prev => [...prev, ...files]);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!replyMessage.trim() && selectedFiles.length === 0) || isSending) return;

    setIsSending(true);
    try {
      await onReply(replyMessage, selectedFiles);
      setReplyMessage('');
      setSelectedFiles([]);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleClose = async () => {
    if (isClosing || !confirm('¿Seguro que deseas cerrar esta conversación?')) return;
    setIsClosing(true);
    try {
      await onClose();
    } finally {
      setIsClosing(false);
    }
  };

  const otherParticipant = thread.other_participant;
  const displayName = otherParticipant?.full_name ||
    (thread.admin === currentUserId ? thread.user_full_name : thread.admin_full_name);

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[500px] bg-white dark:bg-gray-800 rounded-xl shadow-sm border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-200 dark:bg-gray-600 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.bgColor}`}>
              <Icon className={`w-5 h-5 ${config.color}`} />
            </div>
            <div>
              <h2 className="font-semibold">{thread.subject}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                Con: {displayName}
              </p>
            </div>
          </div>
          {!thread.is_closed ? (
            <button
              onClick={handleClose}
              disabled={isClosing}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:bg-gray-600 rounded-lg transition-colors"
            >
              {isClosing ? 'Cerrando...' : 'Cerrar conversación'}
            </button>
          ) : (
            <span className="px-3 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 text-sm rounded-lg">
              Conversación cerrada
            </span>
          )}
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-100 dark:bg-gray-700">
        {thread.messages.map((msg) => {
          const isFromMe = msg.sender === currentUserId;
          // Iniciales para avatar
          const senderName = msg.sender_full_name || msg.sender_username || 'Usuario';
          const initials = senderName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isFromMe ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              {!isFromMe && (
                <div className="flex-shrink-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
                    {initials}
                  </div>
                </div>
              )}

              {/* Burbuja del mensaje */}
              <div className={`max-w-[70%] ${isFromMe ? 'items-end' : 'items-start'}`}>
                {/* Nombre del remitente - Solo para mensajes que no son míos */}
                {!isFromMe && (
                  <div className="mb-1 ml-1">
                    <span className="text-sm font-bold text-purple-700 dark:text-purple-300">
                      {msg.sender_full_name || msg.sender_username}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                      @{msg.sender_username}
                    </span>
                  </div>
                )}

                <div
                  className={`p-3 rounded-2xl shadow-sm ${
                    isFromMe
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-bl-md'
                  }`}
                >
                  {msg.message && msg.message !== '[Archivo adjunto]' && (
                    <p className={`text-sm whitespace-pre-line leading-relaxed ${isFromMe ? 'text-white' : 'text-gray-800 dark:text-gray-100'}`}>
                      {msg.message}
                    </p>
                  )}
                  {/* Mostrar adjuntos */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="space-y-2">
                      {msg.attachments.map((attachment) => (
                        <AttachmentDisplay
                          key={attachment.id}
                        attachment={attachment}
                        isFromMe={isFromMe}
                      />
                    ))}
                  </div>
                )}
                  {/* Hora y estado */}
                  <div className={`flex items-center gap-1 mt-2 ${isFromMe ? 'text-blue-200 justify-end' : 'text-gray-400 dark:text-gray-500'}`}>
                    <p className="text-xs">{msg.time_ago}</p>
                    {isFromMe && msg.is_read && (
                      <CheckCheck className="w-3 h-3" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input de respuesta con adjuntos */}
      {!thread.is_closed && (
        <div className="border-t bg-white dark:bg-gray-800">
          {/* Preview de archivos seleccionados */}
          {selectedFiles.length > 0 && (
            <div className="p-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center gap-2 mb-2">
                <Paperclip className="w-4 h-4 text-gray-500 dark:text-gray-400 dark:text-gray-500" />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {selectedFiles.length} archivo(s) adjunto(s)
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <FilePreviewItem
                    key={index}
                    file={file}
                    onRemove={() => handleRemoveFile(index)}
                  />
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-4">
            <div className="flex gap-2">
              {/* Input oculto para archivos */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
              />

              {/* Botón de adjuntar */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSending}
                className="p-2.5 text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 rounded-xl transition-colors disabled:opacity-50"
                title="Adjuntar archivo (o pega Ctrl+V)"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              <input
                type="text"
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Escribe tu mensaje... (Ctrl+V para pegar imagen)"
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                disabled={isSending}
              />
              <button
                type="submit"
                disabled={(!replyMessage.trim() && selectedFiles.length === 0) || isSending}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// === PÁGINA PRINCIPAL PARA SUPERADMIN ===
const SuperAdminMessages: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'compose' | 'threads'>('compose');

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Centro de Mensajería</h2>
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            Envía mensajes a usuarios individuales, por rol o masivos. Gestiona todas las conversaciones.
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('compose')}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 font-semibold transition-colors ${
                  activeTab === 'compose'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:text-white hover:border-gray-300 dark:border-gray-600'
                }`}
              >
                <Send className="w-5 h-5" />
                Enviar Mensaje
              </button>
              <button
                onClick={() => setActiveTab('threads')}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 font-semibold transition-colors ${
                  activeTab === 'threads'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:text-white hover:border-gray-300 dark:border-gray-600'
                }`}
              >
                <Inbox className="w-5 h-5" />
                Conversaciones
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'compose' && (
              <MessageComposer
                onSuccess={() => setActiveTab('threads')}
              />
            )}
            {activeTab === 'threads' && <AdminThreadList />}
          </div>
        </div>
      </div>
    </Layout>
  );
};

// === PÁGINA PRINCIPAL PARA USUARIOS NORMALES ===
const UserMessages: React.FC = () => {
  const { user } = useAuthStore();
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'direct' | 'support' | 'admin'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Estados de modales
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  // Estado de conversación seleccionada
  const [selectedThread, setSelectedThread] = useState<MessageThreadDetail | null>(null);
  const [isLoadingThread, setIsLoadingThread] = useState(false);

  // Cargar hilos
  const loadThreads = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await notificationsApi.listThreads();
      setThreads(response.results || []);
    } catch (error) {
      console.error('Error loading threads:', error);
      setThreads([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  // Abrir hilo
  const handleOpenThread = async (threadId: number) => {
    setIsLoadingThread(true);
    try {
      const thread = await notificationsApi.getThreadById(threadId);
      setSelectedThread(thread);
    } catch (error) {
      console.error('Error loading thread:', error);
    } finally {
      setIsLoadingThread(false);
    }
  };

  // Enviar mensaje directo
  const handleSendDirectMessage = async (recipientId: number, subject: string, message: string) => {
    const response = await notificationsApi.sendDirectMessage({
      recipient_id: recipientId,
      subject,
      message,
    });
    // Abrir la conversación creada
    await handleOpenThread(response.thread_id);
    // Recargar lista
    loadThreads();
  };

  // Crear ticket de soporte
  const handleCreateSupportTicket = async (subject: string, message: string) => {
    const response = await notificationsApi.createSupportTicket({ subject, message });
    // Abrir la conversación creada
    await handleOpenThread(response.thread_id);
    // Recargar lista
    loadThreads();
  };

  // Responder en hilo (con soporte para adjuntos)
  const handleReply = async (message: string, files: File[] = []) => {
    if (!selectedThread) return;

    if (files.length > 0) {
      // Usar endpoint con adjuntos
      await notificationsApi.replyWithAttachments(selectedThread.id, message, files);
    } else {
      // Usar endpoint simple
      await notificationsApi.replyToThread(selectedThread.id, message);
    }
    // Recargar el hilo
    const updatedThread = await notificationsApi.getThreadById(selectedThread.id);
    setSelectedThread(updatedThread);
    loadThreads();
  };

  // Cerrar hilo
  const handleCloseThread = async () => {
    if (!selectedThread) return;
    await notificationsApi.closeThread(selectedThread.id);
    setSelectedThread((prev) =>
      prev ? { ...prev, is_closed: true, closed_at: new Date().toISOString() } : null
    );
    loadThreads();
  };

  // Filtrar hilos
  const filteredThreads = threads.filter((t) => {
    // Filtro por tipo
    if (filter !== 'all') {
      if (filter === 'admin' && t.thread_type !== 'warning' && t.thread_type !== 'info') return false;
      if (filter === 'direct' && t.thread_type !== 'direct') return false;
      if (filter === 'support' && t.thread_type !== 'support') return false;
    }

    // Filtro por búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const otherName = t.other_participant?.full_name?.toLowerCase() || '';
      const otherUsername = t.other_participant?.username?.toLowerCase() || '';
      const subject = t.subject?.toLowerCase() || '';

      return (
        otherName.includes(query) ||
        otherUsername.includes(query) ||
        subject.includes(query)
      );
    }

    return true;
  });

  // Si hay un hilo seleccionado, mostrar la conversación
  if (selectedThread) {
    return (
      <Layout>
        <ConversationView
          thread={selectedThread}
          currentUserId={user?.id || 0}
          onBack={() => setSelectedThread(null)}
          onReply={handleReply}
          onClose={handleCloseThread}
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mensajes</h1>
            <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
              Conversaciones con usuarios y soporte
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowSupportModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <LifeBuoy className="w-4 h-4" />
              <span className="hidden sm:inline">Soporte</span>
            </button>
            <button
              onClick={() => setShowNewMessageModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nuevo Mensaje</span>
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Búsqueda */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar conversaciones..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>

          {/* Filtro de tipo */}
          <div className="flex gap-2 flex-wrap">
            {[
              { value: 'all', label: 'Todas' },
              { value: 'direct', label: 'Directos' },
              { value: 'support', label: 'Soporte' },
              { value: 'admin', label: 'Administración' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value as any)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${
                    filter === opt.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:bg-gray-600'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de conversaciones */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
              <p className="mt-3 text-gray-500 dark:text-gray-400 dark:text-gray-500">Cargando conversaciones...</p>
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquare className="w-16 h-16 mx-auto text-gray-300" />
              <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">No hay conversaciones</h3>
              <p className="mt-2 text-gray-500 dark:text-gray-400 dark:text-gray-500 max-w-sm mx-auto">
                {filter !== 'all'
                  ? 'No hay conversaciones de este tipo'
                  : 'Inicia una nueva conversación con otro usuario o contacta a soporte'}
              </p>
              <div className="mt-6 flex gap-3 justify-center">
                <button
                  onClick={() => setShowNewMessageModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Nuevo Mensaje
                </button>
                <button
                  onClick={() => setShowSupportModal(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900"
                >
                  <LifeBuoy className="w-4 h-4" />
                  Contactar Soporte
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredThreads.map((thread) => (
                <ThreadItem
                  key={thread.id}
                  thread={thread}
                  currentUserId={user?.id || 0}
                  onClick={() => handleOpenThread(thread.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modales */}
      <NewMessageModal
        isOpen={showNewMessageModal}
        onClose={() => setShowNewMessageModal(false)}
        onSend={handleSendDirectMessage}
      />

      <SupportTicketModal
        isOpen={showSupportModal}
        onClose={() => setShowSupportModal(false)}
        onSubmit={handleCreateSupportTicket}
      />

      {/* Loading overlay para cargar conversación */}
      {isLoadingThread && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl dark:shadow-gray-900/50 flex items-center gap-3">
            <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
            <span>Cargando conversación...</span>
          </div>
        </div>
      )}
    </Layout>
  );
};

// === COMPONENTE PRINCIPAL QUE DECIDE QUÉ MOSTRAR ===
export const Messages: React.FC = () => {
  const { user } = useAuthStore();

  // Si es superadmin, mostrar la vista completa de admin
  if (user?.role === 'superadmin') {
    return <SuperAdminMessages />;
  }

  // Para usuarios normales, mostrar la vista normal
  return <UserMessages />;
};

export default Messages;
