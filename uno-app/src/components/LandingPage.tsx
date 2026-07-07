import { Link } from 'react-router-dom';

export function LandingPage() {
  return (
    <main className="landing">
      <h1 className="landing-title">UNO</h1>
      <p className="landing-tagline">Classic card game vs CPU — pick your style above</p>

      <section className="landing-about">
        <h2>About the game</h2>
        <p>
          UNO is a fast-paced shedding card game. Match the top discard by color or
          number, play action cards to shake things up, and be the first to empty your
          hand.
        </p>
        <p>
          Don&apos;t forget to call UNO when you&apos;re down to one card — or draw two
          penalty cards. Switch between retro pixel art and modern 3D card styles anytime
          using the theme toggle.
        </p>
      </section>

      <Link className="landing-play" to="/games/uno">
        Play UNO
      </Link>
    </main>
  );
}
