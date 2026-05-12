export type CellType = "S" | "." | "O" | "E";

export interface RobotObject {
  row: number;
  col: number;
  type: string;
}

export interface Exercise {
  id: number;
  grid: CellType[][];
  robotDir: "right";
  objects: RobotObject[];
}

export interface LevelConfig {
  label: string;
  attempts: number;
  showCount: number;
  exercises: Exercise[];
}

export const LEVELS: Record<string, LevelConfig> = {
  basico: {
    label: "Básico",
    attempts: 3,
    showCount: 3,
    exercises: [
      { id: 1, grid: [["S", ".", ".", ".", "E"]], robotDir: "right", objects: [] },
      { id: 2, grid: [["S", ".", ".", ".", ".", "E"]], robotDir: "right", objects: [] },
      { id: 3, grid: [["S", ".", ".", ".", ".", ".", "E"]], robotDir: "right", objects: [] },
      { id: 4, grid: [["S", ".", ".", ".", ".", ".", ".", "E"]], robotDir: "right", objects: [] },
      { id: 5, grid: [["S", ".",".", "E"]], robotDir: "right", objects: [] },
      { id: 6, grid: [["S", ".", ".",".",".",".",".", "E"]], robotDir: "right", objects: [] },
    ],
  },
  intermedio: {
    label: "Intermedio",
    attempts: 2,
    showCount: 4,
    exercises: [
      { id: 7, grid: [["S", ".", "O", ".", "O", ".", "E"]], robotDir: "right", objects: [{ row: 0, col: 2, type: "📦" }, { row: 0, col: 4, type: "⭐" }] },
      { id: 8, grid: [["S", ".", ".", "O", ".", "O", ".", ".", "E"]], robotDir: "right", objects: [{ row: 0, col: 3, type: "⭐" }, { row: 0, col: 5, type: "📦" }] },
      { id: 9, grid: [["S", ".", "O", ".", ".", "O", ".", "O", ".", "E"]], robotDir: "right", objects: [{ row: 0, col: 2, type: "📦" }, { row: 0, col: 5, type: "⭐" }, { row: 0, col: 7, type: "📦" }] },
      { id: 11, grid: [["S", ".", ".", "O", ".", ".", "O", ".", "E"]], robotDir: "right", objects: [{ row: 0, col: 3, type: "📦" }, { row: 0, col: 6, type: "📦" }] },
      { id: 12, grid: [["S", ".", "O", ".", ".", "O", ".", ".", "O", "E"]], robotDir: "right", objects: [{ row: 0, col: 2, type: "⭐" }, { row: 0, col: 5, type: "⭐" }, { row: 0, col: 8, type: "⭐" }] },
      { id: 13, grid: [["S", ".", "O", ".", ".", ".", "O", ".", "E"]], robotDir: "right", objects: [{ row: 0, col: 2, type: "📦" }, { row: 0, col: 6, type: "⭐" }] },
      { id: 14, grid: [["S", ".", ".", "O", "O", "O", ".", ".", "E"]], robotDir: "right", objects: [{ row: 0, col: 3, type: "📦" }, { row: 0, col: 4, type: "⭐" }, { row: 0, col: 5, type: "📦" }] },
    ],
  },
  avanzado: {
    label: "Avanzado",
    attempts: 1,
    showCount: 5,
    exercises: [
      { id: 15, grid: [["S", ".", "O", ".", "O", ".", "O", ".", "O", ".", "E"]], robotDir: "right", objects: [{ row: 0, col: 2, type: "⭐" }, { row: 0, col: 4, type: "📦" }, { row: 0, col: 6, type: "📦" }, { row: 0, col: 8, type: "⭐" }] },
      { id: 16, grid: [["S", "O", ".", "O", ".", ".", "O", ".", "O", ".", "O", ".", "E"]], robotDir: "right", objects: [{ row: 0, col: 1, type: "📦" }, { row: 0, col: 3, type: "📦" }, { row: 0, col: 6, type: "⭐" }, { row: 0, col: 8, type: "📦" }, { row: 0, col: 10, type: "⭐" }] },
      { id: 17, grid: [["S", ".", "O", ".", "O", ".", ".", "O", "O", ".", "O", ".", "E"]], robotDir: "right", objects: [{ row: 0, col: 2, type: "📦" }, { row: 0, col: 4, type: "⭐" }, { row: 0, col: 7, type: "📦" }, { row: 0, col: 8, type: "📦" }, { row: 0, col: 10, type: "⭐" }] },
      { id: 18, grid: [["S", "O", ".", "O", ".", "O", ".", ".", "O", ".", "O", ".", "O", ".", "E"]], robotDir: "right", objects: [{ row: 0, col: 1, type: "⭐" }, { row: 0, col: 3, type: "⭐" }, { row: 0, col: 5, type: "📦" }, { row: 0, col: 8, type: "⭐" }, { row: 0, col: 10, type: "⭐" }, { row: 0, col: 12, type: "📦" }] },
      { id: 19, grid: [["S", ".", "O", "O", ".", ".", "O", ".", "O", ".", ".", "O", ".", "O", ".", "E"]], robotDir: "right", objects: [{ row: 0, col: 2, type: "⭐" }, { row: 0, col: 3, type: "📦" }, { row: 0, col: 6, type: "⭐" }, { row: 0, col: 8, type: "⭐" }, { row: 0, col: 11, type: "📦" }, { row: 0, col: 13, type: "⭐" }] },
      { id: 20, grid: [["S", ".", ".", "O", ".", "O", ".", ".", "O", ".", "O", "E"]], robotDir: "right", objects: [{ row: 0, col: 3, type: "📦" }, { row: 0, col: 5, type: "📦" }, { row: 0, col: 8, type: "📦" }, { row: 0, col: 10, type: "⭐" }] },
      { id: 21, grid: [["S", ".", "O", ".", ".", "O", ".", "O", ".", ".", "O", ".", "O", "E"]], robotDir: "right", objects: [{ row: 0, col: 2, type: "📦" }, { row: 0, col: 5, type: "⭐" }, { row: 0, col: 7, type: "⭐" }, { row: 0, col: 10, type: "📦" }, { row: 0, col: 12, type: "⭐" }] },
      { id: 22, grid: [["S", "O", ".", ".", "O", ".", "O", ".", ".", "O", ".", ".", "O", ".", ".", "E"]], robotDir: "right", objects: [{ row: 0, col: 1, type: "⭐" }, { row: 0, col: 4, type: "📦" }, { row: 0, col: 6, type: "📦" }, { row: 0, col: 9, type: "📦" }, { row: 0, col: 12, type: "⭐" }] },
    ],
  },
};

export const LEVEL_MAP: Record<string, string> = {
  basic: "basico",
  intermediate: "intermedio",
  advanced: "avanzado",
};

export const LEVEL_POINTS: Record<string, number> = {
  basico: 10,
  intermedio: 20,
  avanzado: 30,
};
