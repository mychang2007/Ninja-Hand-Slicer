import { useEffect, useRef, useState, useCallback } from 'react';
import { Results } from '@mediapipe/hands';
import confetti from 'canvas-confetti';

interface Point {
  x: number;
  y: number;
}

interface GameObject {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  type: 'fruit' | 'bomb';
  color: string;
  emoji: string;
  isSliced: boolean;
  sliceAngle?: number;
}

interface SlicedFruit {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  emoji: string;
  angle: number;
  rotation: number;
  life: number;
}

interface GameCanvasProps {
  handResults: Results | null;
  gameState: 'start' | 'playing' | 'gameover';
  onScoreUpdate: (score: number) => void;
  onLifeUpdate: (lives: number) => void;
  onGameOver: () => void;
  onShake: () => void;
}

const GRAVITY = 0.18;
const SPAWN_INTERVAL = 1100;
const INITIAL_LIVES = 3;

const FRUITS = [
    { emoji: '🍎', color: '#ff4d4d' },
    { emoji: '🍊', color: '#ffa64d' },
    { emoji: '🍋', color: '#ffff4d' },
    { emoji: '🍉', color: '#4dff4d' },
    { emoji: '🥝', color: '#4dff88' },
    { emoji: '🍍', color: '#ffd11a' },
];

