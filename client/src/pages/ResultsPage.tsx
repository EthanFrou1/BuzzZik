import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiService } from "../services/apiService";

interface TeamResult {
    id: string;
    name: string;
    avatar: string;
    score: number;
    playerIds: string[];
}

export default function ResultsPage() {
    const { code } = useParams<{ code: string }>();
    const [teams, setTeams] = useState<TeamResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [gameTheme, setGameTheme] = useState<string>("Pop");

    // Fonction pour obtenir l'URL de l'avatar
    function getAvatarUrl(name: string) {
        return `https://api.dicebear.com/8.x/fun-emoji/svg?seed=${encodeURIComponent(name)}`;
    }

    useEffect(() => {
        async function loadResults() {
            if (!code) {
                setError("Code de partie manquant");
                setIsLoading(false);
                return;
            }

            try {
                // Récupérer les informations de la partie
                const gameData = await apiService.getGameByCode(code);
                setGameTheme(gameData.theme);

                // Récupérer les équipes de la partie
                const teamsData = await apiService.getTeamsByGameId(gameData.id);

                // Trier les équipes par score décroissant
                const sortedTeams = teamsData.sort((a, b) => b.score - a.score);
                setTeams(sortedTeams);
                setIsLoading(false);
            } catch (err) {
                console.error("Erreur lors du chargement des résultats:", err);
                setError("Impossible de charger les résultats");
                setIsLoading(false);
            }
        }

        loadResults();
    }, [code]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-[#1e1e2f] to-[#11111c] text-white flex flex-col items-center justify-center">
                <div className="animate-pulse text-purple-400 text-xl">Chargement des résultats...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-[#1e1e2f] to-[#11111c] text-white flex flex-col items-center justify-center">
                <div className="bg-red-500/30 text-red-200 p-4 rounded-lg max-w-md text-center">
                    <h2 className="text-xl font-bold mb-2">Erreur</h2>
                    <p>{error}</p>
                    <Link to="/" className="mt-4 inline-block bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded-xl font-semibold">
                        Retour à l'accueil
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#1e1e2f] to-[#11111c] text-white flex flex-col items-center justify-center p-6">
            <Link to="/" className="absolute top-6 left-6 text-sm text-purple-300 hover:underline">
                Retour à l'accueil
            </Link>

            <h1 className="text-3xl font-bold mb-2 text-purple-400">RÉSULTATS</h1>
            <div className="text-gray-300 mb-8">Thème: {gameTheme}</div>

            {/* Podium pour les 3 premières équipes */}
            {teams.length > 0 && (
                <div className="relative flex items-end justify-center w-full max-w-md mb-12 h-64">
                    {/* Étoile au-dessus du gagnant */}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-12 text-yellow-400 animate-pulse">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279-7.416-3.967-7.417 3.967 1.481-8.279-6.064-5.828 8.332-1.151z" />
                        </svg>
                    </div>

                    {/* 2ème place */}
                    {teams.length > 1 && (
                        <div className="absolute left-8 bottom-0 flex flex-col items-center">
                            <div className="w-20 h-20 rounded-full overflow-hidden mb-2 border-4 border-silver bg-white">
                                <img
                                    src={getAvatarUrl(teams[1].name)}
                                    alt={teams[1].name}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="text-lg font-bold text-silver">{teams[1].name}</div>
                            <div className="text-3xl font-bold text-silver">{teams[1].score}</div>
                            <div className="bg-silver/30 h-32 w-24 rounded-t-lg"></div>
                        </div>
                    )}

                    {/* 1ère place */}
                    <div className="absolute bottom-0 flex flex-col items-center z-10">
                        <div className="w-24 h-24 rounded-full overflow-hidden mb-2 border-4 border-yellow-400 bg-white">
                            <img
                                src={getAvatarUrl(teams[0].name)}
                                alt={teams[0].name}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="text-xl font-bold text-yellow-400">{teams[0].name}</div>
                        <div className="text-4xl font-bold text-yellow-400">{teams[0].score}</div>
                        <div className="bg-yellow-500/30 h-44 w-28 rounded-t-lg"></div>
                    </div>

                    {/* 3ème place */}
                    {teams.length > 2 && (
                        <div className="absolute right-8 bottom-0 flex flex-col items-center">
                            <div className="w-16 h-16 rounded-full overflow-hidden mb-2 border-4 border-amber-700 bg-white">
                                <img
                                    src={getAvatarUrl(teams[2].name)}
                                    alt={teams[2].name}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="text-lg font-bold text-amber-700">{teams[2].name}</div>
                            <div className="text-3xl font-bold text-amber-700">{teams[2].score}</div>
                            <div className="bg-amber-700/30 h-24 w-24 rounded-t-lg"></div>
                        </div>
                    )}
                </div>
            )}

            {/* Liste des autres équipes */}
            {teams.length > 3 && (
                <div className="w-full max-w-md bg-white/10 rounded-xl p-4">
                    <h2 className="text-xl font-bold mb-4 text-center text-gray-300">Autres équipes</h2>
                    <div className="space-y-3">
                        {teams.slice(3).map((team, index) => (
                            <div key={team.id} className="flex items-center justify-between bg-white/5 p-3 rounded-lg">
                                <div className="flex items-center">
                                    <span className="mr-3 text-gray-400 font-mono">{index + 4}</span>
                                    <div className="w-10 h-10 rounded-full overflow-hidden mr-3 bg-white">
                                        <img
                                            src={getAvatarUrl(team.name)}
                                            alt={team.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <span className="font-semibold">{team.name}</span>
                                </div>
                                <span className="text-xl font-bold text-purple-300">{team.score}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Boutons de navigation */}
            <div className="mt-8 space-x-4">
                <Link to="/" className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 px-6 rounded-xl">
                    Accueil
                </Link>
                <Link to="/game" className="bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-xl">
                    Nouvelle partie
                </Link>
            </div>
        </div>
    );
}