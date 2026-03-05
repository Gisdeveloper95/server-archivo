import JSZip from 'jszip';

/**
 * Utilidades de seguridad para validación de archivos
 */

/**
 * Extensiones de archivos realmente peligrosos
 * Sincronizado con backend/utils/validators.py
 */
export const DANGEROUS_EXTENSIONS = new Set([
  // Ejecutables Windows - los más peligrosos
  'exe', 'com', 'bat', 'cmd', 'scr', 'pif',
  // Scripts Windows que ejecutan directamente
  'vbs', 'vbe', 'wsf', 'wsh',
  // HTML Application - ejecuta como aplicación
  'hta',
]);

/** Tamaño máximo para compresión automática: 1GB */
const MAX_AUTO_ZIP_SIZE = 1 * 1024 * 1024 * 1024;

/**
 * Verifica si un archivo tiene una extensión peligrosa
 */
export function isDangerousFile(filename: string): { dangerous: boolean; extension?: string; reason?: string } {
  if (!filename.includes('.')) {
    return { dangerous: false };
  }

  const ext = filename.split('.').pop()?.toLowerCase();

  if (ext && DANGEROUS_EXTENSIONS.has(ext)) {
    return {
      dangerous: true,
      extension: ext,
      reason: `Archivos .${ext} no permitidos. Súbalo dentro de un .zip`
    };
  }

  // Verificar extensiones dobles sospechosas (ej: documento.pdf.exe)
  const parts = filename.toLowerCase().split('.');
  if (parts.length > 2) {
    for (let i = 1; i < parts.length; i++) {
      if (DANGEROUS_EXTENSIONS.has(parts[i])) {
        return {
          dangerous: true,
          extension: parts[i],
          reason: `Extensión .${parts[i]} oculta. Súbalo dentro de un .zip`
        };
      }
    }
  }

  return { dangerous: false };
}

/**
 * Comprime un archivo peligroso en un ZIP con compresión mínima (rápido)
 * @param file Archivo a comprimir
 * @returns Nuevo archivo ZIP con el archivo original dentro
 */
export async function compressToZip(file: File): Promise<File> {
  const zip = new JSZip();

  // Agregar el archivo al ZIP con compresión mínima (STORE = sin compresión, más rápido)
  zip.file(file.name, file, { compression: 'DEFLATE', compressionOptions: { level: 1 } });

  // Generar el ZIP
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 1 } // Nivel 1 = compresión mínima, máxima velocidad
  });

  // Crear nuevo File con extensión .zip
  // IMPORTANTE: Remover la extensión peligrosa del nombre para evitar detección de extensión oculta
  // Ejemplo: "virus.exe" -> "virus.zip" (NO "virus.exe.zip")
  const baseName = file.name.includes('.')
    ? file.name.substring(0, file.name.lastIndexOf('.'))
    : file.name;
  const zipFileName = baseName + '.zip';
  return new File([zipBlob], zipFileName, { type: 'application/zip' });
}

/**
 * Verifica si un archivo peligroso puede ser comprimido automáticamente
 */
export function canAutoCompress(file: File): boolean {
  return file.size <= MAX_AUTO_ZIP_SIZE;
}

/**
 * Filtra archivos peligrosos de una lista
 * Retorna los archivos seguros, los que se pueden comprimir, y los bloqueados
 */
export function filterDangerousFiles(files: File[]): {
  safe: File[];
  canCompress: Array<{ file: File; reason: string }>;
  blocked: Array<{ file: File; reason: string }>;
} {
  const safe: File[] = [];
  const canCompress: Array<{ file: File; reason: string }> = [];
  const blocked: Array<{ file: File; reason: string }> = [];

  for (const file of files) {
    const check = isDangerousFile(file.name);
    if (check.dangerous) {
      if (canAutoCompress(file)) {
        // Menor a 1GB: ofrecer compresión
        canCompress.push({ file, reason: check.reason || 'Archivo peligroso' });
      } else {
        // Mayor a 1GB: bloqueado
        blocked.push({ file, reason: `${check.reason} (archivo muy grande para comprimir automáticamente)` });
      }
    } else {
      safe.push(file);
    }
  }

  return { safe, canCompress, blocked };
}
