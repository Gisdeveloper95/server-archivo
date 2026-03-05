import { useState } from 'react';
import { Sparkles, Send, Loader, FileText, Calendar, AlertCircle, Check, ChevronDown, ChevronUp, BookOpen, X } from 'lucide-react';
import { filesApi } from '../api/files';
import { Layout } from '../components/Layout';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/Toast';

// Las 12 reglas oficiales del Sistema de Archivo
const NAMING_RULES = [
  {
    number: 1,
    title: 'Todo en minúsculas',
    description: 'Los nombres de archivos y carpetas deben estar completamente en minúsculas.',
    example: { bad: 'Documento_IMPORTANTE', good: 'documento_importante' }
  },
  {
    number: 2,
    title: 'Sin tildes ni acentos',
    description: 'No se permiten caracteres acentuados. Reemplazar por su equivalente sin acento.',
    example: { bad: 'autorizacion_técnica', good: 'autorizacion_tecnica' }
  },
  {
    number: 3,
    title: 'Sin conectores',
    description: 'Eliminar artículos y preposiciones: a, y, de, del, la, el, los, las, en, con, para, por, entre.',
    example: { bad: 'informe_de_la_reunion', good: 'informe_reunion' }
  },
  {
    number: 4,
    title: 'Espacios = Guiones bajos',
    description: 'Todos los espacios deben reemplazarse por guiones bajos (_).',
    example: { bad: 'mi documento final', good: 'mi_documento_final' }
  },
  {
    number: 5,
    title: 'Sin paréntesis ni guiones medios',
    description: 'Los paréntesis y guiones medios se reemplazan por guiones bajos.',
    example: { bad: 'archivo(v2)-final', good: 'archivo_v2_final' }
  },
  {
    number: 6,
    title: 'Sin caracteres especiales',
    description: 'Solo se permiten: letras (a-z), números (0-9), guiones bajos (_) y puntos (.).',
    example: { bad: 'doc@empresa#2024!', good: 'doc_empresa_2024' }
  },
  {
    number: 7,
    title: 'Sin caracteres duplicados',
    description: 'No se permiten letras consecutivas duplicadas.',
    example: { bad: 'documentoo_finaal', good: 'documento_final' }
  },
  {
    number: 8,
    title: 'Fecha al INICIO',
    description: 'Si hay fecha, debe ir al principio en formato YYYYMMDD (ej: 20250104).',
    example: { bad: 'reunion_enero_2025', good: '20250115_reunion' }
  },
  {
    number: 9,
    title: 'Sin palabras genéricas',
    description: 'Evitar: archivo, final, nuevo, copia, backup, temp, borrador, documento.',
    example: { bad: 'archivo_final_nuevo', good: 'informe_presupuesto' }
  },
  {
    number: 10,
    title: 'Máximo 50 caracteres',
    description: 'El nombre (sin extensión) no debe exceder 50 caracteres.',
    example: { bad: 'documento_muy_largo_que_describe_todo_el_contenido_del_archivo_en_detalle', good: 'doc_contenido_resumen' }
  },
  {
    number: 11,
    title: 'Sin prefijos prohibidos',
    description: 'No usar: nuevo_, copia_, backup_, temp_, old_, copy_, final_, v_.',
    example: { bad: 'nuevo_informe_v2', good: 'informe_v2' }
  },
  {
    number: 12,
    title: 'Usar abreviaciones del diccionario',
    description: 'Las palabras deben abreviarse según el diccionario del Sistema de Archivo. La IA abrevia las no encontradas.',
    example: { bad: 'autorizacion_manifestacion', good: 'autoriz_manifes' }
  }
];

