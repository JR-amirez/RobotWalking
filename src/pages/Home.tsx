import {
  IonBadge,
  IonButton,
  IonCard,
  IonChip,
  IonContent,
  IonIcon,
  IonNote,
  IonPage,
  IonPopover,
} from "@ionic/react";
import {
  alertCircleOutline,
  closeCircleOutline,
  exitOutline,
  gameControllerOutline,
  homeOutline,
  informationCircleOutline,
  pauseCircleOutline,
  playCircleOutline,
  refresh,
  time,
  trophyOutline,
} from "ionicons/icons";
import "./Home.css";
import { useEffect, useRef, useState } from "react";
import { App } from "@capacitor/app";
import { ScreenOrientation } from "@capacitor/screen-orientation";
import RobotGame, { type RobotGameHandle } from "../components/RobotGame";
import { LEVEL_MAP, LEVEL_POINTS, LEVELS } from "../data/robotLevels";
import ARModal, { ARTipo } from "../components/ARModal";

const lockLandscape = async () => {
  try {
    await ScreenOrientation.lock({ orientation: "landscape" });
  } catch {
    try {
      await (screen.orientation as any).lock("landscape");
    } catch {
      // not supported in this environment
    }
  }
};

const unlockOrientation = async () => {
  try {
    await ScreenOrientation.unlock();
  } catch {
    try {
      screen.orientation.unlock();
    } catch {
      // not supported in this environment
    }
  }
};

type Difficulty = "basic" | "intermediate" | "advanced";

export interface PlayProps {
  difficulty?: Difficulty;
}

export interface GameConfig {
  totalExercises: number;
  pointsCorrect: number;
  attemptsPerExercise: number;
  objectSummary: string;
}

type ConfettiPiece = {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
};

type ARSeccionConfig = {
  activo?: boolean;
  fondo?: string;
  contenido?: {
    texto?: string;
    imagen?: string;
    audio?: string;
    video?: string;
  };
};

type RobotRuntimeConfig = {
  nivel?: string;
  autor?: string;
  version?: string;
  fecha?: string;
  descripcion?: string;
  nombreApp?: string;
  plataformas?: string[];
  ar?: {
    inicio?: ARSeccionConfig;
    acierto?: ARSeccionConfig;
    fin?: ARSeccionConfig;
  };
};

const getLevelObjectSummary = (levelCfg: (typeof LEVELS)[string]): string => {
  const objectCounts = levelCfg.exercises.map(
    (exercise) => exercise.objects.length,
  );

  if (objectCounts.length === 0) return "Sin objetos";

  const minObjects = Math.min(...objectCounts);
  const maxObjects = Math.max(...objectCounts);

  if (maxObjects === 0) return "Sin objetos";
  if (minObjects === maxObjects) {
    return `${maxObjects} ${maxObjects === 1 ? "objeto" : "objetos"}`;
  }

  return `${minObjects} a ${maxObjects} objetos`;
};

const getGameConfig = (difficulty: Difficulty): GameConfig => {
  const levelKey = LEVEL_MAP[difficulty];
  const levelCfg = LEVELS[levelKey];

  return {
    totalExercises: levelCfg.showCount,
    pointsCorrect: LEVEL_POINTS[levelKey] ?? 0,
    attemptsPerExercise: levelCfg.attempts,
    objectSummary: getLevelObjectSummary(levelCfg),
  };
};

