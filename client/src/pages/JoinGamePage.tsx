import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiService } from "../services/apiService";
import { signalRService } from "../services/signalRService";

export default function JoinGamePage() {
    const [code, setCode] = useState("");
    const [playerName, setPlayerName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleJoinGame = async () => {
        if (!code || !playerName) {
            setError("Veuillez remplir tous les champs");
            return;
        }

        try {
            setIsLoading(true);

            // Stocker le nom du joueur pour les reconnexions
            localStorage.setItem('playerName', playerName)

            setError(null);

            // 1. Vérifier si la partie existe
            await apiService.getGameByCode(code.toUpperCase());

            // 2. Connecter au hub SignalR
            await signalRService.startConnection(() => {
                console.log("Connecté au hub");
            });

            // 3. Rejoindre la partie via SignalR
            await signalRService.joinGame(code.toUpperCase(), playerName);

            // 4. Naviguer vers le lobby
            navigate(`/lobby/${code.toUpperCase()}`);
        } catch (err) {
            console.error("Erreur:", err);
            setError(err instanceof Error ? err.message : "Une erreur est survenue");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#1e1e2f] to-[#11111c] flex flex-col items-center justify-center text-white relative">
            <Link to="/" className="absolute top-6 left-6 text-sm text-purple-300 hover:underline">
                Retour à l'accueil
            </Link>

            <h1 className="text-3xl font-bold mb-8 text-purple-400">Rejoindre une partie</h1>

            <div className="bg-white/10 p-6 rounded-xl shadow-md w-[300px] space-y-6">
                <div className="flex flex-col">
                    <label className="text-sm mb-1">Code de partie</label>
                    <input
                        type="text"
                        className="rounded-md p-2 bg-gray-900 text-white border border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none uppercase"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="Exemple: AB123"
                        maxLength={5}
                    />
                </div>

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

                {error && (
                    <div className="bg-red-500/30 text-red-200 p-2 rounded text-sm">
                        {error}
                    </div>
                )}

                <button
                    onClick={handleJoinGame}
                    disabled={isLoading}
                    className={`w-full ${isLoading ? "bg-purple-500/50" : "bg-purple-500 hover:bg-purple-600"
                        } text-white py-2 rounded-xl font-semibold`}
                >
                    {isLoading ? "Connexion..." : "Rejoindre la partie"}
                </button>

                <div className="text-center text-sm">
                    <span className="text-gray-400">Pas de code ? </span>
                    <Link to="/game" className="text-purple-300 hover:underline">
                        Crée une partie
                    </Link>
                </div>
            </div>
        </div>
    );
}