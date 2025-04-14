import { Link } from "react-router-dom";

export default function HomePage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-[#0f0c29] via-[#302b63] to-[#24243e] flex flex-col items-center justify-center text-white">
            <div className="text-center mb-12">
                <h1 className="text-5xl font-bold mb-4 text-purple-400">BuzzZik</h1>
                <p className="text-lg text-gray-300">Blind Test Musical entre amis, fun et rapide !</p>
            </div>

            <div className="flex flex-col items-center space-y-4">
                <Link to="/game">
                    <button className="bg-purple-500 hover:bg-purple-600 text-white text-lg font-semibold py-3 px-6 rounded-xl shadow-lg transition-all w-full">
                        Créer une partie
                    </button>
                </Link>

                <Link to="/join">
                    <button className="bg-white/10 hover:bg-white/20 text-white text-lg font-semibold py-3 px-6 rounded-xl shadow-lg transition-all w-full">
                        Rejoindre une partie
                    </button>
                </Link>

                <Link to="/how-to-play" className="text-sm text-purple-300 hover:underline mt-4">
                    Comment jouer ?
                </Link>
            </div>

            <div className="absolute bottom-6 text-xs text-gray-400">
                &copy; 2025 BuzzZik - All rights reserved
            </div>
        </div>
    );
}