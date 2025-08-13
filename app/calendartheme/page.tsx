"use client";
import { Moon, Sunrise, Sunset, Leaf } from "lucide-react";

export default function NatureRhythmPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center text-center"
      style={{
        background: "linear-gradient(to bottom, #e6f0e6, #f5f0ff)",
      }}
    >
      {/* Moon phase icons */}
      <div className="flex gap-4 text-gray-700 mb-6">
        <Moon size={28} />
        <Sunrise size={28} />
        <Leaf size={28} />
        <Sunset size={28} />
      </div>

      {/* Title */}
      <h1 className="text-4xl font-bold text-green-800 mb-2">
        Nature’s Rhythm
      </h1>

      {/* Subtitle */}
      <p className="text-lg max-w-md text-gray-700">
        Just like the moon, the sun, and the seasons, our journeys flow
        naturally. Take a moment to breathe in peace and exhale stress.
      </p>
    </div>
  );
}
