import type { TurnHighlight } from '../types/game';

interface TurnRailProps {
  highlight: TurnHighlight;
  cpuDetail: string;
  humanDetail: string;
}

export function TurnRail({ highlight, cpuDetail, humanDetail }: TurnRailProps) {
  const cpuClass = 'turn-slot cpu' + (highlight === 'cpu' ? ' active' : '');
  const humanClass =
    'turn-slot human' +
    (highlight === 'human' ? ' active' : '') +
    (highlight === 'human-uno' ? ' active human-uno' : '');

  return (
    <div className="turn-rail">
      <div className={cpuClass}>
        <span className="turn-slot-label">OPPONENT</span>
        <span className="turn-slot-name">CPU</span>
        <span className="turn-slot-detail">{cpuDetail}</span>
      </div>
      <div className={humanClass}>
        <span className="turn-slot-label">PLAYER</span>
        <span className="turn-slot-name">YOU</span>
        <span className="turn-slot-detail">{humanDetail}</span>
      </div>
    </div>
  );
}

export function playerAreaClass(highlight: TurnHighlight, area: 'cpu' | 'human'): string {
  if (area === 'cpu') {
    return 'player-area cpu-area' + (highlight === 'cpu' ? ' active-turn cpu-active' : '');
  }
  return (
    'player-area' +
    (highlight === 'human' || highlight === 'human-uno' ? ' active-turn human-active' : '')
  );
}