const Home: React.FC<PlayProps> = ({ difficulty = "basic" }) => {
  const robotGameRef = useRef<RobotGameHandle>(null);
  const [showTypeInstructions, setShowTypeInstructions] = useState<boolean>(false);


  const [showStartScreen, setShowStartScreen] = useState<boolean>(true);
  const [appNombreJuego, setAppNombreJuego] = useState<string>("STEAM-G");
  const [difficultyConfig, setDifficultyConfig] =
    useState<Difficulty>(difficulty);
  const [showInformation, setShowInformation] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(5);
  const [showCountdown, setShowCountdown] = useState<boolean>(false);
  const [appDescripcion, setAppDescripcion] = useState<string>(
    "Juego para el desarrollo de habilidades matemáticas",
  );
  const [appFecha, setAppFecha] = useState<string>("2 de Diciembre del 2025");
  const [appVersion, setAppVersion] = useState<string>("1.0");
  const [appPlataformas, setAppPlataformas] = useState<string>("android");
  const [appAutor, setAppAutor] = useState<string>("Valeria C. Z.");
  const [showInstructions, setShowInstructions] = useState<boolean>(false);
  const [showSummary, setShowSummary] = useState<boolean>(false);
  const [showFeedback, setShowFeedback] = useState<boolean>(false);
  const [pausado, setPausado] = useState<boolean>(false);
  const [activeButtonIndex, setActiveButtonIndex] = useState<number | null>(
    null,
  );
  const [isComplete, setisComplete] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [score, setScore] = useState<number>(0);
  const [maxScore, setMaxScore] = useState<number>(0);
  const [showExitModal, setShowExitModal] = useState<boolean>(false);
  const [configLoaded, setConfigLoaded] = useState<boolean>(false);
  const [tiempoRestante, setTiempoRestante] = useState(0);

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState<number>(0);
  const [totalCorrect, setTotalCorrect] = useState<number>(0);
  const [totalAnswered, setTotalAnswered] = useState<number>(0);
  const [gameActive, setGameActive] = useState<boolean>(false);
  const [isExecutingRobot, setIsExecutingRobot] = useState<boolean>(false);
  const [showARModal, setShowARModal] = useState<boolean>(false);
  const [arTipo, setARTipo] = useState<ARTipo>("inicio");
  const arConfigRef = useRef<RobotRuntimeConfig["ar"]>(undefined);
  const arOnCloseRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const cargarConfig = async () => {
      try {
        const res = await fetch("/config/robot-config.json");

        if (!res.ok) {
          setConfigLoaded(true);
          return;
        }

        const data: RobotRuntimeConfig = await res.json();

        if (data.nivel) {
          setDifficultyConfig(normalizarNivelConfig(data.nivel));
        }

        if (data.autor) setAppAutor(data.autor);
        if (data.version) setAppVersion(data.version);
        if (data.fecha) setAppFecha(formatearFechaLarga(data.fecha));
        if (data.descripcion) setAppDescripcion(data.descripcion);
        if (data.plataformas) setAppPlataformas(data.plataformas.join(", "));
        if (data.nombreApp) setAppNombreJuego(data.nombreApp);
        if (data.ar) arConfigRef.current = data.ar;
      } catch (err) {
        console.error("No se pudo cargar robot-config.json", err);
      } finally {
        setConfigLoaded(true);
      }
    };

    cargarConfig();
  }, []);

  useEffect(() => {
    if (showCountdown && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else if (showCountdown && countdown === 0) {
      const timer = setTimeout(() => {
        setShowCountdown(false);
        openAR("inicio", startGameLogic);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [countdown, showCountdown]);

  useEffect(() => {
    if (
      !gameActive ||
      isPaused ||
      showCountdown ||
      showFeedback ||
      showARModal ||
      tiempoRestante <= 0
    )
      return;

    const interval = setInterval(() => {
      setTiempoRestante((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [
    gameActive,
    isPaused,
    showCountdown,
    showFeedback,
    showARModal,
    tiempoRestante,
    currentExerciseIndex,
  ]);

  const TIMEOUT_MESSAGES = [
    "Sigue intentando 💪",
    "No te rindas ✨",
    "¡Vamos, tú puedes! 🚀",
  ];

  const getInstructions = (): string => {
    switch (difficultyConfig) {
      case "basic":
        return "Nivel Básico: resolverás 3 ejercicios lineales sin objetos. Cada ejercicio cuenta con 3 oportunidades.";
      case "intermediate":
        return "Nivel Intermedio: resolverás 4 ejercicios lineales con 2 a 3 objetos a recoger. Cada ejercicio cuenta con 2 oportunidades.";
      case "advanced":
        return "Nivel Avanzado: resolverás 5 ejercicios lineales con 4 a 6 objetos a recoger. Cada ejercicio cuenta con 1 oportunidad.";
    }
  };

  const getTimeoutMessage = () =>
    TIMEOUT_MESSAGES[Math.floor(Math.random() * TIMEOUT_MESSAGES.length)];

  const handleTimeExpired = () => {
    if (!gameActive || showFeedback) return;

    const currentExercise = 0;
    if (!currentExercise) return;

    setTotalAnswered((prev) => prev + 1);
    setFeedbackMessage(getTimeoutMessage());
    setShowFeedback(true);

    setTimeout(() => {
      advanceAfterFeedback();
    }, 1800);
  };

  const getDifficultyLabel = (nivel: Difficulty): string => {
    const labels: Record<Difficulty, string> = {
      basic: "Básico",
      intermediate: "Intermedio",
      advanced: "Avanzado",
    };
    return labels[nivel] ?? nivel;
  };

  const generarConfeti = (cantidad = 60): ConfettiPiece[] => {
    const colores = ["#ff6b6b", "#feca57", "#48dbfb", "#1dd1a1", "#5f27cd"];

    return Array.from({ length: cantidad }, (_, id) => ({
      id,
      left: Math.random() * 100,
      delay: Math.random() * 1.5,
      duration: 2.5 + Math.random() * 2.5,
      color: colores[Math.floor(Math.random() * colores.length)],
    }));
  };

  const formatPlataforma = (texto: string): string => {
    const mapa: Record<string, string> = {
      android: "Android",
      ios: "iOS",
      web: "Web",
    };
    return texto
      .split(/,\s*/)
      .map(
        (p) => mapa[p.toLowerCase()] ?? p.charAt(0).toUpperCase() + p.slice(1),
      )
      .join(", ");
  };

  const normalizarNivelConfig = (nivel: string): Difficulty => {
    const limpio = nivel.toLowerCase();
    const mapa: Record<string, Difficulty> = {
      basico: "basic",
      basic: "basic",
      intermedio: "intermediate",
      intermediate: "intermediate",
      avanzado: "advanced",
      advanced: "advanced",
    };
    return mapa[limpio] ?? "basic";
  };

  const formatearFechaLarga = (isoDate?: string) => {
    if (!isoDate) return appFecha;
    const [year, month, day] = isoDate.split("-");
    const meses = [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ];

    const mesIndex = Number(month) - 1;
    if (mesIndex < 0 || mesIndex > 11) return isoDate;

    return `${Number(day)} de ${meses[mesIndex]} del ${year}`;
  };

  const getTotalTime = (difficulty: Difficulty): number => {
    switch (difficulty) {
      case "basic":
        return 120;
      case "intermediate":
        return 150;
      case "advanced":
        return 180;
    }
  };

  const openAR = (tipo: ARTipo, onClose: () => void) => {
    const seccion = arConfigRef.current?.[tipo];
    const hasContent =
      seccion?.contenido &&
      Object.values(seccion.contenido).some(
        (value) => typeof value === "string" && value.trim() !== "",
      );

    if (seccion?.activo && hasContent) {
      setARTipo(tipo);
      arOnCloseRef.current = onClose;
      setShowARModal(true);
    } else {
      onClose();
    }
  };

  const waitForAR = (tipo: ARTipo) =>
    new Promise<void>((resolve) => openAR(tipo, resolve));

  const handleARClose = () => {
    setShowARModal(false);
    const cb = arOnCloseRef.current;
    arOnCloseRef.current = null;
    cb?.();
  };

  const startGameLogic = () => {
    const config = getGameConfig(difficultyConfig);
    setCurrentExerciseIndex(0);
    setTotalCorrect(0);
    setTotalAnswered(0);
    setScore(0);
    setMaxScore(config.totalExercises * config.pointsCorrect);
    setTiempoRestante(getTotalTime(difficultyConfig));
    setGameActive(true);
  };

  const endGame = () => {
    setGameActive(false);
    openAR("fin", () => setShowSummary(true));
  };

  const advanceAfterFeedback = () => {
    setShowFeedback(false);

    setCurrentExerciseIndex((prev) => {
      const next = prev + 1;
      if (next >= 1) {
        endGame();
        return prev;
      }
      return next;
    });
  };

  const handleSalirDesdePausa = () => {
    setPausado(false);
    setIsPaused(false);
    handleExitToStart();
  };

  const handleExitApp = async () => {
    await unlockOrientation();
    try {
      await App.exitApp();
    } catch (e) {
      window.close();
    }
  };

  const handleStartGame = () => {
    lockLandscape();
    setShowStartScreen(false);
    resetGame();
  };

  const handleInformation = () => {
    setShowInformation(!showInformation);
  };

  const handlePausar = () => {
    if (
      showStartScreen ||
      showCountdown ||
      showSummary ||
      showInstructions ||
      showFeedback ||
      showARModal ||
      pausado
    )
      return;

    setPausado(true);
    setIsPaused(true);
  };

  const handleEjecutar = async () => {
    if (isExecutingRobot) return;

    setIsExecutingRobot(true);
    try {
      await robotGameRef.current?.execute();
    } finally {
      setIsExecutingRobot(false);
    }
  };

  const handleResume = () => {
    setShowExitModal(false);
    setIsPaused(false);
    setPausado(false);
  };

  const handleExitToStart = () => {
    unlockOrientation();
    setShowExitModal(false);
    setIsPaused(false);
    setGameActive(false);

    setShowCountdown(false);
    setShowInstructions(false);
    setShowSummary(false);
    setShowFeedback(false);

    setShowStartScreen(true);
  };

  const resetGame = () => {
    setCountdown(5);
    setShowCountdown(true);
    setActiveButtonIndex(null);
    setisComplete(true);
    setScore(0);
    setMaxScore(0);
    setTiempoRestante(0);
    setCurrentExerciseIndex(0);
    setTotalCorrect(0);
    setTotalAnswered(0);
    setGameActive(false);
    setShowSummary(false);
    setShowFeedback(false);
  };

  const formatearTiempo = (segundos: number) => {
    const minutos = Math.floor(segundos / 60);
    const segs = Math.max(0, segundos % 60);
    return `${minutos}:${segs.toString().padStart(2, "0")}`;
  };

  const currentGameConfig = getGameConfig(difficultyConfig);

  return (
    <IonPage>
      {showCountdown && countdown > 0 && (
        <div className="countdown-overlay">
          <div className="countdown-number">{countdown}</div>
        </div>
      )}

      {showFeedback && (
        <div className="feedback-overlay">
          <div className="feedback-text">{feedbackMessage}</div>
        </div>
      )}

      {showSummary && (
        <div className="summary-overlay">
          <div className="summary-message">
            {(() => {
              const total = totalAnswered;
              const correctas = totalCorrect;
              const incorrectas = Math.max(total - correctas, 0);
              const porcentaje =
                total > 0 ? Math.round((correctas / total) * 100) : 0;
              const etiqueta =
                correctas === total
                  ? "PERFECTO!"
                  : porcentaje >= 70
                    ? "Excelente!"
                    : porcentaje >= 50
                      ? "Buen trabajo!"
                      : "Sigue practicando!";

              return (
                <>
                  <h2>Juego Terminado</h2>

                  <div className="resumen-final">
                    <h3>Resultados Finales</h3>

                    <p>
                      <strong>Correctos:</strong> {correctas}
                    </p>
                    <p>
                      <strong>Incorrectos:</strong> {incorrectas}
                    </p>
                    <p>
                      <strong>Puntuación total:</strong> {score} / {maxScore}
                    </p>

                    <IonBadge className="badge">{etiqueta}</IonBadge>
                  </div>

                  <IonButton
                    id="finalize"
                    expand="block"
                    onClick={handleSalirDesdePausa}
                  >
                    <IonIcon icon={refresh} slot="start" />
                    Jugar de Nuevo
                  </IonButton>

                  <IonButton
                    id="exit"
                    expand="block"
                    onClick={handleExitApp}
                    style={{ marginTop: "15px" }}
                  >
                    <IonIcon slot="start" icon={exitOutline}></IonIcon>
                    Cerrar aplicación
                  </IonButton>
                </>
              );
            })()}
          </div>

          <div className="confetti-container">
            {generarConfeti().map((c) => (
              <div
                key={c.id}
                className="confetti"
                style={{
                  left: `${c.left}%`,
                  animationDelay: `${c.delay}s`,
                  animationDuration: `${c.duration}s`,
                  backgroundColor: c.color,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {showInstructions && (
        <div className="ins-overlay" onClick={() => setShowInstructions(false)}>
          <div className="ins-card" onClick={(e) => e.stopPropagation()}>
            <div className="ins-title">
              <h2
                style={{ margin: 0, fontWeight: "bold", color: "var(--dark)" }}
              >
                Reglas Básicas
              </h2>
              <IonIcon
                icon={closeCircleOutline}
                style={{ fontSize: "26px", color: "var(--dark)" }}
                onClick={() => setShowInstructions(false)}
              />
            </div>

            <div className="ins-stats">
              <p style={{ textAlign: "justify" }}>
                <strong>{getInstructions()}</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {showInformation && (
        <div className="info-modal-background">
          <div className="info-modal">
            <div className="header">
              <h2 style={{ color: "var(--color-primary)", fontWeight: "bold" }}>
                {appNombreJuego}
              </h2>
              <p
                style={{
                  color: "#8b8b8bff",
                  marginTop: "5px",
                  textAlign: "center",
                }}
              >
                Actividad configurada desde la plataforma Steam-G
              </p>
            </div>
            <div className="cards-info">
              <div className="card">
                <p className="title">VERSIÓN</p>
                <p className="data">{appVersion}</p>
              </div>
              <div className="card">
                <p className="title">FECHA DE CREACIÓN</p>
                <p className="data">{appFecha}</p>
              </div>
              <div className="card">
                <p className="title">AUTOR</p>
                <p className="data">{appAutor}</p>
              </div>
              <div className="card">
                <p className="title">PLATAFORMAS</p>
                <p className="data">{formatPlataforma(appPlataformas)}</p>
              </div>
              <div className="card">
                <p className="title">NÚMERO DE EJERCICIOS</p>
                <p className="data">
                  {currentGameConfig.totalExercises}
                </p>
              </div>
              <div className="card description">
                <p className="title">DESCRIPCIÓN</p>
                <p className="data">{appDescripcion}</p>
              </div>
            </div>
            <div className="button">
              <IonButton expand="full" onClick={handleInformation}>
                Cerrar
              </IonButton>
            </div>
          </div>
        </div>
      )}

      {pausado && (
        <div className="pause-overlay">
          <div className="pause-card">
            <h2>Juego en pausa</h2>
            <p>El tiempo está detenido.</p>

            <IonButton
              expand="block"
              id="resume"
              style={{ marginTop: "16px" }}
              onClick={handleResume}
            >
              <IonIcon slot="start" icon={playCircleOutline}></IonIcon>
              Reanudar
            </IonButton>

            <IonButton
              expand="block"
              id="finalize"
              style={{ marginTop: "10px" }}
              onClick={handleSalirDesdePausa}
            >
              <IonIcon slot="start" icon={homeOutline}></IonIcon>
              Finalizar juego
            </IonButton>

            <IonButton
              expand="block"
              id="exit"
              style={{ marginTop: "10px" }}
              onClick={handleExitApp}
            >
              <IonIcon slot="start" icon={exitOutline}></IonIcon>
              Cerrar aplicación
            </IonButton>
          </div>
        </div>
      )}

      {showARModal && (
        <ARModal
          tipo={arTipo}
          contenido={arConfigRef.current?.[arTipo]?.contenido ?? {}}
          fondo={arConfigRef.current?.[arTipo]?.fondo}
          onClose={handleARClose}
        />
      )}

      <IonContent fullscreen className="ion-padding">
        {showStartScreen ? (
          <div className="inicio-container">
            <div className="header-game ion-no-border">
              <div className="toolbar-game">
                <div className="titles start-page">
                  <h1>{appNombreJuego}</h1>
                </div>
              </div>
            </div>

            <div className="info-juego">
              <div className="info-item">
                <IonChip>
                  <strong>Nivel: {getDifficultyLabel(difficultyConfig)}</strong>
                </IonChip>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
              className="page-start-btns"
            >
              <IonButton onClick={handleStartGame} className="play">
                <IonIcon slot="start" icon={playCircleOutline}></IonIcon>
                Iniciar juego
              </IonButton>
              <IonButton onClick={handleInformation} className="info">
                <IonIcon slot="start" icon={informationCircleOutline}></IonIcon>
                Información
              </IonButton>
            </div>
          </div>
        ) : (
          <>
            <div className="header-game ion-no-border">
              <div className="toolbar-game">
                <div className="titles">
                  <h1>STEAM-G</h1>
                  <IonIcon
                    icon={alertCircleOutline}
                    size="small"
                    id="info-icon"
                  />
                  <IonPopover
                    trigger="info-icon"
                    side="bottom"
                    alignment="center"
                  >
                    <IonCard className="filter-card ion-no-margin">
                      <div className="section header-section">
                        <h2>{appNombreJuego}</h2>
                      </div>

                      <div className="section description-section">
                        <p>{appDescripcion}</p>
                      </div>

                      <div className="section footer-section">
                        <span>{appFecha}</span>
                      </div>
                    </IonCard>
                  </IonPopover>
                </div>
                <span>
                  <strong>{appNombreJuego}</strong>
                </span>
              </div>
            </div>

            <div className="instructions-exercises">
              <div className="num-words play">
                {showTypeInstructions ? (
                  <>
                    <IonIcon icon={gameControllerOutline} className="icono" />
                    <strong>
                      {currentExerciseIndex + 1} de {currentGameConfig.totalExercises}
                    </strong>
                  </>
                ) : (
                  <strong>
                    Juego {currentExerciseIndex + 1} de {currentGameConfig.totalExercises}
                  </strong>
                )}
              </div>

              <div className="temporizador">
                <IonIcon icon={time} className="icono" />
                <h5 className="tiempo-display">
                  {formatearTiempo(tiempoRestante)}
                </h5>
              </div>

              <div className="num-words score">
                {showTypeInstructions ? (
                  <>
                    <IonIcon icon={trophyOutline} className="icono" />
                    <strong>{score}</strong>
                  </>
                ) : (
                  <strong>Puntuación: {score}</strong>
                )}
              </div>

              <div className="num-words rules">
                <strong onClick={() => setShowInstructions(true)}>
                  Reglas Básicas
                </strong>
              </div>
            </div>

            <div className="videogame">
              <RobotGame
                ref={robotGameRef}
                difficulty={difficultyConfig}
                active={gameActive}
                isPaused={isPaused || showARModal}
                onCorrect={async (pts) => {
                  setScore((prev) => prev + pts);
                  setTotalCorrect((prev) => prev + 1);
                  setTotalAnswered((prev) => prev + 1);
                  await waitForAR("acierto");
                }}
                onWrong={() => setTotalAnswered((prev) => prev + 1)}
                onDone={endGame}
                onExerciseChange={(current, total) => {
                  setCurrentExerciseIndex(current);
                  setMaxScore(total * currentGameConfig.pointsCorrect);
                }}
              />
            </div>

            <div className="button game">
              <IonButton
                shape="round"
                expand="full"
                onClick={handlePausar}
                disabled={
                  showCountdown ||
                  showFeedback ||
                  showARModal ||
                  showSummary ||
                  showInstructions ||
                  pausado ||
                  activeButtonIndex !== null ||
                  !isComplete
                }
              >
                <IonIcon slot="start" icon={pauseCircleOutline} />
                Pausar
              </IonButton>

              <IonButton
                shape="round"
                expand="full"
                onClick={handleEjecutar}
                disabled={
                  !gameActive ||
                  isExecutingRobot ||
                  isPaused ||
                  showARModal ||
                  showCountdown ||
                  showFeedback ||
                  showSummary ||
                  showInstructions ||
                  pausado
                }
              >
                <IonIcon slot="start" icon={playCircleOutline} />
                Ejecutar
              </IonButton>
            </div>
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Home;
