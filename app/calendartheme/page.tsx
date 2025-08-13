"use client";

export default function NatureRhythmPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center text-center px-6"
      style={{ background: "linear-gradient(180deg,#eaf6ef 0%,#f4f0ff 70%)" }}
    >
      {/* Tiny “icons” row (no libraries) */}
      <div className="flex gap-4 text-2xl mb-6" aria-hidden>
        <span>🌿</span>
        <span>🌤️</span>
        <span>🌑</span>
        <span>🕊️</span>
      </div>

      <h1 className="text-4xl font-semibold text-green-800 mb-2">
        Nature’s Rhythm
      </h1>
      <p className="text-lg max-w-xl text-gray-700">
        Just like the moon, the sun, and the seasons, our journeys flow naturally.
        Take a slow breath in… and out. You’re right on time.
      </p>
    </div>
  );
}
