// components/ElevenElevenFireworks.tsx
"use client";

import React, { useEffect, useState, useRef } from 'react';

export default function ElevenElevenFireworks() {
  const [showFireworks, setShowFireworks] = useState(false);
  const [countdown, setCountdown] = useState<string>('');
  const hasTriggeredTodayRef = useRef<Set<string>>(new Set());
  const lastDateRef = useRef<string>('');

  useEffect(() => {
    // Check immediately when component mounts
    checkTime();

    // Then check every second
    const interval = setInterval(checkTime, 1000);

    return () => clearInterval(interval);
  }, []);

  const checkTime = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const today = now.toDateString();

    // Reset the tracking for a new day
    if (today !== lastDateRef.current) {
      hasTriggeredTodayRef.current = new Set();
      lastDateRef.current = today;
    }

    // Check if it's 11:11 (for the entire minute, not just at :00 seconds)
    if (hours === 11 && minutes === 11) {
      // 11:11 AM
      if (!hasTriggeredTodayRef.current.has('11:11AM')) {
        console.log('🎆 Triggering 11:11 AM fireworks!');
        triggerFireworks();
        hasTriggeredTodayRef.current.add('11:11AM');
      }
    } else if (hours === 23 && minutes === 11) {
      // 11:11 PM (23:11 in 24-hour format)
      if (!hasTriggeredTodayRef.current.has('11:11PM')) {
        console.log('🎆 Triggering 11:11 PM fireworks!');
        triggerFireworks();
        hasTriggeredTodayRef.current.add('11:11PM');
      }
    }

    // Optional: Show countdown when close to 11:11
    updateCountdown(now);
  };

  const updateCountdown = (now: Date) => {
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    // Calculate time until next 11:11
    let targetHour = 11;
    if (hours >= 11 && !(hours === 11 && minutes < 11)) {
      targetHour = 23; // Next is 11:11 PM
    }
    if (hours >= 23 && !(hours === 23 && minutes < 11)) {
      targetHour = 11; // Next is 11:11 AM tomorrow
    }

    const timeToTarget = (targetHour - hours) * 3600 + (11 - minutes) * 60 - seconds;
    
    // Only show countdown if within 5 minutes
    if (timeToTarget > 0 && timeToTarget <= 300) {
      const mins = Math.floor(timeToTarget / 60);
      const secs = timeToTarget % 60;
      setCountdown(`${mins}:${secs.toString().padStart(2, '0')}`);
    } else {
      setCountdown('');
    }
  };

  const triggerFireworks = () => {
    setShowFireworks(true);
    
    // Play a subtle chime sound (optional)
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTS');
      audio.volume = 0.3;
      audio.play().catch(() => {
        console.log('Audio play failed - browser may block autoplay');
      });
    } catch (e) {
      console.log('Audio not supported');
    }

    // Show for 7 seconds (a bit longer to enjoy it!)
    setTimeout(() => {
      setShowFireworks(false);
    }, 7000);
  };

  // Manual trigger for testing (you can call this from console)
  useEffect(() => {
    // Add to window for testing: window.testFireworks()
    (window as any).testFireworks = () => {
      console.log('🧪 Testing fireworks...');
      triggerFireworks();
    };
  }, []);

  return (
    <>
      {/* Countdown timer (optional - shows when close to 11:11) */}
      {countdown && !showFireworks && (
        <div className="countdown-badge">
          <span className="countdown-label">11:11 in</span>
          <span className="countdown-time">{countdown}</span>
        </div>
      )}

      {/* Fireworks display */}
      {showFireworks && (
        <div className="eleven-eleven-container">
          {/* Main message */}
          <div className="eleven-message">
            <div className="eleven-time">11:11</div>
            <div className="eleven-text">Make a wish! ✨</div>
            <div className="eleven-subtext">The universe is listening...</div>
          </div>

          {/* Fireworks */}
          <div className="fireworks">
            {[...Array(8)].map((_, i) => (
              <div key={i} className={`firework firework-${i + 1}`}>
                <div className="explosion">
                  {[...Array(12)].map((_, j) => (
                    <div key={j} className="spark" />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Falling stars effect */}
          <div className="stars">
            {[...Array(25)].map((_, i) => (
              <div key={i} className={`star star-${i + 1}`} />
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        /* Countdown Badge */
        .countdown-badge {
          position: fixed;
          top: 80px;
          right: 20px;
          background: linear-gradient(135deg, rgba(147, 51, 234, 0.9), rgba(196, 132, 252, 0.9));
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 1000;
          box-shadow: 0 4px 20px rgba(147, 51, 234, 0.3);
          animation: pulse 2s ease-in-out infinite;
          backdrop-filter: blur(10px);
        }

        .countdown-label {
          font-size: 12px;
          opacity: 0.9;
        }

        .countdown-time {
          font-size: 14px;
          font-weight: bold;
          font-variant-numeric: tabular-nums;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        /* Main Container */
        .eleven-eleven-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 9999;
          pointer-events: none;
          animation: fadeIn 0.5s ease-in;
          background: radial-gradient(circle at center, rgba(147, 51, 234, 0.1), transparent);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Message Styling */
        .eleven-message {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          z-index: 10000;
          animation: messageFloat 7s ease-in-out;
        }

        .eleven-time {
          font-size: 80px;
          font-weight: bold;
          background: linear-gradient(45deg, #FFD700, #FFA500, #FF69B4, #9370DB);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
          animation: shimmer 2s ease-in-out infinite;
          margin-bottom: 10px;
          letter-spacing: 8px;
        }

        .eleven-text {
          font-size: 28px;
          color: white;
          text-shadow: 
            0 0 10px rgba(255, 255, 255, 0.8),
            0 0 20px rgba(255, 215, 0, 0.6),
            0 0 30px rgba(255, 215, 0, 0.4);
          animation: glow 1.5s ease-in-out infinite;
          margin-bottom: 8px;
        }

        .eleven-subtext {
          font-size: 16px;
          color: rgba(255, 255, 255, 0.8);
          font-style: italic;
          animation: fadeInUp 2s ease-out;
        }

        @keyframes messageFloat {
          0%, 100% { 
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 0;
          }
          15% {
            transform: translate(-50%, -50%) scale(1.1);
            opacity: 1;
          }
          85% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
        }

        @keyframes shimmer {
          0%, 100% { 
            filter: brightness(1) hue-rotate(0deg);
          }
          50% { 
            filter: brightness(1.3) hue-rotate(15deg);
          }
        }

        @keyframes glow {
          0%, 100% { 
            transform: scale(1);
            filter: brightness(1);
          }
          50% { 
            transform: scale(1.02);
            filter: brightness(1.2);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Fireworks */
        .fireworks {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
        }

        .firework {
          position: absolute;
          width: 4px;
          height: 4px;
        }

        .firework-1 { top: 25%; left: 20%; animation-delay: 0s; }
        .firework-2 { top: 30%; left: 70%; animation-delay: 0.3s; }
        .firework-3 { top: 60%; left: 25%; animation-delay: 0.6s; }
        .firework-4 { top: 35%; left: 80%; animation-delay: 0.9s; }
        .firework-5 { top: 70%; left: 60%; animation-delay: 1.2s; }
        .firework-6 { top: 20%; left: 50%; animation-delay: 1.5s; }
        .firework-7 { top: 50%; left: 85%; animation-delay: 1.8s; }
        .firework-8 { top: 65%; left: 15%; animation-delay: 2.1s; }

        .explosion {
          position: absolute;
          width: 4px;
          height: 4px;
          animation: explode 3s ease-out forwards;
        }

        @keyframes explode {
          0% {
            transform: scale(0);
            opacity: 1;
          }
          100% {
            transform: scale(60);
            opacity: 0;
          }
        }

        .spark {
          position: absolute;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          animation: sparkle 3s ease-out forwards;
        }

        .spark:nth-child(1) { background: #FFD700; }
        .spark:nth-child(2) { background: #FF69B4; }
        .spark:nth-child(3) { background: #00CED1; }
        .spark:nth-child(4) { background: #FFA500; }
        .spark:nth-child(5) { background: #FF1493; }
        .spark:nth-child(6) { background: #00FA9A; }
        .spark:nth-child(7) { background: #FFD700; }
        .spark:nth-child(8) { background: #FF69B4; }
        .spark:nth-child(9) { background: #87CEEB; }
        .spark:nth-child(10) { background: #FFA500; }
        .spark:nth-child(11) { background: #FF1493; }
        .spark:nth-child(12) { background: #00CED1; }

        @keyframes sparkle {
          0% {
            transform: rotate(calc(var(--i) * 30deg)) translateX(0) scale(0);
            opacity: 1;
          }
          50% {
            transform: rotate(calc(var(--i) * 30deg)) translateX(120px) scale(1);
            opacity: 1;
          }
          100% {
            transform: rotate(calc(var(--i) * 30deg)) translateX(180px) scale(0);
            opacity: 0;
          }
        }

        .spark:nth-child(1) { --i: 0; animation-delay: 0s; }
        .spark:nth-child(2) { --i: 1; animation-delay: 0.1s; }
        .spark:nth-child(3) { --i: 2; animation-delay: 0.2s; }
        .spark:nth-child(4) { --i: 3; animation-delay: 0.3s; }
        .spark:nth-child(5) { --i: 4; animation-delay: 0.4s; }
        .spark:nth-child(6) { --i: 5; animation-delay: 0.5s; }
        .spark:nth-child(7) { --i: 6; animation-delay: 0.6s; }
        .spark:nth-child(8) { --i: 7; animation-delay: 0.7s; }
        .spark:nth-child(9) { --i: 8; animation-delay: 0.8s; }
        .spark:nth-child(10) { --i: 9; animation-delay: 0.9s; }
        .spark:nth-child(11) { --i: 10; animation-delay: 1s; }
        .spark:nth-child(12) { --i: 11; animation-delay: 1.1s; }

        /* Falling stars */
        .stars {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          overflow: hidden;
        }

        .star {
          position: absolute;
          width: 2px;
          height: 2px;
          background: white;
          border-radius: 50%;
          box-shadow: 
            0 0 6px white,
            0 0 12px white,
            0 0 20px rgba(255, 215, 0, 0.5);
          animation: fall 4s linear forwards;
        }

        @keyframes fall {
          0% {
            transform: translateY(-100px) translateX(0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) translateX(100px) rotate(720deg);
            opacity: 0;
          }
        }

        /* Star positions and delays */
        ${[...Array(25)].map((_, i) => `
          .star-${i + 1} { 
            left: ${4 + i * 4}%; 
            animation-delay: ${i * 0.15}s;
            animation-duration: ${3 + (i % 3)}s;
          }
        `).join('')}

        /* Mobile adjustments */
        @media (max-width: 768px) {
          .eleven-time {
            font-size: 60px;
            letter-spacing: 4px;
          }
          
          .eleven-text {
            font-size: 22px;
          }

          .eleven-subtext {
            font-size: 14px;
          }

          .countdown-badge {
            top: 70px;
            right: 10px;
            padding: 6px 12px;
          }
        }
      `}</style>
    </>
  );
}
