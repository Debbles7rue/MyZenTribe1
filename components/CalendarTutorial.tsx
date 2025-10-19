// components/CalendarTutorial.tsx
"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "mzt_calendar_tutorial_seen_v1";

const TUTORIAL_STEPS = [
  {
    step: 1,
    icon: "📅",
    title: "Your Command Center for Life",
    description: "Never miss a moment or forget a task. Your calendar is split into two powerful spaces to keep you organized and connected.",
    highlight: true,
    sections: [
      {
        icon: "📋",
        title: "My Calendar",
        description: "Your personal event hub—see everything you've planned, RSVP'd to, or are interested in"
      },
      {
        icon: "🌟",
        title: "What's Happening",
        description: "Discover events from businesses you follow and invitations from friends"
      }
    ]
  },
  {
    step: 2,
    icon: "🗓️",
    title: "My Calendar: Everything in One Place",
    description: "See your entire life organized beautifully, all in one view.",
    highlight: false,
    features: [
      "Events you've planned and created",
      "Events you've RSVP'd to (confirmed attendance)",
      "Events you're interested in (maybe attending)",
      "Private personal events like 'Dinner at Grandma's'"
    ],
    tip: "Create private events for anything—even reminders like 'Call Mom' or 'Pick up prescription.' If it matters to you, put it on your calendar so nothing conflicts!"
  },
  {
    step: 3,
    icon: "✨",
    title: "Unlock Extra Features",
    description: "Head to 'Extras' to discover powerful tools that make planning effortless.",
    highlight: false,
    features: [
      "Lists for to-dos and shopping",
      "Customizable templates for recurring events",
      "Smart Coordinator for group planning",
      "Carpool Coordinator for easy ride-sharing"
    ],
    specialNote: {
      icon: "🎯",
      message: "Think of Extras as your calendar's secret superpower menu—productivity tools designed to simplify your life!"
    }
  },
  {
    step: 4,
    icon: "📝",
    title: "Lists: Never Forget Again",
    description: "Keep track of everything with flexible, draggable lists.",
    highlight: false,
    features: [
      "Create to-do lists for tasks and projects",
      "Make shopping lists so you never forget items",
      "Drag and drop items straight onto your calendar",
      "Set reminders that you can also drag to your calendar"
    ],
    tip: "Grocery shopping on Saturday? Create a shopping list, then drag it to Saturday's calendar so you remember to go!"
  },
  {
    step: 5,
    icon: "📋",
    title: "Templates: Automate the Repetitive",
    description: "Stop recreating the same events over and over. Set it up once, use it forever.",
    highlight: false,
    features: [
      "Use pre-made templates for common events",
      "Customize templates to match your needs",
      "Create your own templates from scratch",
      "Perfect for weekly meetings, monthly events, or regular activities"
    ],
    comparisonNote: {
      icon: "⏰",
      title: "Example",
      message: "Host a monthly book club? Create a template with all the details, then just pick the date each month. No more retyping everything!"
    }
  },
  {
    step: 6,
    icon: "🤝",
    title: "Smart Coordinator: Find Time Together",
    description: "Planning with friends just got ridiculously easy.",
    highlight: false,
    features: [
      "Invite friends to an event you're planning",
      "See everyone's availability in one view",
      "Smart suggestions for times that work for everyone",
      "No more endless group texts trying to find a time!"
    ],
    finalMessage: "Because coordinating schedules shouldn't be harder than the actual event. 😊"
  },
  {
    step: 7,
    icon: "🚗",
    title: "Carpool Coordinator: Rides Made Simple",
    description: "Organize transportation so everyone gets there stress-free.",
    highlight: false,
    features: [
      "See who's driving and how many seats they have",
      "Find out who needs a ride",
      "Get suggestions for centralized meeting spots",
      "Perfect for group outings, events, or carpooling to work"
    ],
    tip: "Heading to a concert with friends? Use Carpool Coordinator to figure out rides AND find a convenient meet-up spot for everyone!"
  },
  {
    step: 8,
    icon: "🌍",
    title: "What's Happening: Discover & Explore",
    description: "Find exciting events from the businesses and friends you care about.",
    highlight: false,
    features: [
      "Browse events from wellness businesses you follow",
      "See event invitations from friends",
      "RSVP to commit to attending an event",
      "Mark events as 'interested' (maybe attending) to save for later"
    ],
    specialNote: {
      icon: "💡",
      message: "Events you RSVP to or mark as interested will appear on your 'My Calendar' page for easy access and planning!"
    }
  },
  {
    step: 9,
    icon: "🎉",
    title: "Your Life, Beautifully Organized",
    description: "Everything you need to stay on top of your schedule—and actually enjoy the process.",
    highlight: true,
    features: [
      "See all your commitments in one organized view",
      "Discover new experiences and stay connected",
      "Collaborate effortlessly with friends",
      "Never double-book or forget important moments"
    ],
    finalMessage: "Life is busy, but it doesn't have to be chaotic. Your calendar helps you show up for what matters most. 🌟"
  }
];

