// components/SafetyTutorial.tsx
"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "mzt_safety_tutorial_seen_v1";

const TUTORIAL_STEPS = [
  {
    step: 1,
    icon: "🛡️",
    title: "Your Safety Matters Most",
    description: "While we hope every interaction is positive, it's important to stay aware and prepared. Your safety is our priority.",
    highlight: true,
    features: [
      "Tools to help you stay safe at events and meetups",
      "Emergency contact system for uncomfortable situations",
      "Guidelines for meeting new people safely",
      "Resources to trust your instincts and stay protected"
    ],
    safetyNote: {
      icon: "⚠️",
      title: "Reality Check",
      message: "As much as we'd love the world to be perfect, not everyone has good intentions. These tools help you enjoy community while staying smart and safe."
    }
  },
  {
    step: 2,
    icon: "🚨",
    title: "Set Up Your SOS System",
    description: "Configure your emergency contact system now, before you ever need it. Hope for the best, prepare for the worst.",
    highlight: false,
    features: [
      "Choose a trusted emergency contact person",
      "Customize your emergency message",
      "System automatically includes your GPS location",
      "Quick access through the floating SOS button"
    ],
    setupSteps: [
      {
        icon: "👤",
        step: "Choose Contact",
        description: "Pick someone who will respond quickly and take action"
      },
      {
        icon: "📝",
        step: "Write Message",
        description: "Pre-write messages like 'Call police' or 'Come get me'"
      },
      {
        icon: "🧪",
        step: "Test the System",
        description: "CRITICAL: Test with your contact before relying on it"
      }
    ]
  },
  {
    step: 3,
    icon: "📍",
    title: "Smart Event Safety",
    description: "Attending events with new people? Follow these guidelines to stay safe while building your community.",
    highlight: false,
    features: [
      "Research event hosts and venues beforehand",
      "Check for reviews or testimonials when available",
      "Use the buddy system for unfamiliar events",
      "Know your exit routes and transportation options"
    ],
    tip: "MyZenTribe can't vet every event host as the platform grows. Use your best judgment and trust your instincts!"
  },
  {
    step: 4,
    icon: "🤝",
    title: "Meeting People Safely",
    description: "Building your tribe means connecting with new people—here's how to do it wisely.",
    highlight: false,
    guidelines: [
      {
        icon: "📱",
        rule: "Tell Someone Where You're Going",
        description: "Always let a friend or family member know your plans"
      },
      {
        icon: "🚗",
        rule: "Arrange Your Own Transportation",
        description: "Drive yourself or have a backup plan to leave independently"
      },
      {
        icon: "🎯",
        rule: "Trust Your Instincts",
        description: "If something feels off, it probably is—don't ignore that feeling"
      },
      {
        icon: "🔒",
        rule: "Keep Personal Details Private",
        description: "Be cautious about sharing address, workplace, or routine details"
      }
    ]
  },
  {
    step: 5,
    icon: "⚡",
    title: "When to Use Your SOS",
    description: "The SOS system works for different levels of situations—from uncomfortable to truly dangerous.",
    highlight: false,
    sosScenarios: [
      {
        icon: "😰",
        situation: "Uncomfortable Situations",
        examples: "Event feels weird, person making you uneasy, want backup on your way home",
        action: "Use SOS to alert your contact for support or check-ins"
      },
      {
        icon: "⚠️",
        situation: "Concerning Situations", 
        examples: "Lost in unfamiliar area, car trouble at night, person won't take no for answer",
        action: "Use SOS for immediate contact assistance and location sharing"
      },
      {
        icon: "🚨",
        situation: "True Emergencies",
        examples: "Being followed, threatened, or in immediate danger",
        action: "Call 911 first, then use SOS to alert your contact"
      }
    ],
    tip: "Your SOS is there for peace of mind—use it whenever you feel uncertain, not just in worst-case scenarios!"
  },
  {
    step: 6,
    icon: "🧪",
    title: "Test Your Safety System",
    description: "Your SOS system is only effective if it works when you need it. Test it now!",
    highlight: false,
    features: [
      "Send a test message to your emergency contact",
      "Verify they receive the message and location",
      "Make sure they know how to respond",
      "Update your system if anything doesn't work"
    ],
    testingNote: {
      icon: "🔧",
      title: "System Check",
      message: "Test your SOS system with different devices and locations. What works at home might not work everywhere. Regular testing could save your life."
    }
  },
  {
    step: 7,
    icon: "💜",
    title: "Stay Safe, Stay Connected",
    description: "Safety doesn't mean living in fear—it means being smart so you can enjoy community with peace of mind.",
    highlight: true,
    features: [
      "Your safety tools are always available when you need them",
      "Trust your community, but verify when meeting new people",
      "Report suspicious behavior to help protect others",
      "Enjoy building your tribe with confidence and wisdom"
    ],
    finalMessage: "We're here to support your safety and your connections. You deserve to feel secure while building meaningful relationships. Stay safe, beautiful soul. 💜"
  }
];

