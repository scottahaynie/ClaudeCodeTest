import { useEffect } from 'react';
import { unlockAudio } from '../audio/sounds';
import { useUnoGame } from '../hooks/useUnoGame';
import { ActionButtons } from './ActionButtons';
import { CenterArea } from './CenterArea';
import { ColorOverlay } from './ColorOverlay';
import { CpuHand } from './CpuHand';
import { GameOverOverlay } from './GameOverOverlay';
import { HumanHand } from './HumanHand';
import { playerAreaClass, TurnRail } from './TurnRail';

export function UnoGame() {
  const game = useUnoGame();

  useEffect(() => {
    const unlock = () => unlockAudio();
    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, []);

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
            <CenterArea state={game.state} />
          </div>
          <div className="game-zone human-zone">
            <div className={playerAreaClass(game.turnHighlight, 'human')}>
              <HumanHand state={game.state} onPlay={(i) => game.playCard('human', i)} />
            </div>
          </div>
          <ActionButtons
            drawDisabled={game.drawDisabled}
            canPass={game.canPass}
            unoDisabled={game.unoDisabled}
            unoPulse={game.unoPulse}
            onDraw={game.humanDraw}
            onPass={game.endHumanTurnWithoutPlay}
            onUno={game.humanCallUno}
            onNewGame={game.newGame}
          />
        </div>
      </div>

      <ColorOverlay visible={game.showColorOverlay} onPick={game.completeWildPlay} />
      <GameOverOverlay
        visible={game.showGameOver}
        title={game.gameOverTitle}
        message={game.gameOverMsg}
        onPlayAgain={game.newGame}
      />
    </div>
  );
}
