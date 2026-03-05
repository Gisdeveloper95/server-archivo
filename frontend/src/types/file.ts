export interface FileItem {
  id: number | null;
  path: string;
  name: string;
  extension: string | null;
  size: number;
  size_formatted: string;
  is_directory: boolean;
  modified_date: string;
  created_date: string;
  md5_hash: string | null;
  indexed_at: string | null;
  icon_class?: string;
  icon_color?: string;
  // Información del propietario (desde BD)
  owner_name?: string;
  owner_username?: string;
  created_at?: string | null;
  // Permisos individuales del item (desde backend)
  can_write?: boolean;
  can_delete?: boolean;
  can_rename?: boolean;
  read_only_mode?: boolean;
  // Conteo de elementos en directorios
  item_count?: number | null;
}

export interface Breadcrumb {
  name: string;
  path: string;
}

export interface AvailableFilters {
  extensions: string[];
  years: number[];
  months: number[];
}

export interface BrowseResponse {
  files: FileItem[];
  total: number;
  page: number;
  pages: number;
  current_path: string;
  breadcrumbs: Breadcrumb[];
  available_filters: AvailableFilters;
  mode?: string;
}

export interface QuickAccessItem {
  name: string;
  path: string;
  type: string;
  icon: string;
  color: string;
  permissions?: {
    read: boolean;
    write: boolean;
    delete: boolean;
  };
}

export interface QuickAccessResponse {
  quick_access: QuickAccessItem[];
  user_role: string;
  total: number;
}

export interface SearchParams {
  q: string;
  extension?: string;
  page?: number;
  per_page?: number;
}

export interface BrowseParams {
  path?: string;
  page?: number;
  per_page?: number;
  extension?: string;
  search?: string;
  show_hidden?: boolean;
  year?: number;
  month?: number;
  size?: string;
}
