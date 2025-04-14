import * as signalR from "@microsoft/signalr";

// Types pour les événements SignalR
export interface Player {
    id: string;
    name: string;
    isLeader: boolean;
    isConnected: boolean;
    teamId: string;
    connectionId: string;
}

export interface Team {
    id: string;
    name: string;
    avatar: string;
    score: number;
    playerIds: string[];
}

// Class de service SignalR
class SignalRService {
    private connection: signalR.HubConnection | null = null;

    /**
     * Vérifie si une connexion existe
     */
    public hasConnection(): boolean {
        return this.connection !== null;
    }

    /**
     * Obtient l'ID de connexion actuel
     */
    public async getConnectionId(): Promise<string> {
        if (!this.connection) {
            throw new Error("Connexion non établie");
        }
        return this.connection.connectionId || '';
    }

    /**
     * Démarre la connexion au hub SignalR
     */
    public async startConnection(onConnected: () => void): Promise<void> {
        if (this.connection) {
            // Si déjà connecté, juste appeler le callback
            if (this.connection.state === signalR.HubConnectionState.Connected) {
                onConnected();
                return;
            }
            // Si en train de se connecter, attendre
            if (this.connection.state === signalR.HubConnectionState.Connecting) {
                this.connection.onreconnected(() => {
                    onConnected();
                });
                return;
            }
        }

        this.connection = new signalR.HubConnectionBuilder()
            .withUrl("http://localhost:5206/gamehub") // URL du hub SignalR
            .withAutomaticReconnect()
            .build();

        // Écoute des erreurs
        this.connection.on("Error", (message: string) => {
            console.error("SignalR Error:", message);
            // Tu pourras ajouter ici un système de notification visuelle
        });

        try {
            await this.connection.start();
            console.log("SignalR Connecté!");
            onConnected();
        } catch (err) {
            console.error("Erreur de connexion SignalR:", err);
        }
    }

    /**
     * Rejoindre une partie existante
     */
    public async joinGame(gameCode: string, playerName: string): Promise<void> {
        if (!this.connection) {
            throw new Error("Connexion non établie");
        }

        await this.connection.invoke("JoinGame", gameCode, playerName);
    }

    /**
     * Créer une nouvelle équipe
     */
    public async createTeam(gameCode: string, teamName: string, avatar: string): Promise<void> {
        if (!this.connection) {
            throw new Error("Connexion non établie");
        }

        await this.connection.invoke("CreateTeam", gameCode, teamName, avatar);
    }

    /**
     * Rejoindre une équipe existante
     */
    public async joinTeam(teamId: string): Promise<void> {
        if (!this.connection) {
            throw new Error("Connexion non établie");
        }

        await this.connection.invoke("JoinTeam", teamId);
    }

    /**
     * Lancer la partie
     */
    public async startGame(gameCode: string): Promise<void> {
        if (!this.connection) {
            throw new Error("Connexion non établie");
        }

        await this.connection.invoke("StartGame", gameCode);
    }

    /**
     * Envoyer une réponse
     */
    public async submitAnswer(gameCode: string, answer: string): Promise<void> {
        if (!this.connection) {
            throw new Error("Connexion non établie");
        }

        await this.connection.invoke("SubmitAnswer", gameCode, answer);
    }

    /**
     * S'abonner à un événement
     */
    public on<T>(event: string, callback: (data: T) => void): void {
        if (!this.connection) {
            throw new Error("Connexion non établie");
        }

        this.connection.on(event, callback);
    }

    /**
     * Se désabonner d'un événement
     */
    public off(event: string): void {
        if (!this.connection) {
            return;
        }

        this.connection.off(event);
    }

    /**
     * Arrêter la connexion
     */
    public async stop(): Promise<void> {
        if (this.connection) {
            await this.connection.stop();
            this.connection = null;
        }
    }
}

// Exporte une instance singleton
export const signalRService = new SignalRService();