import { Player, type PlayerRef } from "@remotion/player";
import { useRef, useEffect } from "react";
import {
  DatePulseTrailer,
  TRAILER_DURATION_FRAMES,
  TRAILER_FPS,
} from "./TrailerComposition";

const TRAILER_DURATION_MS = (TRAILER_DURATION_FRAMES / TRAILER_FPS) * 1000;

interface TrailerPlayerProps {
  onEnd: () => void;
}

export default function TrailerPlayer({ onEnd }: TrailerPlayerProps) {
  const playerRef = useRef<PlayerRef>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    // Retry play until the Player actually starts
    const interval = setInterval(() => {
      if (!playerRef.current || startedRef.current) return;
      if (playerRef.current.isPlaying()) {
        startedRef.current = true;
        clearInterval(interval);
        return;
      }
      playerRef.current.play();
    }, 150);

    // Fallback: auto-dismiss after the full trailer duration + buffer
    const fallback = setTimeout(() => {
      onEnd();
    }, TRAILER_DURATION_MS + 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(fallback);
    };
  }, [onEnd]);

  return (
    <div
      className="h-full w-full flex items-center justify-center cursor-pointer"
      onClick={onEnd}
      title="Cliquer pour passer"
    >
      <Player
        ref={playerRef}
        component={DatePulseTrailer}
        durationInFrames={TRAILER_DURATION_FRAMES}
        compositionWidth={800}
        compositionHeight={500}
        fps={TRAILER_FPS}
        autoPlay
        numberOfSharedAudioTags={0}
        style={{
          width: "100%",
          maxWidth: 800,
          aspectRatio: "800 / 500",
        }}
        onEnded={onEnd}
      />
      <button
        onClick={(e) => { e.stopPropagation(); onEnd(); }}
        className="absolute bottom-8 right-8 text-sm text-slate-400 hover:text-slate-600 transition font-medium"
      >
        Passer &rarr;
      </button>
    </div>
  );
}
