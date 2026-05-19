import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sword, Trophy, Heart, Play, RefreshCcw, Camera } from 'lucide-react';
import { Results } from '@mediapipe/hands';
import HandTracker from './components/HandTracker';
import GameCanvas from './components/GameCanvas';

type GameState = 'start' | 'playing' | 'gameover';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('start');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('ninja_highscore');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [handResults, setHandResults] = useState<Results | null>(null);

  const [isShaking, setIsShaking] = useState(false);

  const triggerShake = useCallback(() => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  }, []);

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setLives(3);
  };

  const handleGameOver = useCallback(() => {
    setGameState('gameover');
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('ninja_highscore', score.toString());
    }
  }, [score, highScore]);

  const onHandResults = (results: Results) => {
    setHandResults(results);
  };

  return (
    <motion.div 
      animate={isShaking ? { x: [-10, 10, -10, 10, 0], y: [-5, 5, -5, 5, 0] } : {}}
      transition={{ duration: 0.1, repeat: 4 }}
      className="fixed inset-0 bg-[#0f0422] text-white font-sans overflow-hidden select-none"
    >
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#ff00ff22] blur-[120px] rounded-full -mr-64 -mt-64"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#00ffff11] blur-[120px] rounded-full -ml-64 -mb-64"></div>
      </div>

      <HandTracker onResults={onHandResults} />

      <AnimatePresence mode="wait">
        {gameState === 'start' && (
          <motion.div
            key="start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4"
          >
            <motion.div
              initial={{ y: -50 }}
              animate={{ y: 0 }}
              className="mb-12"
            >
              <h1 className="text-7xl md:text-9xl font-black italic uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-[#00ffcc] flex flex-col items-center">
                <span>NINJA</span>
                <span className="text-4xl md:text-6xl -mt-4 opacity-80 text-[#ff00ff]">HAND SLICER</span>
              </h1>
            </motion.div>

            <motion.div 
              className="flex flex-col gap-6 items-center"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl max-w-sm mb-4 shadow-[0_0_30px_rgba(0,255,204,0.1)]">
                <p className="text-[#00ffcc] text-xs font-bold uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
                  <Camera className="w-4 h-4" /> System: Finger Tracking Online
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm font-medium">
                  <div className="flex flex-col items-center p-3 bg-white/5 rounded-2xl border border-white/5">
                    <span className="text-2xl mb-1">☝️</span>
                    <span className="text-white/70">Point Finger</span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-white/5 rounded-2xl border border-white/5">
                    <span className="text-2xl mb-1">⚡</span>
                    <span className="text-[#00ffcc]">High Sensitivity</span>
                  </div>
                </div>
              </div>

              <button
                onClick={startGame}
                className="group relative flex items-center justify-center gap-4 bg-[#00ffcc] hover:bg-[#00ffcc]/80 text-[#0f0422] px-12 py-5 rounded-2xl font-black text-2xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(0,255,204,0.3)] uppercase tracking-widest"
              >
                <Play className="fill-current text-[#0f0422]" />
                Start Game
              </button>
              
              {highScore > 0 && (
                <div className="bg-[#ff0066] px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest animate-pulse mt-4">
                  High Score: {highScore}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {gameState === 'playing' && (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 w-full h-full"
          >
            {/* Top HUD */}
            <div className="absolute top-0 left-0 right-0 p-8 flex justify-between items-start pointer-events-none z-20">
              <div className="flex flex-col">
                <span className="text-[#00ffcc] text-xs font-bold uppercase tracking-widest">Session Score</span>
                <span className="text-6xl font-black text-white italic tracking-tighter drop-shadow-2xl tabular-nums">
                  {score}
                </span>
                <div className="flex gap-2 mt-2">
                  {[...Array(3)].map((_, i) => (
                    <div 
                      key={i}
                      className={`h-2 w-16 rounded-full transition-all duration-500 ${
                        i < lives ? 'bg-[#ff0066] shadow-[0_0_10px_rgba(255,0,102,0.5)]' : 'bg-white/10'
                      }`} 
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-end">
                <div className="bg-[#ff0066] px-4 py-1 rounded-full text-xs font-bold uppercase mb-4 animate-pulse">
                  High Score: {Math.max(score, highScore)}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[#00ffcc] text-[10px] uppercase font-bold tracking-widest">System Status</p>
                    <p className="text-xs font-mono text-white/70">CAM_FEED: ACTIVE</p>
                  </div>
                  <div className="w-12 h-12 rounded-full border-2 border-[#00ffcc] flex items-center justify-center font-black text-lg bg-[#00ffcc]/10 text-[#00ffcc] shadow-[0_0_15px_rgba(0,255,204,0.2)]">
                    60
                  </div>
                </div>
              </div>
            </div>

            <GameCanvas
              handResults={handResults}
              gameState={gameState}
              onScoreUpdate={setScore}
              onLifeUpdate={setLives}
              onGameOver={handleGameOver}
              onShake={triggerShake}
            />
          </motion.div>
        )}

        {gameState === 'gameover' && (
          <motion.div
            key="gameover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-20 flex flex-col items-center justify-center h-full text-center px-4 bg-black/80 backdrop-blur-md"
          >
            <motion.h2 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-8xl md:text-9xl font-black italic uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-[#ff0066] to-[#ff00ff] mb-2 drop-shadow-[0_0_30px_rgba(255,0,102,0.5)]"
            >
              GAME OVER
            </motion.h2>
            
            <div className="flex flex-col gap-4 mb-12">
              <div className="text-5xl font-black italic tracking-tighter">
                FINAL SCORE: <span className="text-[#00ffcc]">{score}</span>
              </div>
              {score >= highScore && score > 0 && (
                <div className="text-xl text-[#ff00ff] font-bold tracking-[0.3em] uppercase animate-pulse">
                  ✨ NEW SECTOR RECORD ✨
                </div>
              )}
            </div>

            <div className="flex gap-6">
              <button
                onClick={startGame}
                className="flex items-center gap-3 bg-[#00ffcc] text-[#0f0422] px-10 py-5 rounded-2xl font-black uppercase tracking-widest hover:brightness-110 transition-all active:scale-95 shadow-[0_0_30px_rgba(0,255,204,0.3)]"
              >
                <RefreshCcw className="w-5 h-5" />
                Retry
              </button>
              <button
                onClick={() => setGameState('start')}
                className="flex items-center gap-3 border-2 border-white/20 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all active:scale-95"
              >
                Menu
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hand status indicator */}
      {!handResults?.multiHandLandmarks?.length && gameState === 'playing' && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-xl px-8 py-4 rounded-2xl border border-[#ff0066]/30 flex items-center gap-4 animate-pulse shadow-[0_0_30px_rgba(255,0,102,0.1)]">
            <div className="w-2 h-2 rounded-full bg-[#ff0066]" />
            <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#ff0066]">Sensor Offline: Hand Not Detected</span>
        </div>
      )}
    </motion.div>
  );
}
