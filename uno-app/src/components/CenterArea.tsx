import { topDiscard } from '../game/deck';
import type { Color, GameState } from '../types/game';
import { Card } from './Card';

interface CenterAreaProps {
  state: GameState;
}

export function CenterArea({ state }: CenterAreaProps) {
  const top = topDiscard(state.discard);

  return (
    <>
      <div className="center-area">
        <div className="pile-group">
          <div className="pile-label">DRAW</div>
          <div>
            {state.deck.length > 0 ? (
              <Card back />
            ) : (
              <div className="pile-label">EMPTY</div>
            )}
          </div>
        </div>
        <div className="pile-group">
          <div className="pile-label">COLOR</div>
          <div className={`color-indicator ${state.currentColor as Color}`} />
        </div>
        <div className="pile-group">
          <div className="pile-label">DISCARD</div>
          <div>{top ? <Card card={top} /> : null}</div>
        </div>
      </div>
      <div className="status-bar">{state.statusMessage}</div>
    </>
  );
}
