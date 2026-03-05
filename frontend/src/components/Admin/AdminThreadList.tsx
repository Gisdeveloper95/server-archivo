/**
 * AdminThreadList - Lista de conversaciones del administrador
 * Con filtros avanzados, estadísticas y mejor UI
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  MessageSquare,
  User,
  Clock,
  ChevronRight,
  Filter,
  Search,
  AlertTriangle,
  Info,
  HelpCircle,
  X,
  Send,
  ArrowLeft,
  Calendar,
  Users,
  Mail,
  MailOpen,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronDown,
  BarChart3,
  RotateCcw,
  UserSearch,
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
  Notification,
} from '../../api/notifications';

// Configuración de tipos de hilo
const threadTypeConfig: Record<ThreadType, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  warning: { icon: AlertTriangle, color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/50', label: 'Advertencia' },
  info: { icon: Info, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/50', label: 'Información' },
  support: { icon: HelpCircle, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/50', label: 'Soporte' },
  direct: { icon: MessageSquare, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100', label: 'Directo' },
};

// Componente de estadísticas
const StatsCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
  bgColor: string;
}> = ({ icon: Icon, label, value, color, bgColor }) => (
  <div className={`${bgColor} rounded-lg p-4 flex items-center gap-3`}>
    <div className={`p-2 rounded-full bg-white dark:bg-gray-800/50`}>
      <Icon className={`w-5 h-5 ${color}`} />
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-sm text-gray-600 dark:text-gray-300">{label}</p>
    </div>
  </div>
);

// Componente de item de hilo mejorado
const ThreadItem: React.FC<{
  thread: MessageThread;
  onClick: () => void;
}> = ({ thread, onClick }) => {
  const config = threadTypeConfig[thread.thread_type] || threadTypeConfig.info;
  const Icon = config.icon;
  const hasUnread = (thread.admin_unread_count || 0) > 0 || (thread.my_unread_count || 0) > 0;

  return (
    <div
      onClick={onClick}
      className={`p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 cursor-pointer transition-colors
        ${hasUnread ? 'bg-blue-50 dark:bg-blue-900/30/50 border-l-4 border-l-blue-500' : ''}`}
    >
      <div className="flex gap-3">
        {/* Icono de tipo */}
        <div className={`p-2.5 rounded-full ${config.bgColor} flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${config.color}`} />
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate flex items-center gap-2">
                {thread.user_full_name || thread.other_participant?.full_name || 'Usuario'}
                {hasUnread && (
                  <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                    {thread.admin_unread_count || thread.my_unread_count || 0}
                  </span>
                )}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">@{thread.user_username || thread.other_participant?.username}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`text-xs px-2 py-0.5 rounded-full ${config.bgColor} ${config.color} font-medium`}>
                {config.label}
              </span>
              {thread.is_closed && (
                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  Cerrado
                </span>
              )}
            </div>
          </div>

          <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mt-1 truncate">{thread.subject}</p>

          {thread.last_message_preview && (
            <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-0.5 truncate italic">
              "{thread.last_message_preview}"
            </p>
          )}

          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(thread.last_message_at).toLocaleDateString('es-CO', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {thread.message_count} mensajes
            </span>
          </div>
        </div>

        <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0 self-center" />
      </div>
    </div>
  );
};

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
  isFromAdmin: boolean;
}> = ({ attachment, isFromAdmin }) => {
  const [showPreview, setShowPreview] = useState(false);
  const FileIcon = getFileIcon(attachment.file_type);

  const handleDownload = () => {
    // Usar download_url para descargar con nombre original
    const downloadUrl = attachment.download_url || attachment.file_url;
    window.open(downloadUrl, '_blank');
  };

  // Vista previa de imagen
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
        {/* Modal de preview */}
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

  // Vista previa de video
  if (attachment.file_type === 'video') {
    return (
      <div className="mt-2">
        <video
          src={attachment.file_url}
          controls
          className="max-w-xs max-h-48 rounded-lg"
        />
        <p className={`text-xs mt-1 ${isFromAdmin ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400 dark:text-gray-500'}`}>
          {attachment.original_filename} ({attachment.file_size_human})
        </p>
      </div>
    );
  }

  // Otros archivos (documentos, etc)
  return (
    <div
      onClick={handleDownload}
      className={`mt-2 flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
        isFromAdmin
          ? 'bg-blue-500 hover:bg-blue-400'
          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:bg-gray-600'
      }`}
    >
      <FileIcon className={`w-5 h-5 ${isFromAdmin ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${isFromAdmin ? 'text-white' : 'text-gray-700 dark:text-gray-200'}`}>
          {attachment.original_filename}
        </p>
        <p className={`text-xs ${isFromAdmin ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400 dark:text-gray-500'}`}>
          {attachment.file_size_human}
        </p>
      </div>
      <Download className={`w-4 h-4 ${isFromAdmin ? 'text-white' : 'text-gray-500 dark:text-gray-400 dark:text-gray-500'}`} />
    </div>
  );
};

