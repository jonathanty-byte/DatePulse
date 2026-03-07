import { Player, type PlayerRef } from "@remotion/player";
import { useEffect, useRef } from "react";
import {
  DatePulseTrailer,
  TRAILER_DURATION_FRAMES,
  TRAILER_FPS,
} from "./TrailerComposition";

interface TrailerPlayerProps {
  onEnd: () => void;
}

export default function TrailerPlayer({ onEnd }: TrailerPlayerProps) {
  const playerRef = useRef<PlayerRef>(null);

  useEffect(() => {
    // Auto-play after a short delay to ensure the Player is mounted
    const t = setTimeout(() => playerRef.current?.play(), 100);
    // Fallback: if onEnded doesn't fire, dismiss after full duration + buffer
    const fallback = setTimeout(onEnd, (TRAILER_DURATION_FRAMES / TRAILER_FPS) * 1000 + 500);
    return () => { clearTimeout(t); clearTimeout(fallback); };
  }, [onEnd]);

  return (
    <div
      className="h-full w-full flex items-center justify-center cursor-pointer relative"
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
        numberOfSharedAudioTags={0}
        style={{
          width: "100%",
          maxWidth: 800,
          aspectRatio: "800 / 500",
        }}
        onEnded={onEnd}
      />

      <button
        onClick={(e) => {
          e.stopPropagation();
          onEnd();
        }}
        className="absolute top-6 right-6 px-4 py-2 rounded-lg bg-white/80 backdrop-blur-sm border border-gray-200 shadow-sm text-sm text-slate-500 hover:text-slate-700 transition font-medium"
      >
        Passer &rarr;
      </button>
    </div>
  );
}
