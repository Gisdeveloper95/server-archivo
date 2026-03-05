/**
 * MessageComposer - Componente para enviar mensajes a usuarios (solo superadmin)
 */
import React, { useState, useEffect } from 'react';
import {
  Send,
  Users,
  User,
  UserCheck,
  X,
  AlertTriangle,
  Info,
  HelpCircle,
  Search,
  Check,
} from 'lucide-react';
import {
  notificationsApi,
  SendNotificationRequest,
  NotificationTemplate,
  ThreadType,
  NotificationPriority,
} from '../../api/notifications';
import apiClient from '../../api/client';

interface UserOption {
  id: number;
  username: string;
  full_name: string;
  email: string;
  role: string;
}

// Configuración de tipos de mensaje
const threadTypeConfig: Record<ThreadType, { icon: React.ElementType; color: string; label: string }> = {
  warning: { icon: AlertTriangle, color: 'text-red-600 dark:text-red-400', label: 'Advertencia / Llamado de atención' },
  info: { icon: Info, color: 'text-blue-600 dark:text-blue-400', label: 'Información' },
  support: { icon: HelpCircle, color: 'text-green-600 dark:text-green-400', label: 'Soporte' },
  direct: { icon: Info, color: 'text-purple-600 dark:text-purple-400', label: 'Mensaje Directo' },
};

