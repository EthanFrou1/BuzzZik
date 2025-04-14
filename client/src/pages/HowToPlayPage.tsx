import { Link } from "react-router-dom";
import { Play, Users, Cat, Music, Trophy } from "lucide-react";

export default function HowToPlayPage() {
    const steps = [
        {
            id: 1,
            title: "Créer une partie",
            description: "Lancez une partie et choisissez un thème musical qui vous plaît.",
            icon: <Play />
        },
        {
            id: 2,
            title: "Inviter des amis",
            description: "Partagez le code unique avec vos amis pour qu'ils rejoignent la partie.",
            icon: <Users />
        },
        {
            id: 3,
            title: "Former les équipes",
            description: "Créez des équipes avec des noms fun et choisissez vos avatars d'animaux.",
            icon: <Cat />
        },
        {
            id: 4,
            title: "Jouer!",
            description: "Écoutez les extraits musicaux et choisissez la bonne réponse le plus vite possible.",
            icon: <Music />
        },
        {
            id: 5,
            title: "Gagnez des points",
            description: "Obtenez des points pour chaque bonne réponse. Plus vous êtes rapide, plus vous gagnez!",
            icon: <Trophy />
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#0f0c29] via-[#302b63] to-[#24243e] text-white flex flex-col items-center p-6 relative">
            <Link to="/" className="absolute top-6 left-6 text-sm text-purple-300 hover:underline">
                Retour à l'accueil
            </Link>

            <div className="w-full max-w-lg mx-auto">
                <div className="text-center mb-10 mt-12">
                    <h1 className="text-4xl font-bold text-purple-400 mb-4">Comment jouer</h1>
                    <p className="text-gray-300">Découvrez comment jouer à BuzzZik en quelques étapes simples</p>
                </div>

                <div className="bg-white/10 rounded-xl p-6 shadow-lg space-y-8">
                    {steps.map((step) => (
                        <div key={step.id} className="flex items-start">
                            <div className="bg-purple-500 rounded-full w-12 h-12 flex items-center justify-center shrink-0 mr-4">
                                {step.icon}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-purple-300 mb-1">
                                    {step.id}. {step.title}
                                </h3>
                                <p className="text-gray-300">{step.description}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-8 flex justify-center gap-4">
                    <Link to="/">
                        <button className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold">
                            Retour
                        </button>
                    </Link>
                    <Link to="/game">
                        <button className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-semibold">
                            Créer une partie
                        </button>
                    </Link>
                </div>

                <div className="mt-10 text-center">
                    <h2 className="text-2xl font-bold text-purple-400 mb-4">Astuces</h2>
                    <div className="bg-white/10 rounded-xl p-6 shadow-lg">
                        <ul className="space-y-3 text-left">
                            <li className="flex items-start">
                                <span className="text-purple-300 mr-2">•</span>
                                <span>Répondez rapidement pour obtenir plus de points</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-purple-300 mr-2">•</span>
                                <span>Utilisez des écouteurs pour une meilleure expérience audio</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-purple-300 mr-2">•</span>
                                <span>Choisissez des thèmes que vous connaissez bien pour plus de fun</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-purple-300 mr-2">•</span>
                                <span>Consultez le récapitulatif à mi-parcours pour ajuster votre stratégie</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-6 text-xs text-gray-400">
                &copy; 2025 BuzzZik - All rights reserved
            </div>
        </div>
    );
}