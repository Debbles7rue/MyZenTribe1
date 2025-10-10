// components/HolidayCelebrationPopup.tsx
"use client";

import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";

interface HolidayCelebrationPopupProps {
  isOpen: boolean;
  onClose: () => void;
  holiday: {
    title: string;
    date: string;
    emoji?: string;
  };
  fromFriend: {
    name: string;
    avatar?: string;
  };
  onCelebrate?: () => void;
}

export default function HolidayCelebrationPopup({
  isOpen,
  onClose,
  holiday,
  fromFriend,
  onCelebrate
}: HolidayCelebrationPopupProps) {
  const [hasShownConfetti, setHasShownConfetti] = useState(false);

  useEffect(() => {
    if (isOpen && !hasShownConfetti) {
      triggerConfetti();
      setHasShownConfetti(true);
    }
  }, [isOpen, hasShownConfetti]);

  useEffect(() => {
    if (!isOpen) {
      setHasShownConfetti(false);
    }
  }, [isOpen]);

  const triggerConfetti = () => {
    // Create confetti particles
    const colors = ['#FF6B9D', '#C44569', '#FFA07A', '#FFD700', '#FF69B4', '#9370DB', '#00CED1', '#FF1493'];
    const particleCount = 150;
    
    for (let i = 0; i < particleCount; i++) {
      createConfettiPiece(colors[Math.floor(Math.random() * colors.length)]);
    }
  };

  const createConfettiPiece = (color: string) => {
    const confetti = document.createElement('div');
    confetti.className = 'confetti-piece';
    confetti.style.cssText = `
      position: fixed;
      width: ${Math.random() * 10 + 5}px;
      height: ${Math.random() * 10 + 5}px;
      background-color: ${color};
      left: ${Math.random() * 100}vw;
      top: -20px;
      opacity: ${Math.random() * 0.7 + 0.3};
      transform: rotate(${Math.random() * 360}deg);
      animation: confetti-fall ${Math.random() * 3 + 2}s linear forwards;
      z-index: 10000;
      pointer-events: none;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
    `;
    
    document.body.appendChild(confetti);
    
    setTimeout(() => {
      confetti.remove();
    }, 5000);
  };

  if (!isOpen) return null;

  const holidayEmoji = holiday.emoji || holiday.title.match(/[\u{1F300}-\u{1F9FF}]/u)?.[0] || '🎉';
  const holidayName = holiday.title.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();

  const content = (
    <>
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] animate-fadeIn"
        onClick={onClose}
      />
      
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-bounceIn pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Colorful Header */}
          <div className="relative bg-gradient-to-br from-pink-400 via-purple-400 to-blue-400 p-8 text-center overflow-hidden">
            {/* Animated background circles */}
            <div className="absolute top-0 left-0 w-32 h-32 bg-white/20 rounded-full -translate-x-16 -translate-y-16 animate-pulse" />
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-white/20 rounded-full translate-x-20 translate-y-20 animate-pulse animation-delay-500" />
            
            {/* Content */}
            <div className="relative z-10">
              <div className="text-8xl mb-4 animate-bounce-slow">{holidayEmoji}</div>
              <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 inline-block mb-3">
                <p className="text-white/90 text-sm font-medium">
                  {fromFriend.name} wants to celebrate!
                </p>
              </div>
              <h2 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">
                {holidayName}
              </h2>
              <p className="text-white/90 text-lg">{holiday.date}</p>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {/* Friend Info */}
            <div className="flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl">
              {fromFriend.avatar ? (
                <img 
                  src={fromFriend.avatar} 
                  alt={fromFriend.name}
                  className="w-12 h-12 rounded-full border-3 border-white shadow-lg"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                  {fromFriend.name[0].toUpperCase()}
                </div>
              )}
              <div className="text-left">
                <p className="font-semibold text-gray-800">{fromFriend.name}</p>
                <p className="text-sm text-gray-600">shared this holiday with you!</p>
              </div>
            </div>

            {/* Fun Messages */}
            <div className="text-center py-2">
              <p className="text-gray-700 text-lg font-medium">
                {getRandomMessage(holidayName)}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => {
                  onCelebrate?.();
                  onClose();
                }}
                className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all flex items-center justify-center gap-2"
              >
                <span className="text-2xl">🎉</span>
                <span>Let's Celebrate!</span>
              </button>
              
              <button
                onClick={onClose}
                className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-2xl font-medium hover:bg-gray-200 transition-colors"
              >
                Maybe Later
              </button>
            </div>

            {/* Fun footer */}
            <p className="text-center text-xs text-gray-400 pt-2">
              ✨ Make memories together! ✨
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes bounceIn {
          0% {
            opacity: 0;
            transform: scale(0.3) translateY(-20px);
          }
          50% {
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.95);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        @keyframes confetti-fall {
          0% {
            transform: translateY(-20px) rotate(0deg);
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-bounceIn {
          animation: bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
        
        .animation-delay-500 {
          animation-delay: 0.5s;
        }
      `}</style>
    </>
  );

  return ReactDOM.createPortal(content, document.body);
}

function getRandomMessage(holidayName: string): string {
  const messages = [
    `Time to make ${holidayName} unforgettable! 🌟`,
    `${holidayName} is better with friends! 💖`,
    `Ready to celebrate together? 🎊`,
    `Let's make this ${holidayName} amazing! ✨`,
    `Party time for ${holidayName}! 🥳`,
    `Join the ${holidayName} fun! 🎈`,
    `${holidayName} celebration incoming! 🎉`
  ];
  
  return messages[Math.floor(Math.random() * messages.length)];
}
