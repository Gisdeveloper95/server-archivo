/**
 * Store de Clipboard para operaciones de copiar/cortar/pegar
 * Usa LocalStorage para persistir entre navegaciones
 */

export interface ClipboardItem {
  operation: 'copy' | 'cut';
  path: string;
  name: string;
  isDirectory: boolean;
  timestamp: number;
}

const STORAGE_KEY = 'netapp_clipboard';

class ClipboardStore {
  private listeners: Set<() => void> = new Set();

  /**
   * Almacena un item en el clipboard
   */
  setItem(operation: 'copy' | 'cut', path: string, name: string, isDirectory: boolean): void {
    const item: ClipboardItem = {
      operation,
      path,
      name,
      isDirectory,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(item));
      this.notifyListeners();
    } catch (error) {
      console.error('Error al guardar en clipboard:', error);
    }
  }

  /**
   * Obtiene el item del clipboard
   */
  getItem(): ClipboardItem | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      const item = JSON.parse(stored) as ClipboardItem;

      // Verificar que no sea muy antiguo (más de 1 hora)
      const ONE_HOUR = 60 * 60 * 1000;
      if (Date.now() - item.timestamp > ONE_HOUR) {
        this.clear();
        return null;
      }

      return item;
    } catch (error) {
      console.error('Error al leer clipboard:', error);
      return null;
    }
  }

  /**
   * Limpia el clipboard
   */
  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      this.notifyListeners();
    } catch (error) {
      console.error('Error al limpiar clipboard:', error);
    }
  }

  /**
   * Verifica si hay algo en el clipboard
   */
  hasItem(): boolean {
    return this.getItem() !== null;
  }

  /**
   * Suscribe un listener para cambios en el clipboard
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);

    // Retorna función para desuscribirse
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notifica a todos los listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }
}

// Exportar instancia singleton
export const clipboardStore = new ClipboardStore();
