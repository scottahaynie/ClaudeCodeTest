import { Card } from './Card';

interface CpuHandProps {
  cardCount: number;
}

export function CpuHand({ cardCount }: CpuHandProps) {
  return (
    <>
      <div className="cpu-label">
        CPU — {cardCount} card{cardCount === 1 ? '' : 's'}
      </div>
      <div className="hand-row">
        {Array.from({ length: cardCount }, (_, i) => (
          <Card key={i} back />
        ))}
      </div>
    </>
  );
}
