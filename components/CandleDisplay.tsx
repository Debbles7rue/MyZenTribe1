// components/CandleDisplay.tsx
"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";

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

/** Procedural WebGL flame (code-only). */
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
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (!gl) {
      setOk(false);
      return;
    }

    const vertSrc = `
      attribute vec2 position;
      varying vec2 vUv;
      void main(){
        vUv = (position + 1.0) * 0.5;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    // Slightly warmer, more contrasty flame; narrower top; bottom snaps to canvas bottom.
    const fragSrc = `
      precision mediump float;
      varying vec2 vUv;
      uniform float u_time;
      uniform vec2  u_res;

      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
      float noise(vec2 p){
        vec2 i=floor(p), f=fract(p);
        float a=hash(i), b=hash(i+vec2(1.,0.)), c=hash(i+vec2(0.,1.)), d=hash(i+vec2(1.,1.));
        vec2 u=f*f*(3.-2.*f);
        return mix(a,b,u.x) + (c-a)*u.y*(1.-u.x) + (d-b)*u.x*u.y;
      }
      float fbm(vec2 p){
        float v=0., a=0.6;
        for(int i=0;i<5;i++){
          v += a*noise(p);
          p *= 2.03;
          a *= 0.55;
        }
        return v;
      }

      // Teardrop SDF (bottom at vUv.y=0.0)
      float flameMask(vec2 uv){
        uv.x = (uv.x - 0.5) * 1.05;
        float y = uv.y;
        float r = length(vec2(uv.x*0.95, max(y*0.92, 0.0)));
        float base = 1.0 - smoothstep(0.0, 1.0, r + 0.12*y);
        // pinch towards the tip
        base *= smoothstep(0.0, 0.22, 1.0 - y);
        return clamp(base, 0.0, 1.0);
      }

      vec3 ramp(float t){
        vec3 c1 = vec3(1.00, 0.99, 0.96); // near-white
        vec3 c2 = vec3(1.00, 0.93, 0.58); // warm yellow
        vec3 c3 = vec3(1.00, 0.68, 0.28); // orange
        vec3 c4 = vec3(0.95, 0.42, 0.12); // deep orange
        if (t < 0.35) return mix(c1, c2, smoothstep(0.0,0.35,t));
        if (t < 0.70) return mix(c2, c3, smoothstep(0.35,0.70,t));
        return mix(c3, c4, smoothstep(0.70,1.0,t));
      }

      void main(){
        vec2 uv = vUv;
        uv.x = (uv.x - 0.5) * (u_res.x/u_res.y) + 0.5;

        float t = u_time;

        // Flicker & curl
        vec2 p = vec2(uv.x*2.2, uv.y*3.4 - t*1.7);
        float n  = fbm(p + vec2(0.0, t*0.9));
        float n2 = fbm(p*1.37 + vec2(2.1, -t*1.2));
        float f = flameMask(uv);
        f *= smoothstep(0.02, 0.9, 0.7*n + 0.3*n2 + 0.25);

        // Heat shimmer
        float shimmer = (noise(uv*13.0 + t*2.1) - 0.5)*0.02;
        float intensity = clamp(f + shimmer, 0.0, 1.0);

        // Bright core near bottom
        float baseGlow = (1.0 - uv.y) * 0.35;
        intensity = clamp(intensity + baseGlow, 0.0, 1.0);

        vec3 col = ramp(intensity);
        float alpha = pow(intensity, 1.15);
        alpha *= smoothstep(0.05, 0.95, intensity);
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

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
      setOk(false);
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1,-1, 1,-1, -1,1,  -1,1, 1,-1, 1,1]),
      gl.STATIC_DRAW
    );
    const loc = gl.getAttribLocation(prog, "position");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u_time = gl.getUniformLocation(prog, "u_time");
    const u_res = gl.getUniformLocation(prog, "u_res");

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

  // Precompute bead positions along the front rim
  const beads = useMemo(() => {
    const arr: { x: number; y: number }[] = [];
    const cx = 100, cy = 56, rx = 60, ry = 12;
    const start = (200 * Math.PI) / 180; // 200°
    const end = (340 * Math.PI) / 180;   // 340°
    const count = 22;
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const th = start + (end - start) * t;
      arr.push({ x: cx + rx * Math.cos(th), y: cy + ry * Math.sin(th) });
    }
    return arr;
  }, [candle.id]);

  return (
    <>
      <div className="candle-display">
        <div className="stage">
          <div className="ambient" aria-hidden />

          {/* Wrap ensures flame anchors to wick coordinates */}
          <div className="candle-wrap">
            {/* Candle + ornaments (pure SVG) */}
            <svg className="candle-svg" viewBox="0 0 200 300" role="img" aria-label="White memorial candle">
              <defs>
                <linearGradient id={`waxSide-${candle.id}`} x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#d9d9d9" />
                  <stop offset="16%" stopColor="#f7f7f7" />
                  <stop offset="50%" stopColor="#ffffff" />
                  <stop offset="84%" stopColor="#f2f2f2" />
                  <stop offset="100%" stopColor="#d4d4d4" />
                </linearGradient>
                <radialGradient id={`waxFront-${candle.id}`} cx="50%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="55%" stopColor="#fff6ea" />
                  <stop offset="100%" stopColor="#efeae3" />
                </radialGradient>
                <radialGradient id={`pool-${candle.id}`} cx="50%" cy="55%" r="70%">
                  <stop offset="0%" stopColor="#fff8e6" />
                  <stop offset="60%" stopColor="#ffe0b6" />
                  <stop offset="100%" stopColor="#ffd094" />
                </radialGradient>
                <filter id={`softShadow-${candle.id}`} x="-35%" y="-35%" width="170%" height="190%">
                  <feDropShadow dx="0" dy="2.5" stdDeviation="3" floodOpacity="0.18" />
                </filter>
                <filter id={`flowerShadow-${candle.id}`} x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="1.2" stdDeviation="1.5" floodColor="#000" floodOpacity="0.18" />
                </filter>
                <linearGradient id={`goldTag-${candle.id}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#caa85a" />
                  <stop offset="100%" stopColor="#a27d2c" />
                </linearGradient>
                <linearGradient id={`goldFace-${candle.id}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#fff2c9" />
                  <stop offset="55%" stopColor="#f6d784" />
                  <stop offset="100%" stopColor="#e9c15a" />
                </linearGradient>
              </defs>

              {/* Candle body */}
              <g filter={`url(#softShadow-${candle.id})`}>
                <rect x="40" y="56" width="120" height="210" rx="22" fill={`url(#waxSide-${candle.id})`} />
                <rect x="40" y="56" width="120" height="210" rx="22" fill={`url(#waxFront-${candle.id})`} opacity="0.9" />

                {/* melted top */}
                <path
                  d="M50 56 Q100 42 150 56 C153 60 151 64 146 65 C129 71 71 71 54 65 C49 64 47 60 50 56 Z"
                  fill="#fff1db"
                />
                <ellipse cx="100" cy="67" rx="36" ry="10" fill={`url(#pool-${candle.id})`} opacity="0.92" />

                {/* glossy bands */}
                <rect x="58" y="64" width="12" height="188" rx="6" fill="#ffffff" opacity="0.35" />
                <rect x="128" y="64" width="6" height="184" rx="3" fill="#ffffff" opacity="0.22" />
              </g>

              {/* WICK (top of wick at y=60) */}
              <rect x="98.8" y="60" width="2.4" height="18" rx="1" fill="#2a2a2a" />

              {/* Pearl bead ring on the near rim */}
              <g>
                {beads.map((b, i) => (
                  <g key={i}>
                    <circle cx={b.x} cy={b.y} r="2.5" fill="#faf7f2" />
                    <circle cx={b.x - 0.6} cy={b.y - 0.6} r="1.1" fill="#ffffff" opacity="0.85" />
                    <circle cx={b.x + 0.7} cy={b.y + 0.4} r="0.8" fill="#d6c9b0" opacity="0.7" />
                  </g>
                ))}
              </g>

              {/* Small flower cluster (tasteful, not huge) */}
              <g filter={`url(#flowerShadow-${candle.id})`}>
                {/* stems */}
                <path d="M80 250 C76 260, 72 268, 70 276" stroke="#5b7d3c" strokeWidth="1.4" fill="none" />
                <path d="M120 248 C124 258, 128 266, 130 274" stroke="#5b7d3c" strokeWidth="1.4" fill="none" />
                {/* leaves */}
                <ellipse cx="74" cy="265" rx="8" ry="4" fill="#7caf5a" />
                <ellipse cx="126" cy="262" rx="7" ry="3.5" fill="#7caf5a" />
                {/* lilies (five petals each) */}
                <g transform="translate(88,262) scale(1)">
                  {[0,72,144,216,288].map((a) => (
                    <ellipse
                      key={a}
                      cx="0"
                      cy="0"
                      rx="9"
                      ry="4.8"
                      fill="#ffffff"
                      transform={`rotate(${a}) translate(0, -7)`}
                      opacity="0.98"
                    />
                  ))}
                  <circle cx="0" cy="0" r="1.8" fill="#f0c94f" />
                </g>
                <g transform="translate(108,258) scale(0.9)">
                  {[0,72,144,216,288].map((a) => (
                    <ellipse
                      key={a}
                      cx="0"
                      cy="0"
                      rx="8"
                      ry="4.2"
                      fill="#ffffff"
                      transform={`rotate(${a}) translate(0, -6.5)`}
                      opacity="0.98"
                    />
                  ))}
                  <circle cx="0" cy="0" r="1.6" fill="#f0c94f" />
                </g>
              </g>

              {/* Gold name tag ON the candle (subtle) */}
              <g transform="translate(0,0)">
                <path d="M60 132 h80 a10 10 0 0 1 10 10 v3 a10 10 0 0 1 -10 10 h-80 a10 10 0 0 1 -10 -10 v-3 a10 10 0 0 1 10 -10 z" fill={`url(#goldTag-${candle.id})`} opacity="0.95" />
                <rect x="64" y="134.5" width="72" height="16" rx="8" fill={`url(#goldFace-${candle.id})`} />
                <text x="100" y="146" textAnchor="middle" fontSize="8" fontWeight={800} fill="#3e2e16" letterSpacing="0.3" style={{ userSelect: "none" }}>
                  {candle.name}
                </text>
              </g>
            </svg>

            {/* IMPORTANT: align flame bottom to wick (y=60). With 76px high canvas, set top to wickY and translate -100% */}
            <CanvasFlame className="flame" width={46} height={76} />
          </div>

          {/* Breathing glow */}
          <div className="glow" aria-hidden />

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

        .candle-wrap {
          position: relative;
          width: 200px;
          height: 300px;
          display: grid;
          place-items: center;
        }

        .candle-svg {
          width: 200px;
          height: 300px;
          display: block;
          pointer-events: none;
          user-select: none;
        }

        /* Align bottom of flame canvas to wick (y=60px in the SVG) */
        .flame {
          position: absolute;
          left: 50%;
          top: 60px;                      /* wick Y */
          transform: translate(-50%, -100%); /* move flame up so its bottom sits on wick */
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
          .candle-wrap { width: 180px; height: 270px; }
          .candle-svg { width: 180px; height: 270px; }
          .flame { top: 54px; width: 42px; height: 70px; }
          .title { font-size: 1rem; }
          .message { font-size: 0.85rem; }
        }
      `}</style>
    </>
  );
}
