import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { signalRService, Player, Team } from "../services/signalRService";
import { apiService } from "../services/apiService";
import TeamCreation from "../components/TeamCreation";
import { Cat, Dog, Bird, Fish, Snail, Rabbit, Plus, UserPlus } from "lucide-react";

export default function LobbyPage() {
    const { code } = useParams<{ code: string }>();
    const navigate = useNavigate();
    const [players, setPlayers] = useState<Player[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isLeader, setIsLeader] = useState(false);
    const [gameInfo, setGameInfo] = useState<{ theme: string; maxRounds: number } | null>(null);
    const [showCreateTeam, setShowCreateTeam] = useState(false);
    const [currentPlayerTeamId, setCurrentPlayerTeamId] = useState<string | undefined>(undefined);
    const [currentConnectionId, setCurrentConnectionId] = useState<string>("");

    // Fonction pour obtenir l'URL de l'avatar
    function getAvatarUrl(name: string) {
        return `https://api.dicebear.com/8.x/fun-emoji/svg?seed=${encodeURIComponent(name)}`;
    }

    // Fonction pour obtenir l'icône correspondant à l'avatar
    function getAvatarIcon(avatar: string) {
        switch (avatar) {
            case "cat":
                return <Cat size={24} />;
            case "dog":
                return <Dog size={24} />;
            case "bird":
                return <Bird size={24} />;
            case "fish":
                return <Fish size={24} />;
            case "snail":
                return <Snail size={24} />;
            case "rabbit":
                return <Rabbit size={24} />;
            default:
                return <Cat size={24} />;
        }
    }

    // Fonction pour obtenir la couleur de fond correspondant à l'avatar
    function getAvatarColor(avatar: string) {
        switch (avatar) {
            case "cat":
                return "bg-amber-400";
            case "dog":
                return "bg-blue-400";
            case "bird":
                return "bg-green-400";
            case "fish":
                return "bg-purple-400";
            case "snail":
                return "bg-orange-500";
            case "rabbit":
                return "bg-pink-400";
            default:
                return "bg-gray-400";
        }
    }

    // Vérifier si on peut créer plus d'équipes
    const canCreateMoreTeams = () => {
        // Règle: On peut créer jusqu'à (nombre de joueurs / 2) équipes avec un minimum de 2
        const maxTeams = Math.max(2, Math.floor(players.length / 2));
        return teams.length < maxTeams;
    };

    useEffect(() => {
        // Fonction pour nettoyer les gestionnaires d'événements
        const cleanupEventHandlers = () => {
            if (signalRService.hasConnection()) {
                signalRService.off("PlayerJoined");
                signalRService.off("TeamCreated");
                signalRService.off("PlayerJoinedTeam");
                signalRService.off("GameStarted");
                signalRService.off("Error");
            }
        };

        async function initLobby() {
            if (!code) {
                setError("Code de partie manquant");
                return;
            }

            try {
                setIsLoading(true);
                cleanupEventHandlers(); // Nettoyage préventif

                // 1. Récupérer les informations de la partie
                const gameData = await apiService.getGameByCode(code);
                setGameInfo({
                    theme: gameData.theme,
                    maxRounds: gameData.maxRounds
                });

                // 2. Connecter au hub SignalR si ce n'est pas déjà fait
                if (!signalRService.hasConnection()) {
                    await signalRService.startConnection(() => {
                        console.log("Connecté au hub dans le lobby");
                    });
                }

                // Récupérer l'ID de connexion actuel
                const connId = await signalRService.getConnectionId();
                setCurrentConnectionId(connId);

                // 3. Écouter les événements
                signalRService.on<Player>("PlayerJoined", (player) => {
                    setPlayers(prev => {
                        // Vérifier si le joueur existe déjà pour éviter les doublons
                        const exists = prev.some(p => p.id === player.id);
                        if (exists) {
                            return prev; // Ne pas ajouter si déjà présent
                        }
                        return [...prev, player];
                    });

                    if (player.connectionId === connId && player.isLeader) {
                        setIsLeader(true);
                    }
                });

                signalRService.on<Team>("TeamCreated", (team) => {
                    setTeams(prev => {
                        // Vérifier si l'équipe existe déjà
                        const exists = prev.some(t => t.id === team.id);
                        if (exists) {
                            return prev;
                        }
                        return [...prev, team];
                    });

                    // Masquer le formulaire de création d'équipe
                    setShowCreateTeam(false);
                });

                signalRService.on<{ player: Player, team: Team }>("PlayerJoinedTeam", (data) => {
                    // Mise à jour des joueurs
                    setPlayers(prev => prev.map(p => p.id === data.player.id ? data.player : p));

                    // Mise à jour des équipes
                    setTeams(prev => prev.map(t => t.id === data.team.id ? data.team : t));

                    // Vérifier si c'est le joueur actuel
                    if (data.player.connectionId === connId) {
                        setCurrentPlayerTeamId(data.team.id);
                    }
                });

                signalRService.on("GameStarted", () => {
                    navigate(`/game/${code}`);
                });

                signalRService.on("Error", (message: string) => {
                    console.error("SignalR Error:", message);
                    setError(message);
                    // Masquer l'erreur après 5 secondes
                    setTimeout(() => setError(null), 5000);
                });

                // 4. Récupérer la liste initiale des joueurs déjà connectés
                try {
                    const connectedPlayers = await apiService.getPlayersByGameCode(code);
                    setPlayers(connectedPlayers);

                    // Vérifier si l'utilisateur actuel est déjà dans une équipe
                    const currentPlayer = connectedPlayers.find(p => p.connectionId === connId);

                    if (currentPlayer) {
                        setIsLeader(currentPlayer.isLeader);
                        if (currentPlayer.teamId) {
                            setCurrentPlayerTeamId(currentPlayer.teamId);
                        }
                    }
                } catch (err) {
                    console.warn("Impossible de récupérer la liste des joueurs:", err);
                    // Ne pas bloquer le chargement pour cette erreur non critique
                }

                // 5. Récupérer les équipes de la partie
                try {
                    const teamsData = await apiService.getTeamsByGameId(gameData.id);
                    setTeams(teamsData);
                } catch (err) {
                    console.warn("Impossible de récupérer les équipes:", err);
                    // Ne pas bloquer le chargement pour cette erreur non critique
                }

                setIsLoading(false);
            } catch (err) {
                console.error("Erreur lors du chargement du lobby:", err);
                setError("Impossible de rejoindre le lobby. Vérifiez le code de partie.");
                setIsLoading(false);
            }
        }

        initLobby();

        // Nettoyage des gestionnaires d'événements lors du démontage
        return cleanupEventHandlers;
    }, [code, navigate]);

    const handleStartGame = async () => {
        if (!code) return;

        // Vérifier que tous les joueurs ont une équipe avant de commencer
        const playersWithoutTeam = players.filter(p => !p.teamId);
        if (playersWithoutTeam.length > 0) {
            setError("Tous les joueurs doivent rejoindre une équipe avant de commencer");
            return;
        }

        try {
            await signalRService.startGame(code);
        } catch (err) {
            console.error("Erreur lors du démarrage:", err);
            setError("Impossible de démarrer la partie");
        }
    };

    const handleTeamCreated = () => {
        // Masquer le formulaire de création après la création réussie
        setShowCreateTeam(false);
    };

    const joinTeamBalanced = async (teamId: string) => {
        try {
            await signalRService.joinTeam(teamId);
        } catch (err) {
            console.error("Erreur lors de la connexion à l'équipe:", err);
            setError("Impossible de rejoindre l'équipe");
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-[#1e1e2f] to-[#11111c] text-white flex flex-col items-center justify-center">
                <div className="animate-pulse text-purple-400 text-xl">Chargement du lobby...</div>
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
        <div className="min-h-screen bg-gradient-to-b from-[#1e1e2f] to-[#11111c] text-white flex flex-col items-center p-6 relative">
            <Link to="/" className="absolute top-6 left-6 text-sm text-purple-300 hover:underline">
                Retour à l'accueil
            </Link>

            <div className="bg-white/5 p-1 px-3 rounded-full text-sm text-purple-300 mb-2 mt-8">
                LOBBY
            </div>

            <h1 className="text-3xl font-bold mb-2 text-purple-400">BLIND TEST MODERNE</h1>

            <div className="mb-8 flex flex-col items-center">
                <p className="text-gray-300 mb-1">En attente du début de la partie...</p>

                {gameInfo && (
                    <div className="bg-white/10 rounded-lg p-2 px-4 text-sm mb-2">
                        <span className="text-gray-400">Thème:</span> {gameInfo.theme} |
                        <span className="text-gray-400"> Manches:</span> {gameInfo.maxRounds}
                    </div>
                )}

                <div className="bg-purple-500/20 rounded-lg p-2 px-4 text-sm">
                    <span className="text-gray-400">Code:</span> <span className="font-mono font-bold">{code}</span>
                </div>
            </div>

            {/* Section des joueurs */}
            <h2 className="text-xl font-bold mt-4 mb-2 text-gray-300">Joueurs</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6 w-full max-w-md">
                {players.length === 0 ? (
                    <div className="col-span-full text-center bg-white/10 rounded-xl p-6">
                        <p className="text-gray-400">En attente de joueurs...</p>
                    </div>
                ) : (
                    players.map((player) => (
                        <div
                            key={player.id}
                            className={`bg-white/10 rounded-xl p-3 flex flex-col items-center text-center shadow-md ${player.connectionId === currentConnectionId ? "border border-purple-500" : ""
                                }`}
                        >
                            <img
                                src={getAvatarUrl(player.name)}
                                alt={player.name}
                                className="w-14 h-14 rounded-full mb-2 border-2 border-purple-400"
                            />
                            <div className="font-semibold text-purple-300">{player.name}</div>
                            {player.isLeader && (
                                <div className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full mt-1">
                                    Leader
                                </div>
                            )}
                            {player.teamId && (
                                <div className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full mt-1">
                                    {teams.find(t => t.id === player.teamId)?.name || "Équipe"}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Section des équipes */}
            {showCreateTeam ? (
                <div className="w-full max-w-md mt-4">
                    <TeamCreation
                        gameCode={code || ""}
                        onTeamCreated={handleTeamCreated}
                    />
                    <button
                        onClick={() => setShowCreateTeam(false)}
                        className="w-full mt-2 bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg"
                    >
                        Annuler
                    </button>
                </div>
            ) : (
                <>
                    <h2 className="text-xl font-bold mb-4 text-center text-gray-300">Équipes</h2>

                    <div className="w-full max-w-5xl">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {teams.length === 0 ? (
                                <div className="col-span-full text-center bg-white/10 rounded-xl p-6">
                                    <p className="text-gray-400">Aucune équipe créée</p>
                                    {isLeader && (
                                        <button
                                            onClick={() => setShowCreateTeam(true)}
                                            className="mt-4 bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded-xl"
                                        >
                                            Créer la première équipe
                                        </button>
                                    )}
                                </div>
                            ) : (
                                teams.map(team => (
                                    <div
                                        key={team.id}
                                        className={`bg-white/10 p-6 rounded-xl ${currentPlayerTeamId === team.id ? "border-2 border-purple-500" : ""
                                            }`}
                                    >
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex items-center">
                                                <div className={`${getAvatarColor(team.avatar)} rounded-full p-3 mr-3`}>
                                                    <div className="text-white">
                                                        {getAvatarIcon(team.avatar)}
                                                    </div>
                                                </div>
                                                <h3 className="font-bold text-xl">{team.name}</h3>
                                            </div>
                                            <span className="bg-purple-500/20 px-3 py-1 rounded-full">
                                                {team.playerIds.length} joueur{team.playerIds.length > 1 ? "s" : ""}
                                            </span>
                                        </div>

                                        <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                                            {/* Liste des joueurs de l'équipe */}
                                            {players
                                                .filter(p => p.teamId === team.id)
                                                .map(player => (
                                                    <div key={player.id} className="flex items-center bg-white/5 p-2 rounded">
                                                        <img
                                                            src={getAvatarUrl(player.name)}
                                                            alt={player.name}
                                                            className="w-8 h-8 rounded-full mr-2"
                                                        />
                                                        <span>{player.name}</span>
                                                        {player.isLeader && (
                                                            <span className="ml-2 text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full">
                                                                Capitaine
                                                            </span>
                                                        )}
                                                    </div>
                                                ))
                                            }
                                        </div>

                                        {/* Bouton pour rejoindre l'équipe (si le joueur n'est pas dans une équipe) */}
                                        {!currentPlayerTeamId && (
                                            <button
                                                onClick={() => joinTeamBalanced(team.id)}
                                                className="w-full bg-purple-500 hover:bg-purple-600 text-white py-2 rounded-lg flex items-center justify-center"
                                            >
                                                <UserPlus size={16} className="mr-2" />
                                                Rejoindre l'équipe
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Section pour les joueurs sans équipe */}
                        {players.filter(p => !p.teamId).length > 0 && (
                            <div className="w-full mt-6">
                                <h3 className="text-lg font-semibold mb-2 text-gray-300">Joueurs en attente d'équipe</h3>
                                <div className="bg-white/10 p-4 rounded-xl">
                                    <div className="space-y-2">
                                        {players
                                            .filter(p => !p.teamId)
                                            .map(player => (
                                                <div key={player.id} className="flex items-center bg-white/5 p-2 rounded">
                                                    <img
                                                        src={getAvatarUrl(player.name)}
                                                        alt={player.name}
                                                        className="w-8 h-8 rounded-full mr-2"
                                                    />
                                                    <span>{player.name}</span>
                                                    {player.isLeader && (
                                                        <span className="ml-2 text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full">
                                                            Leader
                                                        </span>
                                                    )}
                                                    {player.connectionId === currentConnectionId && (
                                                        <span className="ml-auto text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                                                            Vous
                                                        </span>
                                                    )}
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Bouton pour créer une équipe supplémentaire (pour le leader seulement) */}
                        {isLeader && canCreateMoreTeams() && teams.length > 0 && (
                            <div className="mt-6 text-center">
                                <button
                                    onClick={() => setShowCreateTeam(true)}
                                    className="bg-white/10 hover:bg-white/20 text-white py-3 px-6 rounded-xl flex items-center justify-center mx-auto"
                                >
                                    <Plus size={20} className="mr-2" />
                                    Ajouter une équipe
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Bouton pour démarrer la partie */}
            <div className="mt-8">
                {isLeader ? (
                    <button
                        onClick={handleStartGame}
                        disabled={teams.length < 1 || players.some(p => !p.teamId)}
                        className={`${teams.length < 1 || players.some(p => !p.teamId)
                                ? "bg-purple-500/50 cursor-not-allowed"
                                : "bg-purple-500 hover:bg-purple-600"
                            } text-white font-semibold py-3 px-8 rounded-xl shadow`}
                    >
                        Lancer la partie
                    </button>
                ) : (
                    <div className="bg-purple-500/20 text-gray-300 py-3 px-8 rounded-xl text-sm">
                        En attente du lancement...
                    </div>
                )}

                {isLeader && teams.length < 1 && (
                    <p className="text-xs text-yellow-300 mt-2 text-center">
                        Il faut au moins une équipe pour commencer
                    </p>
                )}

                {isLeader && players.some(p => !p.teamId) && (
                    <p className="text-xs text-yellow-300 mt-2 text-center">
                        Tous les joueurs doivent rejoindre une équipe
                    </p>
                )}
            </div>

            {/* Notification d'erreur temporaire */}
            {error && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-red-500/80 text-white p-3 rounded-lg max-w-md text-center">
                    {error}
                </div>
            )}
        </div>
    );
}