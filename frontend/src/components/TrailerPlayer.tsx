import { Player, type PlayerRef } from "@remotion/player";
import { useRef, useState } from "react";
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
  const [started, setStarted] = useState(false);

  const handlePlay = () => {
    setStarted(true);
    // Small delay so the Player is visible before playing
    setTimeout(() => playerRef.current?.play(), 50);
  };

  return (
    <div
      className="h-full w-full flex items-center justify-center cursor-pointer relative"
      onClick={started ? onEnd : handlePlay}
      title={started ? "Cliquer pour passer" : "Cliquer pour lancer"}
    >
      {!started && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 bg-[#f8f9fc]">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
              Decouvre ton rapport en un coup d'oeil
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              15 secondes d'apercu — clique pour lancer
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePlay();
            }}
            className="flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 transition-all"
          >
            <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        </div>
      )}

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

      {started && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEnd();
          }}
          className="absolute bottom-8 right-8 text-sm text-slate-400 hover:text-slate-600 transition font-medium"
        >
          Passer &rarr;
        </button>
      )}
    </div>
  );
}
