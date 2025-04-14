export default function TeamsList({
    teams,
    currentTeamId,
    gameCode,
    onTeamJoined,
    onCreateTeamClick
}: TeamsListProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleJoinTeam = async (teamId: string) => {
        try {
            setIsLoading(true);
            setError(null);

            // Appeler le service SignalR pour rejoindre l'équipe
            await signalRService.joinTeam(teamId);

            // Notifier le parent que l'équipe a été rejointe
            onTeamJoined();
        } catch (err) {
            console.error("Erreur lors de la connexion à l'équipe:", err);
            setError(err instanceof Error ? err.message : "Erreur lors de la connexion à l'équipe");
        } finally {
            setIsLoading(false);
        }
    };

    // Si aucune équipe n'existe, afficher un message
    if (teams.length === 0) {
        return (
            <div className="w-full max-w-md bg-white/10 p-6 rounded-xl shadow-lg text-center">
                <h2 className="text-xl font-bold mb-4 text-purple-300">Aucune équipe</h2>
                <p className="text-gray-300 mb-6">
                    Sois le premier à créer une équipe pour cette partie!
                </p>
                <button
                    onClick={onCreateTeamClick}
                    className="bg-purple-500 hover:bg-purple-600 text-white py-3 px-6 rounded-xl font-semibold"
                >
                    Créer une équipe
                </button>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md bg-white/10 p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-center text-purple-300">
                {currentTeamId ? "Ton équipe" : "Rejoindre une équipe"}
            </h2>

            <div className="space-y-3">
                {teams.map((team) => {
                    const isCurrentTeam = team.id === currentTeamId;
                    const avatarIcon = AVATAR_ICONS[team.avatar] || <Cat size={24} />;
                    const avatarColor = AVATAR_COLORS[team.avatar] || "bg-gray-500";

                    return (
                        <div
                            key={team.id}
                            className={`p-4 rounded-lg ${isCurrentTeam
                                    ? "bg-purple-500/30 border border-purple-500"
                                    : "bg-white/5 hover:bg-white/10"
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className={`${avatarColor} rounded-full p-2 mr-3`}>
                                        <div className="text-white">
                                            {avatarIcon}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg">{team.name}</h3>
                                        <p className="text-xs text-gray-400">
                                            {team.playerIds.length} joueur{team.playerIds.length > 1 ? "s" : ""}
                                        </p>
                                    </div>
                                </div>

                                {!isCurrentTeam && !currentTeamId && (
                                    <button
                                        onClick={() => handleJoinTeam(team.id)}
                                        disabled={isLoading}
                                        className="bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded-lg flex items-center"
                                    >
                                        <UserPlus size={16} className="mr-1" />
                                        Rejoindre
                                    </button>
                                )}

                                {isCurrentTeam && (
                                    <span className="bg-purple-500/50 text-white py-1 px-3 rounded-full text-xs">
                                        Mon équipe
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {error && (
                <div className="bg-red-500/30 text-red-200 p-2 rounded text-sm mt-4">
                    {error}
                </div>
            )}

            {!currentTeamId && (
                <button
                    onClick={onCreateTeamClick}
                    className="w-full mt-4 bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-semibold"
                >
                    Créer une nouvelle équipe
                </button>
            )}
        </div>
    );
} import { useState } from "react";
import { signalRService, Team } from "../services/signalRService";
import { Cat, Dog, Bird, Fish, Snail, Rabbit, UserPlus } from "lucide-react";

interface TeamsListProps {
    teams: Team[];
    currentTeamId?: string;
    gameCode: string;
    onTeamJoined: () => void;
    onCreateTeamClick: () => void;
}

// Correspondance des avatars avec leurs icônes
const AVATAR_ICONS: Record<string, JSX.Element> = {
    cat: <Cat size={24} />,
    dog: <Dog size={24} />,
    bird: <Bird size={24} />,
    fish: <Fish size={24} />,
    snail: <Snail size={24} />,
    rabbit: <Rabbit size={24} />,
};

// Correspondance des avatars avec leurs couleurs
const AVATAR_COLORS: Record<string, string> = {
    cat: "bg-amber-400",
    dog: "bg-blue-400",
    bird: "bg-green-400",
    fish: "bg-purple-400",
    snail: "bg-orange-500",
    rabbit: "bg-pink-400",
};