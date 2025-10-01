// components/BusinessTutorial.tsx
"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "mzt_business_tutorial_seen_v1";

const TUTORIAL_STEPS = [
  {
    step: 1,
    icon: "🎪",
    title: "Not Just for Businesses!",
    description: "Host a drum circle? Weekend yoga? Community garden? You DON'T need a formal business—just share what you love!",
    highlight: true,
    features: [
      "Anyone hosting events or building community can use this",
      "No business registration or paperwork required",
      "Perfect for teachers, healers, and community organizers",
      "Share your passion and connect with like-minded people"
    ],
    tip: "Whether you're a certified instructor or just someone who loves bringing people together, this space is for you!"
  },
  {
    step: 2,
    icon: "📱",
    title: "Reach Your Community",
    description: "Your business page is your hub for connecting with followers and sharing your offerings.",
    highlight: false,
    features: [
      "Posts go directly to your followers' home feeds",
      "Create events that appear in 'What's Happening' calendar",
      "Communities you're part of will help promote your events",
      "Build a loyal following of people who resonate with your work"
    ]
  },
  {
    step: 3,
    icon: "🏆",
    title: "Build Trust Through Verification",
    description: "Help people feel confident attending your events by establishing your credibility.",
    highlight: false,
    verificationLevels: [
      {
        icon: "⚠️",
        level: "Non-verified",
        description: "New to the platform - no feedback yet, attendees should use caution"
      },
      {
        icon: "⭐",
        level: "Some Social Credibility",
        description: "One or two people have attended your events or used your services"
      },
      {
        icon: "✅",
        level: "Verified",
        description: "Multiple people have attended your events with positive experiences"
      }
    ],
    tip: "Add your website, Facebook, or Instagram to help establish legitimacy from day one!"
  },
  {
    step: 4,
    icon: "🎯",
    title: "Showcase Multiple Services",
    description: "Are you a yoga instructor AND a Reiki master? Perfect! You can feature all your offerings.",
    highlight: false,
    features: [
      "List multiple services and specialties",
      "Separate sections for different types of offerings",
      "Tag your expertise areas for better discovery",
      "Let people know the full range of what you provide"
    ],
    specialNote: {
      icon: "🌟",
      title: "Multi-Talented Healers Welcome!",
      message: "Many wellness practitioners wear multiple hats. Whether you teach yoga, offer massage, lead meditation, and provide life coaching—showcase it all! Your diverse skills make you unique."
    }
  },
  {
    step: 5,
    icon: "📅",
    title: "Host Events That Matter",
    description: "Create meaningful gatherings that bring your community together.",
    highlight: false,
    features: [
      "Schedule regular classes or one-time workshops",
      "Events automatically appear in community calendars",
      "Set privacy levels for your events",
      "Communities you belong to will help promote your events"
    ],
    tip: "Regular events help build a consistent following, while special workshops can attract new community members!"
  },
  {
    step: 6,
    icon: "💳",
    title: "Display Your Offerings",
    description: "Show what you offer, but payments happen directly with you—not through the app.",
    highlight: false,
    features: [
      "Display your services with photos and descriptions",
      "Link to your booking system or website",
      "Reference external platforms (Etsy, personal website, etc.)",
      "Keep all financial arrangements between you and your clients"
    ],
    paymentNote: {
      icon: "🤝",
      title: "Direct Payment Only",
      message: "MyZenTribe doesn't handle payments. You arrange pricing, booking, and payment directly with attendees. This keeps things personal and flexible for everyone involved."
    }
  },
  {
    step: 7,
    icon: "🌱",
    title: "Grow Your Tribe",
    description: "Your business page is the foundation for building authentic connections in the wellness community.",
    highlight: true,
    features: [
      "Connect with other practitioners and businesses",
      "Join communities that align with your values",
      "Support other small businesses and healers",
      "Create the positive, supportive environment you want to see"
    ],
    finalMessage: "You're not just building a business—you're nurturing a community. Welcome to your wellness family! 🌸"
  }
];

export default function BusinessTutorial() {
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

          {/* Feature List */}
          {step.features && (
            <ul className="space-y-3 mb-6">
              {step.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="text-purple-600 font-bold mt-0.5">✓</span>
                  <span className="text-gray-700 flex-1">{feature}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Verification Levels (Step 3) */}
          {step.verificationLevels && (
            <div className="space-y-3 mb-6">
              {step.verificationLevels.map((level, idx) => (
                <div key={idx} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-2xl">{level.icon}</span>
                  <div>
                    <div className="font-semibold text-gray-900">{level.level}</div>
                    <div className="text-sm text-gray-600">{level.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Special Note (Multi-Services) */}
          {step.specialNote && (
            <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border-2 border-purple-200">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{step.specialNote.icon}</span>
                <div>
                  <div className="font-bold text-purple-900 mb-2">{step.specialNote.title}</div>
                  <div className="text-sm text-purple-800 leading-relaxed">{step.specialNote.message}</div>
                </div>
              </div>
            </div>
          )}

          {/* Payment Note (Step 6) */}
          {step.paymentNote && (
            <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{step.paymentNote.icon}</span>
                <div>
                  <div className="font-bold text-green-900 mb-2">{step.paymentNote.title}</div>
                  <div className="text-sm text-green-800 leading-relaxed">{step.paymentNote.message}</div>
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
                  <div className="font-semibold text-amber-900 text-sm mb-1">Pro Tip</div>
                  <div className="text-sm text-amber-800">{step.tip}</div>
                </div>
              </div>
            </div>
          )}

          {/* Final Message */}
          {step.finalMessage && (
            <div className="p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl border border-purple-200">
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
