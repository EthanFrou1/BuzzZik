// src/contexts/GameContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react';

interface GameContextType {
    gameCode: string | null;
    setGameCode: (code: string | null) => void;
    playerName: string | null;
    setPlayerName: (name: string | null) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
    const [gameCode, setGameCode] = useState<string | null>(null);
    const [playerName, setPlayerName] = useState<string | null>(null);

    return (
        <GameContext.Provider value={{ gameCode, setGameCode, playerName, setPlayerName }}>
            {children}
        </GameContext.Provider>
    );
}

export function useGame() {
    const context = useContext(GameContext);
    if (context === undefined) {
        throw new Error('useGame must be used within a GameProvider');
    }
    return context;
}