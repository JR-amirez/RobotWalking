import {
  forwardRef,
  type CSSProperties,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { IonIcon } from "@ionic/react";
import { reorderThreeOutline } from "ionicons/icons";
import {
  CellType,
  Exercise,
  createLevelExercisePool,
  getExerciseBlockCount,
  LEVEL_MAP,
  LEVEL_POINTS,
  LEVELS,
  RobotObject,
} from "../data/robotLevels";
import "./RobotGame.css";

type Difficulty = "basic" | "intermediate" | "advanced";
type BlockId = "inicio" | "avanzar" | "recoger" | "fin";

interface SequenceItem {
  id: BlockId;
  param?: number | null;
}

interface GameCore {
  grid: CellType[][];
  robot: { row: number; col: number };
  collectedObjects: RobotObject[];
  attemptsLeft: number;
  exerciseData: Exercise | null;
}

type ResultOverlay = {
  type: "success" | "fail";
  title: string;
  message: string;
};

interface Props {
  difficulty: Difficulty;
  active: boolean;
  isPaused: boolean;
  onCorrect: (points: number) => void | Promise<void>;
  onWrong: () => void;
  onDone: () => void;
  onExerciseChange: (current: number, total: number) => void;
  onAttemptsChange?: (left: number, total: number) => void;
}

export interface RobotGameHandle {
  execute: () => Promise<void>;
}

const ROBOT_WALKING_GIF = "/assets/walking_V3_fast_transparent.gif";
const ROBOT_GREETING_GIF = "/assets/greeting_V2_fast.gif";
const ROBOT_JUMPING_GIF = "/assets/jumping_transparent.gif";
const ROBOT_PICK_UP_STAR_GIF = "/assets/pick-up-star.gif";
const ROBOT_PICK_UP_BOX_GIF = "/assets/pick-up-box.gif";
const PICK_UP_ANIMATION_MS = 2600;
const RESULT_OVERLAY_MS = 3000;
const SOURCE_BLOCKS: BlockId[] = ["inicio", "avanzar", "recoger", "fin"];

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function shufflePick<T>(arr: T[], count: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

function shufflePickUniqueBlockCounts(
  exercises: Exercise[],
  count: number,
): Exercise[] {
  const shuffled = shufflePick(exercises, exercises.length);
  const usedBlockCounts = new Set<number>();
  const selected: Exercise[] = [];

  for (const exercise of shuffled) {
    const blockCount = getExerciseBlockCount(exercise);
    if (usedBlockCounts.has(blockCount)) continue;

    usedBlockCounts.add(blockCount);
    selected.push(exercise);

    if (selected.length === count) break;
  }

  return selected;
}

function findStartCol(grid: CellType[][]): number {
  return grid[0].findIndex((c) => c === "S") ?? 0;
}

function getIdleRobotGif(grid: CellType[][], row: number, col: number): string {
  return grid[row]?.[col] === "S" ? ROBOT_GREETING_GIF : ROBOT_WALKING_GIF;
}

function getPickUpGif(obj?: RobotObject): string {
  return obj?.type === "⭐" ? ROBOT_PICK_UP_STAR_GIF : ROBOT_PICK_UP_BOX_GIF;
}

const RobotGame = forwardRef<RobotGameHandle, Props>(
  (
    {
      difficulty,
      active,
      isPaused,
      onCorrect,
      onWrong,
      onDone,
      onExerciseChange,
      onAttemptsChange,
    },
    ref,
  ) => {
  const levelKey = LEVEL_MAP[difficulty];
  const levelCfg = LEVELS[levelKey];

  const sourceBlocks = SOURCE_BLOCKS;
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exIdx, setExIdx] = useState(0);
  const [sequence, setSequence] = useState<SequenceItem[]>([]);
  const [attemptsLeft, setAttemptsLeft] = useState(levelCfg.attempts);
  const [resultOverlay, setResultOverlay] = useState<ResultOverlay | null>(
    null,
  );
  const [notif, setNotif] = useState<{ msg: string; type: string } | null>(
    null,
  );
  const [dragOverZone, setDragOverZone] = useState(false);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [dragAbove, setDragAbove] = useState(false);
  const [visualRobotX, setVisualRobotX] = useState(0);
  const [robotGifSrc, setRobotGifSrc] = useState(ROBOT_GREETING_GIF);
  const [, setTick] = useState(0);

  const rerender = () => setTick((t) => t + 1);
  const visualRobotXRef = useRef(0);
  const robotAnimationTimer = useRef<number | null>(null);
  const core = useRef<GameCore>({
    grid: [],
    robot: { row: 0, col: 0 },
    collectedObjects: [],
    attemptsLeft: levelCfg.attempts,
    exerciseData: null,
  });
  const isRunning = useRef(false);
  const dragData = useRef<{
    id: string;
    param: number | null;
    fromIdx: number | null;
  } | null>(null);
  const touchDrag = useRef<{
    id: string;
    param: number | null;
    fromIdx: number | null;
    ghost: HTMLElement;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const cancelRobotAnimation = () => {
    if (robotAnimationTimer.current !== null) {
      window.clearInterval(robotAnimationTimer.current);
      robotAnimationTimer.current = null;
    }
  };

  const getRobotXForCol = (col: number, grid = core.current.grid) => {
    const columns = Math.max(grid[0]?.length ?? 1, 1);
    const clampedCol = Math.min(Math.max(col, 0), columns - 1);
    return ((clampedCol + 0.5) / columns) * 100;
  };

  const syncVisualRobotCol = (col: number) => {
    cancelRobotAnimation();
    const x = getRobotXForCol(col);
    visualRobotXRef.current = x;
    setVisualRobotX(x);
  };

  const animateVisualRobotTo = (targetCol: number, duration = 1000) =>
    new Promise<void>((resolve) => {
      cancelRobotAnimation();

      const startX = visualRobotXRef.current;
      const targetX = getRobotXForCol(targetCol);
      const distance = targetX - startX;

      if (distance === 0) {
        resolve();
        return;
      }

      const direction = Math.sign(distance);
      const totalSteps = Math.ceil(Math.abs(distance));
      const intervalMs = duration / totalSteps;
      let currentStep = 0;

      robotAnimationTimer.current = window.setInterval(() => {
        currentStep += 1;
        const isFinalStep = currentStep >= totalSteps;
        const nextX = isFinalStep
          ? targetX
          : startX + direction * currentStep;

        visualRobotXRef.current = nextX;
        setVisualRobotX(nextX);

        if (isFinalStep) {
          cancelRobotAnimation();
          resolve();
        }
      }, intervalMs);
    });

  useEffect(() => {
    return () => {
      if (robotAnimationTimer.current !== null) {
        window.clearInterval(robotAnimationTimer.current);
      }
    };
  }, []);

  const showNotif = (msg: string, type: string) => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 2500);
  };

  const showResultOverlay = async (overlay: ResultOverlay) => {
    setResultOverlay(overlay);
    await sleep(RESULT_OVERLAY_MS);
    setResultOverlay(null);
  };

  const loadExercise = (exs: Exercise[], idx: number) => {
    const ex = exs[idx];
    if (!ex) return;
    const grid = JSON.parse(JSON.stringify(ex.grid)) as CellType[][];
    const startCol = findStartCol(grid);
    core.current = {
      grid,
      robot: { row: 0, col: startCol },
      collectedObjects: [],
      attemptsLeft: levelCfg.attempts,
      exerciseData: ex,
    };
    syncVisualRobotCol(startCol);
    setRobotGifSrc(getIdleRobotGif(grid, 0, startCol));
    setAttemptsLeft(levelCfg.attempts);
    onAttemptsChange?.(levelCfg.attempts, levelCfg.attempts);
    setSequence([]);
    setResultOverlay(null);
    rerender();
    onExerciseChange(idx, exs.length);
  };

  useEffect(() => {
    const exercisePool = createLevelExercisePool(levelKey);
    const selected = shufflePickUniqueBlockCounts(
      exercisePool,
      levelCfg.showCount,
    );
    setExercises(selected);
    setExIdx(0);
    loadExercise(selected, 0);
  }, [difficulty]);

  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      if (!touchDrag.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      const g = touchDrag.current.ghost;
      g.style.left = touch.clientX - touchDrag.current.offsetX + "px";
      g.style.top = touch.clientY - touchDrag.current.offsetY + "px";
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      setDragOverZone(!!el?.closest(".rg-drop-zone"));
    };

    const onTouchEnd = (e: TouchEvent) => {
      const state = touchDrag.current;
      if (!state) return;
      const touch = e.changedTouches[0];
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      state.ghost.remove();
      touchDrag.current = null;
      setDragOverZone(false);
      setDragOverIdx(null);

      if (!el?.closest(".rg-drop-zone")) return;

      const pieceEl = el.closest("[data-seq-idx]");
      if (pieceEl) {
        const targetIdx = parseInt(pieceEl.getAttribute("data-seq-idx")!);
        const rect = pieceEl.getBoundingClientRect();
        const above = touch.clientY < rect.top + rect.height / 2;
        setSequence((prev) => {
          const next = [...prev];
          let at = above ? targetIdx : targetIdx + 1;
          if (state.fromIdx !== null) {
            const [item] = next.splice(state.fromIdx, 1);
            if (state.fromIdx < at) at--;
            next.splice(at, 0, item);
          } else {
            next.splice(at, 0, { id: state.id as BlockId, param: state.param });
          }
          return next;
        });
      } else {
        setSequence((prev) => {
          const next = [...prev];
          if (state.fromIdx !== null) {
            const [item] = next.splice(state.fromIdx, 1);
            next.push(item);
          } else {
            next.push({ id: state.id as BlockId, param: state.param });
          }
          return next;
        });
      }
    };

    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
    return () => {
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  const handleTouchStart = (
    e: React.TouchEvent,
    id: string,
    fromIdx: number | null = null,
    param: number | null = null,
  ) => {
    const touch = e.touches[0];
    const src = e.currentTarget as HTMLElement;
    const ghostSource =
      fromIdx !== null
        ? ((src.closest(".rg-piece") as HTMLElement | null) ?? src)
        : src;
    const rect = ghostSource.getBoundingClientRect();
    const ghost = ghostSource.cloneNode(true) as HTMLElement;
    ghost.style.cssText = `
      position:fixed; z-index:9999; opacity:0.75; pointer-events:none;
      width:${rect.width}px; left:${rect.left}px; top:${rect.top}px; margin:0; box-sizing:border-box;
    `;
    document.body.appendChild(ghost);
    touchDrag.current = {
      id,
      param,
      fromIdx,
      ghost,
      offsetX: touch.clientX - rect.left,
      offsetY: touch.clientY - rect.top,
    };
  };

  const handleSourceDragStart = (id: string) => {
    dragData.current = { id, param: null, fromIdx: null };
  };

  const handleZoneDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverZone(false);
    const d = dragData.current;
    if (!d) return;
    dragData.current = null;
    setSequence((prev) => {
      const next = [...prev];
      if (d.fromIdx !== null) {
        const [item] = next.splice(d.fromIdx, 1);
        next.push(item);
      } else {
        next.push({ id: d.id as BlockId, param: null });
      }
      return next;
    });
    setDragOverIdx(null);
  };

  const handlePieceDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragOverIdx(idx);
    setDragAbove(e.clientY < rect.top + rect.height / 2);
  };

  const handlePieceDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    const d = dragData.current;
    if (!d) return;
    dragData.current = null;
    const above = dragAbove;
    setSequence((prev) => {
      const next = [...prev];
      let at = above ? targetIdx : targetIdx + 1;
      if (d.fromIdx !== null) {
        const [item] = next.splice(d.fromIdx, 1);
        if (d.fromIdx < at) at--;
        next.splice(at, 0, item);
      } else {
        next.splice(at, 0, { id: d.id as BlockId, param: null });
      }
      return next;
    });
    setDragOverIdx(null);
  };

  const removeFromSeq = (idx: number) =>
    setSequence((p) => p.filter((_, i) => i !== idx));

  const updateParam = (idx: number, val: number) =>
    setSequence((p) =>
      p.map((item, i) => (i === idx ? { ...item, param: val } : item)),
    );

  const validateSolution = async (seq: SequenceItem[]) => {
    if (isRunning.current || !active || isPaused || resultOverlay) return;
    if (seq.length === 0) {
      showNotif("Arrastra instrucciones a la secuencia primero.", "error");
      return;
    }

    const first = seq[0]?.id;
    const last = seq[seq.length - 1]?.id;
    if (first !== "inicio" || last !== "fin") {
      if (first !== "inicio" && last !== "fin")
        showNotif(
          'La secuencia debe comenzar con "Inicio" y terminar con "Fin".',
          "error",
        );
      else if (first !== "inicio")
        showNotif('La secuencia debe comenzar con "Inicio".', "error");
      else showNotif('La secuencia debe terminar con "Fin".', "error");
      return;
    }

    isRunning.current = true;
    const ex = core.current.exerciseData!;
    core.current.grid = JSON.parse(JSON.stringify(ex.grid));
    const startCol = findStartCol(core.current.grid);
    core.current.robot = { row: 0, col: startCol };
    core.current.collectedObjects = [];
    syncVisualRobotCol(startCol);
    setRobotGifSrc(getIdleRobotGif(core.current.grid, 0, startCol));
    rerender();
    await sleep(400);

    let success = true;

    for (const item of seq) {
      if (!success) break;
      switch (item.id) {
        case "inicio":
        case "fin":
          await sleep(300);
          break;

        case "avanzar": {
          const steps = item.param ?? 0;
          if (steps <= 0) {
            success = false;
            showNotif("Debes indicar cuántos bloques avanzar.", "error");
            break;
          }
          const lastCol = core.current.grid[0].length - 1;
          const willLeavePath = core.current.robot.col + steps > lastCol;
          setRobotGifSrc(ROBOT_WALKING_GIF);
          for (let s = 0; s < steps; s++) {
            const newCol = core.current.robot.col + 1;
            if (newCol >= core.current.grid[0].length) {
              success = false;
              setRobotGifSrc(ROBOT_WALKING_GIF);
              showNotif("¡El robot se salió del camino!", "error");
              break;
            }
            core.current.robot.col = newCol;
            rerender();
            await animateVisualRobotTo(newCol);
            if (!willLeavePath && core.current.grid[0]?.[newCol] === "E") {
              setRobotGifSrc(ROBOT_JUMPING_GIF);
            }
          }
          break;
        }

        case "recoger": {
          const { row, col } = core.current.robot;
          if (core.current.grid[row][col] === "O") {
            core.current.grid[row][col] = ".";
            const obj = ex.objects.find((o) => o.row === row && o.col === col);
            core.current.collectedObjects.push(obj ?? { row, col, type: "📦" });
            setRobotGifSrc(getPickUpGif(obj));
            rerender();
            showNotif("¡Objeto recogido!", "success");
            await sleep(PICK_UP_ANIMATION_MS);
            setRobotGifSrc(getIdleRobotGif(core.current.grid, row, col));
          } else {
            success = false;
            showNotif("No hay objeto aquí para recoger.", "error");
            await sleep(400);
          }
          break;
        }
      }
    }

    const { row, col } = core.current.robot;
    const endCell = core.current.grid[row]?.[col];
    const allCollected =
      ex.objects.length === 0 ||
      core.current.collectedObjects.length >= ex.objects.length;

    if (success && endCell === "E" && allCollected) {
      const pts = LEVEL_POINTS[levelKey] ?? 10;
      await onCorrect(pts);
      await showResultOverlay({
        type: "success",
        title: "¡Correcto!",
        message: `Ganaste ${pts} puntos`,
      });
      goNext();
    } else {
      const left = core.current.attemptsLeft - 1;
      core.current.attemptsLeft = left;
      setAttemptsLeft(left);
      onAttemptsChange?.(left, levelCfg.attempts);
      const isFinalAttempt = left <= 0;
      if (isFinalAttempt) onWrong();
      await showResultOverlay({
        type: "fail",
        title: left > 0 ? "Oportunidad agotada" : "Sin oportunidades",
        message:
          left > 0
            ? `Oportunidades restantes: ${left}`
            : "Avanzando al siguiente ejercicio.",
      });

      if (left > 0) {
        resetExercise(false);
      } else {
        goNext();
      }
    }

    isRunning.current = false;
  };

  const resetExercise = (showMessage = true) => {
    const ex = core.current.exerciseData;
    if (!ex) return;
    const grid = JSON.parse(JSON.stringify(ex.grid)) as CellType[][];
    const startCol = findStartCol(grid);
    core.current.grid = grid;
    core.current.robot = { row: 0, col: startCol };
    core.current.collectedObjects = [];
    syncVisualRobotCol(startCol);
    setRobotGifSrc(getIdleRobotGif(grid, 0, startCol));
    setSequence([]);
    setResultOverlay(null);
    rerender();
    if (showMessage) showNotif("Ejercicio reiniciado.", "info");
  };

  useImperativeHandle(ref, () => ({
    execute: () => validateSolution(sequence),
  }));

  const goNext = () => {
    const next = exIdx + 1;
    if (next >= exercises.length) {
      onDone();
    } else {
      setExIdx(next);
      loadExercise(exercises, next);
    }
  };

  const goPrev = () => {
    if (exIdx > 0) {
      const p = exIdx - 1;
      setExIdx(p);
      loadExercise(exercises, p);
    } else showNotif("Ya estás en el primer ejercicio.", "info");
  };

  const { grid, robot, exerciseData } = core.current;
  const columns = Math.max(grid[0]?.length ?? 1, 1);
  const gridStyle = {
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    "--rg-cols": columns,
  } as CSSProperties;
  const robotStyle = {
    "--rg-robot-x": `${visualRobotX}%`,
  } as CSSProperties;

  return (
    <div className="rg-root">
      {notif && (
        <div className={`rg-notif rg-notif--${notif.type}`}>{notif.msg}</div>
      )}

      {resultOverlay && (
        <div
          className={`rg-result-overlay rg-result-overlay--${resultOverlay.type}`}
          role="status"
          aria-live="polite"
        >
          <div className="rg-result-card">
            <div className="rg-result-icon">
              {resultOverlay.type === "success" ? "✓" : "!"}
            </div>
            <h3 className="rg-result-title">{resultOverlay.title}</h3>
            <p>{resultOverlay.message}</p>
          </div>
        </div>
      )}

      <div className="rg-pieces-row">
        {sourceBlocks.map((type) => (
          <div
            key={type}
            className={`rg-piece rg-piece--${type}`}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", type);
              handleSourceDragStart(type);
            }}
            onTouchStart={(e) => handleTouchStart(e, type)}
          >
            {type === "inicio" && "Inicio"}
            {type === "fin" && "Fin"}
            {type === "recoger" && "Recoger objeto"}
            {type === "avanzar" && (
              <span className="rg-piece-avanzar">
                <span>Avanzar</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  placeholder="?"
                  className="rg-param"
                  onClick={(e) => e.stopPropagation()}
                  readOnly
                />
                <span>bloques</span>
              </span>
            )}
          </div>
        ))}
      </div>

      <div
        className={`rg-drop-zone${dragOverZone ? " rg-drop-zone--over" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOverZone(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragOverZone(false);
          }
        }}
        onDrop={handleZoneDrop}
      >
        {sequence.length === 0 ? (
          <span className="rg-placeholder">
            Arrastra los bloques aquí para armar la secuencia
          </span>
        ) : (
          sequence.map((item, idx) => (
            <div
              key={idx}
              data-seq-idx={idx}
              className={`rg-piece rg-piece--${item.id} rg-piece--inzone${dragOverIdx === idx ? (dragAbove ? " rg-piece--drop-above" : " rg-piece--drop-below") : ""}`}
              onDragOver={(e) => handlePieceDragOver(e, idx)}
              onDragLeave={() => setDragOverIdx(null)}
              onDrop={(e) => handlePieceDrop(e, idx)}
            >
              <button
                type="button"
                className="rg-drag-handle"
                aria-label="Reorganizar bloque"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", item.id);
                  dragData.current = {
                    id: item.id,
                    param: item.param ?? null,
                    fromIdx: idx,
                  };
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  handleTouchStart(e, item.id, idx, item.param ?? null);
                }}
              >
                <IonIcon icon={reorderThreeOutline} />
              </button>
              {item.id === "inicio" && (<span style={{flex: '1', textAlign: 'center'}}>Inicio</span>)}
              {item.id === "fin" && (<span style={{flex: '1', textAlign: 'center'}}>Fin</span>)}
              {item.id === "recoger" && (<span style={{flex: '1', textAlign: 'center'}}>Recoger objeto</span>)}
              {item.id === "avanzar" && (
                <span className="rg-piece-avanzar">
                  <span>Avanzar</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={item.param ?? ""}
                    placeholder="?"
                    className="rg-param"
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      updateParam(idx, parseInt(e.target.value) || 0)
                    }
                  />
                  <span>bloques</span>
                </span>
              )}
              <button className="rg-remove" onClick={() => removeFromSeq(idx)}>
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      <div className="rg-grid-area">
        {exerciseData && (
          <>
            <div
              className="rg-grid"
              style={gridStyle}
            >
              {grid[0]?.map((cell, c) => {
                const isRobot = robot.row === 0 && robot.col === c;
                const obj = exerciseData.objects.find((o) => o.col === c);
                return (
                  <div
                    key={c}
                    className={`rg-cell${cell === "S" ? " rg-cell--start" : cell === "E" ? " rg-cell--end" : " rg-cell--path"}`}
                  >
                    {cell === "E" && !isRobot && (
                      <span className="rg-end-marker">🏁</span>
                    )}
                    {cell === "O" && (
                      <span className="rg-obj">{obj?.type ?? "📦"}</span>
                    )}
                  </div>
                );
              })}
              <img
                key={exerciseData.id}
                className="rg-robot"
                style={robotStyle}
                src={robotGifSrc}
                alt="Robot caminando"
                draggable={false}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
  },
);

RobotGame.displayName = "RobotGame";

export default RobotGame;