export const MessageComposer: React.FC<{
  onSuccess?: () => void;
  onCancel?: () => void;
}> = ({ onSuccess, onCancel }) => {
  // Estado del formulario
  const [recipientType, setRecipientType] = useState<'user' | 'role' | 'users' | 'all'>('user');
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<UserOption[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [threadType, setThreadType] = useState<ThreadType>('info');
  const [priority, setPriority] = useState<NotificationPriority>('normal');
  const [allowReply, setAllowReply] = useState(true);

  // Estado de búsqueda de usuarios
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<UserOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Estado de envío
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Templates
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  // Cargar templates al montar
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await notificationsApi.listTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  // Buscar usuarios
  useEffect(() => {
    if (userSearch.length < 2) {
      setUserResults([]);
      return;
    }

    const searchUsers = async () => {
      setIsSearching(true);
      try {
        // Nota: sin trailing slash porque el router tiene trailing_slash=False
        const response = await apiClient.get('/admin/users', {
          params: { search: userSearch, per_page: 10 },
        });
        setUserResults(response.data.results || []);
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [userSearch]);

  // Aplicar template
  const applyTemplate = (templateId: string) => {
    const template = templates.find((t) => t.template_id === templateId);
    if (template) {
      setSubject(template.subject);
      setMessage(template.message_template);
      setSelectedTemplate(templateId);
    }
  };

  // Agregar usuario a la lista de selección múltiple
  const addUserToSelection = (user: UserOption) => {
    if (!selectedUsers.find((u) => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
    setUserSearch('');
    setUserResults([]);
  };

  // Remover usuario de la selección
  const removeUserFromSelection = (userId: number) => {
    setSelectedUsers(selectedUsers.filter((u) => u.id !== userId));
  };

  // Enviar mensaje
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validaciones
    if (!subject.trim()) {
      setError('El asunto es requerido');
      return;
    }
    if (!message.trim()) {
      setError('El mensaje es requerido');
      return;
    }

    if (recipientType === 'user' && !selectedUser) {
      setError('Selecciona un usuario');
      return;
    }
    if (recipientType === 'users' && selectedUsers.length === 0) {
      setError('Selecciona al menos un usuario');
      return;
    }
    if (recipientType === 'role' && !selectedRole) {
      setError('Selecciona un rol');
      return;
    }

    setIsSending(true);

    try {
      const request: SendNotificationRequest = {
        recipient_type: recipientType,
        subject,
        message,
        thread_type: threadType,
        priority,
        allow_reply: allowReply,
      };

      // Agregar valor del destinatario según tipo
      if (recipientType === 'user' && selectedUser) {
        request.recipient_id = selectedUser.id;
      } else if (recipientType === 'users') {
        request.recipient_ids = selectedUsers.map((u) => u.id);
      } else if (recipientType === 'role' && selectedRole) {
        request.recipient_role = selectedRole;
      }

      const response = await notificationsApi.send(request);

      if (response.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess?.();
        }, 1500);
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Error al enviar el mensaje');
    } finally {
      setIsSending(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto">
          <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">Mensaje enviado</h3>
        <p className="mt-1 text-gray-500 dark:text-gray-400 dark:text-gray-500">El mensaje ha sido enviado correctamente</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Tipo de destinatario */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          Destinatarios
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { value: 'user', icon: User, label: 'Usuario' },
            { value: 'users', icon: Users, label: 'Múltiples' },
            { value: 'role', icon: UserCheck, label: 'Por rol' },
            { value: 'all', icon: Users, label: 'Todos' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRecipientType(opt.value as any)}
              className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors
                ${
                  recipientType === opt.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900'
                }`}
            >
              <opt.icon className="w-4 h-4" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Selector de usuario único */}
      {recipientType === 'user' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Buscar usuario
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={selectedUser ? selectedUser.full_name : userSearch}
              onChange={(e) => {
                setUserSearch(e.target.value);
                setSelectedUser(null);
              }}
              placeholder="Escribe para buscar..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
            {selectedUser && (
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {/* Resultados de búsqueda */}
          {userResults.length > 0 && !selectedUser && (
            <div className="mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg dark:shadow-gray-900/50 max-h-48 overflow-y-auto">
              {userResults.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => {
                    setSelectedUser(user);
                    setUserResults([]);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{user.full_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{user.email}</p>
                  </div>
                  <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{user.role}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selector de múltiples usuarios */}
      {recipientType === 'users' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Seleccionar usuarios
          </label>
          {/* Usuarios seleccionados */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedUsers.map((user) => (
                <span
                  key={user.id}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded text-sm"
                >
                  {user.full_name}
                  <button
                    type="button"
                    onClick={() => removeUserFromSelection(user.id)}
                    className="hover:text-blue-600 dark:hover:text-blue-400 dark:text-blue-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Buscar y agregar usuarios..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>
          {userResults.length > 0 && (
            <div className="mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg dark:shadow-gray-900/50 max-h-48 overflow-y-auto">
              {userResults.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => addUserToSelection(user)}
                  disabled={selectedUsers.some((u) => u.id === user.id)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 flex items-center justify-between disabled:opacity-50"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{user.full_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{user.email}</p>
                  </div>
                  {selectedUsers.some((u) => u.id === user.id) && (
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selector de rol */}
      {recipientType === 'role' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Seleccionar rol
          </label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
          >
            <option value="">Selecciona un rol...</option>
            <option value="consultation">Consulta</option>
            <option value="consultation_edit">Consulta + Edición</option>
            <option value="admin">Administrador</option>
            <option value="superadmin">Super Administrador</option>
          </select>
        </div>
      )}

      {/* Tipo de mensaje */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          Tipo de mensaje
        </label>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {Object.entries(threadTypeConfig).map(([type, config]) => {
            const Icon = config.icon;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setThreadType(type as ThreadType)}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors
                  ${
                    threadType === type
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900'
                  }`}
              >
                <Icon className={`w-5 h-5 ${config.color}`} />
                <span className="text-xs font-medium text-center dark:text-gray-200">{config.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Templates */}
      {templates.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Usar plantilla (opcional)
          </label>
          <select
            value={selectedTemplate}
            onChange={(e) => applyTemplate(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
          >
            <option value="">Selecciona una plantilla...</option>
            {templates.map((t) => (
              <option key={t.template_id} value={t.template_id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Asunto */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          Asunto
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Asunto del mensaje..."
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
          required
        />
      </div>

      {/* Mensaje */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          Mensaje
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Escribe tu mensaje..."
          rows={6}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
          required
        />
      </div>

      {/* Opciones adicionales */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={priority === 'urgent'}
            onChange={(e) => setPriority(e.target.checked ? 'urgent' : 'normal')}
            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
          <span className="text-sm text-gray-700 dark:text-gray-200">
            Marcar como urgente (enviar también por email)
          </span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={allowReply}
            onChange={(e) => setAllowReply(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
          <span className="text-sm text-gray-700 dark:text-gray-200">Permitir respuesta del usuario</span>
        </label>
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={isSending}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isSending ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Enviar mensaje
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default MessageComposer;
