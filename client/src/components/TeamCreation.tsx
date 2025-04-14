import { useState } from "react";
import { signalRService } from "../services/signalRService";
import { Cat, Dog, Bird, Fish, Snail, Rabbit } from "lucide-react";

interface TeamCreationProps {
    gameCode: string;
    onTeamCreated: () => void;
}

// Liste des avatars disponibles avec leurs icônes et couleurs
const AVATARS = [
    { id: "cat", name: "Chat", icon: <Cat size={32} />, color: "bg-amber-400" },
    { id: "dog", name: "Chien", icon: <Dog size={32} />, color: "bg-blue-400" },
    { id: "bird", name: "Oiseau", icon: <Bird size={32} />, color: "bg-green-400" },
    { id: "fish", name: "Poisson", icon: <Fish size={32} />, color: "bg-purple-400" },
    { id: "snail", name: "Snail", icon: <Snail size={32} />, color: "bg-orange-500" },
    { id: "rabbit", name: "Lapin", icon: <Rabbit size={32} />, color: "bg-pink-400" },
];

export default function TeamCreation({ gameCode, onTeamCreated }: TeamCreationProps) {
    const [teamName, setTeamName] = useState("");
    const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].id);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCreateTeam = async () => {
        if (!teamName.trim()) {
            setError("Veuillez entrer un nom d'équipe");
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            // Appeler le service SignalR pour créer l'équipe
            await signalRService.createTeam(gameCode, teamName, selectedAvatar);

            // Notifier le parent que l'équipe a été créée
            onTeamCreated();
        } catch (err) {
            console.error("Erreur lors de la création de l'équipe:", err);
            setError(err instanceof Error ? err.message : "Erreur lors de la création de l'équipe");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md bg-white/10 p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-center text-purple-300">Créer une équipe</h2>

            <div className="space-y-4">
                <div className="flex flex-col">
                    <label className="text-sm mb-1 text-gray-300">Nom de l'équipe</label>
                    <input
                        type="text"
                        className="rounded-md p-2 bg-gray-900 text-white border border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        placeholder="Nom de l'équipe..."
                        maxLength={20}
                    />
                </div>

                <div>
                    <label className="text-sm mb-2 block text-gray-300">Choisir un avatar</label>
                    <div className="grid grid-cols-3 gap-3">
                        {AVATARS.map((avatar) => (
                            <button
                                key={avatar.id}
                                type="button"
                                onClick={() => setSelectedAvatar(avatar.id)}
                                className={`${avatar.color} ${selectedAvatar === avatar.id
                                        ? "ring-4 ring-purple-500"
                                        : "opacity-60 hover:opacity-100"
                                    } rounded-lg p-3 flex flex-col items-center justify-center transition-all`}
                            >
                                <div className="text-white">{avatar.icon}</div>
                                <span className="text-xs font-medium text-white mt-1">
                                    {avatar.name}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {error && (
                    <div className="bg-red-500/30 text-red-200 p-2 rounded text-sm">
                        {error}
                    </div>
                )}

                <button
                    onClick={handleCreateTeam}
                    disabled={isLoading}
                    className={`w-full ${isLoading ? "bg-purple-500/50" : "bg-purple-500 hover:bg-purple-600"
                        } text-white py-3 rounded-xl font-semibold`}
                >
                    {isLoading ? "Création..." : "Créer l'équipe"}
                </button>
            </div>
        </div>
    );
}