// Componente para previsualizar archivos seleccionados
const FilePreview: React.FC<{
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

// Modal de confirmación profesional
const ConfirmModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText: string;
  confirmColor: 'red' | 'green' | 'blue';
  icon: React.ElementType;
  isLoading?: boolean;
}> = ({ isOpen, onClose, onConfirm, title, message, confirmText, confirmColor, icon: ModalIcon, isLoading }) => {
  if (!isOpen) return null;

  const colorClasses = {
    red: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    green: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
    blue: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 dark:focus:ring-blue-400',
  };

  const iconBgClasses = {
    red: 'bg-red-100 dark:bg-red-900/50',
    green: 'bg-green-100 dark:bg-green-900/50',
    blue: 'bg-blue-100 dark:bg-blue-900/50',
  };

  const iconColorClasses = {
    red: 'text-red-600 dark:text-red-400',
    green: 'text-green-600 dark:text-green-400',
    blue: 'text-blue-600 dark:text-blue-400',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />

        {/* Modal */}
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl dark:shadow-gray-900/50 max-w-md w-full p-6 transform transition-all">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full ${iconBgClasses[confirmColor]}`}>
              <ModalIcon className={`w-6 h-6 ${iconColorClasses[confirmColor]}`} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{message}</p>
            </div>
          </div>

          <div className="mt-6 flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 flex items-center gap-2 ${colorClasses[confirmColor]}`}
            >
              {isLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente de vista de conversación
const ThreadConversation: React.FC<{
  thread: MessageThreadDetail;
  onBack: () => void;
  onReply: (message: string, files: File[]) => Promise<void>;
  onClose: () => Promise<void>;
  onReopen: () => Promise<void>;
}> = ({ thread, onBack, onReply, onClose, onReopen }) => {
  const [replyMessage, setReplyMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isReopening, setIsReopening] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const config = threadTypeConfig[thread.thread_type] || threadTypeConfig.info;
  const Icon = config.icon;

  // Scroll al final cuando hay nuevos mensajes
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
          if (file) {
            files.push(file);
          }
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleClose = async () => {
    setIsClosing(true);
    try {
      await onClose();
      setShowCloseModal(false);
    } finally {
      setIsClosing(false);
    }
  };

  const handleReopen = async () => {
    setIsReopening(true);
    try {
      await onReopen();
      setShowReopenModal(false);
    } finally {
      setIsReopening(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-200 dark:bg-gray-600 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className={`p-2 rounded-full ${config.bgColor}`}>
              <Icon className={`w-5 h-5 ${config.color}`} />
            </div>
            <div>
              <h2 className="font-semibold">{thread.subject}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                Con: {thread.user_full_name || thread.other_participant?.full_name}
                <span className="text-gray-400 dark:text-gray-500 ml-1">
                  (@{thread.user_username || thread.other_participant?.username})
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded-full ${config.bgColor} ${config.color}`}>
              {config.label}
            </span>
            {!thread.is_closed ? (
              <button
                onClick={() => setShowCloseModal(true)}
                disabled={isClosing}
                className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-900/30 rounded-lg transition-colors flex items-center gap-1"
              >
                <XCircle className="w-4 h-4" />
                Cerrar
              </button>
            ) : (
              <button
                onClick={() => setShowReopenModal(true)}
                disabled={isReopening}
                className="px-3 py-1.5 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:bg-green-900/30 rounded-lg transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-4 h-4" />
                Reabrir
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal de confirmación para cerrar */}
      <ConfirmModal
        isOpen={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        onConfirm={handleClose}
        title="Cerrar conversación"
        message="Al cerrar esta conversación, el usuario no podrá enviar más mensajes en este hilo. Sin embargo, podrá crear una nueva conversación si necesita contactarte nuevamente."
        confirmText="Cerrar conversación"
        confirmColor="red"
        icon={XCircle}
        isLoading={isClosing}
      />

      {/* Modal de confirmación para reabrir */}
      <ConfirmModal
        isOpen={showReopenModal}
        onClose={() => setShowReopenModal(false)}
        onConfirm={handleReopen}
        title="Reabrir conversación"
        message="Al reabrir esta conversación, el usuario podrá volver a enviarte mensajes en este hilo."
        confirmText="Reabrir conversación"
        confirmColor="green"
        icon={RotateCcw}
        isLoading={isReopening}
      />

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-100 dark:bg-gray-700">
        {thread.messages.map((msg) => {
          const isFromAdmin = msg.sender !== null && msg.sender === thread.admin;
          // Iniciales para avatar
          const senderName = msg.sender_full_name || msg.sender_username || 'Usuario';
          const initials = senderName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isFromAdmin ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar - solo para mensajes del otro usuario */}
              {!isFromAdmin && (
                <div className="flex-shrink-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
                    {initials}
                  </div>
                </div>
              )}

              {/* Contenido del mensaje */}
              <div className={`max-w-[70%] ${isFromAdmin ? 'items-end' : 'items-start'}`}>
                {/* Nombre del remitente - solo para mensajes que no son del admin */}
                {!isFromAdmin && (
                  <div className="mb-1 ml-1">
                    <span className="text-sm font-bold text-purple-700 dark:text-purple-300">
                      {msg.sender_full_name || msg.sender_username}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                      @{msg.sender_username}
                    </span>
                  </div>
                )}

                {/* Burbuja del mensaje */}
                <div
                  className={`p-3 rounded-2xl shadow-sm ${
                    isFromAdmin
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-bl-md'
                  }`}
                >
                  {msg.message && msg.message !== '[Archivo adjunto]' && (
                    <p className={`text-sm whitespace-pre-line leading-relaxed ${isFromAdmin ? 'text-white' : 'text-gray-800 dark:text-gray-100'}`}>
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
                          isFromAdmin={isFromAdmin}
                        />
                      ))}
                    </div>
                  )}
                  {/* Hora */}
                  <div className={`flex items-center gap-1 mt-2 ${isFromAdmin ? 'text-blue-200 justify-end' : 'text-gray-400 dark:text-gray-500'}`}>
                    <p className="text-xs">{msg.time_ago}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input de respuesta o mensaje de cerrado */}
      {!thread.is_closed ? (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
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
                  <FilePreview
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
                title="Adjuntar archivo (o pega desde el portapapeles)"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              <input
                ref={textInputRef}
                type="text"
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Escribe tu respuesta... (Ctrl+V para pegar imagen)"
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                disabled={isSending}
              />
              <button
                type="submit"
                disabled={(!replyMessage.trim() && selectedFiles.length === 0) || isSending}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSending ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 dark:text-gray-500">
            <XCircle className="w-5 h-5" />
            <span>Esta conversación está cerrada.</span>
            <button
              onClick={() => setShowReopenModal(true)}
              disabled={isReopening}
              className="text-green-600 dark:text-green-400 hover:text-green-700 dark:text-green-300 font-medium underline"
            >
              Reabrir para continuar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente principal
export const AdminThreadList: React.FC = () => {
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed' | 'unread'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | ThreadType>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Filtro por usuario específico
  const [userFilter, setUserFilter] = useState<UserSearchResult | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Estado para vista de conversación
  const [selectedThread, setSelectedThread] = useState<MessageThreadDetail | null>(null);
  const [isLoadingThread, setIsLoadingThread] = useState(false);

  // Búsqueda de usuarios con debounce
  useEffect(() => {
    if (!userSearchQuery || userSearchQuery.length < 2) {
      setUserSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingUsers(true);
      try {
        const response = await notificationsApi.searchUsers(userSearchQuery, 10);
        setUserSearchResults(response.results);
      } catch (error) {
        console.error('Error searching users:', error);
        setUserSearchResults([]);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [userSearchQuery]);

  // Cargar hilos
  const loadThreads = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (statusFilter === 'open') params.is_closed = false;
      if (statusFilter === 'closed') params.is_closed = true;
      if (statusFilter === 'unread') params.has_unread = true;

      const response = await notificationsApi.listAdminThreads(params);
      setThreads(response.results || []);
    } catch (error) {
      console.error('Error loading threads:', error);
      setThreads([]);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  // Filtrar hilos localmente
  const filteredThreads = useMemo(() => {
    let result = [...(threads || [])];

    // Filtro por usuario específico
    if (userFilter) {
      result = result.filter((t) =>
        t.user === userFilter.id ||
        t.other_participant?.id === userFilter.id
      );
    }

    // Filtro por búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((t) =>
        (t.user_full_name || '').toLowerCase().includes(query) ||
        (t.user_username || '').toLowerCase().includes(query) ||
        (t.subject || '').toLowerCase().includes(query) ||
        (t.last_message_preview || '').toLowerCase().includes(query) ||
        (t.other_participant?.full_name || '').toLowerCase().includes(query) ||
        (t.other_participant?.username || '').toLowerCase().includes(query)
      );
    }

    // Filtro por tipo
    if (typeFilter !== 'all') {
      result = result.filter((t) => t.thread_type === typeFilter);
    }

    // Filtro por fecha
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();

      if (dateFilter === 'today') {
        filterDate.setHours(0, 0, 0, 0);
      } else if (dateFilter === 'week') {
        filterDate.setDate(now.getDate() - 7);
      } else if (dateFilter === 'month') {
        filterDate.setMonth(now.getMonth() - 1);
      }

      result = result.filter((t) => new Date(t.last_message_at) >= filterDate);
    }

    return result;
  }, [threads, searchQuery, typeFilter, dateFilter, userFilter]);

  // Estadísticas
  const stats = useMemo(() => {
    const total = threads.length;
    const open = threads.filter(t => !t.is_closed).length;
    const closed = threads.filter(t => t.is_closed).length;
    const unread = threads.filter(t => (t.admin_unread_count || 0) > 0 || (t.my_unread_count || 0) > 0).length;
    const byType = {
      warning: threads.filter(t => t.thread_type === 'warning').length,
      info: threads.filter(t => t.thread_type === 'info').length,
      support: threads.filter(t => t.thread_type === 'support').length,
      direct: threads.filter(t => t.thread_type === 'direct').length,
    };
    return { total, open, closed, unread, byType };
  }, [threads]);

  // Abrir hilo
  const handleOpenThread = async (threadId: number) => {
    setIsLoadingThread(true);
    try {
      const thread = await notificationsApi.getThread(threadId);
      setSelectedThread(thread);
    } catch (error) {
      console.error('Error loading thread:', error);
    } finally {
      setIsLoadingThread(false);
    }
  };

  // Responder en hilo (con soporte para adjuntos)
  const handleReply = async (message: string, files: File[] = []) => {
    if (!selectedThread) return;

    try {
      if (files.length > 0) {
        // Usar endpoint con adjuntos
        await notificationsApi.replyWithAttachments(selectedThread.id, message, files);
      } else {
        // Usar endpoint simple
        await notificationsApi.replyToThread(selectedThread.id, message);
      }
      const updatedThread = await notificationsApi.getThread(selectedThread.id);
      setSelectedThread(updatedThread);
    } catch (error) {
      console.error('Error replying:', error);
      throw error;
    }
  };

  // Cerrar hilo
  const handleCloseThread = async () => {
    if (!selectedThread) return;

    try {
      await notificationsApi.closeThread(selectedThread.id);
      setSelectedThread((prev) =>
        prev ? { ...prev, is_closed: true, closed_at: new Date().toISOString() } : null
      );
      loadThreads();
    } catch (error) {
      console.error('Error closing thread:', error);
      throw error;
    }
  };

  // Reabrir hilo
  const handleReopenThread = async () => {
    if (!selectedThread) return;

    try {
      await notificationsApi.reopenThread(selectedThread.id);
      setSelectedThread((prev) =>
        prev ? { ...prev, is_closed: false, closed_at: null, closed_by: null } : null
      );
      loadThreads();
    } catch (error) {
      console.error('Error reopening thread:', error);
      throw error;
    }
  };

  // Vista de conversación
  if (selectedThread) {
    return (
      <div className="h-[600px] flex flex-col bg-white dark:bg-gray-800 rounded-lg border overflow-hidden">
        <ThreadConversation
          thread={selectedThread}
          onBack={() => setSelectedThread(null)}
          onReply={handleReply}
          onClose={handleCloseThread}
          onReopen={handleReopenThread}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          icon={MessageSquare}
          label="Total"
          value={stats.total}
          color="text-blue-600 dark:text-blue-400"
          bgColor="bg-blue-50 dark:bg-blue-900/30"
        />
        <StatsCard
          icon={MailOpen}
          label="Abiertas"
          value={stats.open}
          color="text-green-600 dark:text-green-400"
          bgColor="bg-green-50 dark:bg-green-900/30"
        />
        <StatsCard
          icon={Mail}
          label="No leídas"
          value={stats.unread}
          color="text-orange-600"
          bgColor="bg-orange-50"
        />
        <StatsCard
          icon={CheckCircle}
          label="Cerradas"
          value={stats.closed}
          color="text-gray-600 dark:text-gray-300"
          bgColor="bg-gray-100 dark:bg-gray-700"
        />
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-4 space-y-4">
        {/* Búsqueda principal */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por usuario, asunto o contenido..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors ${
              showFilters ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtros
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          <button
            onClick={loadThreads}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        {/* Filtros expandidos */}
        {showFilters && (
          <div className="pt-4 border-t grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Filtro por usuario */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                <UserSearch className="w-4 h-4 inline mr-1" />
                Usuario específico
              </label>
              <div className="relative">
                {userFilter ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg">
                    <User className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-sm text-purple-700 dark:text-purple-300 flex-1 truncate">
                      {userFilter.full_name}
                    </span>
                    <button
                      onClick={() => {
                        setUserFilter(null);
                        setUserSearchQuery('');
                      }}
                      className="text-purple-400 hover:text-purple-600 dark:text-purple-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={userSearchQuery}
                      onChange={(e) => {
                        setUserSearchQuery(e.target.value);
                        setShowUserDropdown(true);
                      }}
                      onFocus={() => setShowUserDropdown(true)}
                      placeholder="Buscar usuario..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                    {showUserDropdown && (userSearchResults.length > 0 || isSearchingUsers) && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg dark:shadow-gray-900/50 max-h-48 overflow-y-auto">
                        {isSearchingUsers ? (
                          <div className="p-3 text-center text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm">
                            Buscando...
                          </div>
                        ) : (
                          userSearchResults.map((user) => (
                            <button
                              key={user.id}
                              onClick={() => {
                                setUserFilter(user);
                                setUserSearchQuery('');
                                setShowUserDropdown(false);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 flex items-center gap-2"
                            >
                              <User className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.full_name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">@{user.username} · {user.role}</p>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Filtro por estado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Estado</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'Todas' },
                  { value: 'open', label: 'Abiertas' },
                  { value: 'closed', label: 'Cerradas' },
                  { value: 'unread', label: 'No leídas' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setStatusFilter(opt.value as any)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      statusFilter === opt.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:bg-gray-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filtro por tipo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Tipo de mensaje</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setTypeFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    typeFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:bg-gray-600'
                  }`}
                >
                  Todos
                </button>
                {Object.entries(threadTypeConfig).map(([type, config]) => {
                  const TypeIcon = config.icon;
                  return (
                    <button
                      key={type}
                      onClick={() => setTypeFilter(type as ThreadType)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                        typeFilter === type
                          ? `${config.bgColor} ${config.color}`
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:bg-gray-600'
                      }`}
                    >
                      <TypeIcon className="w-3.5 h-3.5" />
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filtro por fecha */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Período</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'Todo el tiempo' },
                  { value: 'today', label: 'Hoy' },
                  { value: 'week', label: 'Última semana' },
                  { value: 'month', label: 'Último mes' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDateFilter(opt.value as any)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      dateFilter === opt.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:bg-gray-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Indicador de filtros activos */}
        {(searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || dateFilter !== 'all' || userFilter) && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <span className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">Filtros activos:</span>
            <div className="flex flex-wrap gap-2">
              {userFilter && (
                <span className="px-2 py-1 bg-purple-100 text-purple-700 dark:text-purple-300 text-xs rounded-full flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {userFilter.full_name}
                  <button onClick={() => { setUserFilter(null); setUserSearchQuery(''); }}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {searchQuery && (
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs rounded-full flex items-center gap-1">
                  Búsqueda: "{searchQuery}"
                  <button onClick={() => setSearchQuery('')}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {statusFilter !== 'all' && (
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs rounded-full flex items-center gap-1">
                  Estado: {statusFilter === 'open' ? 'Abiertas' : statusFilter === 'closed' ? 'Cerradas' : 'No leídas'}
                  <button onClick={() => setStatusFilter('all')}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {typeFilter !== 'all' && (
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs rounded-full flex items-center gap-1">
                  Tipo: {threadTypeConfig[typeFilter].label}
                  <button onClick={() => setTypeFilter('all')}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {dateFilter !== 'all' && (
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs rounded-full flex items-center gap-1">
                  Período: {dateFilter === 'today' ? 'Hoy' : dateFilter === 'week' ? 'Última semana' : 'Último mes'}
                  <button onClick={() => setDateFilter('all')}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setTypeFilter('all');
                  setDateFilter('all');
                  setUserFilter(null);
                  setUserSearchQuery('');
                }}
                className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:text-red-300 font-medium"
              >
                Limpiar todos
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Resumen por tipo */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(stats.byType).map(([type, count]) => {
          const config = threadTypeConfig[type as ThreadType];
          const TypeIcon = config.icon;
          return (
            <button
              key={type}
              onClick={() => setTypeFilter(typeFilter === type ? 'all' : type as ThreadType)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${
                typeFilter === type
                  ? `${config.bgColor} ${config.color} ring-2 ring-offset-1 ring-current`
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <TypeIcon className="w-4 h-4" />
              <span>{config.label}</span>
              <span className="px-1.5 py-0.5 bg-white dark:bg-gray-800/50 rounded-full text-xs font-bold">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Lista de hilos */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header de la lista */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {filteredThreads.length} conversación{filteredThreads.length !== 1 ? 'es' : ''}
            {filteredThreads.length !== threads.length && ` (de ${threads.length} total)`}
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
            <p className="mt-3 text-gray-500 dark:text-gray-400 dark:text-gray-500">Cargando conversaciones...</p>
          </div>
        ) : filteredThreads.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400 dark:text-gray-500">
            <MessageSquare className="w-16 h-16 mx-auto text-gray-300" />
            <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">No hay conversaciones</h3>
            <p className="mt-2 text-sm max-w-md mx-auto">
              {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || dateFilter !== 'all' || userFilter
                ? 'No se encontraron conversaciones con los filtros aplicados. Intenta ajustar los criterios de búsqueda.'
                : 'Aún no has enviado ningún mensaje. Usa la pestaña "Enviar Mensaje" para crear una nueva conversación.'}
            </p>
            {(searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || dateFilter !== 'all' || userFilter) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setTypeFilter('all');
                  setDateFilter('all');
                  setUserFilter(null);
                  setUserSearchQuery('');
                }}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
            {filteredThreads.map((thread) => (
              <ThreadItem
                key={thread.id}
                thread={thread}
                onClick={() => handleOpenThread(thread.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Loading overlay para cargar conversación */}
      {isLoadingThread && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl dark:shadow-gray-900/50 flex items-center gap-3">
            <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
            <span>Cargando conversación...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminThreadList;
