// Constante pour l'URL de base de l'API
const API_BASE_URL = "http://localhost:5206/api";

// Types pour les r�ponses de l'API
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
     * Cr�e une nouvelle partie
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
                throw new Error(errorData.error || "Erreur lors de la cr�ation de la partie");
            }

            return await response.json();
        } catch (error) {
            console.error("Erreur API:", error);
            throw error;
        }
    },

    /**
     * R�cup�re une partie par son code
     */
    async getGameByCode(code: string): Promise<GameResponse> {
        try {
            const response = await fetch(`${API_BASE_URL}/games/${code}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Partie non trouv�e");
            }

            return await response.json();
        } catch (error) {
            console.error("Erreur API:", error);
            throw error;
        }
    },

    /**
     * R�cup�re les �quipes d'une partie
     */
    async getTeamsByGameId(gameId: string): Promise<TeamResponse[]> {
        try {
            const response = await fetch(`${API_BASE_URL}/teams/game/${gameId}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "�quipes non trouv�es");
            }

            return await response.json();
        } catch (error) {
            console.error("Erreur API:", error);
            throw error;
        }
    },

    /**
     * Cr�e une nouvelle �quipe
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
                throw new Error(errorData.error || "Erreur lors de la cr�ation de l'�quipe");
            }

            return await response.json();
        } catch (error) {
            console.error("Erreur API:", error);
            throw error;
        }
    },

    /**
     * R�cup�re les joueurs d'une partie par son code
     */
    async getPlayersByGameCode(code: string): Promise<PlayerResponse[]> {
        try {
            const response = await fetch(`${API_BASE_URL}/players/${code}/players`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Joueurs non trouv�s");
            }

            return await response.json();
        } catch (error) {
            console.error("Erreur API:", error);
            throw error;
        }
    }
};