export default function GameCanvas({ 
  handResults, 
  gameState, 
  onScoreUpdate, 
  onLifeUpdate,
  onGameOver,
  onShake
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const objectsRef = useRef<GameObject[]>([]);
  const slicedFruitsRef = useRef<SlicedFruit[]>([]);
  const trailRef = useRef<Point[]>([]);
  const scoreRef = useRef(0);
  const livesRef = useRef(INITIAL_LIVES);
  const lastSpawnTime = useRef(0);
  const animationFrameId = useRef<number>(0);
  
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (gameState === 'playing') {
      scoreRef.current = 0;
      livesRef.current = INITIAL_LIVES;
      objectsRef.current = [];
      slicedFruitsRef.current = [];
      trailRef.current = [];
      onScoreUpdate(0);
      onLifeUpdate(INITIAL_LIVES);
    }
  }, [gameState]);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const parent = canvasRef.current.parentElement;
        if (parent) {
          setDimensions({
            width: parent.clientWidth,
            height: parent.clientHeight
          });
        }
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const spawnObject = useCallback((width: number, height: number) => {
    const isBomb = Math.random() < 0.22;
    const fruit = FRUITS[Math.floor(Math.random() * FRUITS.length)];
    
    const objX = Math.random() * (width - 150) + 75;
    // If spawning near the right side (where the camera is), nudge velocity to the left
    let vx = (Math.random() - 0.5) * 10;
    if (objX > width * 0.7) {
        vx = -Math.random() * 5 - 2;
    }

    const obj: GameObject = {
      id: Math.random().toString(36).substr(2, 9),
      x: objX,
      y: height + 50,
      vx,
      vy: -(Math.random() * 6 + 13),
      radius: 40,
      type: isBomb ? 'bomb' : 'fruit',
      color: isBomb ? '#333' : fruit.color,
      emoji: isBomb ? '💣' : fruit.emoji,
      isSliced: false
    };
    objectsRef.current.push(obj);
  }, []);

  const checkCollision = (p1: Point, p2: Point, obj: GameObject) => {
    if (obj.isSliced) return false;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const lengthSq = dx * dx + dy * dy;
    if (lengthSq === 0) {
      const dist = Math.sqrt(Math.pow(p1.x - obj.x, 2) + Math.pow(p1.y - obj.y, 2));
      return dist < obj.radius;
    }
    let t = ((obj.x - p1.x) * dx + (obj.y - p1.y) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));
    const projX = p1.x + t * dx;
    const projY = p1.y + t * dy;
    const dist = Math.sqrt(Math.pow(obj.x - projX, 2) + Math.pow(obj.y - projY, 2));
    if (dist < obj.radius) {
      obj.sliceAngle = Math.atan2(dy, dx);
      return true;
    }
    return false;
  };

  const update = useCallback((time: number) => {
    if (gameState !== 'playing') return;
    const { width, height } = dimensions;
    if (width === 0 || height === 0) return;

    if (time - lastSpawnTime.current > SPAWN_INTERVAL) {
      spawnObject(width, height);
      lastSpawnTime.current = time;
    }

    if (handResults?.multiHandLandmarks?.length) {
      const landmark = handResults.multiHandLandmarks[0][8];
      
      // Sensitivity factor: maps a tighter central range to the full screen
      const sensitivity = 1.8;
      const rawX = 1 - landmark.x;
      const rawY = landmark.y;
      
      const adjX = (rawX - 0.5) * sensitivity + 0.5;
      const adjY = (rawY - 0.5) * sensitivity + 0.5;
      
      const currentPoint = { 
        x: Math.max(0, Math.min(width, adjX * width)), 
        y: Math.max(0, Math.min(height, adjY * height)) 
      };
      
      if (trailRef.current.length > 0) {
          const lastPoint = trailRef.current[trailRef.current.length - 1];
          objectsRef.current.forEach(obj => {
              if (checkCollision(lastPoint, currentPoint, obj)) {
                  if (obj.type === 'bomb') {
                      onShake();
                      onGameOver();
                      confetti({
                          particleCount: 150,
                          spread: 360,
                          origin: { x: obj.x / width, y: obj.y / height },
                          colors: ['#ff0000', '#000000', '#ffd700']
                      });
                  } else {
                      obj.isSliced = true;
                      scoreRef.current += 10;
                      onScoreUpdate(scoreRef.current);
                      
                      const angle = obj.sliceAngle || 0;
                      slicedFruitsRef.current.push(
                        {
                            id: obj.id + '_h1',
                            x: obj.x, y: obj.y,
                            vx: obj.vx + Math.cos(angle - Math.PI/2) * 5,
                            vy: obj.vy + Math.sin(angle - Math.PI/2) * 5,
                            emoji: obj.emoji, angle, rotation: 0, life: 1.0
                        },
                        {
                            id: obj.id + '_h2',
                            x: obj.x, y: obj.y,
                            vx: obj.vx + Math.cos(angle + Math.PI/2) * 5,
                            vy: obj.vy + Math.sin(angle + Math.PI/2) * 5,
                            emoji: obj.emoji, angle, rotation: 0, life: 1.0
                        }
                      );

                      confetti({
                          particleCount: 25,
                          spread: 60,
                          origin: { x: obj.x / width, y: obj.y / height },
                          colors: [obj.color]
                      });
                  }
              }
          });
      }
      trailRef.current.push(currentPoint);
      if (trailRef.current.length > 12) trailRef.current.shift();
    } else {
      if (trailRef.current.length > 0) trailRef.current.shift();
    }

    objectsRef.current = objectsRef.current.filter(obj => {
      obj.x += obj.vx;
      obj.y += obj.vy;
      obj.vy += GRAVITY;
      if (obj.y > height + 100) {
        if (!obj.isSliced && obj.type === 'fruit') {
          livesRef.current -= 1;
          onLifeUpdate(livesRef.current);
          if (livesRef.current <= 0) onGameOver();
        }
        return false;
      }
      return !obj.isSliced;
    });

    slicedFruitsRef.current = slicedFruitsRef.current.filter(obj => {
        obj.x += obj.vx;
        obj.y += obj.vy;
        obj.vy += GRAVITY;
        obj.rotation += 0.1;
        obj.life -= 0.015;
        return obj.y < height + 100 && obj.life > 0;
    });

    draw();
    animationFrameId.current = requestAnimationFrame(update);
  }, [dimensions, gameState, handResults, onGameOver, onLifeUpdate, onScoreUpdate, spawnObject, onShake]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = dimensions;
    ctx.clearRect(0, 0, width, height);

    // Create a clipping region to avoid drawing fruits behind the camera overlay (bottom-right)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    // Overlay area: matching HandTracker w-44 (176px) + right-4 (16px) = 192px
    // and h-32 (128px) + bottom-4 (16px) = 144px
    const overlayW = 192;
    const overlayH = 144;
    ctx.rect(width - overlayW, height - overlayH, overlayW, overlayH);
    ctx.clip('evenodd');

    slicedFruitsRef.current.forEach(obj => {
        ctx.save();
        ctx.translate(obj.x, obj.y);
        ctx.rotate(obj.rotation);
        ctx.globalAlpha = obj.life;
        ctx.font = `50px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(obj.emoji, 0, 0);
        ctx.restore();
    });

    objectsRef.current.forEach(obj => {
      ctx.save();
      ctx.translate(obj.x, obj.y);
      ctx.font = `70px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(obj.emoji, 0, 0);
      ctx.restore();
    });
    
    // Restore the clipping region context so trail is not clipped
    ctx.restore();

    if (trailRef.current.length > 1) {
      ctx.save();
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00ffff';
      for (let i = 0; i < trailRef.current.length - 1; i++) {
        const p1 = trailRef.current[i];
        const p2 = trailRef.current[i+1];
        const ratio = i / trailRef.current.length;
        
        // Glow layer
        ctx.beginPath();
        ctx.lineWidth = ratio * 15;
        ctx.strokeStyle = `rgba(0, 255, 255, ${ratio * 0.4})`;
        ctx.lineCap = 'round';
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        // Sharp white core
        ctx.beginPath();
        ctx.lineWidth = ratio * 3;
        ctx.strokeStyle = `rgba(255, 255, 255, ${ratio})`;
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      
      // Finger tip pointer
      const head = trailRef.current[trailRef.current.length - 1];
      ctx.beginPath();
      ctx.arc(head.x, head.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#00ffff';
      ctx.fill();
      
      ctx.restore();
    }
  }, [dimensions]);

  useEffect(() => {
    if (gameState === 'playing') {
      animationFrameId.current = requestAnimationFrame(update);
    } else {
      cancelAnimationFrame(animationFrameId.current);
    }
    return () => cancelAnimationFrame(animationFrameId.current);
  }, [gameState, update]);

  return (
    <canvas
      ref={canvasRef}
      width={dimensions.width}
      height={dimensions.height}
      className="w-full h-full block cursor-none"
    />
  );
}