// Componente Modal de Reglas
const RulesModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-purple-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">12 Reglas del Sistema de Archivo</h2>
              <p className="text-purple-200 text-sm">Estándares oficiales de nombrado de archivos y carpetas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-purple-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid gap-4">
            {NAMING_RULES.map((rule) => (
              <div
                key={rule.number}
                className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="bg-purple-100 text-purple-700 dark:text-purple-300 font-bold text-lg w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                    {rule.number}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">{rule.title}</h3>
                    <p className="text-gray-600 dark:text-gray-300 mt-1">{rule.description}</p>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-2">
                        <span className="text-xs text-red-600 dark:text-red-400 font-semibold block mb-1">❌ Incorrecto:</span>
                        <code className="text-red-800 dark:text-red-200 text-sm break-all">{rule.example.bad}</code>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-2">
                        <span className="text-xs text-green-600 dark:text-green-400 font-semibold block mb-1">✓ Correcto:</span>
                        <code className="text-green-800 dark:text-green-200 text-sm break-all">{rule.example.good}</code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ValidationResult {
  suggested_name?: string;
  suggested_base?: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: {
    original_name: string;
    original_length: number;
    suggested_length: number;
    path_length: number;
    available_chars: number;
    ai_model?: string;
    used_fallback?: boolean;
    dictionary_warnings?: boolean;
  };
}

export const NamingHelp = () => {
  const toast = useToast();
  const [name, setName] = useState('');
  const [context, setContext] = useState('');
  const [extension, setExtension] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showRulesApplied, setShowRulesApplied] = useState(false);
  const [rulesApplied, setRulesApplied] = useState<number[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '¡Hola! Soy tu asistente de renombramiento inteligente. Puedo ayudarte a crear nombres de archivos o directorios que cumplan con las normas del sistema.\n\nPuedes darme un nombre largo y te ayudaré a abreviarlo correctamente. También puedes darme contexto adicional para entender mejor qué estás nombrando.',
      timestamp: new Date()
    }
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.warning('Por favor ingresa un nombre');
      return;
    }

    // Agregar mensaje del usuario
    const userMessage: Message = {
      role: 'user',
      content: context ? `Nombre: "${name}"\nContexto: ${context}` : `Nombre: "${name}"`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    setLoading(true);

    try {
      // Llamar al nuevo endpoint de smart rename
      const response = await filesApi.smartRename({
        name: extension ? `${name}${extension.startsWith('.') ? extension : '.' + extension}` : name,
        current_path: '' // Ruta vacía para máximo espacio
      });

      // Adaptar respuesta al formato esperado
      const adaptedResult: ValidationResult = {
        suggested_name: response.suggested_name,
        suggested_base: response.suggested_base,
        valid: response.valid,
        errors: response.errors || [],
        warnings: response.warnings || [],
        metadata: {
          original_name: response.original_name,
          original_length: response.original_name?.length || 0,
          suggested_length: response.suggested_name?.length || 0,
          path_length: 0,
          available_chars: 50 - (response.suggested_base?.length || 0),
          ai_model: response.used_ai ? 'GROQ AI' : undefined,
          used_fallback: !response.used_ai && response.valid,
          dictionary_warnings: (response.warnings || []).length > 0
        }
      };
      setResult(adaptedResult);

      // Detectar qué reglas se aplicaron basándose en format_changes y warnings
      const appliedRules: number[] = [];
      const formatChanges = response.format_changes || [];
      const warnings = response.warnings || [];
      const allChanges = [...formatChanges, ...warnings].join(' ').toLowerCase();

      if (allChanges.includes('minúscula') || allChanges.includes('minuscula')) appliedRules.push(1);
      if (allChanges.includes('tilde') || allChanges.includes('acento')) appliedRules.push(2);
      if (allChanges.includes('conector')) appliedRules.push(3);
      if (allChanges.includes('espacio')) appliedRules.push(4);
      if (allChanges.includes('paréntesis') || allChanges.includes('guion')) appliedRules.push(5);
      if (allChanges.includes('especial')) appliedRules.push(6);
      if (allChanges.includes('duplicad')) appliedRules.push(7);
      if ((response as any).detected_date) appliedRules.push(8);
      if (allChanges.includes('genéric')) appliedRules.push(9);
      if (allChanges.includes('excede') || allChanges.includes('truncad') || allChanges.includes('límite')) appliedRules.push(10);
      if (allChanges.includes('prefijo')) appliedRules.push(11);
      // Regla 12: siempre se aplica si hay partes del diccionario o IA
      if (response.parts_analysis?.some((p: any) => p.source === 'abbreviated' || p.source === 'ai_abbreviated')) {
        appliedRules.push(12);
      }

      setRulesApplied(appliedRules);

      // Crear mensaje de respuesta de la IA
      let assistantContent = '';

      if (response.valid && response.suggested_name) {
        assistantContent = `**Sugerencia aprobada:**\n\n`;
        assistantContent += `**Nombre sugerido:** \`${response.suggested_name}\`\n\n`;
        assistantContent += `**Estadisticas:**\n`;
        assistantContent += `- Longitud original: ${response.original_name?.length || 0} caracteres\n`;
        assistantContent += `- Longitud sugerida: ${response.suggested_name?.length || 0} caracteres\n`;
        assistantContent += `- Uso IA: ${response.used_ai ? 'Si' : 'No'}\n`;

        // Mostrar análisis de partes si está disponible
        if (response.parts_analysis && response.parts_analysis.length > 0) {
          assistantContent += `\n**Análisis de partes:**\n`;
          response.parts_analysis.forEach((part: any) => {
            let icon = '';
            let description = '';

            switch (part.type) {
              case 'dictionary':
                icon = '📖';
                if (part.source === 'abbreviated') {
                  description = `\`${part.original}\` → \`${part.value}\` (Diccionario: ${part.meaning})`;
                } else {
                  description = `\`${part.value}\` (Diccionario: ${part.meaning})`;
                }
                break;
              case 'date':
                icon = '📅';
                description = `\`${part.value}\` (Fecha)`;
                break;
              case 'number':
                icon = '🔢';
                description = `\`${part.value}\` (Número)`;
                break;
              case 'cadastral_code':
                icon = '🗺️';
                description = `\`${part.value}\` (Código catastral)`;
                break;
              case 'connector':
                icon = '🚫';
                description = `\`${part.value}\` → Eliminado (Conector)`;
                break;
              case 'unknown':
                if (part.source === 'ai_abbreviated') {
                  icon = '🤖';
                  description = `\`${part.value}\` → \`${part.abbreviated_to}\` (Abreviado por IA - guardado)`;
                } else if (part.source === 'cached') {
                  icon = '💾';
                  description = `\`${part.value}\` → \`${part.abbreviated_to}\` (Cache - consistente)`;
                } else {
                  icon = '❓';
                  description = `\`${part.value}\` (Desconocido)`;
                }
                break;
              case 'standard_english':
                icon = '🌐';
                description = `\`${part.value}\` (Inglés estándar)`;
                break;
              default:
                icon = '•';
                description = `\`${part.value}\``;
            }

            assistantContent += `- ${icon} ${description}\n`;
          });
        }
      } else {
        assistantContent = `**No se pudo generar una sugerencia valida**\n\n`;
        if (response.errors && response.errors.length > 0) {
          assistantContent += `**Errores:**\n${response.errors.map((e: string) => `- ${e}`).join('\n')}`;
        }
      }

      if (response.warnings && response.warnings.length > 0) {
        assistantContent += `\n\n**Advertencias:**\n${response.warnings.map((w: string) => `- ${w}`).join('\n')}`;
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);

    } catch (error: any) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `❌ Error al generar sugerencia: ${error.response?.data?.error || error.message || 'Error desconocido'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setName('');
    setContext('');
    setExtension('');
    setResult(null);
    setRulesApplied([]);
    setShowRulesApplied(false);
    setMessages([
      {
        role: 'assistant',
        content: '¡Hola! Soy tu asistente de renombramiento inteligente. Puedo ayudarte a crear nombres de archivos o directorios que cumplan con las normas del sistema.\n\nPuedes darme un nombre largo y te ayudaré a abreviarlo correctamente. También puedes darme contexto adicional para entender mejor qué estás nombrando.',
        timestamp: new Date()
      }
    ]);
  };

  // Regla especial: detectar fechas
  const detectDate = (text: string): string | null => {
    // Detectar patrones de fecha: YYYY-MM-DD, DD/MM/YYYY, etc.
    const datePatterns = [
      /(\d{4})[/-](\d{1,2})[/-](\d{1,2})/,  // YYYY-MM-DD
      /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/,  // DD-MM-YYYY
      /(\d{4})(\d{2})(\d{2})/,               // YYYYMMDD
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return null;
  };

  const detectedDate = detectDate(name);

  return (
    <Layout>
      <div className="w-full">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-gray-900/50 p-8 mb-6 border-t-4 border-purple-600">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-purple-600 p-3 rounded-xl">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Ayuda de Renombramiento con IA
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                Asistente inteligente para crear nombres de archivos y directorios
              </p>
            </div>
          </div>

          {/* Botón para ver las 12 reglas */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowRulesModal(true)}
              className="flex items-center gap-2 bg-purple-100 text-purple-700 dark:text-purple-300 px-4 py-2 rounded-lg hover:bg-purple-200 transition-colors font-semibold"
            >
              <BookOpen className="w-5 h-5" />
              Ver las 12 Reglas Oficiales
            </button>

            {rulesApplied.length > 0 && (
              <button
                onClick={() => setShowRulesApplied(!showRulesApplied)}
                className="flex items-center gap-2 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 px-4 py-2 rounded-lg hover:bg-green-200 transition-colors font-semibold"
              >
                <Check className="w-5 h-5" />
                {rulesApplied.length} reglas aplicadas
                {showRulesApplied ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>

          {/* Panel expandible de reglas aplicadas */}
          {showRulesApplied && rulesApplied.length > 0 && (
            <div className="mt-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-xl p-4">
              <h4 className="font-bold text-green-800 dark:text-green-200 mb-3 flex items-center gap-2">
                <Check className="w-5 h-5" />
                Reglas aplicadas en esta sugerencia:
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {rulesApplied.map(ruleNum => {
                  const rule = NAMING_RULES.find(r => r.number === ruleNum);
                  if (!rule) return null;
                  return (
                    <div
                      key={ruleNum}
                      className="bg-white dark:bg-gray-800 border border-green-300 dark:border-green-600 rounded-lg p-3 flex items-start gap-2"
                    >
                      <span className="bg-green-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
                        {rule.number}
                      </span>
                      <span className="text-sm text-green-900 dark:text-green-200">{rule.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel de entrada */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-gray-900/50 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Entrada
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Nombre largo <span className="text-red-600 dark:text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  placeholder="reunion de directores para asignacion de presupuesto 2025"
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
                  {name.length} caracteres
                </p>
              </div>

              {/* Contexto opcional */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Contexto adicional (opcional)
                </label>
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  placeholder="Ej: Es una reunión mensual del equipo de catastro para revisar el presupuesto del año 2025"
                />
              </div>

              {/* Extensión */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Extensión (opcional)
                </label>
                <input
                  type="text"
                  value={extension}
                  onChange={(e) => setExtension(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  placeholder=".pdf, .xlsx, .docx (dejar vacío para directorios)"
                />
              </div>

              {/* Info sobre el sistema inteligente */}
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Sistema inteligente:</strong> El diccionario IGAC se usa como referencia.
                  Si no encuentra palabras, la IA genera abreviaciones siguiendo las 12 reglas oficiales.
                </p>
              </div>

              {/* Detección de fecha */}
              {detectedDate && (
                <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-600 p-3 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="text-sm text-blue-900">
                      <p className="font-semibold">Fecha detectada: {detectedDate}</p>
                      <p className="text-xs mt-1">Esta fecha se colocará al inicio del nombre sugerido.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Botones */}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Generar Sugerencia
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-colors font-semibold"
                >
                  Limpiar
                </button>
              </div>
            </form>

            {/* Resultado rápido */}
            {result && result.valid && (
              <div className="mt-6 bg-green-50 dark:bg-green-900/30 border-l-4 border-green-600 p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-green-900 mb-2">Sugerencia aprobada:</p>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded border border-green-200 dark:border-green-700">
                      <code className="text-lg font-mono text-green-900 break-all">
                        {result.suggested_name}
                      </code>
                    </div>
                    <div className="mt-3 text-sm text-green-800 dark:text-green-200">
                      <p>📏 Longitud: {result.metadata?.suggested_length || 0} caracteres</p>
                      <p>✅ Caracteres disponibles: {result.metadata?.available_chars || 0}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Panel de conversación */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-gray-900/50 p-6 flex flex-col" style={{ height: '600px' }}>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Conversación con IA
            </h2>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-4 ${
                      msg.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-xs mt-2 opacity-70">
                      {msg.timestamp.toLocaleTimeString('es-CO', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg p-4">
                    <Loader className="w-5 h-5 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />

      {/* Modal de las 12 reglas */}
      <RulesModal isOpen={showRulesModal} onClose={() => setShowRulesModal(false)} />
    </Layout>
  );
};
