interface Props {
  gameState: any;
}

const GameGrid: React.FC<Props> = ({ gameState }) => {
  const grid = gameState.grid;
  const cols = grid[0].length;

  return (
    <div
      id="game-grid"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, minmax(0, 60px))`,
        gridTemplateRows: "auto",
      }}
    >
      {grid[0].map((value: string, c: number) => {
        const isRobot = gameState.robot.row === 0 && gameState.robot.col === c;

        const obj = gameState.exerciseData.objects.find(
          (o: any) => o.col === c,
        );

        return (
          <div
            key={c}
            className={`grid-cell ${
              value === "." || value === "O"
                ? "path"
                : value === "S"
                  ? "start"
                  : value === "E"
                    ? "end"
                    : ""
            }`}
            data-row={0}
            data-col={c}
          >
            {/* Contenido de la celda */}
            {value === "E" && "🏁"}

            {value === "O" && (
              <span className="object-icon">{obj ? obj.type : "📦"}</span>
            )}

            {/* Robot */}
            {isRobot && (
              <span className="robot" id="robot-sprite">
                🤖
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default GameGrid;