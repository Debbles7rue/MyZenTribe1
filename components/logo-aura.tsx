'use client';
import { useEffect, useRef } from "react";

export default function LogoAura() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let t = 0;
    const id = setInterval(() => {
      t += 0.02;
      const glow = 20 + Math.sin(t) * 20;
      el.style.boxShadow = `0 0 ${glow}px rgba(122,61,255,0.55)`;
    }, 50);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-4">
      <div
        ref={ref}
        className="size-12 rounded-full"
        style={{ background: 'linear-gradient(45deg,#7a3dff,#c6a664,#2bb673)' }}
      />
      <div className="text-2xl font-semibold italic">
        My<span className="not-italic">Zen</span><span className="italic">Tribe</span>
      </div>
    </div>
  );
}
