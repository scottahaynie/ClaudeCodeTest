import { useUnoGame } from '../hooks/useUnoGame';
import { ActionButtons } from './ActionButtons';
import { CenterArea } from './CenterArea';
import { ColorOverlay } from './ColorOverlay';
import { CpuHand } from './CpuHand';
import { FlyingCardLayer } from './FlyingCardLayer';
import { GameOverOverlay } from './GameOverOverlay';
import { HumanHand } from './HumanHand';
import { playerAreaClass, TurnRail } from './TurnRail';

export function UnoGame() {
  const game = useUnoGame();

  const cpuDetail =
    game.turnHighlight === 'cpu'
      ? game.state.cpuThinking
        ? 'THINKING'
        : 'PLAYING'
      : '';
  const humanDetail =
    game.turnHighlight === 'human'
      ? game.state.wildPending
        ? 'PICK COLOR'
        : 'YOUR TURN'
      : game.turnHighlight === 'human-uno'
        ? 'CALL UNO!'
        : '';

  return (
    <div className="app">
      <h1>UNO</h1>
      <div className="game-table">
        <TurnRail highlight={game.turnHighlight} cpuDetail={cpuDetail} humanDetail={humanDetail} />
        <div className="game-main">
          <div className="game-zone cpu-zone">
            <div className={playerAreaClass(game.turnHighlight, 'cpu')}>
              <CpuHand cardCount={game.state.hands.cpu.length} />
            </div>
          </div>
          <div className="game-zone middle-zone">
            <CenterArea
              state={game.state}
              drawDisabled={game.drawDisabled}
              onDraw={game.humanDraw}
            />
          </div>
          <div className="game-zone human-zone">
            <div className={playerAreaClass(game.turnHighlight, 'human')}>
              <HumanHand
                state={game.state}
                disabled={game.isAnimating}
                activeMotion={game.activeMotion}
                onPlay={game.playHumanCard}
              />
            </div>
          </div>
          <ActionButtons
            canPass={game.canPass}
            unoDisabled={game.unoDisabled}
            unoPulse={game.unoPulse}
            onPass={game.endHumanTurnWithoutPlay}
            onUno={game.humanCallUno}
            onNewGame={game.newGame}
          />
        </div>
      </div>

      <ColorOverlay
        visible={game.showColorOverlay && !game.isAnimating}
        onPick={game.completeWildPlay}
      />
      <FlyingCardLayer motion={game.activeMotion} onComplete={game.completeMotion} />
      <GameOverOverlay
        visible={game.showGameOver}
        title={game.gameOverTitle}
        message={game.gameOverMsg}
        onPlayAgain={game.newGame}
      />
    </div>
  );
}
