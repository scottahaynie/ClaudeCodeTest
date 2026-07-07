import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { unlockAudio } from './audio/sounds';
import { LandingPage } from './components/LandingPage';
import { ThemeToggle } from './components/ThemeToggle';
import { UnoGame } from './components/UnoGame';

function App() {
  useEffect(() => {
    const unlock = () => unlockAudio();
    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, []);

  return (
    <>
      <ThemeToggle />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/games/uno" element={<UnoGame />} />
      </Routes>
    </>
  );
}

export default App;
