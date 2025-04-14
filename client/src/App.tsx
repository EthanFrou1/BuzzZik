import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import GamePage from "./pages/GamePage";
import HowToPlayPage from "./pages/HowToPlayPage";
import JoinGamePage from "./pages/JoinGamePage";
import LobbyPage from "./pages/LobbyPage";
import { GameProvider } from './contexts/GameContext';

function App() {
    return (
        <GameProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/game" element={<GamePage />} />
                    <Route path="/how-to-play" element={<HowToPlayPage />} />
                    <Route path="/join" element={<JoinGamePage />} />
                    <Route path="/lobby/:code" element={<LobbyPage />} />
                </Routes>
            </BrowserRouter>
        </GameProvider>
    );
}

export default App;