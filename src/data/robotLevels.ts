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

export function getExerciseBlockCount(exercise: Exercise): number {
  return Math.max((exercise.grid[0]?.length ?? 1) - 1, 0);
}

function createLinearExercise(
  id: number,
  blocks: number,
  objectCols: number[] = [],
): Exercise {
  const objectColSet = new Set(objectCols);
  const grid = Array.from({ length: blocks + 1 }, (_, col): CellType => {
    if (col === 0) return "S";
    if (col === blocks) return "E";
    return objectColSet.has(col) ? "O" : ".";
  });

  return {
    id,
    grid: [grid],
    robotDir: "right",
    objects: objectCols.map((col, idx) => ({
      row: 0,
      col,
      type: idx % 2 === 0 ? "📦" : "⭐",
    })),
  };
}

export const LEVELS: Record<string, LevelConfig> = {
  basico: {
    label: "Básico",
    attempts: 3,
    showCount: 3,
    exercises: Array.from({ length: 7 }, (_, idx) =>
      createLinearExercise(idx + 1, idx + 3),
    ),
  },
  intermedio: {
    label: "Intermedio",
    attempts: 2,
    showCount: 4,
    exercises: [
      createLinearExercise(7, 5, [2, 4]),
      createLinearExercise(8, 6, [1, 3, 5]),
      createLinearExercise(9, 7, [2, 5]),
      createLinearExercise(10, 8, [2, 4, 6]),
      createLinearExercise(11, 9, [3, 6]),
      createLinearExercise(12, 10, [2, 5, 8]),
      createLinearExercise(13, 11, [3, 7]),
      createLinearExercise(14, 12, [2, 6, 10]),
      createLinearExercise(15, 13, [3, 7, 11]),
      createLinearExercise(16, 14, [4, 8, 12]),
    ],
  },
  avanzado: {
    label: "Avanzado",
    attempts: 1,
    showCount: 5,
    exercises: [
      createLinearExercise(17, 7, [1, 3, 5, 6]),
      createLinearExercise(18, 8, [1, 3, 5, 7]),
      createLinearExercise(19, 9, [1, 3, 5, 7]),
      createLinearExercise(20, 10, [1, 3, 5, 7, 9]),
      createLinearExercise(21, 11, [1, 3, 5, 7, 9]),
      createLinearExercise(22, 12, [2, 4, 6, 8, 10]),
      createLinearExercise(23, 13, [1, 3, 5, 7, 9, 11]),
      createLinearExercise(24, 14, [2, 4, 6, 8, 10, 12]),
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
