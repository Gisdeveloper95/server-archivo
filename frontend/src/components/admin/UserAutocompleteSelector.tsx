import React, { useState, useEffect, useRef } from 'react';
import type { User } from '../../types/user';
import { usersApi } from '../../api/users';
import { useModal } from '../../hooks/useModal';

interface UserAutocompleteSelectorProps {
  selectedUsers: User[];
  onUsersChange: (users: User[]) => void;
  placeholder?: string;
}

export const UserAutocompleteSelector: React.FC<UserAutocompleteSelectorProps> = ({
  selectedUsers,
  onUsersChange,
  placeholder = 'Buscar usuarios por nombre o email...',
}) => {
  const { alert } = useModal();
  const [searchTerm, setSearchTerm] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cargar todos los usuarios al montar el componente
  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      try {
        const response = await usersApi.getAll({ is_active: true });
        setAllUsers(response.results || []);
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  // Filtrar usuarios basado en el término de búsqueda
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredUsers([]);
      setIsDropdownOpen(false);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = allUsers.filter(
      (user) =>
        !selectedUsers.some((selected) => selected.id === user.id) &&
        (user.email.toLowerCase().includes(searchLower) ||
          user.first_name.toLowerCase().includes(searchLower) ||
          user.last_name.toLowerCase().includes(searchLower) ||
          `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchLower))
    );

    setFilteredUsers(filtered.slice(0, 10)); // Limitar a 10 resultados
    setIsDropdownOpen(filtered.length > 0);
  }, [searchTerm, allUsers, selectedUsers]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectUser = (user: User) => {
    onUsersChange([...selectedUsers, user]);
    setSearchTerm('');
    setIsDropdownOpen(false);
    inputRef.current?.focus();
  };

  const handleRemoveUser = (userId: number) => {
    onUsersChange(selectedUsers.filter((user) => user.id !== userId));
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Backspace en input vacío elimina el último usuario
    if (e.key === 'Backspace' && searchTerm === '' && selectedUsers.length > 0) {
      handleRemoveUser(selectedUsers[selectedUsers.length - 1].id);
    }
  };

  // Manejar pegado masivo de correos
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');

    // Detectar si es un pegado masivo (contiene separadores)
    if (pastedText.includes(',') || pastedText.includes('\t') || pastedText.includes('\n') || pastedText.includes(';')) {
      e.preventDefault(); // Prevenir el pegado normal

      // Separar por comas, tabs, saltos de línea o punto y coma
      const emails = pastedText
        .split(/[,\t\n;]+/)
        .map(email => email.trim().toLowerCase())
        .filter(email => email.length > 0 && email.includes('@'));

      if (emails.length === 0) {
        return;
      }

      // Buscar usuarios que coincidan con los emails pegados
      const usersToAdd: User[] = [];
      const notFound: string[] = [];

      emails.forEach(email => {
        const user = allUsers.find(u =>
          u.email.toLowerCase() === email &&
          !selectedUsers.some(s => s.id === u.id) &&
          !usersToAdd.some(a => a.id === u.id)
        );

        if (user) {
          usersToAdd.push(user);
        } else if (!selectedUsers.some(s => s.email.toLowerCase() === email)) {
          notFound.push(email);
        }
      });

      // Agregar todos los usuarios encontrados
      if (usersToAdd.length > 0) {
        onUsersChange([...selectedUsers, ...usersToAdd]);
      }

      // Mostrar alerta si algunos no se encontraron
      if (notFound.length > 0) {
        alert(`Se agregaron ${usersToAdd.length} usuario(s).\n\nNo se encontraron: ${notFound.join(', ')}`, {
          type: 'warning',
          title: 'Usuarios agregados parcialmente'
        });
      }

      setSearchTerm('');
      setIsDropdownOpen(false);
    }
  };

  return (
    <div className="relative">
      {/* Selected Users (Chips) */}
      <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-white dark:bg-gray-800 min-h-[60px]">
        {selectedUsers.map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded-full text-sm"
          >
            <span className="font-medium">
              {user.first_name} {user.last_name}
            </span>
            <span className="text-blue-600 dark:text-blue-400 text-xs">({user.email})</span>
            <button
              type="button"
              onClick={() => handleRemoveUser(user.id)}
              className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 dark:text-blue-200 font-bold"
            >
              ×
            </button>
          </div>
        ))}

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleInputKeyDown}
          onPaste={handlePaste}
          placeholder={selectedUsers.length === 0 ? placeholder : 'Pega múltiples correos separados por comas o tabs...'}
          className="flex-1 min-w-[200px] outline-none text-sm"
          disabled={loading}
        />
      </div>

      {/* Dropdown */}
      {isDropdownOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border rounded-lg shadow-lg dark:shadow-gray-900/50 max-h-60 overflow-y-auto"
        >
          {filteredUsers.length > 0 ? (
            <ul>
              {filteredUsers.map((user) => (
                <li
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className="px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 dark:bg-blue-900/30 cursor-pointer border-b last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-300">{user.email}</div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
                      {user.role === 'superadmin' && '👑 Superadmin'}
                      {user.role === 'admin' && '⚙️ Admin'}
                      {user.role === 'consultation_edit' && '✏️ Consulta + Edición'}
                      {user.role === 'consultation' && '👁️ Consulta'}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">No se encontraron usuarios</div>
          )}
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="absolute right-3 top-3 text-gray-400 dark:text-gray-500 text-sm">Cargando usuarios...</div>
      )}

      {/* Count */}
      {selectedUsers.length > 0 && (
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          {selectedUsers.length} usuario{selectedUsers.length !== 1 ? 's' : ''} seleccionado
          {selectedUsers.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Hint for bulk paste */}
      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
        💡 Puedes pegar múltiples correos separados por comas, tabulaciones o saltos de línea
      </div>
    </div>
  );
};
