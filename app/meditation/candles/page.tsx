// app/candles/page.tsx
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
  fade_stage?: number; // 1=bright, 2=dimming, 3=fading, 4=memory orb
  last_renewed_at?: string;
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
  const [loading, setLoading] = useState(true);
  const [activeCandles, setActiveCandles] = useState<Candle[]>([]);
  const [memoryOrbs, setMemoryOrbs] = useState<Candle[]>([]);
  const [eternalCandles, setEternalCandles] = useState<Candle[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showAddType, setShowAddType] = useState<'eternal' | 'renewable' | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const pageRef = useRef(0);
  const searchParams = useSearchParams();

  // Calculate fade stage based on age
  function calculateFadeStage(candle: Candle): number {
    if (candle.candle_type === 'eternal') return 1; // Always bright
    
    const createdDate = new Date(candle.last_renewed_at || candle.created_at);
    const now = new Date();
    const daysOld = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysOld <= 30) return 1;      // Month 1: Bright flame
    if (daysOld <= 60) return 2;      // Month 2: Dimming
    if (daysOld <= 90) return 3;      // Month 3: Fading
    return 4;                          // After 3 months: Memory orb
  }

  // Check for successful payment return
  useEffect(() => {
    const success = searchParams.get('success');
    const candleId = searchParams.get('candle_id');
    
    if (success === 'true' && candleId) {
      setCheckingPayment(true);
      checkPaymentStatus(candleId);
      
      // Clean up URL
      window.history.replaceState({}, '', '/candles');
    }
  }, [searchParams]);

  async function checkPaymentStatus(candleId: string) {
    let attempts = 0;
    const maxAttempts = 10;
    
    const checkInterval = setInterval(async () => {
      attempts++;
      
      const { data, error } = await supabase
        .from("candle_offerings")
        .select("*")
        .eq('id', candleId)
        .single();
      
      if (data && data.payment_status === 'paid') {
        clearInterval(checkInterval);
        setCheckingPayment(false);
        
        // Show success animation
        showSuccessAnimation(data.candle_type === 'eternal');
        
        // Reload candles
        await loadAllCandles();
      }
      
      if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        setCheckingPayment(false);
      }
    }, 1000);
  }

  function showSuccessAnimation(isEternal: boolean) {
    const elem = document.createElement('div');
    elem.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl p-8 shadow-2xl';
    elem.innerHTML = `
      <div class="text-center">
        <div class="text-6xl mb-4">${isEternal ? '✨' : '🕯️'}</div>
        <h3 class="text-2xl font-bold text-amber-900 mb-2">${isEternal ? 'Eternal Flame Lit' : 'Candle Lit'}</h3>
        <p class="text-amber-700">${isEternal ? 'Your memorial will burn forever' : 'Your light brings comfort'}</p>
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

    // Load eternal candles
    const { data: eternal } = await supabase
      .from("candle_offerings")
      .select("*")
      .eq('candle_type', 'eternal')
      .eq('payment_status', 'paid')
      .order("created_at", { ascending: false });

    if (eternal) {
      setEternalCandles(eternal as Candle[]);
    }

    // Load all renewable candles (both active and memory orbs)
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

  async function handleRelight(candle: Candle) {
    // Create a renewal candle record
    const { data, error } = await supabase
      .from("candle_offerings")
      .insert([{
        name: candle.name,
        color: candle.color,
        message: candle.message,
        candle_type: 'renewable',
        payment_status: 'pending',
        amount_paid: 99, // $0.99 in cents
        parent_candle_id: candle.id
      }])
      .select("*")
      .single();

    if (!error && data) {
      // Redirect to Stripe for renewal payment
      const returnUrl = `${window.location.origin}/candles?success=true&candle_id=${data.id}`;
      const stripeUrl = `https://buy.stripe.com/14AdR8amRbEocd267c6wE05?prefilled_email=${encodeURIComponent('')}&client_reference_id=${data.id}&success_url=${encodeURIComponent(returnUrl)}&cancel_url=${encodeURIComponent(window.location.href)}`;
      
      window.location.href = stripeUrl;
    }
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
            loadAllCandles(); // Reload everything to recalculate stages
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-amber-900 mb-2">Memorial Candle Room</h1>
            <p className="text-amber-700 max-w-2xl">
              Light a candle in memory, for healing, or for hope. Eternal flames burn forever, 
              while temporary candles transform into gentle memory orbs.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/meditation" className="px-4 py-2 bg-white/60 text-amber-800 rounded-lg hover:bg-white/80 transition-colors border border-amber-200">
              ← Back
            </Link>
            <button 
              onClick={() => setShowAdd(true)}
              className="px-6 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg hover:from-amber-700 hover:to-orange-700 transition-all font-medium shadow-lg"
            >
              + Light a Candle
            </button>
          </div>
        </header>

        {/* Payment Processing Overlay */}
        {checkingPayment && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl p-8 shadow-2xl">
              <div className="text-center">
                <div className="animate-pulse text-5xl mb-4">🕯️</div>
                <h3 className="text-xl font-bold text-amber-900 mb-2">Lighting Your Candle...</h3>
                <p className="text-amber-700">Please wait while we confirm your memorial</p>
              </div>
            </div>
          </div>
        )}

        {/* Eternal Memorial Garden Section */}
        {eternalCandles.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-2xl font-bold text-amber-900">Eternal Memorial Garden</h2>
              <span className="text-sm text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
                ✨ Forever Burning
              </span>
            </div>
            
            <div className="bg-gradient-to-br from-amber-100/40 to-orange-100/40 backdrop-blur-sm rounded-2xl p-8 border border-amber-300 shadow-xl">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8">
                {eternalCandles.map((c) => (
                  <div key={c.id} className="text-center">
                    <EternalCandleVisual name={c.name} colorKey={c.color} message={c.message} />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Active Renewable Candles Section */}
        {activeCandles.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-bold text-amber-900">Active Prayers & Healing Light</h2>
              <span className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                Renewable flames
              </span>
            </div>
            
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-amber-200 shadow-lg">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8">
                {activeCandles.map((c) => (
                  <div key={c.id} className="text-center">
                    <RenewableCandleVisual 
                      name={c.name} 
                      colorKey={c.color} 
                      message={c.message} 
                      fadeStage={c.fade_stage || 1}
                      createdAt={c.created_at}
                      lastRenewed={c.last_renewed_at}
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Memory Orbs Section */}
        {memoryOrbs.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-bold text-amber-800">Memory Garden</h2>
              <span className="text-sm text-amber-600 bg-amber-50/50 px-3 py-1 rounded-full">
                Gentle memories • Re-light for $0.99
              </span>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50/30 to-blue-50/30 backdrop-blur-sm rounded-2xl p-8 border border-purple-200/30 shadow-lg">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6">
                {memoryOrbs.map((c) => (
                  <div key={c.id} className="text-center">
                    <MemoryOrb 
                      candle={c}
                      onRelight={() => handleRelight(c)}
                    />
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

      {/* Candle Type Selection Modal */}
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-amber-900">Choose Your Candle Type</h3>
          <button onClick={onClose} className="text-amber-600 hover:text-amber-800 text-2xl">×</button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Eternal Option */}
          <button
            onClick={() => onSelectType('eternal')}
            className="text-left p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border-2 border-amber-200 hover:border-amber-400 transition-all hover:shadow-lg"
          >
            <div className="text-3xl mb-3">✨</div>
            <h4 className="text-lg font-bold text-amber-900 mb-2">Eternal Memorial</h4>
            <p className="text-sm text-amber-700 mb-3">
              A permanent flame that burns forever in loving memory. Perfect for honoring someone who has passed.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-600">Never expires</span>
              <span className="font-bold text-amber-900">$5.00</span>
            </div>
          </button>

          {/* Renewable Option */}
          <button
            onClick={() => onSelectType('renewable')}
            className="text-left p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200 hover:border-blue-400 transition-all hover:shadow-lg"
          >
            <div className="text-3xl mb-3">🕯️</div>
            <h4 className="text-lg font-bold text-blue-900 mb-2">Renewable Light</h4>
            <p className="text-sm text-blue-700 mb-3">
              For prayers, healing, or temporary intentions. Fades to a memory orb after 3 months. Can be re-lit anytime.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-blue-600">Transforms to memory</span>
              <span className="font-bold text-blue-900">$0.99</span>
            </div>
          </button>
        </div>
      </div>
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
      {/* Eternal glow effect */}
      <div className="absolute inset-0 -inset-x-4 -top-8 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-amber-300 to-yellow-200 blur-2xl animate-pulse" />
      </div>
      
      {/* Star/eternal symbol */}
      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-2xl animate-pulse">
        ✨
      </div>
      
      <div 
        className="w-16 h-32 mx-auto rounded-t-full relative shadow-xl border-2 border-amber-300/30"
        style={{ background: wax }}
      >
        {/* Wick */}
        <div className="absolute top-3 left-1/2 transform -translate-x-1/2 w-1 h-2 bg-amber-900 rounded-full" />
        
        {/* Eternal Flame */}
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-6 h-8 rounded-full opacity-95"
             style={{
               background: 'radial-gradient(ellipse at center, #fff4e0 0%, #ffd27a 20%, #ff9900 60%, transparent 70%)',
               filter: 'blur(0.4px)',
               animation: 'eternalFlicker 3s infinite ease-in-out',
               boxShadow: '0 0 30px 15px rgba(255, 200, 60, 0.5), 0 0 60px 25px rgba(255, 170, 60, 0.3)'
             }} />
      </div>
      
      <div className="mt-3 max-w-32 relative">
        <div className="font-medium text-sm text-amber-900 mb-1">{name}</div>
        {message && (
          <div className="text-xs text-amber-700 opacity-75 line-clamp-2">{message}</div>
        )}
        <div className="text-xs text-amber-600 font-semibold mt-1">Eternal</div>
      </div>

      {/* Hover card */}
      {message && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-3 bg-white rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
          <div className="text-xs text-amber-800">{message}</div>
        </div>
      )}

      <style jsx>{`
        @keyframes eternalFlicker {
          0%, 100% { 
            transform: translateX(-50%) scale(1) translateY(0); 
            opacity: 0.95; 
            filter: blur(0.4px) brightness(1);
          }
          33% { 
            transform: translateX(-52%) scale(1.1) translateY(-2px); 
            opacity: 1; 
            filter: blur(0.3px) brightness(1.2);
          }
          66% { 
            transform: translateX(-48%) scale(1.05) translateY(1px); 
            opacity: 0.9; 
            filter: blur(0.5px) brightness(0.95);
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
  lastRenewed,
}: {
  name: string;
  colorKey: string;
  message: string | null;
  fadeStage: number;
  createdAt: string;
  lastRenewed?: string;
}) {
  const wax = useMemo(() => {
    const found = COLOR_PRESETS.find((c) => c.key === colorKey);
    return found?.wax ?? "#f7f4ef";
  }, [colorKey]);

  const opacity = fadeStage === 1 ? 1 : fadeStage === 2 ? 0.8 : 0.6;
  const flameSize = fadeStage === 1 ? 'w-4 h-6' : fadeStage === 2 ? 'w-3 h-5' : 'w-2 h-4';
  const glowIntensity = fadeStage === 1 ? '18px 8px' : fadeStage === 2 ? '12px 6px' : '8px 4px';

  // Calculate days remaining
  const renewedDate = new Date(lastRenewed || createdAt);
  const now = new Date();
  const daysOld = Math.floor((now.getTime() - renewedDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, 90 - daysOld);

  return (
    <div className="relative group">
      <div 
        className="w-16 h-32 mx-auto rounded-t-full relative shadow-lg transition-opacity duration-1000"
        style={{ 
          background: wax,
          opacity: opacity
        }}
      >
        {/* Wick */}
        <div className="absolute top-3 left-1/2 transform -translate-x-1/2 w-1 h-2 bg-amber-900 rounded-full" />
        
        {/* Fading Flame */}
        <div className={`absolute -top-4 left-1/2 transform -translate-x-1/2 ${flameSize} rounded-full transition-all duration-1000`}
             style={{
               background: 'radial-gradient(ellipse at center, #ffd27a 0%, #ff9900 60%, transparent 70%)',
               filter: `blur(${fadeStage === 3 ? '1px' : '0.6px'})`,
               animation: `flicker ${2.6 + fadeStage}s infinite ease-in-out`,
               boxShadow: `0 0 ${glowIntensity} rgba(255, 170, 60, ${0.35 - (fadeStage * 0.05)})`,
               opacity: opacity
             }} />
      </div>
      
      <div className="mt-3 max-w-32">
        <div className="font-medium text-sm text-amber-900 mb-1">{name}</div>
        {message && (
          <div className="text-xs text-amber-700 opacity-75 line-clamp-2">{message}</div>
        )}
        <div className="text-xs text-amber-600 mt-1">
          {fadeStage < 3 ? `${daysRemaining} days` : 'Fading soon'}
        </div>
      </div>

      {/* Hover card */}
      {message && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-3 bg-white rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
          <div className="text-xs text-amber-800">{message}</div>
          <div className="text-xs text-amber-600 mt-2">
            {fadeStage === 1 && 'Burning bright'}
            {fadeStage === 2 && 'Starting to dim'}
            {fadeStage === 3 && 'Soon to become a memory'}
          </div>
        </div>
      )}

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
  onRelight,
}: {
  candle: Candle;
  onRelight: () => void;
}) {
  const wax = useMemo(() => {
    const found = COLOR_PRESETS.find((c) => c.key === candle.color);
    return found?.wax ?? "#f7f4ef";
  }, [candle.color]);

  return (
    <div className="relative group cursor-pointer" onClick={onRelight}>
      {/* Gentle glow */}
      <div className="absolute inset-0 -inset-2 opacity-20">
        <div 
          className="absolute inset-0 rounded-full blur-xl animate-pulse"
          style={{ background: wax }}
        />
      </div>
      
      {/* Memory orb */}
      <div 
        className="w-12 h-12 mx-auto rounded-full relative shadow-md border border-white/30 transition-all hover:scale-110"
        style={{ 
          background: `radial-gradient(circle at 30% 30%, ${wax}, transparent)`,
          backgroundColor: wax,
          opacity: 0.6
        }}
      >
        {/* Inner glow */}
        <div 
          className="absolute inset-2 rounded-full animate-pulse"
          style={{
            background: `radial-gradient(circle, rgba(255,255,255,0.4), transparent)`,
          }}
        />
      </div>
      
      <div className="mt-2 max-w-24">
        <div className="text-xs text-amber-800 opacity-80 truncate">{candle.name}</div>
        <div className="text-xs text-amber-600 opacity-60">Memory</div>
      </div>

      {/* Hover tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-40 p-3 bg-white rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        <div className="text-xs text-amber-900 font-semibold mb-1">{candle.name}</div>
        {candle.message && (
          <div className="text-xs text-amber-700 mb-2">{candle.message}</div>
        )}
        <div className="text-xs text-amber-600 font-medium">
          Click to re-light ($0.99)
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

    const returnUrl = `${window.location.origin}/candles?success=true&candle_id=${data.id}`;
    const stripeUrl = `https://buy.stripe.com/cNi5kCgLfeQA2CseDI6wE06?prefilled_email=${encodeURIComponent('')}&client_reference_id=${data.id}&success_url=${encodeURIComponent(returnUrl)}&cancel_url=${encodeURIComponent(window.location.href)}`;
    
    window.location.href = stripeUrl;
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-amber-900">Light an Eternal Flame</h3>
            <p className="text-sm text-amber-700 mt-1">This memorial will burn forever</p>
          </div>
          <button onClick={onClose} className="text-amber-600 hover:text-amber-800 text-2xl">×</button>
        </div>

        {!showPreview ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-amber-800 mb-2">
                In loving memory of
              </label>
              <input
                className="w-full px-4 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Grandma Rose, Dad, My beloved friend John"
                maxLength={60}
              />
              <div className="text-xs text-amber-600 mt-1">{name.length}/60 characters</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-amber-800 mb-2">
                Personal message (optional)
              </label>
              <textarea
                className="w-full px-4 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Forever in our hearts. Your love and light continue to guide us..."
                maxLength={240}
              />
              <div className="text-xs text-amber-600 mt-1">{message.length}/240 characters</div>
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
                    className={`h-10 rounded-lg border-2 transition-all ${
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
                  <div className="text-xs text-amber-600 mt-1">Your memorial will burn forever in our sacred space</div>
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
                  <li>• Burn forever in the Memorial Garden</li>
                  <li>• Never fade or expire</li>
                  <li>• Be visible to all visitors for remembrance</li>
                  <li>• Include your personal dedication</li>
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
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => setShowPreview(true)} 
                disabled={saving || !name}
                className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-all font-medium disabled:opacity-50"
              >
                Preview Flame
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => setShowPreview(false)} 
                disabled={saving}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                ← Back to Edit
              </button>
              <button 
                onClick={proceedToPayment} 
                disabled={saving}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg hover:from-amber-700 hover:to-orange-700 transition-all font-medium shadow-lg disabled:opacity-50"
              >
                {saving ? "Processing..." : "Light Eternal Flame ($5.00)"}
              </button>
            </>
          )}
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

    const returnUrl = `${window.location.origin}/candles?success=true&candle_id=${data.id}`;
    const stripeUrl = `https://buy.stripe.com/14AdR8amRbEocd267c6wE05?prefilled_email=${encodeURIComponent('')}&client_reference_id=${data.id}&success_url=${encodeURIComponent(returnUrl)}&cancel_url=${encodeURIComponent(window.location.href)}`;
    
    window.location.href = stripeUrl;
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-blue-900">Light a Renewable Candle</h3>
            <p className="text-sm text-blue-700 mt-1">For prayers, healing, and intentions</p>
          </div>
          <button onClick={onClose} className="text-blue-600 hover:text-blue-800 text-2xl">×</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-blue-800 mb-2">
              Light this candle for
            </label>
            <input
              className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Healing for Mom, Peace for our family"
              maxLength={60}
            />
            <div className="text-xs text-blue-600 mt-1">{name.length}/60 characters</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-800 mb-2">
              Your prayer or intention (optional)
            </label>
            <textarea
              className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Sending healing light and love..."
              maxLength={240}
            />
            <div className="text-xs text-blue-600 mt-1">{message.length}/240 characters</div>
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
                  className={`h-10 rounded-lg border-2 transition-all ${
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
                  Burns bright for 30 days, then gently fades to a memory orb. 
                  Can be re-lit anytime.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button 
            onClick={onClose} 
            disabled={saving}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={proceedToPayment} 
            disabled={saving || !name}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium shadow-lg disabled:opacity-50"
          >
            {saving ? "Processing..." : "Light Candle ($0.99)"}
          </button>
        </div>
      </div>
    </div>
  );
}
