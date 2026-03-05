import React, { useState } from 'react';
import { X, Copy, Check, Link2, Lock, Mail, Calendar, Download } from 'lucide-react';
import { createShareLink, ShareLinkCreate } from '../api/sharing';

interface ShareLinkModalProps {
  path: string;
  isDirectory: boolean;
  onClose: () => void;
}

export const ShareLinkModal: React.FC<ShareLinkModalProps> = ({
  path,
  isDirectory,
  onClose
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Form state
  const [permission, setPermission] = useState<'view' | 'download'>('view');
  const [password, setPassword] = useState('');
  const [requireEmail, setRequireEmail] = useState(false);
  const [allowedDomain, setAllowedDomain] = useState('');
  const [hasExpiration, setHasExpiration] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [hasMaxDownloads, setHasMaxDownloads] = useState(false);
  const [maxDownloads, setMaxDownloads] = useState('');
  const [description, setDescription] = useState('');

  const handleCreateLink = async () => {
    setLoading(true);
    setError(null);

    const data: ShareLinkCreate = {
      path,
      permission,
      description
    };

    if (password) data.password = password;
    if (requireEmail) {
      data.require_email = true;
      if (allowedDomain) data.allowed_domain = allowedDomain;
    }
    if (hasExpiration && expiresAt) data.expires_at = expiresAt;
    if (hasMaxDownloads && maxDownloads) data.max_downloads = parseInt(maxDownloads);

    try {
      const result = await createShareLink(data);
      setShareUrl(result.url);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al crear link compartido');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUrl = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-gray-900/50 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Link2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-xl font-semibold">Compartir {isDirectory ? 'Directorio' : 'Archivo'}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{path}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {shareUrl ? (
            // Success state - show URL
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-800 dark:text-green-200 mb-2">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">Link creado exitosamente</span>
                </div>
                <p className="text-sm text-green-700 dark:text-green-300">
                  El link compartido ha sido generado. Cópialo y compártelo con quien necesite acceso.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  URL de acceso público
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={handleCopyUrl}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      copied
                        ? 'bg-green-600 text-white'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {copied ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Importante:</strong> Este link puede ser usado por cualquier persona que lo tenga.
                  Asegúrate de compartirlo solo con personas de confianza.
                </p>
              </div>
            </div>
          ) : (
            // Form state
            <div className="space-y-4">
              {/* Permission type */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Permisos
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPermission('view')}
                    className={`p-3 border-2 rounded-lg transition-colors ${
                      permission === 'view'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        permission === 'view' ? 'border-blue-600 bg-blue-600' : 'border-gray-300 dark:border-gray-600'
                      }`} />
                      <span className="font-medium">Solo ver</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setPermission('download')}
                    className={`p-3 border-2 rounded-lg transition-colors ${
                      permission === 'download'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        permission === 'download' ? 'border-blue-600 bg-blue-600' : 'border-gray-300 dark:border-gray-600'
                      }`} />
                      <span className="font-medium">Ver y descargar</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Password protection */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                  <Lock className="w-4 h-4" />
                  Proteger con contraseña (opcional)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Dejar vacío para acceso sin contraseña"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>

              {/* Email requirement */}
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={requireEmail}
                    onChange={(e) => setRequireEmail(e.target.checked)}
                    className="w-4 h-4 text-blue-600 dark:text-blue-400 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Requerir email para acceder
                  </span>
                </label>

                {requireEmail && (
                  <input
                    type="text"
                    value={allowedDomain}
                    onChange={(e) => setAllowedDomain(e.target.value)}
                    placeholder="Dominio permitido (ej: igac.gov.co)"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                )}
              </div>

              {/* Expiration date */}
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={hasExpiration}
                    onChange={(e) => {
                      setHasExpiration(e.target.checked);
                      if (!e.target.checked) setExpiresAt('');
                    }}
                    className="w-4 h-4 text-blue-600 dark:text-blue-400 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Establecer fecha de expiración
                  </span>
                </label>

                {hasExpiration && (
                  <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                )}
              </div>

              {/* Max downloads */}
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={hasMaxDownloads}
                    onChange={(e) => {
                      setHasMaxDownloads(e.target.checked);
                      if (!e.target.checked) setMaxDownloads('');
                    }}
                    className="w-4 h-4 text-blue-600 dark:text-blue-400 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Limitar número de descargas
                  </span>
                </label>

                {hasMaxDownloads && (
                  <input
                    type="number"
                    value={maxDownloads}
                    onChange={(e) => setMaxDownloads(e.target.value)}
                    placeholder="Número de descargas"
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Descripción (opcional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Notas sobre este link compartido..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-3">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 dark:bg-gray-900">
          {shareUrl ? (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              Cerrar
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateLink}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creando...' : 'Crear Link'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
