import { Route, Routes } from 'react-router-dom';
import { LandingPage } from './components/LandingPage';
import { ThemeToggle } from './components/ThemeToggle';
import { UnoGame } from './components/UnoGame';

function App() {
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
