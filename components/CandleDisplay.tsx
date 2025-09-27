// components/CandleDisplay.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";

type Candle = {
  id: string;
  name: string;
  color: string;
  message: string | null;
  created_at: string;
  expires_at: string | null;
  candle_type?: string;
  payment_status?: string;
  stripe_payment_id?: string;
  amount_paid?: number;
  fade_stage?: number;
  user_id?: string;
  recipient_id?: string;
  created_for?: string;
  created_by?: string;
};

interface CandleDisplayProps {
  candle: Candle;
}

/** A tiny WebGL shader canvas that renders a realistic, noisy flame with alpha.
 *  0 external assets; pure code. Works on mobile + desktop. */
function CanvasFlame({
  width = 46,
  height = 76,
  className,
  style,
}: {
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ok, setOk] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl =
      canvas.getContext("webgl", { premultipliedAlpha: false, alpha: true }) ||
      canvas.getContext("experimental-webgl");
    if (!gl) {
      setOk(false);
      return;
    }

    const vertSrc = `
      attribute vec2 position;
      varying vec2 vUv;
      void main() {
        vUv = (position + 1.0)*0.5;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    // Fragment shader: fBm noise + teardrop SDF + heat-shimmer + color ramp
    const fragSrc = `
      precision mediump float;
      varying vec2 vUv;
      uniform float u_time;
      uniform vec2 u_res;

      // hash / noise (iq)
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
      float noise(vec2 p){
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f*f*(3.0-2.0*f);
        return mix(a, b, u.x) + (c - a)*u.y*(1.0-u.x) + (d - b)*u.x*u.y;
      }
      float fbm(vec2 p){
        float v = 0.0;
        float a = 0.55;
        for(int i=0;i<5;i++){
          v += a*noise(p);
          p *= 2.02;
          a *= 0.55;
        }
        return v;
      }

      // teardrop-like mask centered horizontally
      float flameMask(vec2 uv){
        // uv in [0,1]
        uv.x = (uv.x-0.5)*1.1;  // widen control
        uv.y = (uv.y)*1.2;      // height scale
        float r = length(vec2(uv.x, max(uv.y*0.9, 0.0)));
        // base teardrop curve
        float base = 1.0 - smoothstep(0.0, 1.0, r + 0.15*uv.y);
        // pinch top
        base *= smoothstep(0.0, 0.18, 1.0-uv.y);
        return clamp(base, 0.0, 1.0);
      }

      // color ramp from white/yellow to orange
      vec3 ramp(float t){
        vec3 c1 = vec3(1.000, 0.980, 0.930);
        vec3 c2 = vec3(1.000, 0.910, 0.520);
        vec3 c3 = vec3(1.000, 0.620, 0.240);
        vec3 c4 = vec3(0.950, 0.420, 0.120);
        if (t < 0.33) return mix(c1, c2, smoothstep(0.0,0.33,t));
        if (t < 0.66) return mix(c2, c3, smoothstep(0.33,0.66,t));
        return mix(c3, c4, smoothstep(0.66,1.0,t));
      }

      void main(){
        // keep aspect so flame doesn't squash
        vec2 uv = vUv;
        uv.x = (uv.x - 0.5) * (u_res.x/u_res.y) + 0.5;

        // rise + swirl using time
        float t = u_time;
        vec2 p = vec2(uv.x*2.2, uv.y*3.2 - t*1.6);

        // flicker field
        float n = fbm(p + vec2(0.0, t*0.8));
        float n2 = fbm(p*1.4 + vec2(2.7, -t*1.1));

        // base mask + turbulence to edges
        float mask = flameMask(uv);
        mask *= smoothstep(0.05, 0.85, n*0.75 + n2*0.25 + 0.2);

        // heat shimmer: offset sample position subtly
        float shimmer = (noise(uv*12.0 + t*2.0) - 0.5)*0.02;
        float intensity = clamp(mask + shimmer, 0.0, 1.0);

        // brighten near base like a real wick
        float wickGlow = smoothstep(0.0, 0.25, uv.y) * (1.0 - uv.y);
        intensity = clamp(intensity + wickGlow*0.35, 0.0, 1.0);

        // color + alpha
        vec3 col = ramp(intensity);
        float alpha = pow(intensity, 1.2);

        // softer edges
        alpha *= smoothstep(0.02, 0.9, intensity);
        gl_FragColor = vec4(col, alpha);
      }
    `;

    function compile(type: number, src: string) {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s));
        setOk(false);
        return null;
      }
      return s;
    }

    const vs = compile(gl.VERTEX_SHADER, vertSrc);
    const fs = compile(gl.FRAGMENT_SHADER, fragSrc);
    if (!vs || !fs) return;

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      setOk(false);
      return;
    }
    gl.useProgram(program);

    // fullscreen quad
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    const verts = new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1,  1, 1, -1, 1, 1,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u_time = gl.getUniformLocation(program, "u_time");
    const u_res = gl.getUniformLocation(program, "u_res");

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(u_res, canvas.width, canvas.height);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let raf = 0;
    const start = performance.now();
    const render = () => {
      const t = (performance.now() - start) / 1000;
      gl.uniform1f(u_time, t);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(render);
    };
    render();

    return () => cancelAnimationFrame(raf);
  }, [width, height]);

  if (!ok) return null;
  return <canvas ref={canvasRef} className={className} style={style} />;
}

export default function CandleDisplay({ candle }: CandleDisplayProps) {
  const isEternal = candle.candle_type === "eternal";
  const createdDate = new Date(candle.created_at);
  const formattedDate = createdDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <>
      <div className="candle-display">
        <div className="stage">
          {/* Ambient warm halo */}
          <div className="ambient" aria-hidden />

          {/* Photoreal-leaning candle body (shaded SVG) */}
          <svg
            className="candle-svg"
            viewBox="0 0 200 300"
            role="img"
            aria-label="White memorial candle"
          >
            <defs>
              {/* edge darkening + front subsurface glow */}
              <linearGradient id={`waxSide-${candle.id}`} x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#d7d7d7" />
                <stop offset="16%" stopColor="#f7f7f7" />
                <stop offset="50%" stopColor="#ffffff" />
                <stop offset="84%" stopColor="#f4f4f4" />
                <stop offset="100%" stopColor="#d0d0d0" />
              </linearGradient>
              <radialGradient id={`waxFront-${candle.id}`} cx="50%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="55%" stopColor="#fff7ea" />
                <stop offset="100%" stopColor="#f1ede7" />
              </radialGradient>
              <radialGradient id={`pool-${candle.id}`} cx="50%" cy="55%" r="70%">
                <stop offset="0%" stopColor="#fff8e6" />
                <stop offset="60%" stopColor="#ffe7bf" />
                <stop offset="100%" stopColor="#ffd79e" />
              </radialGradient>
              <filter id={`softShadow-${candle.id}`} x="-35%" y="-35%" width="170%" height="190%">
                <feDropShadow dx="0" dy="2.5" stdDeviation="3" floodOpacity="0.18" />
              </filter>
            </defs>

            {/* body */}
            <g filter={`url(#softShadow-${candle.id})`}>
              <rect x="40" y="56" width="120" height="210" rx="22" fill={`url(#waxSide-${candle.id})`} />
              <rect x="40" y="56" width="120" height="210" rx="22" fill={`url(#waxFront-${candle.id})`} opacity="0.9" />
              {/* concave melted top */}
              <path
                d="M50 56 Q100 42 150 56 C153 60 151 64 146 65 C129 71 71 71 54 65 C49 64 47 60 50 56 Z"
                fill="#fff1db"
              />
              {/* inner wax pool */}
              <ellipse cx="100" cy="67" rx="36" ry="10" fill={`url(#pool-${candle.id})`} opacity="0.9" />
              {/* vertical glossy band */}
              <rect x="58" y="64" width="12" height="188" rx="6" fill="#ffffff" opacity="0.35" />
              <rect x="128" y="64" width="6" height="184" rx="3" fill="#ffffff" opacity="0.22" />
            </g>

            {/* wick */}
            <rect x="98.8" y="60" width="2.4" height="18" rx="1" fill="#2a2a2a" />
          </svg>

          {/* Procedural flame overlay (code-only) */}
          <CanvasFlame
            width={46}
            height={76}
            className="flame"
          />

          {/* Soft breathing glow near the flame */}
          <div className="glow" aria-hidden />

          {/* Gold name tag */}
          <div className="name-tag" role="img" aria-label={`Name: ${candle.name}`}>
            <span className="name">{candle.name}</span>
          </div>

          {isEternal && <div className="eternal-badge">Eternal Flame</div>}
        </div>

        <div className="info">
          <h3 className="title">{candle.name}</h3>
          {candle.message && <p className="message">"{candle.message}"</p>}
          <div className="meta">
            <span>Lit on {formattedDate}</span>
            {candle.amount_paid && <span>${(candle.amount_paid / 100).toFixed(2)}</span>}
          </div>
        </div>
      </div>

      <style jsx>{`
        .candle-display {
          background: radial-gradient(120% 100% at 50% 0%, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
          border: 1px solid rgba(251,191,36,0.15);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 20px 18px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          overflow: hidden;
        }

        .stage {
          position: relative;
          width: 260px;
          max-width: 90vw;
          display: grid;
          place-items: center;
          padding-top: 8px;
        }

        .ambient {
          position: absolute;
          inset: -40px -40px auto -40px;
          height: 260px;
          background: radial-gradient(180px 120px at 50% 35%, rgba(255,222,170,0.5), rgba(255,180,80,0.14) 60%, transparent 70%);
          filter: blur(2px);
          animation: breathe 3.2s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes breathe {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50%      { opacity: 0.85; transform: scale(1.03); }
        }

        .candle-svg {
          width: 200px;
          height: 300px;
          display: block;
          pointer-events: none;
          user-select: none;
        }

        .flame {
          position: absolute;
          top: 18px;      /* tune to align with the SVG wick */
          left: 50%;
          transform: translateX(-50%);
          width: 46px;
          height: 76px;
          mix-blend-mode: screen;
          filter: drop-shadow(0 0 12px rgba(255,170,60,0.6));
          pointer-events: none;
        }

        .glow {
          position: absolute;
          top: 6px;
          left: 50%;
          transform: translateX(-50%);
          width: 220px;
          height: 160px;
          background: radial-gradient(110px 80px at 50% 35%, rgba(255,220,150,0.85), rgba(255,185,90,0.25) 60%, transparent 70%);
          filter: blur(10px);
          opacity: 0.7;
          animation: breathe 3.2s ease-in-out infinite;
          pointer-events: none;
        }

        .name-tag {
          margin-top: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 6px 12px;
          border-radius: 14px;
          background: linear-gradient(135deg, #caa85a, #a27d2c);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.35),
            0 6px 16px rgba(251,191,36,0.25);
          min-width: 120px;
        }
        .name {
          display: inline-block;
          background: linear-gradient(180deg, #fff2c9, #e9c15a);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          font-weight: 700;
          letter-spacing: 0.2px;
          text-shadow: 0 1px 0 rgba(0,0,0,0.1);
          font-size: 0.9rem;
        }

        .eternal-badge {
          position: absolute;
          top: 6px;
          right: 8px;
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          color: #fff;
          padding: 3px 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.04em;
          box-shadow: 0 4px 12px rgba(251,191,36,0.3);
        }

        .info { text-align: center; max-width: 420px; }
        .title {
          margin: 8px 0 6px 0;
          font-size: 1.12rem;
          color: #fbbf24;
          font-weight: 600;
          text-shadow: 0 2px 4px rgba(0,0,0,0.25);
        }
        .message {
          margin: 0 0 10px 0;
          font-size: 0.9rem;
          color: #fde68a;
          font-style: italic;
          opacity: 0.95;
        }
        .meta {
          display: inline-flex;
          gap: 12px;
          font-size: 0.78rem;
          color: #fde68a;
          opacity: 0.8;
        }

        /* Mobile tweaks */
        @media (max-width: 480px) {
          .stage { width: 220px; }
          .candle-svg { width: 180px; height: 270px; }
          .flame { top: 16px; width: 42px; height: 70px; }
          .name { font-size: 0.85rem; }
        }
      `}</style>
    </>
  );
}
