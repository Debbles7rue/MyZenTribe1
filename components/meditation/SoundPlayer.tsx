"use client";

import { useEffect, useRef } from "react";

type Sound = "none" | "528hz" | "ocean" | "rain";

export function SoundPlayer({
  sound,
  volume,
  onChangeSound,
  onChangeVolume,
}: {
  sound: Sound;
  volume: number;
  onChangeSound: (s: Sound) => void;
  onChangeVolume: (v: number) => void;
}) {
  const ref = useRef<HTMLAudioElement>(null);

  const src =
    sound === "528hz"
      ? "/audio/528hz.mp3"
      : sound === "ocean"
      ? "/audio/ocean.mp3"
      : sound === "rain"
      ? "/audio/rain.mp3"
      : "";

  useEffect(() => {
    if (ref.current) {
      ref.current.volume = volume;
      if (src) {
        ref.current.play().catch(() => void 0);
      } else {
        ref.current.pause();
      }
    }
  }, [src, volume]);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {(["none", "528hz", "ocean", "rain"] as Sound[]).map((s) => (
          <button
            key={s}
            onClick={() => onChangeSound(s)}
            className={`px-3 py-1 rounded-lg border ${
              sound === s ? "bg-brand-500 text-white border-brand-500" : "bg-white"
            }`}
          >
            {s === "none" ? "No sound" : s.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="mt-3">
        <label className="text-sm">Volume</label>
        <input
          className="mt-1 w-full"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
        />
      </div>

      {/* Hidden audio element */}
      <audio ref={ref} src={src} loop />
    </div>
  );
}
