import { useEffect, useState } from "react";

interface RoundTransitionProps {
    roundNumber: number;
    totalRounds: number;
    onFinished: () => void;
    teamName?: string;
    isTeamWinner?: boolean;
}

export default function RoundTransition({
    roundNumber,
    totalRounds,
    onFinished,
    teamName,
    isTeamWinner
}: RoundTransitionProps) {
    const [countdown, setCountdown] = useState(3);

    // Lancer le compte à rebours
    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    // Laisser un peu de temps après que le compte à rebours atteigne 0
                    setTimeout(() => {
                        onFinished();
                    }, 500);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [onFinished]);

    // Si c'est un résultat de manche
    if (teamName && isTeamWinner !== undefined) {
        return (
            <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center">
                <div className="text-3xl font-bold mb-8 text-center">
                    {isTeamWinner ? (
                        <div className="text-green-400">
                            <span className="block mb-4 text-5xl">YFYVBHBB</span>
                            <span className="block mb-2">L'équipe {teamName}</span>
                            <span className="block">a gagné cette manche!</span>
                        </div>
                    ) : (
                        <div className="text-purple-400">
                            <span className="block mb-4 text-5xl">RTYUIHGFV</span>
                            <span className="block">Fin de la manche</span>
                        </div>
                    )}
                </div>

                <div className="text-2xl font-bold text-white">
                    Prochaine manche dans <span className="text-yellow-400">{countdown}</span>
                </div>
            </div>
        );
    }

    // Si c'est une transition entre manches
    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center">
            <div className="text-5xl font-bold mb-6 text-purple-400">
                Manche {roundNumber}
                <span className="text-gray-500 text-3xl"> / {totalRounds}</span>
            </div>

            <div className="bg-purple-500/20 rounded-full w-20 h-20 flex items-center justify-center mb-8">
                <div className="text-4xl font-bold text-white">{countdown}</div>
            </div>

            <div className="text-2xl font-bold text-white">
                Préparez-vous...
            </div>
        </div>
    );
}