import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiService } from "../services/apiService";
import { signalRService } from "../services/signalRService";

const THEMES = ["Pop", "Rap", "Années 2000", "Disney"];
const ROUND_OPTIONS = [10, 15, 20, 30];

export default function GamePage() {
    const [theme, setTheme] = useState("Pop");
    const [rounds, setRounds] = useState(10);
    const [playerName, setPlayerName] = useState(""); // Ajout du nom du joueur
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleStart = async () => {
        // Vérification du nom du joueur
        if (!playerName.trim()) {
            setError("Veuillez entrer votre pseudo");
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            // 1. Appel à l'API pour créer une partie
            const gameData = await apiService.createGame(theme, rounds);

            // 2. Connecter au hub SignalR
            await signalRService.startConnection(() => {
                console.log("Connecté au hub");
            });

            // 3. S'enregistrer comme joueur dans la partie
            await signalRService.joinGame(gameData.code, playerName);

            // 4. Naviguer vers le lobby avec le code de partie
            navigate(`/lobby/${gameData.code}`);
        } catch (err) {
            console.error("Erreur lors de la création:", err);
            setError(err instanceof Error ? err.message : "Erreur lors de la création de la partie");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#1e1e2f] to-[#11111c] flex flex-col items-center justify-center text-white relative">
            <Link to="/" className="absolute top-6 left-6 text-sm text-purple-300 hover:underline">
                Retour à l'accueil
            </Link>

            <h1 className="text-3xl font-bold mb-8 text-purple-400">Créer une partie</h1>

            <div className="bg-white/10 p-6 rounded-xl shadow-md w-[300px] space-y-6">
                <div className="flex flex-col">
                    <label className="text-sm mb-1">Ton pseudo</label>
                    <input
                        type="text"
                        className="rounded-md p-2 bg-gray-900 text-white border border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        placeholder="Choisis un pseudo..."
                        maxLength={15}
                    />
                </div>

                <div className="flex flex-col">
                    <label className="text-sm mb-1">Thème musical</label>
                    <select
                        className="rounded-md p-2 bg-gray-900 text-white border border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        value={theme}
                        onChange={(e) => setTheme(e.target.value)}
                    >
                        {THEMES.map((t) => (
                            <option key={t} value={t} className="bg-gray-900 text-white">{t}</option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col">
                    <label className="text-sm mb-1">Nombre de manches</label>
                    <select
                        className="rounded-md p-2 bg-gray-900 text-white border border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        value={rounds}
                        onChange={(e) => setRounds(Number(e.target.value))}
                    >
                        {ROUND_OPTIONS.map((r) => (
                            <option key={r} value={r} className="bg-gray-900 text-white">{r}</option>
                        ))}
                    </select>
                </div>

                {error && (
                    <div className="bg-red-500/30 text-red-200 p-2 rounded text-sm">
                        {error}
                    </div>
                )}

                <button
                    onClick={handleStart}
                    disabled={isLoading}
                    className={`w-full ${isLoading ? "bg-purple-500/50" : "bg-purple-500 hover:bg-purple-600"
                        } text-white py-2 rounded-xl font-semibold`}
                >
                    {isLoading ? "Création..." : "Lancer la partie"}
                </button>
            </div>
        </div>
    );
}