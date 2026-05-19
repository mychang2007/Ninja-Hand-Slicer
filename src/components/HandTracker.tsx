import { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { Hands, Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

interface HandTrackerProps {
  onResults: (results: Results) => void;
  showDebug?: boolean;
}

export default function HandTracker({ onResults, showDebug = false }: HandTrackerProps) {
  const webcamRef = useRef<Webcam>(null);
  const handsRef = useRef<Hands | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 0, // Lower complexity for faster tracking
      minDetectionConfidence: 0.4,
      minTrackingConfidence: 0.4,
    });

    hands.onResults((results) => {
      onResults(results);
      if (!isLoaded && results.multiHandLandmarks) {
        setIsLoaded(true);
      }
    });

    handsRef.current = hands;

    if (webcamRef.current?.video) {
        const camera = new Camera(webcamRef.current.video, {
          onFrame: async () => {
            if (webcamRef.current?.video) {
                await hands.send({ image: webcamRef.current.video });
            }
          },
          width: 640,
          height: 480,
        });
        camera.start();
    }

    return () => {
      hands.close();
    };
  }, []);

  return (
    <div className={`absolute bottom-4 right-4 w-44 h-32 bg-black rounded-2xl border-2 border-[#00ffcc] shadow-2xl overflow-hidden z-30 transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
      <div className="absolute top-1.5 left-2 flex items-center gap-1.5 z-10">
        <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></div>
        <span className="text-[8px] font-bold tracking-widest text-[#00ffcc]">PLAYER_CAM</span>
      </div>
      
      <Webcam
        ref={webcamRef}
        mirrored
        className="w-full h-full object-cover grayscale brightness-125 contrast-125 opacity-40"
        videoConstraints={{
            width: 640,
            height: 480,
            facingMode: 'user',
        }}
      />

      <div className="absolute bottom-3 left-0 w-full text-center z-10">
        <span className="text-[9px] font-mono text-[#00ffcc] uppercase tracking-tighter">
          SEC_AUTH: 0x{Math.floor(Math.random() * 1000000).toString(16)}
        </span>
      </div>

      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0f0422] z-20">
          <p className="text-[#00ffcc] text-[10px] font-mono animate-pulse tracking-widest uppercase">INITIALIZING_CAM...</p>
        </div>
      )}
    </div>
  );
}
