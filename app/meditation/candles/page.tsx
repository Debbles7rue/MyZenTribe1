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
  { key: "white",   label: "White (Peace)",       wax: "#f7f4ef" },
  { key: "gold",    label: "Gold (Blessings)",    wax: "#f8e3b1" },
  { key: "rose",    label: "Rose (Love)",         wax: "#f7c4c9" },
  { key: "azure",   label: "Azure (Healing)",     wax: "#c5e3ff" },
  { key: "violet",  label: "Violet (Protection)", wax: "#d8c7ff" },
  { key: "emerald", label: "Emerald (Renewal)",   wax: "#cdebd3" },
] as const;

const PAGE_SIZE = 24;

export default function CandleRoomPage() {
  const [mounted, setMounted] = useState(false);
  
  // Only run on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Show loading state during SSR and initial mount
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-5xl mb-4">🕯️</div>
          <p className="text-amber-700">Loading sacred space...</p>
        </div>
      </div>
    );
  }

  // Once mounted, render the actual component
  return <CandleRoomContent />;
}

function CandleRoomContent() {
  const [loading, setLoading] = useState(true);
  const [activeCandles, setActiveCandles] = useState<Candle[]>([]);
  const [memoryOrbs, setMemoryOrbs] = useState<Candle[]>([]);
  const [eternalCandles, setEternalCandles] = useState<Candle[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showAddType, setShowAddType] = useState<'eternal' | 'renewable' | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pageRef = useRef(0);
  const searchParams = useSearchParams();

  // Calculate fade stage based on age
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

  // FIXED: Simplified payment verification
  useEffect(() => {
    const success = searchParams.get('success');
    const candleId = searchParams.get('candle_id');
    
    if (success === 'true' && candleId) {
      // If we got redirected with success=true, the payment worked
      // So just mark it as paid right away
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
          // Even if update fails, try to load candles in case it's already paid
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
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    const elem = document.createElement('div');
    elem.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40';
    elem.innerHTML = `
      <div class="bg-white rounded-2xl p-8 shadow-2xl max-w-sm w-full animate-fadeIn">
        <div class="text-center">
          <div class="text-6xl mb-4">${isEternal ? '✨' : '🕯️'}</div>
          <h3 class="text-2xl font-bold text-amber-900 mb-2">${isEternal ? 'Eternal Flame Lit' : 'Candle Lit'}</h3>
          <p class="text-amber-700">${isEternal ? 'Your memorial will burn forever' : 'Your light brings comfort'}</p>
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      {/* Mobile-Optimized Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-amber-200">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/meditation" className="p-2 -ml-2 text-amber-800 hover:bg-amber-100 rounded-lg md:hidden">
                ←
              </Link>
              <h1 className="text-lg md:text-2xl font-bold text-amber-900">Candle Room</h1>
            </div>
            
            {/* Desktop buttons */}
            <div className="hidden md:flex gap-3">
              <Link href="/meditation" className="px-4 py-2 bg-white/60 text-amber-800 rounded-lg hover:bg-white/80 transition-colors border border-amber-200">
                ← Back
              </Link>
              <button 
                onClick={() => setShowAdd(true)}
                className="px-6 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg hover:from-amber-700 hover:to-orange-700 transition-all font-medium shadow-lg"
              >
                + Light Candle
              </button>
            </div>

            {/* Mobile menu button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-amber-800 hover:bg-amber-100 rounded-lg md:hidden"
            >
              ⋮
            </button>
          </div>

          {/* Mobile dropdown menu */}
          {mobileMenuOpen && (
            <div className="absolute right-4 top-14 bg-white rounded-lg shadow-xl border border-amber-200 p-2 min-w-[150px] md:hidden">
              <Link 
                href="/meditation" 
                className="block px-4 py-2 text-amber-800 hover:bg-amber-50 rounded"
                onClick={() => setMobileMenuOpen(false)}
              >
                ← Back to Meditation
              </Link>
              <button 
                onClick={() => {
                  setShowAdd(true);
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left px-4 py-2 text-amber-800 hover:bg-amber-50 rounded"
              >
                + Light a Candle
              </button>
            </div>
          )}
        </div>

        {/* Mobile description */}
        <div className="px-4 pb-3 md:hidden">
          <p className="text-sm text-amber-700">
            Light eternal flames or temporary candles for loved ones
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Desktop description (hidden on mobile) */}
        <div className="hidden md:block mb-6">
          <p className="text-amber-700 max-w-2xl">
            Light a candle in memory, for healing, or for hope. Eternal flames burn forever, 
            while temporary candles transform into gentle memory orbs.
          </p>
        </div>

        {/* Payment Processing Overlay */}
        {checkingPayment && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-sm w-full">
              <div className="text-center">
                <div className="animate-pulse text-5xl mb-4">🕯️</div>
                <h3 className="text-xl font-bold text-amber-900 mb-2">Lighting Your Candle...</h3>
                <p className="text-amber-700">Please wait while we confirm</p>
              </div>
            </div>
          </div>
        )}

        {/* Eternal Memorial Garden */}
        {eternalCandles.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-lg md:text-2xl font-bold text-amber-900">Eternal Garden</h2>
              <span className="text-xs md:text-sm text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
                ✨ Forever
              </span>
            </div>
            
            <div className="bg-gradient-to-br from-amber-100/40 to-orange-100/40 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 md:p-8 border border-amber-300 shadow-xl">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 md:gap-8">
                {eternalCandles.map((c) => (
                  <div key={c.id} className="text-center">
                    <EternalCandleVisual name={c.name} colorKey={c.color} message={c.message} />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Active Renewable Candles */}
        {activeCandles.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-lg md:text-xl font-bold text-amber-900">Active Prayers</h2>
              <span className="text-xs md:text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                Renewable
              </span>
            </div>
            
            <div className="bg-white/60 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 md:p-8 border border-amber-200 shadow-lg">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 md:gap-8">
                {activeCandles.map((c) => (
                  <div key={c.id} className="text-center">
                    <RenewableCandleVisual 
                      name={c.name} 
                      colorKey={c.color} 
                      message={c.message} 
                      fadeStage={c.fade_stage || 1}
                      createdAt={c.created_at}
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Memory Orbs */}
        {memoryOrbs.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-lg md:text-xl font-bold text-purple-800">Memory Garden</h2>
              <span className="text-xs md:text-sm text-purple-600 bg-purple-50/50 px-2 py-1 rounded-full">
                Collection
              </span>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50/30 to-blue-50/30 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 md:p-8 border border-purple-200/30 shadow-lg">
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 md:gap-6">
                {memoryOrbs.map((c) => (
                  <div key={c.id} className="text-center">
                    <MemoryOrb candle={c} />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {loading && activeCandles.length === 0 && eternalCandles.length === 0 && memoryOrbs.length === 0 && (
          <div className="text-center text-amber-700 py-16">
            <div className="animate-pulse text-4xl mb-4">🕯️</div>
            Loading candles...
          </div>
        )}
      </div>

      {/* Mobile-Optimized FAB */}
      <button 
        onClick={() => setShowAdd(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:scale-110 transition-transform md:hidden z-30"
      >
        +
      </button>

      {/* Type Selection Modal */}
      {showAdd && !showAddType && (
        <CandleTypeModal
          onClose={() => setShowAdd(false)}
          onSelectType={(type) => setShowAddType(type)}
        />
      )}

      {/* Add Eternal Candle Modal */}
      {showAddType === 'eternal' && (
        <AddEternalCandleModal
          onClose={() => {
            setShowAddType(null);
            setShowAdd(false);
          }}
        />
      )}

      {/* Add Renewable Candle Modal */}
      {showAddType === 'renewable' && (
        <AddRenewableCandleModal
          onClose={() => {
            setShowAddType(null);
            setShowAdd(false);
          }}
        />
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

function CandleTypeModal({
  onClose,
  onSelectType,
}: {
  onClose: () => void;
  onSelectType: (type: 'eternal' | 'renewable') => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center">
      {/* Mobile: Bottom sheet, Desktop: Centered */}
      <div className="bg-white rounded-t-3xl md:rounded-2xl p-6 md:p-8 w-full md:max-w-2xl md:mx-4 shadow-2xl animate-slideUp md:animate-fadeIn">
        {/* Drag handle for mobile */}
        <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6 md:hidden" />
        
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl md:text-2xl font-bold text-amber-900">Choose Your Candle</h3>
          <button onClick={onClose} className="p-2 -mr-2 text-amber-600 hover:text-amber-800 text-2xl">×</button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Eternal Option */}
          <button
            onClick={() => onSelectType('eternal')}
            className="text-left p-5 md:p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border-2 border-amber-200 hover:border-amber-400 transition-all hover:shadow-lg active:scale-98"
          >
            <div className="text-3xl mb-3">✨</div>
            <h4 className="text-lg font-bold text-amber-900 mb-2">Eternal Memorial</h4>
            <p className="text-sm text-amber-700 mb-3">
              Burns forever in loving memory
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-600">Never expires</span>
              <span className="font-bold text-amber-900 text-lg">$5.00</span>
            </div>
          </button>

          {/* Renewable Option */}
          <button
            onClick={() => onSelectType('renewable')}
            className="text-left p-5 md:p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200 hover:border-blue-400 transition-all hover:shadow-lg active:scale-98"
          >
            <div className="text-3xl mb-3">🕯️</div>
            <h4 className="text-lg font-bold text-blue-900 mb-2">Renewable Light</h4>
            <p className="text-sm text-blue-700 mb-3">
              For prayers & healing intentions
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-blue-600">Becomes memory</span>
              <span className="font-bold text-blue-900 text-lg">$0.99</span>
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
        .active\\:scale-98:active {
          transform: scale(0.98);
        }
      `}</style>
    </div>
  );
}

function EternalCandleVisual({
  name,
  colorKey,
  message,
}: {
  name: string;
  colorKey: string;
  message: string | null;
}) {
  const wax = useMemo(() => {
    const found = COLOR_PRESETS.find((c) => c.key === colorKey);
    return found?.wax ?? "#f7f4ef";
  }, [colorKey]);

  return (
    <div className="relative group">
      <div className="absolute inset-0 -inset-x-2 md:-inset-x-4 -top-6 md:-top-8 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-amber-300 to-yellow-200 blur-xl md:blur-2xl animate-pulse" />
      </div>
      
      <div className="absolute -top-6 md:-top-8 left-1/2 transform -translate-x-1/2 text-lg md:text-2xl animate-pulse">
        ✨
      </div>
      
      <div 
        className="w-12 h-24 md:w-16 md:h-32 mx-auto rounded-t-full relative shadow-xl border-2 border-amber-300/30"
        style={{ background: wax }}
      >
        <div className="absolute top-2 md:top-3 left-1/2 transform -translate-x-1/2 w-1 h-1.5 md:h-2 bg-amber-900 rounded-full" />
        
        <div className="absolute -top-4 md:-top-6 left-1/2 transform -translate-x-1/2 w-4 h-6 md:w-6 md:h-8 rounded-full opacity-95"
             style={{
               background: 'radial-gradient(ellipse at center, #fff4e0 0%, #ffd27a 20%, #ff9900 60%, transparent 70%)',
               filter: 'blur(0.4px)',
               animation: 'eternalFlicker 3s infinite ease-in-out',
               boxShadow: '0 0 20px 10px rgba(255, 200, 60, 0.5), 0 0 40px 20px rgba(255, 170, 60, 0.3)'
             }} />
      </div>
      
      <div className="mt-2 md:mt-3 max-w-20 md:max-w-32 relative">
        <div className="font-medium text-xs md:text-sm text-amber-900 mb-0.5 md:mb-1 truncate">{name}</div>
        {message && (
          <div className="text-xs text-amber-700 opacity-75 line-clamp-1 md:line-clamp-2">{message}</div>
        )}
        <div className="text-xs text-amber-600 font-semibold mt-0.5 md:mt-1">Eternal</div>
      </div>

      {/* Touch-friendly tooltip */}
      {message && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-40 md:w-48 p-3 bg-white rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
          <div className="text-xs text-amber-800">{message}</div>
        </div>
      )}

      <style jsx>{`
        @keyframes eternalFlicker {
          0%, 100% { 
            transform: translateX(-50%) scale(1) translateY(0); 
            opacity: 0.95; 
          }
          33% { 
            transform: translateX(-52%) scale(1.1) translateY(-2px); 
            opacity: 1; 
          }
          66% { 
            transform: translateX(-48%) scale(1.05) translateY(1px); 
            opacity: 0.9; 
          }
        }
      `}</style>
    </div>
  );
}

