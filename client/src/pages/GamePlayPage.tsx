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

    // �tats du jeu
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

        // Connecter au hub SignalR si ce n'est pas d�j� fait
        if (!signalRService.hasConnection()) {
            signalRService.startConnection(() => {
                console.log("Connect� au hub dans le jeu");
            }).then(() => {
                // Setup des �v�nements SignalR apr�s connexion
                setupSignalREvents();
            });
        } else {
            // Setup des �v�nements SignalR directement
            setupSignalREvents();
        }

        return () => {
            // Nettoyage des listeners
            cleanupSignalREvents();

            // Arr�ter l'audio si existant
            if (audio) {
                audio.pause();
                audio.currentTime = 0;
            }
        };
    }, [code, navigate]);

    // Configuration des �v�nements SignalR
    const setupSignalREvents = () => {
        // Nouvel �v�nement pour recevoir la question
        signalRService.on<{ question: Question, game: CurrentGame }>("NewQuestion", (data) => {
            setCurrentQuestion(data.question);
            setCurrentGame(data.game);
            setSelectedAnswer(null);
            setIsAnswerSubmitted(false);
            setShowResult(false);
            setShowTransition(false);
            setWinningTeam(null);
            setTimeLeft(30); // R�initialiser le timer

            // Charger le nouvel audio
            if (data.question.audioUrl) {
                const newAudio = new Audio(data.question.audioUrl);
                newAudio.loop = true;
                setAudio(newAudio);
                setIsPlaying(false);
            }
        });

        // �v�nement pour recevoir les r�sultats de la manche
        signalRService.on<{ correctAnswer: string, isTeamCorrect: boolean, teams: any[] }>("RoundResult", (data) => {
            setIsCorrect(data.isTeamCorrect);
            setShowResult(true);
            setTeams(data.teams);

            // Trouver notre �quipe et mettre � jour le score
            const currentPlayer = async () => {
                const connectionId = await signalRService.getConnectionId();
                return connectionId;
            };

            currentPlayer().then(connId => {
                // Trouver notre �quipe
                const ourTeam = data.teams.find(t => {
                    // La logique pour trouver notre �quipe d�pend de votre impl�mentation
                    // Ici, nous supposons que vous avez une m�thode pour le faire
                    return true; // Placeholder
                });

                if (ourTeam) {
                    setScore(ourTeam.score);
                }
            });

            // Pause de l'audio � la fin de la manche
            if (audio) {
                audio.pause();
                setIsPlaying(false);
            }

            // Apr�s 3 secondes, afficher la transition vers la prochaine manche
            setTimeout(() => {
                // Trouver l'�quipe gagnante si elle existe
                const winningTeam = data.teams.find(t => t.isCorrect)?.name || null;
                setWinningTeam(winningTeam);
                setShowTransition(true);
            }, 3000);
        });

        // �v�nement pour aller � la page des r�sultats
        signalRService.on("GameEnded", () => {
            navigate(`/results/${code}`);
        });

        // �v�nement pour le timer
        signalRService.on<number>("TimerUpdate", (seconds) => {
            setTimeLeft(seconds);
        });

        // �v�nement pour la r�ponse enregistr�e (feedback personnel)
        signalRService.on<{ isCorrect: boolean, points: number, answer: string }>("AnswerRecorded", (data) => {
            if (data.isCorrect) {
                // Incr�menter le score localement pour une r�ponse rapide
                setScore(prevScore => prevScore + data.points);
            }
        });
    };

    // Nettoyage des �v�nements SignalR
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
            // Si le temps est �coul� et qu'aucune r�ponse n'a �t� soumise,
            // soumettre une r�ponse vide automatiquement
            handleAnswerSubmit("");
        }
    }, [timeLeft, isAnswerSubmitted, currentQuestion]);

    // Soumission de r�ponse
    const handleAnswerSubmit = (answer: string) => {
        if (isAnswerSubmitted || !code) return;

        setSelectedAnswer(answer);
        setIsAnswerSubmitted(true);

        // Envoyer la r�ponse au serveur
        signalRService.submitAnswer(code, answer)
            .catch(err => {
                console.error("Erreur lors de la soumission de la r�ponse:", err);
                setIsAnswerSubmitted(false);
            });
    };

    // Contr�le de la lecture audio
    const togglePlayPause = () => {
        setIsPlaying(!isPlaying);
    };

    // Contr�le du son
    const toggleMute = () => {
        setIsMuted(!isMuted);
    };

    // G�rer la fin de la transition
    const handleTransitionEnd = () => {
        setShowTransition(false);
    };

    // Si aucune question n'est charg�e, afficher un �tat de chargement
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

            {/* En-t�te avec timer et info de manche */}
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

            {/* Lecteur audio avec contr�les */}
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

            {/* Options de r�ponse */}
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

            {/* Affichage du r�sultat */}
            {showResult && (
                <div className="mt-6 w-full max-w-md">
                    <div className={`p-4 rounded-xl text-center ${isCorrect ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                        }`}>
                        {isCorrect
                            ? 'Bravo ! Bonne r�ponse !'
                            : `Dommage ! La bonne r�ponse �tait : ${currentQuestion.correctAnswer}`
                        }
                    </div>
                </div>
            )}
        </div>
    );
}