export default function CalendarTutorial() {
 const [open, setOpen] = useState(false);
const [currentStep, setCurrentStep] = useState(0);
const [showPrompt, setShowPrompt] = useState(false); // ← ADD THIS LINE

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      setShowPrompt(true);
    }
  }, []);

  const close = (remember: boolean) => {
    if (typeof window !== "undefined" && remember) {
      localStorage.setItem(STORAGE_KEY, "1");
    }
    setOpen(false);
  };

  const goNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goPrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  const step = TUTORIAL_STEPS[currentStep];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={() => close(true)}
      />
      
      {/* Modal Panel */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header with progress */}
        <div className={`${step.highlight ? 'bg-gradient-to-br from-purple-600 to-pink-600' : 'bg-gradient-to-br from-purple-500 to-purple-700'} p-6 text-white relative`}>
          <button
            onClick={() => close(true)}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold transition-all text-xl"
            aria-label="Close tutorial"
          >
            ×
          </button>
          
          <div className="flex items-center gap-4 mb-3">
            <div className="text-5xl">{step.icon}</div>
            <div className="flex-1">
              <div className="text-sm font-medium text-purple-100 mb-1">
                Step {step.step} of {TUTORIAL_STEPS.length}
              </div>
              <h2 className="text-2xl font-bold leading-tight">{step.title}</h2>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / TUTORIAL_STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <p className="text-gray-700 text-base leading-relaxed mb-6">
            {step.description}
          </p>

          {/* Two Section Layout (Step 1) */}
          {step.sections && (
            <div className="space-y-4">
              {step.sections.map((section, idx) => (
                <div key={idx} className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-200">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{section.icon}</div>
                    <div>
                      <div className="font-bold text-purple-900 mb-1">{section.title}</div>
                      <div className="text-sm text-purple-700">{section.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Feature List */}
          {step.features && (
            <ul className="space-y-3">
              {step.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="text-purple-600 font-bold mt-0.5">✓</span>
                  <span className="text-gray-700 flex-1">{feature}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Special Note */}
          {step.specialNote && (
            <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border-2 border-purple-200">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{step.specialNote.icon}</span>
                <div className="text-sm text-purple-800 leading-relaxed">
                  {step.specialNote.message}
                </div>
              </div>
            </div>
          )}

          {/* Comparison/Example Note */}
          {step.comparisonNote && (
            <div className="mt-6 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border-2 border-amber-200">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{step.comparisonNote.icon}</span>
                <div>
                  <div className="font-bold text-amber-900 mb-2">{step.comparisonNote.title}</div>
                  <div className="text-sm text-amber-800 leading-relaxed">{step.comparisonNote.message}</div>
                </div>
              </div>
            </div>
          )}

          {/* Pro Tip */}
          {step.tip && (
            <div className="mt-6 bg-amber-50 rounded-lg p-4 border-l-4 border-amber-400">
              <div className="flex items-start gap-2">
                <span className="text-xl">💡</span>
                <div>
                  <div className="font-semibold text-amber-900 text-sm mb-1">Pro Tip</div>
                  <div className="text-sm text-amber-800">{step.tip}</div>
                </div>
              </div>
            </div>
          )}

          {/* Final Message */}
          {step.finalMessage && (
            <div className="mt-6 p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl border border-purple-200">
              <p className="text-purple-900 font-medium text-center italic">
                {step.finalMessage}
              </p>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between gap-4">
            {/* Step Indicators */}
            <div className="flex gap-2">
              {TUTORIAL_STEPS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentStep 
                      ? 'bg-purple-600 w-6' 
                      : idx < currentStep 
                        ? 'bg-purple-300' 
                        : 'bg-gray-300'
                  }`}
                  aria-label={`Go to step ${idx + 1}`}
                />
              ))}
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-2">
              {!isFirstStep && (
                <button
                  onClick={goPrev}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                >
                  Back
                </button>
              )}
              
              {!isLastStep ? (
                <button
                  onClick={goNext}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={() => close(true)}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-semibold shadow-lg"
                >
                  Let's Go! ✨
                </button>
              )}
            </div>
          </div>

          {/* Skip Tutorial Link */}
          <div className="text-center mt-3">
            <button
              onClick={() => close(false)}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Remind me later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
