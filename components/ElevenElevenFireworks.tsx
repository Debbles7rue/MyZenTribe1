// components/ElevenElevenFireworks.tsx
"use client";

import React, { useEffect, useState, useRef } from 'react';

export default function ElevenElevenFireworks() {
  const [showFireworks, setShowFireworks] = useState(false);
  const [hasTriggeredAM, setHasTriggeredAM] = useState(false);
  const [hasTriggeredPM, setHasTriggeredPM] = useState(false);
  const lastCheckRef = useRef<string>('');

  useEffect(() => {
    // Check time every second
    const interval = setInterval(() => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();
      const currentTimeString = `${hours}:${minutes}`;

      // Check if it's exactly 11:11 (and we haven't triggered in the last minute)
      if (minutes === 11 && seconds === 0) {
        if (hours === 11 && !hasTriggeredAM && lastCheckRef.current !== '11:11AM') {
          // 11:11 AM
          triggerFireworks();
          setHasTriggeredAM(true);
          lastCheckRef.current = '11:11AM';
        } else if (hours === 23 && !hasTriggeredPM && lastCheckRef.current !== '11:11PM') {
          // 11:11 PM (23:11 in 24-hour format)
          triggerFireworks();
          setHasTriggeredPM(true);
          lastCheckRef.current = '11:11PM';
        }
      }

      // Reset triggers at midnight for the next day
      if (hours === 0 && minutes === 0 && seconds === 0) {
        setHasTriggeredAM(false);
        setHasTriggeredPM(false);
        lastCheckRef.current = '';
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [hasTriggeredAM, hasTriggeredPM]);

  const triggerFireworks = () => {
    setShowFireworks(true);
    
    // Play a subtle sound if you want (optional)
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTS');
      audio.volume = 0.3;
      audio.play().catch(() => {}); // Ignore if audio doesn't play
    } catch (e) {
      // Ignore audio errors
    }

    // Auto-hide after 5 seconds
    setTimeout(() => {
      setShowFireworks(false);
    }, 5000);
  };

  if (!showFireworks) return null;

  return (
    <div className="eleven-eleven-container">
      {/* Main message */}
      <div className="eleven-message">
        <div className="eleven-time">11:11</div>
        <div className="eleven-text">Make a wish! ✨</div>
      </div>

      {/* Fireworks */}
      <div className="fireworks">
        {/* Multiple firework bursts */}
        {[...Array(6)].map((_, i) => (
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
        {[...Array(20)].map((_, i) => (
          <div key={i} className={`star star-${i + 1}`} />
        ))}
      </div>

      <style jsx>{`
        .eleven-eleven-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 9999;
          pointer-events: none;
          animation: fadeIn 0.3s ease-in;
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
          animation: messageFloat 5s ease-in-out;
        }

        .eleven-time {
          font-size: 72px;
          font-weight: bold;
          background: linear-gradient(45deg, #FFD700, #FFA500, #FF69B4, #9370DB);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
          animation: shimmer 2s ease-in-out infinite;
          margin-bottom: 10px;
        }

        .eleven-text {
          font-size: 24px;
          color: white;
          text-shadow: 
            0 0 10px rgba(255, 255, 255, 0.8),
            0 0 20px rgba(255, 215, 0, 0.6),
            0 0 30px rgba(255, 215, 0, 0.4);
          animation: pulse 1s ease-in-out infinite;
        }

        @keyframes messageFloat {
          0%, 100% { 
            transform: translate(-50%, -50%) scale(1);
            opacity: 0;
          }
          10% {
            transform: translate(-50%, -50%) scale(1.1);
            opacity: 1;
          }
          90% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
        }

        @keyframes shimmer {
          0%, 100% { 
            filter: brightness(1) hue-rotate(0deg);
          }
          50% { 
            filter: brightness(1.2) hue-rotate(10deg);
          }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
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

        .firework-1 { top: 20%; left: 20%; animation-delay: 0s; }
        .firework-2 { top: 30%; left: 70%; animation-delay: 0.3s; }
        .firework-3 { top: 60%; left: 30%; animation-delay: 0.6s; }
        .firework-4 { top: 40%; left: 80%; animation-delay: 0.9s; }
        .firework-5 { top: 70%; left: 60%; animation-delay: 1.2s; }
        .firework-6 { top: 25%; left: 50%; animation-delay: 1.5s; }

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
            transform: scale(50);
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

        .spark:nth-child(1) { 
          background: #FFD700;
          transform: rotate(0deg) translateX(0);
          animation-delay: 0s;
        }
        .spark:nth-child(2) { 
          background: #FF69B4;
          transform: rotate(30deg) translateX(0);
          animation-delay: 0.1s;
        }
        .spark:nth-child(3) { 
          background: #00CED1;
          transform: rotate(60deg) translateX(0);
          animation-delay: 0.2s;
        }
        .spark:nth-child(4) { 
          background: #FFD700;
          transform: rotate(90deg) translateX(0);
          animation-delay: 0.3s;
        }
        .spark:nth-child(5) { 
          background: #FF1493;
          transform: rotate(120deg) translateX(0);
          animation-delay: 0.4s;
        }
        .spark:nth-child(6) { 
          background: #00FA9A;
          transform: rotate(150deg) translateX(0);
          animation-delay: 0.5s;
        }
        .spark:nth-child(7) { 
          background: #FFD700;
          transform: rotate(180deg) translateX(0);
          animation-delay: 0.6s;
        }
        .spark:nth-child(8) { 
          background: #FF69B4;
          transform: rotate(210deg) translateX(0);
          animation-delay: 0.7s;
        }
        .spark:nth-child(9) { 
          background: #87CEEB;
          transform: rotate(240deg) translateX(0);
          animation-delay: 0.8s;
        }
        .spark:nth-child(10) { 
          background: #FFD700;
          transform: rotate(270deg) translateX(0);
          animation-delay: 0.9s;
        }
        .spark:nth-child(11) { 
          background: #FF1493;
          transform: rotate(300deg) translateX(0);
          animation-delay: 1s;
        }
        .spark:nth-child(12) { 
          background: #00CED1;
          transform: rotate(330deg) translateX(0);
          animation-delay: 1.1s;
        }

        @keyframes sparkle {
          0% {
            transform: rotate(var(--rotation)) translateX(0) scale(0);
            opacity: 1;
          }
          50% {
            transform: rotate(var(--rotation)) translateX(100px) scale(1);
            opacity: 1;
          }
          100% {
            transform: rotate(var(--rotation)) translateX(150px) scale(0);
            opacity: 0;
          }
        }

        .spark:nth-child(1) { --rotation: 0deg; }
        .spark:nth-child(2) { --rotation: 30deg; }
        .spark:nth-child(3) { --rotation: 60deg; }
        .spark:nth-child(4) { --rotation: 90deg; }
        .spark:nth-child(5) { --rotation: 120deg; }
        .spark:nth-child(6) { --rotation: 150deg; }
        .spark:nth-child(7) { --rotation: 180deg; }
        .spark:nth-child(8) { --rotation: 210deg; }
        .spark:nth-child(9) { --rotation: 240deg; }
        .spark:nth-child(10) { --rotation: 270deg; }
        .spark:nth-child(11) { --rotation: 300deg; }
        .spark:nth-child(12) { --rotation: 330deg; }

        /* Falling stars */
        .stars {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
        }

        .star {
          position: absolute;
          width: 2px;
          height: 2px;
          background: white;
          border-radius: 50%;
          box-shadow: 
            0 0 4px white,
            0 0 8px white,
            0 0 12px rgba(255, 215, 0, 0.5);
          animation: fall 3s linear forwards;
        }

        @keyframes fall {
          0% {
            transform: translateY(-100px) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) translateX(50px);
            opacity: 0;
          }
        }

        .star-1 { left: 5%; animation-delay: 0s; }
        .star-2 { left: 10%; animation-delay: 0.2s; }
        .star-3 { left: 15%; animation-delay: 0.4s; }
        .star-4 { left: 20%; animation-delay: 0.6s; }
        .star-5 { left: 25%; animation-delay: 0.8s; }
        .star-6 { left: 30%; animation-delay: 1s; }
        .star-7 { left: 35%; animation-delay: 1.2s; }
        .star-8 { left: 40%; animation-delay: 1.4s; }
        .star-9 { left: 45%; animation-delay: 1.6s; }
        .star-10 { left: 50%; animation-delay: 1.8s; }
        .star-11 { left: 55%; animation-delay: 2s; }
        .star-12 { left: 60%; animation-delay: 2.2s; }
        .star-13 { left: 65%; animation-delay: 2.4s; }
        .star-14 { left: 70%; animation-delay: 2.6s; }
        .star-15 { left: 75%; animation-delay: 2.8s; }
        .star-16 { left: 80%; animation-delay: 3s; }
        .star-17 { left: 85%; animation-delay: 3.2s; }
        .star-18 { left: 90%; animation-delay: 3.4s; }
        .star-19 { left: 95%; animation-delay: 3.6s; }
        .star-20 { left: 98%; animation-delay: 3.8s; }

        /* Mobile adjustments */
        @media (max-width: 768px) {
          .eleven-time {
            font-size: 56px;
          }
          
          .eleven-text {
            font-size: 20px;
          }
        }
      `}</style>
    </div>
  );
}
