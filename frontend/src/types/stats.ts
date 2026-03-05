export interface StatsOverview {
  total_files: number;
  total_directories: number;
  total_size: number;
  total_size_formatted: string;
  total_users: number;
  active_users: number;
  pending_users: number;
  total_downloads_today: number;
  total_searches_today: number;
  last_updated: string;
}

export interface DownloadStat {
  date: string;
  count: number;
  user?: string;
}

export interface SearchStat {
  date: string;
  count: number;
  term?: string;
}

export interface TopUser {
  user_id: number;
  username: string;
  full_name: string;
  total_downloads: number;
  total_searches: number;
}

export interface TopFile {
  file_id: number;
  file_name: string;
  file_path: string;
  download_count: number;
  total_size: number;
}
