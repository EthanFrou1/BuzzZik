import * as signalR from "@microsoft/signalr";

// Types pour les �v�nements SignalR
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
     * V�rifie si une connexion existe
     */
    public hasConnection(): boolean {
        return this.connection !== null;
    }

    /**
     * Obtient l'ID de connexion actuel
     */
    public async getConnectionId(): Promise<string> {
        if (!this.connection) {
            throw new Error("Connexion non �tablie");
        }
        return this.connection.connectionId || '';
    }

    /**
     * D�marre la connexion au hub SignalR
     */
    public async startConnection(onConnected: () => void): Promise<void> {
        if (this.connection) {
            // Si d�j� connect�, juste appeler le callback
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

        // �coute des erreurs
        this.connection.on("Error", (message: string) => {
            console.error("SignalR Error:", message);
            // Tu pourras ajouter ici un syst�me de notification visuelle
        });

        try {
            await this.connection.start();
            console.log("SignalR Connect�!");
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
            throw new Error("Connexion non �tablie");
        }

        await this.connection.invoke("JoinGame", gameCode, playerName);
    }

    /**
     * Cr�er une nouvelle �quipe
     */
    public async createTeam(gameCode: string, teamName: string, avatar: string): Promise<void> {
        if (!this.connection) {
            throw new Error("Connexion non �tablie");
        }

        await this.connection.invoke("CreateTeam", gameCode, teamName, avatar);
    }

    /**
     * Rejoindre une �quipe existante
     */
    public async joinTeam(teamId: string): Promise<void> {
        if (!this.connection) {
            throw new Error("Connexion non �tablie");
        }

        await this.connection.invoke("JoinTeam", teamId);
    }

    /**
     * Lancer la partie
     */
    public async startGame(gameCode: string): Promise<void> {
        if (!this.connection) {
            throw new Error("Connexion non �tablie");
        }

        await this.connection.invoke("StartGame", gameCode);
    }

    /**
     * Envoyer une r�ponse
     */
    public async submitAnswer(gameCode: string, answer: string): Promise<void> {
        if (!this.connection) {
            throw new Error("Connexion non �tablie");
        }

        await this.connection.invoke("SubmitAnswer", gameCode, answer);
    }

    /**
     * S'abonner � un �v�nement
     */
    public on<T>(event: string, callback: (data: T) => void): void {
        if (!this.connection) {
            throw new Error("Connexion non �tablie");
        }

        this.connection.on(event, callback);
    }

    /**
     * Se d�sabonner d'un �v�nement
     */
    public off(event: string): void {
        if (!this.connection) {
            return;
        }

        this.connection.off(event);
    }

    /**
     * Arr�ter la connexion
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