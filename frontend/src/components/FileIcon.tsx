import {
  Folder,
  File,
  FileText,
  Image,
  Film,
  Music,
  Archive,
  FileSpreadsheet,
  Map,
  Code,
  Database,
  FileJson,
  FileCode,
  FileImage,
  FileVideo,
  FileAudio,
  FileType,
  Package,
  FileX,
  FileCheck,
  Lock,
  Cpu,
  Settings,
  GitBranch,
  Hash,
  BookOpen,
  Presentation,
  TableProperties,
  Mail,
  Globe,
  Terminal,
  Braces,
  Binary,
} from 'lucide-react';

interface FileIconProps {
  extension: string | null;
  isDirectory: boolean;
  className?: string;
}

export const FileIcon: React.FC<FileIconProps> = ({
  extension,
  isDirectory,
  className = 'w-5 h-5',
}) => {
  if (isDirectory) {
    return <Folder className={`${className} text-yellow-600`} />;
  }

  // Eliminar el punto inicial si existe (backend envía ".pdf" en lugar de "pdf")
  const ext = extension?.toLowerCase().replace(/^\./, '') || '';

  // ===== DOCUMENTOS PDF =====
  if (ext === 'pdf') {
    return <FileText className={`${className} text-red-600`} />;
  }

  // ===== MICROSOFT OFFICE =====
  if (['doc', 'docx'].includes(ext)) {
    return <FileText className={`${className} text-blue-600`} />;
  }

  if (['xls', 'xlsx', 'xlsm', 'xlsb'].includes(ext)) {
    return <FileSpreadsheet className={`${className} text-green-600`} />;
  }

  if (['ppt', 'pptx'].includes(ext)) {
    return <Presentation className={`${className} text-orange-600`} />;
  }

  if (['mdb', 'accdb'].includes(ext)) {
    return <Database className={`${className} text-red-700`} />;
  }

  // ===== OPEN OFFICE / LIBRE OFFICE =====
  if (['odt', 'ott'].includes(ext)) {
    return <FileText className={`${className} text-blue-500`} />;
  }

  if (['ods', 'ots'].includes(ext)) {
    return <FileSpreadsheet className={`${className} text-green-500`} />;
  }

  if (['odp', 'otp'].includes(ext)) {
    return <Presentation className={`${className} text-orange-500`} />;
  }

  // ===== TEXTO PLANO =====
  if (['txt', 'text', 'log'].includes(ext)) {
    return <FileText className={`${className} text-gray-600`} />;
  }

  if (['rtf'].includes(ext)) {
    return <FileText className={`${className} text-purple-600`} />;
  }

  if (['md', 'markdown'].includes(ext)) {
    return <BookOpen className={`${className} text-gray-700`} />;
  }

  // ===== IMÁGENES =====
  if (['jpg', 'jpeg'].includes(ext)) {
    return <FileImage className={`${className} text-blue-500`} />;
  }

  if (ext === 'png') {
    return <FileImage className={`${className} text-cyan-500`} />;
  }

  if (ext === 'gif') {
    return <FileImage className={`${className} text-pink-500`} />;
  }

  if (ext === 'svg') {
    return <FileImage className={`${className} text-purple-500`} />;
  }

  if (['bmp', 'ico', 'webp', 'tif', 'tiff', 'heic', 'heif', 'raw', 'cr2', 'nef'].includes(ext)) {
    return <Image className={`${className} text-indigo-500`} />;
  }

  if (['psd', 'ai', 'sketch', 'fig', 'xd'].includes(ext)) {
    return <Image className={`${className} text-purple-600`} />;
  }

  // ===== VIDEOS =====
  if (['mp4', 'm4v'].includes(ext)) {
    return <FileVideo className={`${className} text-red-500`} />;
  }

  if (['avi', 'wmv'].includes(ext)) {
    return <FileVideo className={`${className} text-blue-500`} />;
  }

  if (['mov', 'qt'].includes(ext)) {
    return <FileVideo className={`${className} text-gray-600`} />;
  }

  if (['mkv', 'webm', 'flv', 'vob', 'ogv', 'mpeg', 'mpg', '3gp', 'm2ts'].includes(ext)) {
    return <Film className={`${className} text-pink-600`} />;
  }

  // ===== AUDIO =====
  if (['mp3'].includes(ext)) {
    return <FileAudio className={`${className} text-green-500`} />;
  }

  if (['wav', 'wave'].includes(ext)) {
    return <FileAudio className={`${className} text-blue-500`} />;
  }

  if (['flac', 'ape', 'alac'].includes(ext)) {
    return <FileAudio className={`${className} text-purple-500`} />;
  }

  if (['aac', 'm4a', 'ogg', 'oga', 'wma', 'opus', 'aiff'].includes(ext)) {
    return <Music className={`${className} text-indigo-600`} />;
  }

  if (['midi', 'mid'].includes(ext)) {
    return <Music className={`${className} text-cyan-600`} />;
  }

  // ===== ARCHIVOS COMPRIMIDOS =====
  if (ext === 'zip') {
    return <Archive className={`${className} text-yellow-600`} />;
  }

  if (ext === 'rar') {
    return <Archive className={`${className} text-purple-600`} />;
  }

  if (ext === '7z') {
    return <Archive className={`${className} text-gray-700`} />;
  }

  if (['tar', 'gz', 'tgz', 'bz2', 'xz', 'lz', 'lzma', 'z'].includes(ext)) {
    return <Archive className={`${className} text-orange-600`} />;
  }

  if (['iso', 'img', 'dmg'].includes(ext)) {
    return <Package className={`${className} text-blue-700`} />;
  }

  // ===== CÓDIGO - WEB =====
  if (['html', 'htm'].includes(ext)) {
    return <FileCode className={`${className} text-orange-600`} />;
  }

  if (['css', 'scss', 'sass', 'less'].includes(ext)) {
    return <FileCode className={`${className} text-blue-500`} />;
  }

  if (['js', 'mjs', 'cjs'].includes(ext)) {
    return <FileCode className={`${className} text-yellow-500`} />;
  }

  if (['ts', 'tsx'].includes(ext)) {
    return <FileCode className={`${className} text-blue-600`} />;
  }

  if (['jsx'].includes(ext)) {
    return <FileCode className={`${className} text-cyan-500`} />;
  }

  if (['vue'].includes(ext)) {
    return <FileCode className={`${className} text-green-600`} />;
  }

  if (['php'].includes(ext)) {
    return <FileCode className={`${className} text-purple-600`} />;
  }

  // ===== CÓDIGO - BACKEND =====
  if (['py', 'pyc', 'pyw', 'pyx'].includes(ext)) {
    return <FileCode className={`${className} text-blue-500`} />;
  }

  if (['java', 'class', 'jar'].includes(ext)) {
    return <FileCode className={`${className} text-red-600`} />;
  }

  if (['cpp', 'cc', 'cxx', 'c++', 'hpp', 'hxx', 'h++'].includes(ext)) {
    return <FileCode className={`${className} text-blue-700`} />;
  }

  if (['c', 'h'].includes(ext)) {
    return <FileCode className={`${className} text-gray-700`} />;
  }

  if (['cs', 'csx'].includes(ext)) {
    return <FileCode className={`${className} text-green-700`} />;
  }

  if (['go'].includes(ext)) {
    return <FileCode className={`${className} text-cyan-600`} />;
  }

  if (['rs'].includes(ext)) {
    return <FileCode className={`${className} text-orange-700`} />;
  }

  if (['rb', 'erb'].includes(ext)) {
    return <FileCode className={`${className} text-red-500`} />;
  }

  if (['swift'].includes(ext)) {
    return <FileCode className={`${className} text-orange-500`} />;
  }

  if (['kt', 'kts'].includes(ext)) {
    return <FileCode className={`${className} text-purple-500`} />;
  }

  // ===== CONFIGURACIÓN Y DATA =====
  if (['json', 'jsonc'].includes(ext)) {
    return <FileJson className={`${className} text-yellow-600`} />;
  }

  if (['xml', 'xaml', 'plist'].includes(ext)) {
    return <Braces className={`${className} text-orange-600`} />;
  }

  if (['yaml', 'yml'].includes(ext)) {
    return <FileType className={`${className} text-purple-600`} />;
  }

  if (['toml', 'ini', 'cfg', 'conf', 'config'].includes(ext)) {
    return <Settings className={`${className} text-gray-600`} />;
  }

  if (['env', 'dotenv'].includes(ext)) {
    return <Lock className={`${className} text-yellow-700`} />;
  }

  // ===== BASE DE DATOS =====
  if (['sql'].includes(ext)) {
    return <Database className={`${className} text-orange-600`} />;
  }

  if (['db', 'sqlite', 'sqlite3', 'db3'].includes(ext)) {
    return <Database className={`${className} text-teal-600`} />;
  }

  if (['mdf', 'ldf'].includes(ext)) {
    return <Database className={`${className} text-blue-700`} />;
  }

  // ===== GIT / VERSION CONTROL =====
  if (['.gitignore', '.gitattributes', '.gitmodules'].includes(ext)) {
    return <GitBranch className={`${className} text-orange-600`} />;
  }

  // ===== GIS / MAPAS =====
  if (['shp', 'shx', 'dbf', 'prj'].includes(ext)) {
    return <Map className={`${className} text-blue-600`} />;
  }

  if (['gdb', 'mxd', 'lyr'].includes(ext)) {
    return <Map className={`${className} text-green-600`} />;
  }

  if (['kml', 'kmz'].includes(ext)) {
    return <Map className={`${className} text-red-600`} />;
  }

  if (['geojson', 'topojson', 'gpx'].includes(ext)) {
    return <FileJson className={`${className} text-blue-500`} />;
  }

  // ===== EJECUTABLES Y BINARIOS =====
  if (['exe', 'msi'].includes(ext)) {
    return <Cpu className={`${className} text-blue-700`} />;
  }

  if (['dll', 'so', 'dylib'].includes(ext)) {
    return <Package className={`${className} text-gray-600`} />;
  }

  if (['bin', 'dat'].includes(ext)) {
    return <Binary className={`${className} text-gray-700`} />;
  }

  if (['app', 'apk', 'ipa'].includes(ext)) {
    return <Package className={`${className} text-green-600`} />;
  }

  // ===== SCRIPTS =====
  if (['sh', 'bash', 'zsh', 'fish'].includes(ext)) {
    return <Terminal className={`${className} text-green-600`} />;
  }

  if (['bat', 'cmd', 'ps1'].includes(ext)) {
    return <Terminal className={`${className} text-blue-600`} />;
  }

  // ===== OTROS FORMATOS =====
  if (['csv', 'tsv'].includes(ext)) {
    return <TableProperties className={`${className} text-green-600`} />;
  }

  if (['eml', 'msg'].includes(ext)) {
    return <Mail className={`${className} text-blue-600`} />;
  }

  if (['url', 'webloc'].includes(ext)) {
    return <Globe className={`${className} text-cyan-600`} />;
  }

  if (['ttf', 'otf', 'woff', 'woff2', 'eot'].includes(ext)) {
    return <FileType className={`${className} text-gray-700`} />;
  }

  if (['cer', 'crt', 'pem', 'p12', 'pfx'].includes(ext)) {
    return <Lock className={`${className} text-green-700`} />;
  }

  if (['key', 'pub'].includes(ext)) {
    return <Lock className={`${className} text-yellow-700`} />;
  }

  if (['torrent'].includes(ext)) {
    return <Hash className={`${className} text-green-600`} />;
  }

  // ===== DEFAULT =====
  return <File className={`${className} text-gray-500`} />;
};
