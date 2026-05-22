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

function createObjectColumns(blocks: number, count: number): number[] {
  const availableCols = Math.max(blocks - 1, 0);
  const safeCount = Math.min(count, availableCols);

  if (safeCount <= 0) return [];

  const used = new Set<number>();

  for (let idx = 0; idx < safeCount; idx++) {
    const col = Math.round(((idx + 1) * blocks) / (safeCount + 1));
    used.add(Math.min(Math.max(col, 1), blocks - 1));
  }

  for (let col = 1; used.size < safeCount && col < blocks; col++) {
    used.add(col);
  }

  return [...used].sort((a, b) => a - b);
}

function createExercisePool(
  startId: number,
  minBlocks: number,
  maxBlocks: number,
  minObjects = 0,
  maxObjects = minObjects,
): Exercise[] {
  const objectRange = Math.max(maxObjects - minObjects + 1, 1);
  const exercises: Exercise[] = [];

  for (let blocks = minBlocks; blocks <= maxBlocks; blocks++) {
    const objectCount = minObjects + ((blocks - minBlocks) % objectRange);
    exercises.push(
      createLinearExercise(
        startId + exercises.length,
        blocks,
        createObjectColumns(blocks, objectCount),
      ),
    );
  }

  return exercises;
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

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function createRandomObjectColumns(blocks: number, count: number): number[] {
  const availableCols = Array.from(
    { length: Math.max(blocks - 1, 0) },
    (_, idx) => idx + 1,
  );

  return shuffle(availableCols)
    .slice(0, count)
    .sort((a, b) => a - b);
}

export function createLevelExercisePool(levelKey: string): Exercise[] {
  return (LEVELS[levelKey]?.exercises ?? []).map((exercise) => {
    const blocks = getExerciseBlockCount(exercise);
    const objectCount = exercise.objects.length;

    return createLinearExercise(
      exercise.id,
      blocks,
      createRandomObjectColumns(blocks, objectCount),
    );
  });
}

export const LEVELS: Record<string, LevelConfig> = {
  basico: {
    label: "Básico",
    attempts: 3,
    showCount: 3,
    exercises: createExercisePool(1, 3, 12),
  },
  intermedio: {
    label: "Intermedio",
    attempts: 2,
    showCount: 4,
    exercises: createExercisePool(100, 5, 16, 2, 3),
  },
  avanzado: {
    label: "Avanzado",
    attempts: 1,
    showCount: 5,
    exercises: createExercisePool(200, 7, 18, 4, 6),
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