function RenewableCandleVisual({
  name,
  colorKey,
  message,
  fadeStage,
  createdAt,
}: {
  name: string;
  colorKey: string;
  message: string | null;
  fadeStage: number;
  createdAt: string;
}) {
  const wax = useMemo(() => {
    const found = COLOR_PRESETS.find((c) => c.key === colorKey);
    return found?.wax ?? "#f7f4ef";
  }, [colorKey]);

  const opacity = fadeStage === 1 ? 1 : fadeStage === 2 ? 0.8 : 0.6;
  const flameSize = fadeStage === 1 ? 'w-3 h-5 md:w-4 md:h-6' : fadeStage === 2 ? 'w-2.5 h-4 md:w-3 md:h-5' : 'w-2 h-3 md:w-2 md:h-4';

  const createdDate = new Date(createdAt);
  const now = new Date();
  const daysOld = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, 90 - daysOld);

  return (
    <div className="relative group">
      <div 
        className="w-12 h-24 md:w-16 md:h-32 mx-auto rounded-t-full relative shadow-lg transition-opacity duration-1000"
        style={{ 
          background: wax,
          opacity: opacity
        }}
      >
        <div className="absolute top-2 md:top-3 left-1/2 transform -translate-x-1/2 w-1 h-1.5 md:h-2 bg-amber-900 rounded-full" />
        
        <div className={`absolute -top-3 md:-top-4 left-1/2 transform -translate-x-1/2 ${flameSize} rounded-full transition-all duration-1000`}
             style={{
               background: 'radial-gradient(ellipse at center, #ffd27a 0%, #ff9900 60%, transparent 70%)',
               filter: `blur(${fadeStage === 3 ? '1px' : '0.6px'})`,
               animation: `flicker ${2.6 + fadeStage}s infinite ease-in-out`,
               opacity: opacity
             }} />
      </div>
      
      <div className="mt-2 md:mt-3 max-w-20 md:max-w-32">
        <div className="font-medium text-xs md:text-sm text-amber-900 mb-0.5 md:mb-1 truncate">{name}</div>
        {message && (
          <div className="text-xs text-amber-700 opacity-75 line-clamp-1">{message}</div>
        )}
        <div className="text-xs text-amber-600 mt-0.5 md:mt-1">
          {fadeStage < 3 ? `${daysRemaining}d` : 'Fading'}
        </div>
      </div>

      <style jsx>{`
        @keyframes flicker {
          0%, 100% { transform: translateX(-50%) scale(1) translateY(0); }
          30% { transform: translateX(-52%) scale(1.06) translateY(-1px); }
          60% { transform: translateX(-49%) scale(0.96) translateY(1px); }
        }
      `}</style>
    </div>
  );
}

