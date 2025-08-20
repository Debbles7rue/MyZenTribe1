"use client";

export function CandleRoom() {
  // purely visual, calm flicker grid
  return (
    <div className="relative">
      <div className="grid grid-cols-5 gap-10 py-6">
        {Array.from({ length: 10 }).map((_, i) => (
          <Candle key={i} delay={i * 137} />
        ))}
      </div>
      <style jsx>{`
        .flame {
          position: absolute;
          left: 50%;
          top: -22px;
          transform: translateX(-50%);
          width: 18px;
          height: 28px;
          border-radius: 50% 50% 50% 50%;
          background: radial-gradient(ellipse at center, #ffd27a 0%, #ff9900 60%, transparent 70%);
          filter: blur(0.6px);
          animation: flicker 2.6s infinite ease-in-out;
          box-shadow: 0 0 18px 8px rgba(255, 170, 60, 0.35);
        }
        @keyframes flicker {
          0%, 100% { transform: translateX(-50%) scale(1) translateY(0); opacity: 0.95; }
          30% { transform: translateX(-52%) scale(1.06) translateY(-1px); opacity: 1; }
          60% { transform: translateX(-49%) scale(0.96) translateY(1px); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}

function Candle({ delay = 0 }: { delay?: number }) {
  return (
    <div className="relative mx-auto w-10">
      <div className="flame" style={{ animationDelay: `${delay}ms` }} />
      <div className="h-10 w-10 rounded-t-full bg-gradient-to-b from-amber-100 to-amber-300 shadow-inner mx-auto" />
      <div className="h-2 w-12 mx-auto -mt-1 bg-amber-700/40 rounded-full blur-[2px]" />
    </div>
  );
}
