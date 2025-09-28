// app/meditation/candles/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

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
};

const COLOR_PRESETS = [
  { key: "white",   label: "White (Peace)",       wax: "#ffffff", waxGradient: ["#ffffff", "#F3F0F7", "#EDE9F7"] },
  { key: "gold",    label: "Gold (Blessings)",    wax: "#f8e3b1", waxGradient: ["#fff5d6", "#f8e3b1", "#e6c56e"] },
  { key: "rose",    label: "Rose (Love)",         wax: "#f7c4c9", waxGradient: ["#ffd6d9", "#f7c4c9", "#e8a5ab"] },
  { key: "azure",   label: "Azure (Healing)",     wax: "#c5e3ff", waxGradient: ["#dceeff", "#c5e3ff", "#9bc8f7"] },
  { key: "violet",  label: "Violet (Protection)", wax: "#d8c7ff", waxGradient: ["#e8dcff", "#d8c7ff", "#c0a8f7"] },
  { key: "emerald", label: "Emerald (Renewal)",   wax: "#cdebd3", waxGradient: ["#dff5e3", "#cdebd3", "#a8d6b3"] },
] as const;

export default function CandleRoomPage() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-5xl mb-4">🕯️</div>
          <p className="text-amber-200">Preparing sacred space...</p>
        </div>
      </div>
    );
  }

  return <CandleRoomContent />;
}

