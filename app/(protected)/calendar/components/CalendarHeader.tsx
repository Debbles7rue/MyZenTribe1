// app/(protected)/calendar/components/CalendarHeader.tsx
"use client";

import React from "react";
import { useRouter } from "next/navigation";

interface CalendarHeaderProps {
  mode: "my" | "invites" | "whats";
  setMode: (mode: "my" | "invites" | "whats") => void;
  isMobile: boolean;
  setOpenCreate: (open: boolean) => void;
}

export default function CalendarHeader({
  mode,
  setMode,
  isMobile,
  setOpenCreate,
}: CalendarHeaderProps) {
  const router = useRouter();

  return (
    <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-30 transition-all duration-300">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-6">
        
        {/* Mobile Header */}
        {isMobile ? (
          <div className="py-3">
            <div className="flex items-center justify-between mb-3">
              {/* Left: Extras Button */}
              <button
                onClick={() => router.push('/calendar/tools')}
                className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-all duration-200 flex items-center gap-1"
                title="Extras & Tools"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-xs font-medium">Extras</span>
              </button>

              {/* Right: Create Button */}
              <button
                onClick={() => setOpenCreate(true)}
                className="p-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                aria-label="Create event"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {/* Center: Mode Switcher with Description */}
            <div className="text-center">
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1.5 shadow-inner justify-center">
                <button
                  onClick={() => setMode("my")}
                  className={`flex-1 px-3 py-3 text-sm font-semibold rounded-lg transition-all duration-200 ${
                    mode === "my"
                      ? "bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  My Calendar
                </button>
                <button
                  onClick={() => setMode("invites")}
                  className={`flex-1 px-3 py-3 text-sm font-semibold rounded-lg transition-all duration-200 ${
                    mode === "invites"
                      ? "bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  Invites
                </button>
                <button
                  onClick={() => setMode("whats")}
                  className={`flex-1 px-3 py-3 text-sm font-semibold rounded-lg transition-all duration-200 ${
                    mode === "whats"
                      ? "bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  What's Happening
                </button>
              </div>
              
              {/* Description Text */}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 px-4">
                {mode === "my" 
                  ? "Your events, saved interests, and RSVPs." 
                  : mode === "invites"
                  ? "Event invitations from friends."
                  : "Events from followed businesses and friend invites."
                }
              </p>
            </div>
          </div>
        ) : (
          /* Desktop Header */
          <div className="py-4">
            <div className="flex items-center justify-between mb-3">
              
              {/* Left: Extras Button */}
              <button
                onClick={() => router.push('/calendar/tools')}
                className="px-5 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Extras
              </button>

              {/* Right: Create Button */}
              <button
                onClick={() => setOpenCreate(true)}
                className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Event
              </button>
            </div>

            {/* Center: Mode Switcher with Description */}
            <div className="text-center">
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1.5 shadow-inner justify-center max-w-2xl mx-auto">
                <button
                  onClick={() => setMode("my")}
                  className={`flex-1 px-6 py-4 text-base font-semibold rounded-lg transition-all duration-200 ${
                    mode === "my"
                      ? "bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  My Calendar
                </button>
                <button
                  onClick={() => setMode("invites")}
                  className={`flex-1 px-6 py-4 text-base font-semibold rounded-lg transition-all duration-200 ${
                    mode === "invites"
                      ? "bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  Invites
                </button>
                <button
                  onClick={() => setMode("whats")}
                  className={`flex-1 px-6 py-4 text-base font-semibold rounded-lg transition-all duration-200 ${
                    mode === "whats"
                      ? "bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  What's Happening
                </button>
              </div>
              
              {/* Description Text */}
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 max-w-md mx-auto">
                {mode === "my" 
                  ? "Your events, saved interests, and RSVPs." 
                  : mode === "invites"
                  ? "Event invitations from friends."
                  : "Events from followed businesses and friend invites."
                }
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
