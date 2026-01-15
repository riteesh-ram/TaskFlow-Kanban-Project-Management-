export interface BoardSettings {
  column_colors?: Record<string, string>;
  [key: string]: unknown;
}

export interface Board {
  id: string;
  title: string;
  description?: string | null;
  owner_id: string;
  settings?: BoardSettings | null;
  columns?: Column[];
}

export interface Column {
  id: string;
  title: string;
  position: number;
  board_id: string;
  cards?: Card[];
}

export interface Card {
  id: string;
  title: string;
  description?: string | null;
  position: number;
  column_id: string;
  board_id: string;
  assignee_id?: string | null;
  due_date?: string | null;
  labels?: string[] | null;
}
