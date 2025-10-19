// components/SafetyTutorial.tsx - UPDATED WITH SMALL POPUP
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
    title: "Set Up & Test Your SOS System",
    description: "Configure your emergency contact system now, before you ever need it. Test it to make sure it works!",
    highlight: false,
    features: [
      "Choose a trusted emergency contact person",
      "Customize your emergency message (like 'Call police' or 'Come get me')",
      "System automatically includes your GPS location",
      "CRITICAL: Test with your contact before relying on it"
    ],
    testingNote: {
      icon: "🔧",
      title: "System Check",
      message: "Test your SOS system with different devices and locations. What works at home might not work everywhere. Regular testing could save your life."
    }
  },
  {
    step: 3,
    icon: "🤝",
    title: "Smart Event & Meeting Safety",
    description: "Stay safe while building your community by following these guidelines.",
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
        icon: "🔍",
        rule: "Research Before You Go",
        description: "Check event hosts, venues, and use the buddy system for new places"
      }
    ],
    tip: "MyZenTribe can't vet every event host as the platform grows. Use your best judgment and trust your instincts!"
  },
  {
    step: 4,
    icon: "⚡",
    title: "When to Use Your SOS",
    description: "The SOS system works for different levels of situations—from uncomfortable to truly dangerous.",
    highlight: true,
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
    finalMessage: "We're here to support your safety and your connections. You deserve to feel secure while building meaningful relationships. Stay safe, beautiful soul. 💜"
  }
];

export default function SafetyTutorial() {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showPrompt, setShowPrompt] = useState(false);

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

  // Small Prompt Popup (shows first)
  if (showPrompt) {
    return (
      <>
        <div 
          className="fixed inset-0 z-[999]" 
          onClick={() => setShowPrompt(false)}
        />
        
        <div className="fixed bottom-6 right-6 z-[1000] animate-slideIn">
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-red-300 p-5 max-w-xs">
            <button
              onClick={() => {
                setShowPrompt(false);
                if (typeof window !== "undefined") {
                  localStorage.setItem(STORAGE_KEY, "1");
                }
              }}
              className="absolute top-2 right-2 w-6 h-6 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              ×
            </button>
            
            <div className="flex items-start gap-3 mb-4">
              <span className="text-3xl">👋</span>
              <div>
                <h3 className="font-bold text-gray-800 text-lg mb-1">
                  New to this page?
                </h3>
                <p className="text-sm text-gray-600">
                  Want a quick tour of the features?
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowPrompt(false);
                  setOpen(true);
                }}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl font-semibold hover:from-red-700 hover:to-rose-700 transition-all shadow-lg hover:shadow-xl"
              >
                Yes, Show Me!
              </button>
              <button
                onClick={() => setShowPrompt(false)}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Not Now
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={() => close(true)}
      />
      
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
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
          
          <div className="mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / TUTORIAL_STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <p className="text-gray-700 text-base leading-relaxed mb-6">
            {step.description}
          </p>

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

          {step.finalMessage && (
            <div className="p-4 bg-gradient-to-r from-red-100 to-pink-100 rounded-xl border border-red-200">
              <p className="text-red-900 font-medium text-center italic">
                {step.finalMessage}
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between gap-4">
            <div className="flex
