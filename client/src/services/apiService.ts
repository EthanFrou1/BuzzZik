// Constante pour l'URL de base de l'API
const API_BASE_URL = "http://localhost:5206/api";

// Types pour les réponses de l'API
export interface GameResponse {
    id: string;
    code: string;
    theme: string;
    maxRounds: number;
    currentRound: number;
    status: "waiting" | "in_progress" | "paused" | "finished";
    teamIds: string[];
    questionIds: string[];
    roundTimer: number;
    createdAt: string;
}

export interface TeamResponse {
    id: string;
    name: string;
    avatar: string;
    score: number;
    playerIds: string[];
    currentAnswer: string | null;
}

export interface PlayerResponse {
    id: string;
    name: string;
    isLeader: boolean;
    isConnected: boolean;
    teamId: string;
    connectionId: string;
}

// Le service API pour les appels REST
export const apiService = {
    /**
     * Crée une nouvelle partie
     */
    async createGame(theme: string, maxRounds: number, roundTimer: number = 30): Promise<{ id: string, code: string }> {
        try {
            const response = await fetch(`${API_BASE_URL}/games`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ theme, maxRounds, roundTimer }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Erreur lors de la création de la partie");
            }

            return await response.json();
        } catch (error) {
            console.error("Erreur API:", error);
            throw error;
        }
    },

    /**
     * Récupère une partie par son code
     */
    async getGameByCode(code: string): Promise<GameResponse> {
        try {
            const response = await fetch(`${API_BASE_URL}/games/${code}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Partie non trouvée");
            }

            return await response.json();
        } catch (error) {
            console.error("Erreur API:", error);
            throw error;
        }
    },

    /**
     * Récupère les équipes d'une partie
     */
    async getTeamsByGameId(gameId: string): Promise<TeamResponse[]> {
        try {
            const response = await fetch(`${API_BASE_URL}/teams/game/${gameId}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Équipes non trouvées");
            }

            return await response.json();
        } catch (error) {
            console.error("Erreur API:", error);
            throw error;
        }
    },

    /**
     * Crée une nouvelle équipe
     */
    async createTeam(
        gameId: string,
        playerId: string,
        teamName: string,
        avatar: string = "cat"
    ): Promise<TeamResponse> {
        try {
            const response = await fetch(`${API_BASE_URL}/teams`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ gameId, playerId, teamName, avatar }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Erreur lors de la création de l'équipe");
            }

            return await response.json();
        } catch (error) {
            console.error("Erreur API:", error);
            throw error;
        }
    },

    /**
     * Récupère les joueurs d'une partie par son code
     */
    async getPlayersByGameCode(code: string): Promise<PlayerResponse[]> {
        try {
            const response = await fetch(`${API_BASE_URL}/players/${code}/players`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Joueurs non trouvés");
            }

            return await response.json();
        } catch (error) {
            console.error("Erreur API:", error);
            throw error;
        }
    }
};