function CandleRoomContent() {
  const [loading, setLoading] = useState(true);
  const [activeCandles, setActiveCandles] = useState<Candle[]>([]);
  const [memoryOrbs, setMemoryOrbs] = useState<Candle[]>([]);
  const [eternalCandles, setEternalCandles] = useState<Candle[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showAddType, setShowAddType] = useState<'eternal' | 'renewable' | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchParams = useSearchParams();

  function calculateFadeStage(candle: Candle): number {
    if (candle.candle_type === 'eternal') return 1;
    
    const createdDate = new Date(candle.created_at);
    const now = new Date();
    const daysOld = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysOld <= 30) return 1;
    if (daysOld <= 60) return 2;
    if (daysOld <= 90) return 3;
    return 4;
  }

  useEffect(() => {
    const success = searchParams.get('success');
    const candleId = searchParams.get('candle_id');
    
    if (success === 'true' && candleId) {
      async function markAsPaid() {
        setCheckingPayment(true);
        
        const { data, error } = await supabase
          .from("candle_offerings")
          .update({ 
            payment_status: 'paid',
            updated_at: new Date().toISOString()
          })
          .eq('id', candleId)
          .eq('payment_status', 'pending')
          .select()
          .single();

        if (data) {
          showSuccessAnimation(data.candle_type === 'eternal');
          await loadAllCandles();
        } else if (error) {
          console.error('Error updating payment status:', error);
          await loadAllCandles();
        }
        
        setCheckingPayment(false);
      }
      
      markAsPaid();
      
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/meditation/candles');
      }
    }
  }, [searchParams]);

  function showSuccessAnimation(isEternal: boolean) {
    if (typeof window === 'undefined') return;
    
    const elem = document.createElement('div');
    elem.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60';
    elem.innerHTML = `
      <div class="bg-slate-800 border border-amber-600/30 rounded-2xl p-8 shadow-2xl max-w-sm w-full animate-fadeIn">
        <div class="text-center">
          <div class="text-6xl mb-4">${isEternal ? '✨' : '🕯️'}</div>
          <h3 class="text-2xl font-bold text-amber-200 mb-2">${isEternal ? 'Eternal Flame Lit' : 'Candle Lit'}</h3>
          <p class="text-amber-200/70">${isEternal ? 'Your memorial will burn forever' : 'Your light brings comfort'}</p>
        </div>
      </div>
    `;
    document.body.appendChild(elem);
    
    setTimeout(() => {
      elem.style.transition = 'opacity 0.5s';
      elem.style.opacity = '0';
      setTimeout(() => elem.remove(), 500);
    }, 3000);
  }

  async function loadAllCandles() {
    setLoading(true);

    const { data: eternal } = await supabase
      .from("candle_offerings")
      .select("*")
      .eq('candle_type', 'eternal')
      .eq('payment_status', 'paid')
      .order("created_at", { ascending: false });

    if (eternal) {
      setEternalCandles(eternal as Candle[]);
    }

    const { data: renewable } = await supabase
      .from("candle_offerings")
      .select("*")
      .eq('payment_status', 'paid')
      .neq('candle_type', 'eternal')
      .order("created_at", { ascending: false });

    if (renewable) {
      const candles = renewable as Candle[];
      const active: Candle[] = [];
      const orbs: Candle[] = [];

      candles.forEach(candle => {
        const stage = calculateFadeStage(candle);
        candle.fade_stage = stage;
        
        if (stage < 4) {
          active.push(candle);
        } else {
          orbs.push(candle);
        }
      });

      setActiveCandles(active);
      setMemoryOrbs(orbs);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadAllCandles();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("candle_offerings_rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "candle_offerings" },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            loadAllCandles();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 relative overflow-hidden">
      {/* Sacred atmosphere backgrounds */}
      <div className="fixed inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-t from-amber-900/20 via-transparent to-purple-900/20"></div>
      </div>
      
      {/* Floating particles/stars */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 20}s`,
              animationDuration: `${20 + Math.random() * 20}s`
            }}
          >
            <div className="w-1 h-1 bg-amber-200 rounded-full opacity-60 blur-[0.5px]"></div>
          </div>
        ))}
      </div>

      {/* Candle Animation Styles */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.6; }
          33% { transform: translateY(-30px) translateX(10px); opacity: 0.8; }
          66% { transform: translateY(20px) translateX(-10px); opacity: 0.4; }
        }
        .animate-float {
          animation: float 20s infinite ease-in-out;
        }
        @keyframes flicker {
          0% { transform: rotate(-1deg) translateY(0px) scaleY(1.02); filter: drop-shadow(0 0 6px rgba(255, 180, 70, .35)); }
          25% { transform: rotate(1.2deg) translateY(-1px) scaleY(0.98); filter: drop-shadow(0 0 10px rgba(255, 200, 90, .5)); }
          50% { transform: rotate(-.8deg) translateY(0px) scaleY(1.03); filter: drop-shadow(0 0 12px rgba(255, 210, 120, .65)); }
          75% { transform: rotate(.6deg) translateY(-1px) scaleY(0.97); filter: drop-shadow(0 0 8px rgba(255, 170, 60, .45)); }
          100% { transform: rotate(-1deg) translateY(0px) scaleY(1.02); filter: drop-shadow(0 0 6px rgba(255, 180, 70, .35)); }
        }
        @keyframes glowPulse {
          0% { opacity: .5; }
          50% { opacity: .9; }
          100% { opacity: .5; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .flame { 
          transform-origin: 50% 100%; 
          animation: flicker 1.6s infinite ease-in-out; 
        }
        .glow { 
          animation: glowPulse 2.8s infinite ease-in-out; 
        }
      `}</style>

      {/* Mobile-Optimized Header */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-amber-600/20">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/meditation" className="p-2 -ml-2 text-amber-200 hover:bg-amber-600/20 rounded-lg md:hidden">
                ←
              </Link>
              <h1 className="text-lg md:text-2xl font-bold text-amber-200">Sacred Candle Sanctuary</h1>
            </div>
            
            <div className="hidden md:flex gap-3 items-center">
              <Link href="/meditation" className="px-4 py-2 bg-slate-800/60 text-amber-200 rounded-lg hover:bg-slate-800/80 transition-colors border border-amber-600/30">
                ← Back
              </Link>
              <button 
                onClick={() => setShowAdd(true)}
                className="px-6 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg hover:from-amber-700 hover:to-orange-700 transition-all font-medium shadow-lg shadow-amber-900/50"
              >
                + Light Candle
              </button>
            </div>

            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-amber-200 hover:bg-amber-600/20 rounded-lg md:hidden"
            >
              ⋮
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="absolute right-4 top-14 bg-slate-900 rounded-lg shadow-xl border border-amber-600/30 p-2 min-w-[150px] md:hidden">
              <Link 
                href="/meditation" 
                className="block px-4 py-2 text-amber-200 hover:bg-amber-600/20 rounded"
                onClick={() => setMobileMenuOpen(false)}
              >
                ← Back to Meditation
              </Link>
              <button 
                onClick={() => {
                  setShowAdd(true);
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left px-4 py-2 text-amber-200 hover:bg-amber-600/20 rounded"
              >
                + Light a Candle
              </button>
            </div>
          )}
        </div>

        <div className="px-4 pb-3 md:hidden">
          <p className="text-sm text-amber-200/70">
            A shared sacred space for memories and prayers
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 p-4 md:p-6 max-w-7xl mx-auto">
        <div className="hidden md:block mb-8 text-center">
          <p className="text-amber-200/80 max-w-3xl mx-auto text-lg italic">
            "Each flame carries a prayer, each light holds a memory, each candle bridges heaven and earth."
          </p>
        </div>

        {checkingPayment && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-amber-600/30 rounded-2xl p-8 shadow-2xl max-w-sm w-full">
              <div className="text-center">
                <div className="animate-pulse text-5xl mb-4">🕯️</div>
                <h3 className="text-xl font-bold text-amber-200 mb-2">Lighting Your Candle...</h3>
                <p className="text-amber-200/70">Please wait while we confirm</p>
              </div>
            </div>
          </div>
        )}

        {/* Eternal Memorial Garden */}
        {eternalCandles.length > 0 && (
          <section className="mb-12 relative">
            <div className="flex items-center gap-3 mb-6 justify-center">
              <div className="h-px bg-gradient-to-r from-transparent via-amber-600/50 to-transparent flex-1"></div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-bold text-amber-200">Eternal Memorial Garden</h2>
                <span className="text-xs md:text-sm text-amber-300 bg-amber-900/30 px-3 py-1 rounded-full border border-amber-600/30">
                  ✨ Forever Burning
                </span>
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-amber-600/50 to-transparent flex-1"></div>
            </div>
            
            <div className="flex justify-center">
              <div className="bg-gradient-to-br from-amber-900/10 to-orange-900/10 backdrop-blur-sm rounded-2xl md:rounded-3xl p-6 md:p-8 border border-amber-600/20 shadow-2xl shadow-amber-900/20">
                <div className={`grid ${eternalCandles.length === 1 ? 'grid-cols-1' : eternalCandles.length === 2 ? 'grid-cols-2' : 'grid-cols-[repeat(auto-fit,minmax(140px,1fr))]'} place-items-center gap-4 sm:gap-6 md:gap-8`}>
                  {eternalCandles.map((c) => (
                    <div key={c.id} className="flex flex-col items-center">
                      <BeautifulCandle 
                        name={c.name} 
                        colorKey={c.color || 'gold'} 
                        message={c.message}
                        isEternal={true}
                        fadeStage={1}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Active Renewable Candles */}
        {activeCandles.length > 0 && (
          <section className="mb-12 relative">
            <div className="flex items-center gap-3 mb-6 justify-center">
              <div className="h-px bg-gradient-to-r from-transparent via-amber-600/50 to-transparent flex-1"></div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-bold text-amber-200">Active Prayers</h2>
                <span className="text-xs md:text-sm text-amber-300/80 bg-slate-800/50 px-3 py-1 rounded-full border border-amber-600/20">
                  Renewable Lights
                </span>
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-amber-600/50 to-transparent flex-1"></div>
            </div>
            
            <div className="mx-auto max-w-5xl bg-slate-800/30 backdrop-blur-sm rounded-2xl md:rounded-3xl p-3 sm:p-4 md:p-6 border border-amber-600/10 shadow-xl">
              <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] place-items-center gap-3 sm:gap-5 md:gap-6">
                {activeCandles.map((c) => (
                  <div key={c.id} className="flex flex-col items-center">
                    <BeautifulCandle 
                      name={c.name} 
                      colorKey={c.color || 'white'} 
                      message={c.message}
                      isEternal={false}
                      fadeStage={c.fade_stage || 1}
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Memory Orbs */}
        {memoryOrbs.length > 0 && (
          <section className="mb-12 relative">
            <div className="flex items-center gap-3 mb-6 justify-center">
              <div className="h-px bg-gradient-to-r from-transparent via-purple-600/50 to-transparent flex-1"></div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-bold text-purple-300">Memory Garden</h2>
                <span className="text-xs md:text-sm text-purple-300/80 bg-purple-900/30 px-3 py-1 rounded-full border border-purple-600/20">
                  Transformed Lights
                </span>
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-purple-600/50 to-transparent flex-1"></div>
            </div>
            
            <div className="mx-auto max-w-6xl bg-gradient-to-br from-purple-900/10 to-blue-900/10 backdrop-blur-sm rounded-2xl md:rounded-3xl p-6 md:p-8 border border-purple-600/10 shadow-xl">
              <div className="grid grid-cols-[repeat(auto-fit,minmax(80px,1fr))] place-items-center gap-3 sm:gap-4 md:gap-6">
                {memoryOrbs.map((c) => (
                  <div key={c.id} className="flex flex-col items-center">
                    <BeautifulMemoryOrb 
                      name={c.name} 
                      colorKey={c.color || 'white'}
                      message={c.message}
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {loading && activeCandles.length === 0 && eternalCandles.length === 0 && memoryOrbs.length === 0 && (
          <div className="text-center text-amber-200/70 py-16">
            <div className="animate-pulse text-4xl mb-4">🕯️</div>
            Preparing sacred space...
          </div>
        )}
      </div>

      <button 
        onClick={() => setShowAdd(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:scale-110 transition-transform md:hidden z-30"
      >
        +
      </button>

      {showAdd && !showAddType && (
        <CandleTypeModal
          onClose={() => setShowAdd(false)}
          onSelectType={(type) => setShowAddType(type)}
        />
      )}

      {showAddType === 'eternal' && (
        <AddEternalCandleModal
          onClose={() => {
            setShowAddType(null);
            setShowAdd(false);
          }}
        />
      )}

      {showAddType === 'renewable' && (
        <AddRenewableCandleModal
          onClose={() => {
            setShowAddType(null);
            setShowAdd(false);
          }}
        />
      )}
    </div>
  );
}

// Beautiful SVG Candle Component with Golden Nameplate - UPDATED WITH REALISTIC DESIGN
function BeautifulCandle({
  name,
  colorKey,
  message,
  isEternal,
  fadeStage = 1,
}: {
  name: string;
  colorKey: string;
  message: string | null;
  isEternal: boolean;
  fadeStage: number;
}) {
  const colorPreset = COLOR_PRESETS.find(c => c.key === colorKey) || COLOR_PRESETS[0];
  const opacity = fadeStage === 1 ? 1 : fadeStage === 2 ? 0.85 : fadeStage === 3 ? 0.7 : 0.5;
  const flameSize = fadeStage === 1 ? 1 : fadeStage === 2 ? 0.9 : fadeStage === 3 ? 0.75 : 0.6;

  // Memorial flower arrangement around base - positioned to avoid name plaque
  const flowers = useMemo(() => {
    const cx = 150; // center x (adjusted for this component's viewBox)
    const nameY = 300; // name plaque area
    
    const arrangement = [];
    
    // Create a full arrangement that flows around the name plaque
    // Back layer - larger flowers positioned around the candle, avoiding center
    const backFlowers = [
      { type: 'lily', x: 95, y: 275, rotation: -15, color: '#ffffff', size: 1.4 },
      { type: 'lily', x: 205, y: 275, rotation: 15, color: '#ffffff', size: 1.4 },
      { type: 'rose', x: 85, y: 295, rotation: -25, color: '#ffffff', size: 1.2 },
      { type: 'rose', x: 215, y: 295, rotation: 25, color: '#ffffff', size: 1.2 },
      { type: 'lily', x: 150, y: 260, rotation: 0, color: '#ffffff', size: 1.3 },
    ];
    
    // Middle layer - flowers flowing around the sides, avoiding center
    const middleFlowers = [
      { type: 'carnation', x: 75, y: 285, rotation: -30, color: '#ffffff', size: 1.1 },
      { type: 'carnation', x: 225, y: 285, rotation: 30, color: '#ffffff', size: 1.1 },
      { type: 'rose', x: 90, y: 310, rotation: -10, color: '#f8f8f8', size: 1.0 },
      { type: 'rose', x: 210, y: 310, rotation: 10, color: '#f8f8f8', size: 1.0 },
      { type: 'carnation', x: 105, y: 325, rotation: -20, color: '#ffffff', size: 0.9 },
      { type: 'carnation', x: 195, y: 325, rotation: 20, color: '#ffffff', size: 0.9 },
    ];
    
    // Front layer - lower flowers that won't interfere with name
    const frontFlowers = [
      { type: 'rose', x: 115, y: 335, rotation: -5, color: '#ffffff', size: 0.8 },
      { type: 'rose', x: 185, y: 335, rotation: 5, color: '#ffffff', size: 0.8 },
      { type: 'carnation', x: 130, y: 340, rotation: -15, color: '#ffffff', size: 0.7 },
      { type: 'carnation', x: 170, y: 340, rotation: 15, color: '#ffffff', size: 0.7 },
      { type: 'carnation', x: 150, y: 330, rotation: 0, color: '#ffffff', size: 0.6 }, // small one below name
    ];
    
    // Add greenery - positioned to flow around name area
    const greenery = [
      // Large leaves on sides, avoiding center
      { type: 'leaf', x: 80, y: 280, rotation: -20, size: 1.0 },
      { type: 'leaf', x: 220, y: 280, rotation: 20, size: 1.0 },
      { type: 'leaf', x: 70, y: 300, rotation: -45, size: 0.8 },
      { type: 'leaf', x: 230, y: 300, rotation: 45, size: 0.8 },
      { type: 'leaf', x: 95, y: 330, rotation: -30, size: 0.7 },
      { type: 'leaf', x: 205, y: 330, rotation: 30, size: 0.7 },
      { type: 'leaf', x: 125, y: 345, rotation: -10, size: 0.6 },
      { type: 'leaf', x: 175, y: 345, rotation: 10, size: 0.6 },
      
      // Baby's breath clusters - avoiding center area around name
      { type: 'breath', x: 92, y: 268, size: 1.1 },
      { type: 'breath', x: 208, y: 268, size: 1.1 },
      { type: 'breath', x: 102, y: 305, size: 0.9 },
      { type: 'breath', x: 198, y: 305, size: 0.9 },
      { type: 'breath', x: 82, y: 320, size: 0.8 },
      { type: 'breath', x: 218, y: 320, size: 0.8 },
      { type: 'breath', x: 120, y: 338, size: 0.7 },
      { type: 'breath', x: 180, y: 338, size: 0.7 },
      { type: 'breath', x: 140, y: 345, size: 0.5 }, // small ones at bottom
      { type: 'breath', x: 160, y: 345, size: 0.5 },
    ];
    
    return [...backFlowers, ...middleFlowers, ...frontFlowers, ...greenery];
  }, [name]); // Using name as dependency for variety

  return (
    <div className="relative group flex flex-col items-center">
      <svg
        viewBox="0 0 300 380"
        className="w-24 sm:w-28 md:w-32 lg:w-40 h-auto"
        style={{ opacity }}
      >
        <defs>
          <linearGradient id={`wax-${colorKey}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={colorPreset.waxGradient[0]} />
            <stop offset="50%" stopColor={colorPreset.waxGradient[1]} />
            <stop offset="100%" stopColor={colorPreset.waxGradient[2]} />
          </linearGradient>
          
          <radialGradient id={`shade-${colorKey}`} cx="20%" cy="30%" r="80%">
            <stop offset="0%" stopColor="rgba(0,0,0,0)" />
            <stop offset="70%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.08)" />
          </radialGradient>

          <linearGradient id={`gold-${colorKey}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#E6C56E" />
            <stop offset="40%" stopColor="#F3E4B0" />
            <stop offset="60%" stopColor="#D4B464" />
            <stop offset="100%" stopColor="#F7E8B8" />
          </linearGradient>

          <linearGradient id={`base-${colorKey}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor={isEternal ? "#E6C56E" : "#C7B28A"} />
            <stop offset="50%" stopColor={isEternal ? "#F3E4B0" : "#E9D9B8"} />
            <stop offset="100%" stopColor={isEternal ? "#D4B464" : "#B9A075"} />
          </linearGradient>

          {/* Realistic wax gradients */}
          <linearGradient id={`wax-main-${colorKey}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#e8e4f0" />
            <stop offset="15%" stopColor="#f5f3f8" />
            <stop offset="35%" stopColor="#ffffff" />
            <stop offset="65%" stopColor="#fdfcfe" />
            <stop offset="85%" stopColor="#f0eef4" />
            <stop offset="100%" stopColor="#e2dde8" />
          </linearGradient>
          
          <radialGradient id={`wax-top-${colorKey}`} cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="#faf9fc" />
            <stop offset="100%" stopColor="#f0edf5" />
          </radialGradient>

          {/* Melted wax pool */}
          <radialGradient id={`wax-pool-${colorKey}`} cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#fff8f0" />
            <stop offset="50%" stopColor="#f5f0e8" />
            <stop offset="100%" stopColor="#ede5db" />
          </radialGradient>

          {/* Realistic flame */}
          <linearGradient id={`flame-outer-${colorKey}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="20%" stopColor="#fff8e1" />
            <stop offset="50%" stopColor="#ffd54f" />
            <stop offset="80%" stopColor="#ff8f00" />
            <stop offset="100%" stopColor="#e65100" />
          </linearGradient>

          <radialGradient id={`flame-inner-${colorKey}`} cx="50%" cy="60%" r="40%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="30%" stopColor="#fff9c4" />
            <stop offset="70%" stopColor="#ffeb3b" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          {/* Soft shadow */}
          <filter id={`shadow-${colorKey}`} x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000000" floodOpacity="0.15"/>
          </filter>

          {/* Flame glow */}
          <filter id={`flame-glow-${colorKey}`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          <radialGradient id="glowGrad" cx="50%" cy="30%" r="60%">
            <stop offset="0%" stopColor={isEternal ? "rgba(255, 220, 140, .95)" : "rgba(255, 210, 120, .85)"} />
            <stop offset="60%" stopColor={isEternal ? "rgba(255, 190, 90, .45)" : "rgba(255, 170, 70, .35)"} />
            <stop offset="100%" stopColor="rgba(255, 150, 40, 0)" />
          </radialGradient>
          
          <filter id="softBlur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        {/* Ground shadow */}
        <ellipse cx="150" cy="370" rx="70" ry="12" fill="#000000" opacity="0.08" />

        {/* Main candle body - realistic design */}
        <g filter={`url(#shadow-${colorKey})`}>
          {/* Candle cylinder */}
          <rect 
            x="90" 
            y="120" 
            width="120" 
            height="200" 
            rx="18" 
            fill={`url(#wax-main-${colorKey})`} 
          />
          
          {/* Top rim */}
          <ellipse 
            cx="150" 
            cy="120" 
            rx="60" 
            ry="18" 
            fill={`url(#wax-top-${colorKey})`} 
          />

          {/* Melted wax pool */}
          <ellipse 
            cx="150" 
            cy="125" 
            rx="40" 
            ry="8" 
            fill={`url(#wax-pool-${colorKey})`} 
          />

          {/* Subtle wax drips */}
          <path 
            d="M 120 125 Q 118 150 120 180 Q 119 200 121 220" 
            stroke="#f0edf5" 
            strokeWidth="1.5" 
            fill="none" 
            opacity="0.6"
          />
          <path 
            d="M 180 128 Q 182 150 180 175 Q 181 195 179 215" 
            stroke="#f0edf5" 
            strokeWidth="1" 
            fill="none" 
            opacity="0.4"
          />

          {/* Highlight on left side */}
          <rect 
            x="95" 
            y="125" 
            width="8" 
            height="190" 
            rx="4" 
            fill="#ffffff" 
            opacity="0.3" 
          />
        </g>

        {/* Wick */}
        <rect 
          x="147" 
          y="115" 
          width="6" 
          height="15" 
          rx="3" 
          fill="#2c2c2c" 
        />

        {/* Realistic flame */}
        <g 
          className="flame" 
          transform={`scale(${flameSize})`} 
          style={{ 
            transformOrigin: '150px 115px'
          }}
          filter={`url(#flame-glow-${colorKey})`}
        >
          {/* Outer flame */}
          <path 
            d="M 150 115 
               C 142 105, 140 95, 145 85
               C 148 80, 152 80, 155 85
               C 160 95, 158 105, 150 115 Z" 
            fill={`url(#flame-outer-${colorKey})`}
            className="flame-outer"
          />
          
          {/* Inner flame */}
          <path 
            d="M 150 112
               C 145 103, 144 96, 148 90
               C 150 88, 152 88, 152 90
               C 156 96, 155 103, 150 112 Z" 
            fill={`url(#flame-inner-${colorKey})`}
            className="flame-inner"
          />

          {/* Bright core */}
          <ellipse 
            cx="150" 
            cy="105" 
            rx="2" 
            ry="3" 
            fill="#ffffff" 
            opacity="0.8"
            className="flame-core"
          />
        </g>

        {/* Memorial flower arrangement */}
        <g className="flowers" opacity="0.94">
          {flowers.map((flower, index) => (
            <g 
              key={index} 
              transform={`translate(${flower.x}, ${flower.y}) rotate(${flower.rotation || 0}) scale(${flower.size || 1})`}
            >
              {flower.type === 'lily' && (
                <>
                  {/* Large white lily - traditional memorial flower */}
                  {[0, 60, 120, 180, 240, 300].map(angle => (
                    <ellipse 
                      key={angle}
                      cx="0" 
                      cy="-4" 
                      rx="2.5" 
                      ry="6" 
                      fill={flower.color}
                      transform={`rotate(${angle})`}
                      opacity="0.9"
                    />
                  ))}
                  {/* Center with golden stamens */}
                  <circle cx="0" cy="0" r="2" fill="#fff8f0" />
                  <circle cx="0" cy="-0.5" r="1" fill="#ffd700" opacity="0.7" />
                  
                  {/* Visible stem */}
                  <line x1="0" y1="4" x2="0" y2="12" stroke="#4a5d4a" strokeWidth="1.2" />
                </>
              )}
              
              {flower.type === 'rose' && (
                <>
                  {/* Full white rose */}
                  <circle cx="0" cy="0" r="5" fill={flower.color} opacity="0.9" />
                  <circle cx="-1.5" cy="-1.5" r="3.8" fill={flower.color} opacity="0.85" />
                  <circle cx="1.5" cy="1.5" r="3" fill="#f8f8f8" opacity="0.8" />
                  <circle cx="0" cy="0" r="2" fill="#ffffff" />
                  
                  {/* Multiple petal layers */}
                  {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
                    <ellipse 
                      key={angle}
                      cx="0" 
                      cy="-3.5" 
                      rx="2.2" 
                      ry="3.8" 
                      fill={flower.color}
                      opacity="0.7"
                      transform={`rotate(${angle})`}
                    />
                  ))}
                  
                  {/* Stem */}
                  <line x1="0" y1="5" x2="0" y2="13" stroke="#4a5d4a" strokeWidth="1.5" />
                  
                  {/* Rose leaves */}
                  <ellipse cx="-3" cy="8" rx="2.5" ry="1.5" fill="#5a6b5a" opacity="0.8" />
                  <ellipse cx="3" cy="9" rx="2.2" ry="1.3" fill="#5a6b5a" opacity="0.8" />
                </>
              )}
              
              {flower.type === 'carnation' && (
                <>
                  {/* Ruffled carnation */}
                  {[0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 340].map(angle => (
                    <path 
                      key={angle}
                      d="M 0 0 Q -1.8 -3.5 0 -5 Q 1.8 -3.5 0 0"
                      fill={flower.color}
                      opacity="0.85"
                      transform={`rotate(${angle})`}
                    />
                  ))}
                  
                  {/* Center */}
                  <circle cx="0" cy="0" r="1.5" fill="#f8f8f8" />
                  
                  {/* Stem */}
                  <line x1="0" y1="3" x2="0" y2="10" stroke="#4a5d4a" strokeWidth="1" />
                </>
              )}
              
              {flower.type === 'leaf' && (
                <>
                  {/* Large decorative leaves */}
                  <ellipse cx="0" cy="0" rx="3.5" ry="1.8" fill="#5a6b5a" opacity="0.85" />
                  <ellipse cx="0" cy="0" rx="3" ry="1.3" fill="#6b7c6b" opacity="0.7" />
                  {/* Leaf vein */}
                  <line x1="-3" y1="0" x2="3" y2="0" stroke="#4a5d4a" strokeWidth="0.5" opacity="0.6" />
                </>
              )}
              
              {flower.type === 'breath' && (
                <>
                  {/* Abundant baby's breath clusters */}
                  <g transform={`scale(${flower.size})`}>
                    <circle cx="0" cy="0" r="1.2" fill="#ffffff" opacity="0.9" />
                    <circle cx="3" cy="1.5" r="1" fill="#ffffff" opacity="0.85" />
                    <circle cx="-2.5" cy="2" r="1.1" fill="#ffffff" opacity="0.8" />
                    <circle cx="2" cy="-2.5" r="0.9" fill="#ffffff" opacity="0.75" />
                    <circle cx="-3" cy="-1.5" r="1" fill="#ffffff" opacity="0.8" />
                    <circle cx="1.5" cy="3" r="0.8" fill="#ffffff" opacity="0.7" />
                    <circle cx="-1" cy="-3" r="0.9" fill="#ffffff" opacity="0.75" />
                  </g>
                </>
              )}
            </g>
          ))}
        </g>

        {/* Golden Base with Nameplate */}
        <g transform="translate(0, 300)">
          <ellipse cx="150" cy="28" rx="76" ry="14" fill={`url(#base-${colorKey})`} />
          <rect x="78" y="8" width="144" height="32" rx="10" fill={`url(#base-${colorKey})`} />
          <ellipse cx="150" cy="8" rx="66" ry="10" fill={isEternal ? "#F3E4B0" : "#e8d9b8"} />

          {/* Golden Nameplate */}
          <rect x="85" y="12" width="130" height="26" rx="8" fill={`url(#gold-${colorKey})`} stroke="#9f8852" strokeWidth="1" />
          <text x="150" y="28" textAnchor="middle" fontFamily="Georgia, serif" fontSize="12" fill="#4a3b1d" fontWeight="600">
            {name.length > 18 ? name.slice(0, 17) + '...' : name}
          </text>
        </g>

        {/* Eternal star */}
        {isEternal && (
          <text x="150" y="50" textAnchor="middle" fontSize="20" fill="#F3E4B0">✨</text>
        )}
      </svg>
      
      {/* Message displayed below candle */}
      {message && (
        <div className="text-center mt-1 sm:mt-2 px-1 sm:px-2 max-w-[120px] sm:max-w-[140px] md:max-w-[150px]">
          <p className="text-xs sm:text-xs text-amber-200/70 italic line-clamp-2">
            "{message}"
          </p>
        </div>
      )}

      {/* Tooltip for full message on hover */}
      {message && message.length > 50 && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-40 sm:w-48 p-2 sm:p-3 bg-slate-800 border border-amber-600/30 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
          <div className="text-xs text-amber-200 font-semibold mb-1">{name}</div>
          <div className="text-xs text-amber-200/70">{message}</div>
        </div>
      )}
    </div>
  );
}

// Beautiful Memory Orb Component
function BeautifulMemoryOrb({
  name,
  colorKey,
  message,
}: {
  name: string;
  colorKey: string;
  message: string | null;
}) {
  const colorPreset = COLOR_PRESETS.find(c => c.key === colorKey) || COLOR_PRESETS[0];

  return (
    <div className="relative group">
      <svg viewBox="0 0 120 120" className="w-16 sm:w-20 md:w-24 h-auto">
        <defs>
          <radialGradient id={`orb-${colorKey}`} cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor={colorPreset.waxGradient[0]} stopOpacity="0.9" />
            <stop offset="50%" stopColor={colorPreset.waxGradient[1]} stopOpacity="0.7" />
            <stop offset="100%" stopColor={colorPreset.waxGradient[2]} stopOpacity="0.5" />
          </radialGradient>
          
          <filter id="orbGlow">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* Glow */}
        <circle cx="60" cy="60" r="35" fill={colorPreset.wax} opacity="0.3" filter="url(#orbGlow)" />
        
        {/* Orb */}
        <circle cx="60" cy="60" r="28" fill={`url(#orb-${colorKey})`} />
        
        {/* Inner light */}
        <circle cx="52" cy="52" r="12" fill="white" opacity="0.4" />
      </svg>

      <div className="text-center mt-1">
        <div className="text-xs text-purple-300 font-medium truncate max-w-16 sm:max-w-20">
          {name.slice(0, 12)}
        </div>
      </div>

      {/* Tooltip */}
      {message && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-28 sm:w-32 p-2 bg-slate-800 border border-purple-600/30 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
          <div className="text-xs text-purple-300 font-semibold">{name}</div>
          <div className="text-xs text-purple-300/70 mt-1">{message}</div>
        </div>
      )}
    </div>
  );
}

// Modal Components
function CandleTypeModal({
  onClose,
  onSelectType,
}: {
  onClose: () => void;
  onSelectType: (type: 'eternal' | 'renewable') => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center">
      <div className="bg-slate-800 border border-amber-600/30 rounded-t-3xl md:rounded-2xl p-6 md:p-8 w-full md:max-w-2xl md:mx-4 shadow-2xl animate-slideUp md:animate-fadeIn">
        <div className="w-12 h-1 bg-amber-600/30 rounded-full mx-auto mb-6 md:hidden" />
        
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl md:text-2xl font-bold text-amber-200">Choose Your Candle</h3>
          <button onClick={onClose} className="p-2 -mr-2 text-amber-200 hover:text-amber-400 text-2xl">×</button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <button
            onClick={() => onSelectType('eternal')}
            className="text-left p-5 md:p-6 bg-gradient-to-br from-amber-900/30 to-orange-900/30 rounded-xl border-2 border-amber-600/30 hover:border-amber-600/50 transition-all hover:shadow-lg"
          >
            <div className="text-3xl mb-3">✨</div>
            <h4 className="text-lg font-bold text-amber-200 mb-2">Eternal Memorial</h4>
            <p className="text-sm text-amber-200/70 mb-3">
              Burns forever in loving memory
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-300">Never expires</span>
              <span className="font-bold text-amber-200 text-lg">$5.00</span>
            </div>
          </button>

          <button
            onClick={() => onSelectType('renewable')}
            className="text-left p-5 md:p-6 bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-xl border-2 border-blue-600/30 hover:border-blue-600/50 transition-all hover:shadow-lg"
          >
            <div className="text-3xl mb-3">🕯️</div>
            <h4 className="text-lg font-bold text-blue-200 mb-2">Renewable Light</h4>
            <p className="text-sm text-blue-200/70 mb-3">
              For prayers & healing intentions
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-blue-300">Becomes memory</span>
              <span className="font-bold text-blue-200 text-lg">$0.99</span>
            </div>
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

function AddEternalCandleModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [color, setColor] = useState<(typeof COLOR_PRESETS)[number]["key"]>("gold");
  const [saving, setSaving] = useState(false);

  function sanitize(s: string, max: number) {
    return s.replace(/\s+/g, " ").trim().slice(0, max);
  }

  async function proceedToPayment() {
    const nm = sanitize(name, 60);
    const msg = sanitize(message, 240);
    if (!nm) {
      alert("Please enter a name or dedication.");
      return;
    }

    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("candle_offerings")
      .insert([{ 
        name: nm, 
        color, 
        message: msg || null, 
        expires_at: null,
        candle_type: 'eternal',
        payment_status: 'pending',
        amount_paid: 500,
        user_id: user?.id
      }])
      .select("*")
      .single();

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    const returnUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/meditation/candles?success=true&candle_id=${data.id}`;
    const stripeUrl = `https://buy.stripe.com/cNi5kCgLfeQA2CseDI6wE06?prefilled_email=${encodeURIComponent('')}&client_reference_id=${data.id}&success_url=${encodeURIComponent(returnUrl)}&cancel_url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`;
    
    if (typeof window !== 'undefined') {
      window.location.href = stripeUrl;
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center">
      <div className="bg-slate-800 border border-amber-600/30 rounded-t-3xl md:rounded-2xl p-6 w-full md:max-w-lg md:mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="w-12 h-1 bg-amber-600/30 rounded-full mx-auto mb-4 md:hidden" />
        
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <div>
            <h3 className="text-lg md:text-xl font-bold text-amber-200">Light an Eternal Flame</h3>
            <p className="text-xs md:text-sm text-amber-200/70 mt-1">This memorial will burn forever</p>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 text-amber-200 hover:text-amber-400 text-xl md:text-2xl">×</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-amber-200 mb-2">In loving memory of</label>
            <input
              className="w-full px-3 md:px-4 py-3 text-base md:text-sm bg-slate-700/50 border border-amber-600/30 text-amber-100 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Grandma Rose"
              maxLength={60}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-amber-200 mb-2">Personal message (optional)</label>
            <textarea
              className="w-full px-3 md:px-4 py-3 text-base md:text-sm bg-slate-700/50 border border-amber-600/30 text-amber-100 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Forever in our hearts..."
              maxLength={240}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-amber-200 mb-2">Candle color</label>
            <div className="grid grid-cols-6 gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  title={c.label}
                  className={`h-12 md:h-10 rounded-lg border-2 transition-all ${
                    color === c.key ? "border-amber-500 ring-2 ring-amber-400/50" : "border-amber-600/30 hover:border-amber-600/50"
                  }`}
                  style={{ background: c.wax }}
                  onClick={() => setColor(c.key)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button 
            onClick={onClose} 
            disabled={saving}
            className="flex-1 px-4 py-3 bg-slate-700/50 text-amber-200 rounded-lg hover:bg-slate-700/70 transition-colors font-medium border border-amber-600/30"
          >
            Cancel
          </button>
          <button 
            onClick={proceedToPayment} 
            disabled={saving || !name}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg hover:from-amber-700 hover:to-orange-700 transition-all font-medium shadow-lg disabled:opacity-50"
          >
            {saving ? "Processing..." : "Pay $5.00"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddRenewableCandleModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [color, setColor] = useState<(typeof COLOR_PRESETS)[number]["key"]>("white");
  const [saving, setSaving] = useState(false);

  function sanitize(s: string, max: number) {
    return s.replace(/\s+/g, " ").trim().slice(0, max);
  }

  async function proceedToPayment() {
    const nm = sanitize(name, 60);
    const msg = sanitize(message, 240);
    if (!nm) {
      alert("Please enter a name or intention.");
      return;
    }

    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("candle_offerings")
      .insert([{ 
        name: nm, 
        color, 
        message: msg || null, 
        candle_type: 'renewable',
        payment_status: 'pending',
        amount_paid: 99,
        fade_stage: 1,
        user_id: user?.id
      }])
      .select("*")
      .single();

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    const returnUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/meditation/candles?success=true&candle_id=${data.id}`;
    const stripeUrl = `https://buy.stripe.com/14AdR8amRbEocd267c6wE05?prefilled_email=${encodeURIComponent('')}&client_reference_id=${data.id}&success_url=${encodeURIComponent(returnUrl)}&cancel_url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`;
    
    if (typeof window !== 'undefined') {
      window.location.href = stripeUrl;
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center">
      <div className="bg-slate-800 border border-blue-600/30 rounded-t-3xl md:rounded-2xl p-6 w-full md:max-w-lg md:mx-4 shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="w-12 h-1 bg-blue-600/30 rounded-full mx-auto mb-4 md:hidden" />
        
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <div>
            <h3 className="text-lg md:text-xl font-bold text-blue-200">Light a Renewable Candle</h3>
            <p className="text-xs md:text-sm text-blue-200/70 mt-1">For prayers, healing, and intentions</p>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 text-blue-200 hover:text-blue-400 text-xl md:text-2xl">×</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">Light this candle for</label>
            <input
              className="w-full px-3 md:px-4 py-3 text-base md:text-sm bg-slate-700/50 border border-blue-600/30 text-blue-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Healing for Mom"
              maxLength={60}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">Your prayer or intention (optional)</label>
            <textarea
              className="w-full px-3 md:px-4 py-3 text-base md:text-sm bg-slate-700/50 border border-blue-600/30 text-blue-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Sending healing light..."
              maxLength={240}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">Candle color</label>
            <div className="grid grid-cols-6 gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  title={c.label}
                  className={`h-12 md:h-10 rounded-lg border-2 transition-all ${
                    color === c.key ? "border-blue-500 ring-2 ring-blue-400/50" : "border-blue-600/30 hover:border-blue-600/50"
                  }`}
                  style={{ background: c.wax }}
                  onClick={() => setColor(c.key)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button 
            onClick={onClose} 
            disabled={saving}
            className="flex-1 px-4 py-3 bg-slate-700/50 text-blue-200 rounded-lg hover:bg-slate-700/70 transition-colors font-medium border border-blue-600/30"
          >
            Cancel
          </button>
          <button 
            onClick={proceedToPayment} 
            disabled={saving || !name}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium shadow-lg disabled:opacity-50"
          >
            {saving ? "Processing..." : "Pay $0.99"}
          </button>
        </div>
      </div>
    </div>
  );
}
