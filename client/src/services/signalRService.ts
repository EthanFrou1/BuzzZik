import * as signalR from "@microsoft/signalr";

// Types pour les �v�nements SignalR
export interface Player {
    id: string;
    name: string;
    isLeader: boolean;
    isConnected: boolean;
    isReady: boolean; // Ajout du statut pr�t
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
    private previousConnectionId: string | null = null;

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

        // Passer l'ancien ConnectionId pour permettre la reconnexion
        await this.connection.invoke("JoinGame", gameCode, playerName, this.previousConnectionId);

        // Stocker le connectionId actuel pour les futurs rafra�chissements
        this.previousConnectionId = await this.getConnectionId();
        localStorage.setItem('connectionId', this.previousConnectionId);
    }

    /**
     * Initialiser le pr�c�dent ConnectionId depuis le localStorage
     */
    public initPreviousConnectionId(): void {
        this.previousConnectionId = localStorage.getItem('connectionId');
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
     * D�finir si le joueur est pr�t
     */
    public async setPlayerReady(isReady: boolean): Promise<void> {
        if (!this.connection) {
            throw new Error("Connexion non �tablie");
        }

        await this.connection.invoke("SetPlayerReady", isReady);
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
            try {
                await this.connection.stop();
            } catch (err) {
                console.warn("Erreur lors de l'arr�t de la connexion:", err);
                // Continuer m�me en cas d'erreur
            }
            this.connection = null;
        }
    }
}

// Exporte une instance singleton
export const signalRService = new SignalRService();