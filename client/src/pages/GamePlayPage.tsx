import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { signalRService } from "../services/signalRService";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import RoundTransition from "../components/RoundTransition";

interface Question {
    id: string;
    audioUrl: string;
    answers: string[];
    correctAnswer: string;
}

interface CurrentGame {
    currentRound: number;
    maxRounds: number;
    theme: string;
    status: string;
}

export default function GamePlayPage() {
    const { code } = useParams<{ code: string }>();
    const navigate = useNavigate();

    // États du jeu
    const [currentGame, setCurrentGame] = useState<CurrentGame | null>(null);
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number>(30);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [showTransition, setShowTransition] = useState(false);
    const [winningTeam, setWinningTeam] = useState<string | null>(null);
    const [score, setScore] = useState<number>(0);
    const [teams, setTeams] = useState<any[]>([]);

    // Initialisation du jeu
    useEffect(() => {
        if (!code) {
            navigate("/");
            return;
        }

        // Connecter au hub SignalR si ce n'est pas déjà fait
        if (!signalRService.hasConnection()) {
            signalRService.startConnection(() => {
                console.log("Connecté au hub dans le jeu");
            }).then(() => {
                // Setup des événements SignalR après connexion
                setupSignalREvents();
            });
        } else {
            // Setup des événements SignalR directement
            setupSignalREvents();
        }

        return () => {
            // Nettoyage des listeners
            cleanupSignalREvents();

            // Arrêter l'audio si existant
            if (audio) {
                audio.pause();
                audio.currentTime = 0;
            }
        };
    }, [code, navigate]);

    // Configuration des événements SignalR
    const setupSignalREvents = () => {
        // Nouvel événement pour recevoir la question
        signalRService.on<{ question: Question, game: CurrentGame }>("NewQuestion", (data) => {
            setCurrentQuestion(data.question);
            setCurrentGame(data.game);
            setSelectedAnswer(null);
            setIsAnswerSubmitted(false);
            setShowResult(false);
            setShowTransition(false);
            setWinningTeam(null);
            setTimeLeft(30); // Réinitialiser le timer

            // Charger le nouvel audio
            if (data.question.audioUrl) {
                const newAudio = new Audio(data.question.audioUrl);
                newAudio.loop = true;
                setAudio(newAudio);
                setIsPlaying(false);
            }
        });

        // Événement pour recevoir les résultats de la manche
        signalRService.on<{ correctAnswer: string, isTeamCorrect: boolean, teams: any[] }>("RoundResult", (data) => {
            setIsCorrect(data.isTeamCorrect);
            setShowResult(true);
            setTeams(data.teams);

            // Trouver notre équipe et mettre à jour le score
            const currentPlayer = async () => {
                const connectionId = await signalRService.getConnectionId();
                return connectionId;
            };

            currentPlayer().then(connId => {
                // Trouver notre équipe
                const ourTeam = data.teams.find(t => {
                    // La logique pour trouver notre équipe dépend de votre implémentation
                    // Ici, nous supposons que vous avez une méthode pour le faire
                    return true; // Placeholder
                });

                if (ourTeam) {
                    setScore(ourTeam.score);
                }
            });

            // Pause de l'audio à la fin de la manche
            if (audio) {
                audio.pause();
                setIsPlaying(false);
            }

            // Après 3 secondes, afficher la transition vers la prochaine manche
            setTimeout(() => {
                // Trouver l'équipe gagnante si elle existe
                const winningTeam = data.teams.find(t => t.isCorrect)?.name || null;
                setWinningTeam(winningTeam);
                setShowTransition(true);
            }, 3000);
        });

        // Événement pour aller à la page des résultats
        signalRService.on("GameEnded", () => {
            navigate(`/results/${code}`);
        });

        // Événement pour le timer
        signalRService.on<number>("TimerUpdate", (seconds) => {
            setTimeLeft(seconds);
        });

        // Événement pour la réponse enregistrée (feedback personnel)
        signalRService.on<{ isCorrect: boolean, points: number, answer: string }>("AnswerRecorded", (data) => {
            if (data.isCorrect) {
                // Incrémenter le score localement pour une réponse rapide
                setScore(prevScore => prevScore + data.points);
            }
        });
    };

    // Nettoyage des événements SignalR
    const cleanupSignalREvents = () => {
        signalRService.off("NewQuestion");
        signalRService.off("RoundResult");
        signalRService.off("GameEnded");
        signalRService.off("TimerUpdate");
        signalRService.off("AnswerRecorded");
    };

    // Gestion de la lecture audio
    useEffect(() => {
        if (audio) {
            if (isPlaying) {
                audio.play().catch(err => {
                    console.error("Erreur de lecture audio:", err);
                    setIsPlaying(false);
                });
            } else {
                audio.pause();
            }

            audio.muted = isMuted;
        }
    }, [audio, isPlaying, isMuted]);

    // Gestion du timer
    useEffect(() => {
        if (timeLeft <= 0 && !isAnswerSubmitted && currentQuestion) {
            // Si le temps est écoulé et qu'aucune réponse n'a été soumise,
            // soumettre une réponse vide automatiquement
            handleAnswerSubmit("");
        }
    }, [timeLeft, isAnswerSubmitted, currentQuestion]);

    // Soumission de réponse
    const handleAnswerSubmit = (answer: string) => {
        if (isAnswerSubmitted || !code) return;

        setSelectedAnswer(answer);
        setIsAnswerSubmitted(true);

        // Envoyer la réponse au serveur
        signalRService.submitAnswer(code, answer)
            .catch(err => {
                console.error("Erreur lors de la soumission de la réponse:", err);
                setIsAnswerSubmitted(false);
            });
    };

    // Contrôle de la lecture audio
    const togglePlayPause = () => {
        setIsPlaying(!isPlaying);
    };

    // Contrôle du son
    const toggleMute = () => {
        setIsMuted(!isMuted);
    };

    // Gérer la fin de la transition
    const handleTransitionEnd = () => {
        setShowTransition(false);
    };

    // Si aucune question n'est chargée, afficher un état de chargement
    if (!currentQuestion || !currentGame) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-[#1e1e2f] to-[#11111c] text-white flex flex-col items-center justify-center">
                <div className="animate-pulse text-purple-400 text-xl">Chargement du jeu...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#1e1e2f] to-[#11111c] text-white flex flex-col items-center justify-center p-4">
            {/* Composant de transition entre les manches */}
            {showTransition && currentGame && (
                <RoundTransition
                    roundNumber={currentGame.currentRound + 1}
                    totalRounds={currentGame.maxRounds}
                    onFinished={handleTransitionEnd}
                    teamName={winningTeam || undefined}
                    isTeamWinner={winningTeam !== null}
                />
            )}

            {/* En-tête avec timer et info de manche */}
            <div className="w-full max-w-md flex justify-between items-center mb-6">
                <div className="bg-purple-500/20 rounded-lg p-2 px-4">
                    <span className="font-bold">MANCHE {currentGame.currentRound}</span>
                    <span className="text-sm text-gray-300"> / {currentGame.maxRounds}</span>
                </div>

                <div className="bg-orange-500/20 rounded-lg p-2 px-4 flex items-center">
                    <span className="text-sm text-orange-200 mr-2">Score:</span>
                    <span className="font-bold text-orange-300">{score}</span>
                </div>

                <div className={`rounded-lg p-2 px-4 ${timeLeft <= 5 ? 'bg-red-500/50 animate-pulse' : 'bg-orange-500/20'
                    }`}>
                    <span className="font-bold text-xl">{timeLeft}</span>
                </div>
            </div>

            {/* Lecteur audio avec contrôles */}
            <div className="w-full max-w-md mb-8">
                <div className="bg-white/10 rounded-2xl p-6 flex flex-col items-center">
                    <div className={`w-32 h-32 rounded-full ${isPlaying ? 'bg-purple-500/50 animate-pulse' : 'bg-purple-500/30'
                        } flex items-center justify-center mb-4`}>
                        <button
                            onClick={togglePlayPause}
                            className="bg-purple-500 rounded-full w-16 h-16 flex items-center justify-center"
                        >
                            {isPlaying ? <Pause size={32} /> : <Play size={32} />}
                        </button>
                    </div>

                    <div className="w-full flex justify-center">
                        <button
                            onClick={toggleMute}
                            className="bg-white/10 rounded-full p-2"
                        >
                            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Options de réponse */}
            <div className="w-full max-w-md grid grid-cols-1 gap-3">
                {currentQuestion.answers.map((answer, index) => (
                    <button
                        key={index}
                        onClick={() => handleAnswerSubmit(answer)}
                        disabled={isAnswerSubmitted}
                        className={`p-4 rounded-xl text-left font-semibold text-lg ${selectedAnswer === answer
                                ? 'bg-purple-500 text-white'
                                : 'bg-white/10 hover:bg-white/20'
                            } ${showResult && answer === currentQuestion.correctAnswer
                                ? 'bg-green-500 text-white'
                                : ''
                            } ${showResult && selectedAnswer === answer && answer !== currentQuestion.correctAnswer
                                ? 'bg-red-500 text-white'
                                : ''
                            } transition-colors`}
                    >
                        {answer}
                    </button>
                ))}
            </div>

            {/* Affichage du résultat */}
            {showResult && (
                <div className="mt-6 w-full max-w-md">
                    <div className={`p-4 rounded-xl text-center ${isCorrect ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                        }`}>
                        {isCorrect
                            ? 'Bravo ! Bonne réponse !'
                            : `Dommage ! La bonne réponse était : ${currentQuestion.correctAnswer}`
                        }
                    </div>
                </div>
            )}
        </div>
    );
}