import { useState } from 'react';
import { Layout } from '../components/Layout';
import { UserManagement } from '../components/admin/UserManagement';
import { PermissionManagement } from '../components/admin/PermissionManagement';
import { Users, Shield } from 'lucide-react';

type Tab = 'users' | 'permissions';

export const Administration = () => {
  const [activeTab, setActiveTab] = useState<Tab>('users');

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-red-600 dark:text-red-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Panel de Administración</h2>
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            Gestiona usuarios, roles y permisos del sistema de archivos.
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('users')}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 font-semibold transition-colors ${
                  activeTab === 'users'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:text-white hover:border-gray-300 dark:border-gray-600'
                }`}
              >
                <Users className="w-5 h-5" />
                Gestión de Usuarios
              </button>
              <button
                onClick={() => setActiveTab('permissions')}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 font-semibold transition-colors ${
                  activeTab === 'permissions'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:text-white hover:border-gray-300 dark:border-gray-600'
                }`}
              >
                <Shield className="w-5 h-5" />
                Gestión de Permisos
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'users' && <UserManagement />}
            {activeTab === 'permissions' && <PermissionManagement />}
          </div>
        </div>
      </div>
    </Layout>
  );
};