export default function SafetyTutorial() {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      setOpen(true);
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
        <div className={`${step.highlight ? 'bg-gradient-to-br from-red-600 to-rose-600' : 'bg-gradient-to-br from-red-500 to-pink-600'} p-6 text-white relative`}>
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
              <div className="text-sm font-medium text-red-100 mb-1">
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

          {/* Feature List */}
          {step.features && (
            <ul className="space-y-3 mb-6">
              {step.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="text-red-600 font-bold mt-0.5">✓</span>
                  <span className="text-gray-700 flex-1">{feature}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Safety Note (Step 1) */}
          {step.safetyNote && (
            <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border-2 border-amber-200">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{step.safetyNote.icon}</span>
                <div>
                  <div className="font-bold text-amber-900 mb-2">{step.safetyNote.title}</div>
                  <div className="text-sm text-amber-800 leading-relaxed">{step.safetyNote.message}</div>
                </div>
              </div>
            </div>
          )}

          {/* Setup Steps (Step 2) */}
          {step.setupSteps && (
            <div className="space-y-3 mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">Setup Process:</div>
              {step.setupSteps.map((setupStep, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <span className="text-xl">{setupStep.icon}</span>
                  <div>
                    <div className="font-semibold text-red-900 text-sm">{setupStep.step}</div>
                    <div className="text-xs text-red-700">{setupStep.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Guidelines (Step 4) */}
          {step.guidelines && (
            <div className="space-y-3 mb-6">
              {step.guidelines.map((guideline, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <span className="text-xl">{guideline.icon}</span>
                  <div>
                    <div className="font-semibold text-blue-900 text-sm">{guideline.rule}</div>
                    <div className="text-xs text-blue-700">{guideline.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SOS Scenarios (Step 5) */}
          {step.sosScenarios && (
            <div className="space-y-4 mb-6">
              {step.sosScenarios.map((scenario, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-start gap-3 mb-2">
                    <span className="text-2xl">{scenario.icon}</span>
                    <div className="font-semibold text-gray-900">{scenario.situation}</div>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    <strong>Examples:</strong> {scenario.examples}
                  </div>
                  <div className="text-sm text-red-700 font-medium">
                    <strong>Action:</strong> {scenario.action}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Emergency Steps (Step 5) */}
          {step.emergencySteps && (
            <div className="space-y-3 mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">Emergency Protocol:</div>
              {step.emergencySteps.map((emergencyStep, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <span className="text-xl">{emergencyStep.icon}</span>
                  <div>
                    <div className="font-semibold text-red-900 text-sm">{emergencyStep.action}</div>
                    <div className="text-xs text-red-700">{emergencyStep.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Testing Note (Step 6) */}
          {step.testingNote && (
            <div className="mb-6 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl p-4 border-2 border-cyan-200">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{step.testingNote.icon}</span>
                <div>
                  <div className="font-bold text-cyan-900 mb-2">{step.testingNote.title}</div>
                  <div className="text-sm text-cyan-800 leading-relaxed">{step.testingNote.message}</div>
                </div>
              </div>
            </div>
          )}

          {/* Pro Tip */}
          {step.tip && (
            <div className="mb-6 bg-amber-50 rounded-lg p-4 border-l-4 border-amber-400">
              <div className="flex items-start gap-2">
                <span className="text-xl">💡</span>
                <div>
                  <div className="font-semibold text-amber-900 text-sm mb-1">Important Note</div>
                  <div className="text-sm text-amber-800">{step.tip}</div>
                </div>
              </div>
            </div>
          )}

          {/* Final Message */}
          {step.finalMessage && (
            <div className="p-4 bg-gradient-to-r from-red-100 to-pink-100 rounded-xl border border-red-200">
              <p className="text-red-900 font-medium text-center italic">
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
                      ? 'bg-red-600 w-6' 
                      : idx < currentStep 
                        ? 'bg-red-300' 
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
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={() => close(true)}
                  className="px-6 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-lg hover:from-red-700 hover:to-rose-700 transition-all font-semibold shadow-lg"
                >
                  Stay Safe 🛡️
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