function MemoryOrb({
  candle,
}: {
  candle: Candle;
}) {
  const wax = useMemo(() => {
    const found = COLOR_PRESETS.find((c) => c.key === candle.color);
    return found?.wax ?? "#f7f4ef";
  }, [candle.color]);

  const createdDate = new Date(candle.created_at);
  const monthsAgo = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24 * 30));

  return (
    <div className="relative group">
      <div className="absolute inset-0 -inset-1 md:-inset-2 opacity-20">
        <div 
          className="absolute inset-0 rounded-full blur-lg md:blur-xl animate-pulse"
          style={{ 
            background: wax,
            animationDelay: `${Math.random() * 3}s`
          }}
        />
      </div>
      
      <div 
        className="w-10 h-10 md:w-12 md:h-12 mx-auto rounded-full relative shadow-md border border-white/30 transition-all hover:scale-110"
        style={{ 
          background: `radial-gradient(circle at 30% 30%, ${wax}, transparent)`,
          backgroundColor: wax,
          opacity: 0.6
        }}
      >
        <div 
          className="absolute inset-1.5 md:inset-2 rounded-full animate-pulse"
          style={{
            background: `radial-gradient(circle, rgba(255,255,255,0.4), transparent)`,
            animationDelay: `${Math.random() * 2}s`
          }}
        />
      </div>
      
      <div className="mt-1 md:mt-2 max-w-16 md:max-w-24">
        <div className="text-xs text-purple-800 opacity-80 truncate">{candle.name}</div>
        <div className="text-xs text-purple-600 opacity-60">
          {monthsAgo < 1 ? 'New' : `${monthsAgo}mo`}
        </div>
      </div>

      {/* Mobile-friendly tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-32 md:w-40 p-2 md:p-3 bg-white rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        <div className="text-xs text-purple-900 font-semibold mb-0.5 md:mb-1">{candle.name}</div>
        {candle.message && (
          <div className="text-xs text-purple-700 mb-1 md:mb-2">{candle.message}</div>
        )}
        <div className="text-xs text-purple-600">
          Memory from {monthsAgo < 1 ? 'recently' : `${monthsAgo}mo ago`}
        </div>
      </div>
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
  const [color, setColor] = useState<(typeof COLOR_PRESETS)[number]["key"]>("white");
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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

    const { data, error } = await supabase
      .from("candle_offerings")
      .insert([{ 
        name: nm, 
        color, 
        message: msg || null, 
        expires_at: null,
        candle_type: 'eternal',
        payment_status: 'pending',
        amount_paid: 500
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center">
      <div className="bg-white rounded-t-3xl md:rounded-2xl p-6 w-full md:max-w-lg md:mx-4 shadow-2xl max-h-[90vh] overflow-y-auto animate-slideUp md:animate-fadeIn">
        {/* Mobile drag handle */}
        <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4 md:hidden" />
        
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <div>
            <h3 className="text-lg md:text-xl font-bold text-amber-900">Light an Eternal Flame</h3>
            <p className="text-xs md:text-sm text-amber-700 mt-1">This memorial will burn forever</p>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 text-amber-600 hover:text-amber-800 text-xl md:text-2xl">×</button>
        </div>

        {!showPreview ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-amber-800 mb-2">
                In loving memory of
              </label>
              <input
                className="w-full px-3 md:px-4 py-3 text-base md:text-sm border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Grandma Rose"
                maxLength={60}
              />
              <div className="text-xs text-amber-600 mt-1">{name.length}/60</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-amber-800 mb-2">
                Personal message (optional)
              </label>
              <textarea
                className="w-full px-3 md:px-4 py-3 text-base md:text-sm border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Forever in our hearts..."
                maxLength={240}
              />
              <div className="text-xs text-amber-600 mt-1">{message.length}/240</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-amber-800 mb-2">
                Candle color
              </label>
              <div className="grid grid-cols-6 gap-2">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    title={c.label}
                    className={`h-12 md:h-10 rounded-lg border-2 transition-all ${
                      color === c.key ? "border-amber-500 ring-2 ring-amber-400/50" : "border-amber-200 hover:border-amber-300"
                    }`}
                    style={{ background: c.wax }}
                    onClick={() => setColor(c.key)}
                  />
                ))}
              </div>
              <div className="text-xs text-amber-600 mt-2">
                {COLOR_PRESETS.find(c => c.key === color)?.label}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">✨</span>
                <div>
                  <div className="font-semibold text-amber-900">Eternal Memorial</div>
                  <div className="text-sm text-amber-700">One-time payment of $5.00</div>
                  <div className="text-xs text-amber-600 mt-1">Burns forever in our sacred space</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center py-8">
              <div className="text-lg font-semibold text-amber-900 mb-4">Preview Your Eternal Flame</div>
              <div className="inline-block">
                <EternalCandleVisual name={name} colorKey={color} message={message} />
              </div>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="text-sm text-amber-800">
                <div className="font-semibold mb-2">Your eternal flame will:</div>
                <ul className="space-y-1 ml-4">
                  <li>• Burn forever</li>
                  <li>• Never fade or expire</li>
                  <li>• Be visible to all visitors</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          {!showPreview ? (
            <>
              <button 
                onClick={onClose} 
                disabled={saving}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-base md:text-sm font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={() => setShowPreview(true)} 
                disabled={saving || !name}
                className="flex-1 px-4 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-all font-medium disabled:opacity-50 text-base md:text-sm"
              >
                Preview
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => setShowPreview(false)} 
                disabled={saving}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-base md:text-sm font-medium"
              >
                ← Edit
              </button>
              <button 
                onClick={proceedToPayment} 
                disabled={saving}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg hover:from-amber-700 hover:to-orange-700 transition-all font-medium shadow-lg disabled:opacity-50 text-base md:text-sm"
              >
                {saving ? "Processing..." : "Pay $5.00"}
              </button>
            </>
          )}
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

function AddRenewableCandleModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [color, setColor] = useState<(typeof COLOR_PRESETS)[number]["key"]>("white");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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

    const { data, error } = await supabase
      .from("candle_offerings")
      .insert([{ 
        name: nm, 
        color, 
        message: msg || null, 
        candle_type: 'renewable',
        payment_status: 'pending',
        amount_paid: 99,
        fade_stage: 1
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center">
      <div className="bg-white rounded-t-3xl md:rounded-2xl p-6 w-full md:max-w-lg md:mx-4 shadow-2xl max-h-[85vh] overflow-y-auto animate-slideUp md:animate-fadeIn">
        {/* Mobile drag handle */}
        <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4 md:hidden" />
        
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <div>
            <h3 className="text-lg md:text-xl font-bold text-blue-900">Light a Renewable Candle</h3>
            <p className="text-xs md:text-sm text-blue-700 mt-1">For prayers, healing, and intentions</p>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 text-blue-600 hover:text-blue-800 text-xl md:text-2xl">×</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-blue-800 mb-2">
              Light this candle for
            </label>
            <input
              className="w-full px-3 md:px-4 py-3 text-base md:text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Healing for Mom"
              maxLength={60}
            />
            <div className="text-xs text-blue-600 mt-1">{name.length}/60</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-800 mb-2">
              Your prayer or intention (optional)
            </label>
            <textarea
              className="w-full px-3 md:px-4 py-3 text-base md:text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Sending healing light..."
              maxLength={240}
            />
            <div className="text-xs text-blue-600 mt-1">{message.length}/240</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-800 mb-2">
              Candle color
            </label>
            <div className="grid grid-cols-6 gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  title={c.label}
                  className={`h-12 md:h-10 rounded-lg border-2 transition-all ${
                    color === c.key ? "border-blue-500 ring-2 ring-blue-400/50" : "border-blue-200 hover:border-blue-300"
                  }`}
                  style={{ background: c.wax }}
                  onClick={() => setColor(c.key)}
                />
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🕯️</span>
              <div>
                <div className="font-semibold text-blue-900">Renewable Light</div>
                <div className="text-sm text-blue-700">$0.99 for 3 months</div>
                <div className="text-xs text-blue-600 mt-1">
                  Burns bright, then becomes a memory orb
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button 
            onClick={onClose} 
            disabled={saving}
            className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-base md:text-sm font-medium"
          >
            Cancel
          </button>
          <button 
            onClick={proceedToPayment} 
            disabled={saving || !name}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium shadow-lg disabled:opacity-50 text-base md:text-sm"
          >
            {saving ? "Processing..." : "Pay $0.99"}
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
