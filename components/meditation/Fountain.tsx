"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Lightweight canvas fountain:
 * - A soft stream of particles with gravity + fade
 * - Looped audio if /public/audio/fountain.mp3 exists
 */
export function Fountain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [soundOn, setSoundOn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let width = canvas.clientWidth;
    let height = 220;
    canvas.width = width;
    canvas.height = height;

    const onResize = () => {
      width = canvas.clientWidth;
      height = 220;
      canvas.width = width;
      canvas.height = height;
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(canvas);

    type P = { x: number; y: number; vx: number; vy: number; life: number; max: number };
    const particles: P[] = [];
    const gravity = 0.12;
    const sourceX = () => width / 2;
    const sourceY = 10;

    function spawn() {
      for (let i = 0; i < 5; i++) {
        particles.push({
          x: sourceX() + (Math.random() * 16 - 8),
          y: sourceY,
          vx: (Math.random() - 0.5) * 0.9,
          vy: 0.5 + Math.random() * 0.6,
          life: 0,
          max: 160 + Math.random() * 80,
        });
      }
    }

    let raf = 0;
    function tick() {
      ctx.clearRect(0, 0, width, height);

      // pool reflection
      const grad = ctx.createLinearGradient(0, height - 60, 0, height);
      grad.addColorStop(0, "rgba(90,170,255,0.10)");
      grad.addColorStop(1, "rgba(60,120,220,0.20)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, height - 60, width, 60);

      // stream particles
      spawn();
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.vy += gravity * 0.2;
        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        const alpha = Math.max(0, 1 - p.life / p.max);
        ctx.globalAlpha = alpha * 0.8;
        ctx.fillStyle = "rgba(120,170,255,0.9)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
        ctx.fill();

        // ripple when reaching pool
        if (p.y > height - 62) {
          // fade splash
          ctx.globalAlpha = 0.15 * alpha;
          ctx.beginPath();
          ctx.arc(p.x, height - 55, 5 + Math.random() * 6, 0, Math.PI * 2);
          ctx.fill();
          particles.splice(i, 1);
          continue;
        }

        if (p.life > p.max) particles.splice(i, 1);
      }
      ctx.globalAlpha = 1;

      // fountain spout
      ctx.fillStyle = "rgba(180,200,255,0.35)";
      ctx.fillRect(width / 2 - 2, 0, 4, 16);

      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  // audio
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = 0.65;
    if (soundOn) {
      a.play().catch(() => void 0);
    } else {
      a.pause();
      a.currentTime = 0;
    }
  }, [soundOn]);

  return (
    <div>
      <canvas ref={canvasRef} className="w-full h-[220px] rounded-xl bg-gradient-to-b from-sky-50 to-blue-50 shadow-inner" />
      <div className="mt-3">
        <button
          onClick={() => setSoundOn(s => !s)}
          className="rounded-lg border px-3 py-1 text-sm"
        >
          {soundOn ? "Sound: On" : "Sound: Off"}
        </button>
        <audio ref={audioRef} src="/audio/fountain.mp3" loop />
      </div>
    </div>
  );
}
