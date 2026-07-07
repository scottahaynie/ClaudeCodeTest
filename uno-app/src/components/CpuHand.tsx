import { useTheme } from '../context/ThemeProvider';
import { Card } from './Card';

interface CpuHandProps {
  cardCount: number;
}

export function CpuHand({ cardCount }: CpuHandProps) {
  const { cpuDisplayName } = useTheme();

  return (
    <>
      <div className="cpu-label">
        {cpuDisplayName} — {cardCount} card{cardCount === 1 ? '' : 's'}
      </div>
      <div className="hand-row" data-hand="cpu">
        {Array.from({ length: cardCount }, (_, i) => (
          <Card key={i} back cardIndex={i} player="cpu" />
        ))}
      </div>
    </>
  );
}
