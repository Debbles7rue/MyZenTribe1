// app/tutorials/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import HomeTutorial from "@/components/HomeTutorial";
import ProfileTutorial from "@/components/ProfileTutorial";
import BusinessTutorial from "@/components/BusinessTutorial";
import BusinessViewerTutorial from "@/components/BusinessViewerTutorial";
import CalendarTutorial from "@/components/CalendarTutorial";
import CommunitiesTutorial from "@/components/CommunitiesTutorial";
import MeditationTutorial from "@/components/MeditationTutorial";
import KarmaTutorial from "@/components/KarmaTutorial";
import SafetyTutorial from "@/components/SafetyTutorial";

type TutorialInfo = {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  component: React.ComponentType;
  stepCount: number;
  duration: string;
};

const TUTORIALS: TutorialInfo[] = [
  {
    id: "home",
    title: "Home Feed",
    description: "Learn to navigate your feed, co-create posts with friends, and master the art of connection",
    icon: "🏠",
    color: "from-purple-500 to-pink-500",
    component: HomeTutorial,
    stepCount: 6,
    duration: "3 min"
  },
  {
    id: "profile",
    title: "Your Profile",
    description: "Discover your personal space for gratitude, memories, gifts, and authentic self-expression",
    icon: "👤",
    color: "from-purple-600 to-indigo-600",
    component: ProfileTutorial,
    stepCount: 7,
    duration: "4 min"
  },
  {
    id: "business",
    title: "Business Dashboard",
    description: "Perfect for healers, teachers, and community builders—no formal business required!",
    icon: "🎪",
    color: "from-purple-500 to-pink-600",
    component: BusinessTutorial,
    stepCount: 7,
    duration: "4 min"
  },
  {
    id: "business-viewer",
    title: "Business Safety Guide",
    description: "Stay safe while discovering wellness businesses—verification, research, and safety tips",
    icon: "🛡️",
    color: "from-blue-500 to-indigo-600",
    component: BusinessViewerTutorial,
    stepCount: 3,
    duration: "2 min"
  },
  {
    id: "calendar",
    title: "Calendar & Planning",
    description: "Master your schedule with smart coordination, templates, carpools, and discovery tools",
    icon: "📅",
    color: "from-purple-600 to-purple-700",
    component: CalendarTutorial,
    stepCount: 9,
    duration: "5 min"
  },
  {
    id: "communities",
    title: "Communities & Discovery",
    description: "Find your tribe, explore the map, and build meaningful connections worldwide",
    icon: "🌍",
    color: "from-purple-500 to-purple-700",
    component: CommunitiesTutorial,
    stepCount: 6,
    duration: "3 min"
  },
  {
    id: "meditation",
    title: "Meditation Room",
    description: "Build a practice, join group sessions, light candles, and find your inner peace",
    icon: "🧘‍♀️",
    color: "from-indigo-500 to-purple-600",
    component: MeditationTutorial,
    stepCount: 4,
    duration: "3 min"
  },
  {
    id: "karma",
    title: "Karma Corner",
    description: "Share good news, spread kindness anonymously, and be the light the world needs",
    icon: "✨",
    color: "from-emerald-500 to-teal-600",
    component: KarmaTutorial,
    stepCount: 3,
    duration: "2 min"
  },
  {
    id: "safety",
    title: "Safety & SOS",
    description: "Essential safety tools, emergency contacts, and smart practices for peace of mind",
    icon: "🚨",
    color: "from-red-500 to-rose-600",
    component: SafetyTutorial,
    stepCount: 4,
    duration: "3 min"
  }
];

export default function TutorialsPage() {
  const [activeTutorial, setActiveTutorial] = useState<string | null>(null);

  const openTutorial = (tutorialId: string) => {
    setActiveTutorial(tutorialId);
  };

  const closeTutorial = () => {
    setActiveTutorial(null);
  };

  const TutorialComponent = activeTutorial 
    ? TUTORIALS.find(t => t.id === activeTutorial)?.component 
    : null;

  return (
    <div className="tutorials-page">
      <style jsx>{`
        .tutorials-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 30%, #e9d5ff 60%, #ddd6fe 100%);
          padding: 1rem;
        }

        .tutorials-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 1rem 0;
        }

        .page-header {
          text-align: center;
          margin-bottom: 3rem;
          padding: 0 1rem;
        }

        .header-controls {
          display: flex;
          justify-content: center;
          margin-bottom: 2rem;
        }

        .btn-home {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem 2rem;
          background: white;
          color: #1f2937;
          border: 2px solid rgba(147, 51, 234, 0.2);
          border-radius: 12px;
          font-weight: 600;
          font-size: 1rem;
          text-decoration: none;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(147, 51, 234, 0.1);
          min-height: 48px;
        }

        .btn-home:hover {
          background: linear-gradient(135deg, #f9f5ff, #ede9fe);
          border-color: #9333ea;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(147, 51, 234, 0.2);
        }

        .page-title {
          font-family: "Playfair Display", ui-serif, Georgia, serif;
          font-size: 3rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 1rem;
          letter-spacing: 0.2px;
          line-height: 1.2;
        }

        .zen {
          background: linear-gradient(135deg, #9333ea, #c084fc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .page-description {
          font-size: 1.25rem;
          line-height: 1.7;
          color: #374151;
          max-width: 800px;
          margin: 0 auto 1rem;
        }

        .page-subtitle {
          font-size: 1rem;
          color: #6b7280;
          font-style: italic;
        }

        .tutorials-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 2rem;
          margin-bottom: 3rem;
        }

        .tutorial-card {
          background: white;
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 8px 24px rgba(147, 51, 234, 0.1);
          border: 1px solid rgba(147, 51, 234, 0.1);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          cursor: pointer;
        }

        .tutorial-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 6px;
          height: 100%;
          background: linear-gradient(180deg, var(--card-color, #9333ea), transparent);
          transition: width 0.3s ease;
        }

        .tutorial-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 12px 32px rgba(147, 51, 234, 0.2);
          border-color: #9333ea;
        }

        .tutorial-card:hover::before {
          width: 10px;
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .card-icon {
          font-size: 3rem;
          flex-shrink: 0;
          filter: drop-shadow(0 2px 4px rgba(147, 51, 234, 0.2));
        }

        .card-title-section {
          flex: 1;
        }

        .card-title {
          font-family: "Playfair Display", ui-serif, Georgia, serif;
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
          line-height: 1.3;
        }

        .card-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.875rem;
          color: #6b7280;
          font-weight: 500;
        }

        .card-description {
          font-size: 1rem;
          line-height: 1.6;
          color: #4b5563;
          margin-bottom: 1.5rem;
        }

        .card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .learn-button {
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #9333ea, #c084fc);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(147, 51, 234, 0.3);
          min-height: 44px;
        }

        .learn-button:hover {
          background: linear-gradient(135deg, #7c3aed, #a855f7);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(147, 51, 234, 0.4);
        }

        .difficulty-badge {
          padding: 0.5rem 1rem;
          background: rgba(147, 51, 234, 0.1);
          color: #9333ea;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
          border: 1px solid rgba(147, 51, 234, 0.2);
        }

        .closing-section {
          text-align: center;
          padding: 3rem 2rem;
          background: white;
          border-radius: 20px;
          box-shadow: 0 8px 24px rgba(147, 51, 234, 0.1);
          border: 1px solid rgba(147, 51, 234, 0.1);
        }

        .closing-title {
          font-family: "Playfair Display", ui-serif, Georgia, serif;
          font-size: 1.75rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 1rem;
        }

        .closing-text {
          font-size: 1.125rem;
          line-height: 1.7;
          color: #374151;
          max-width: 600px;
          margin: 0 auto;
        }

        /* Mobile Optimizations */
        @media (max-width: 640px) {
          .tutorials-page {
            padding: 0.5rem;
          }

          .tutorials-container {
            padding: 0.5rem 0;
          }

          .page-title {
            font-size: 2.25rem;
            margin-bottom: 0.75rem;
          }

          .page-description {
            font-size: 1.125rem;
          }

          .tutorials-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .tutorial-card {
            padding: 1.5rem;
          }

          .card-header {
            flex-direction: column;
            text-align: center;
            gap: 1rem;
          }

          .card-icon {
            font-size: 2.5rem;
          }

          .card-title {
            font-size: 1.25rem;
          }

          .card-footer {
            flex-direction: column;
            align-items: stretch;
          }

          .learn-button {
            width: 100%;
          }

          .closing-section {
            padding: 2rem 1.5rem;
          }

          .closing-title {
            font-size: 1.5rem;
          }

          .closing-text {
            font-size: 1rem;
          }

          .btn-home {
            padding: 0.75rem 1.5rem;
            font-size: 0.95rem;
          }
        }

        /* Tablet */
        @media (min-width: 641px) and (max-width: 1024px) {
          .tutorials-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .page-title {
            font-size: 2.5rem;
          }
        }

        /* Large screens */
        @media (min-width: 1200px) {
          .tutorials-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        /* Accessibility */
        @media (prefers-reduced-motion: reduce) {
          .tutorial-card,
          .learn-button,
          .btn-home,
          .tutorial-card::before {
            transition: none;
          }

          .tutorial-card:hover,
          .learn-button:hover {
            transform: none;
          }
        }
      `}</style>

      <div className="tutorials-container">
        {/* Header */}
        <div className="page-header">
          <div className="header-controls">
            <Link href="/" className="btn-home">
              ← Home
            </Link>
          </div>

          <h1 className="page-title">
            <span className="zen">Zen</span> Tutorials
          </h1>
          <p className="page-description">
            Master every corner of MyZenTribe with our comprehensive guides. Each tutorial is designed to help you get the most out of your wellness journey.
          </p>
          <p className="page-subtitle">
            Click any card below to start learning
          </p>
        </div>

        {/* Tutorials Grid */}
        <div className="tutorials-grid">
          {TUTORIALS.map((tutorial) => (
            <div 
              key={tutorial.id} 
              className="tutorial-card"
              onClick={() => openTutorial(tutorial.id)}
              style={{ '--card-color': tutorial.color.split(' ')[1] } as React.CSSProperties}
            >
              <div className="card-header">
                <span className="card-icon">{tutorial.icon}</span>
                <div className="card-title-section">
                  <h3 className="card-title">{tutorial.title}</h3>
                  <div className="card-meta">
                    <span>{tutorial.stepCount} steps</span>
                    <span>•</span>
                    <span>{tutorial.duration}</span>
                  </div>
                </div>
              </div>
              
              <p className="card-description">{tutorial.description}</p>
              
              <div className="card-footer">
                <button className="learn-button">
                  Start Tutorial →
                </button>
                <div className="difficulty-badge">
                  {tutorial.duration}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Closing Section */}
        <div className="closing-section">
          <h2 className="closing-title">Ready to Master MyZenTribe?</h2>
          <p className="closing-text">
            Each tutorial is crafted to help you navigate with confidence and connect authentically. Take your time, explore at your own pace, and remember—we're here to support your journey every step of the way.
          </p>
        </div>
      </div>

      {/* Render Active Tutorial */}
      {TutorialComponent && <TutorialComponent key={activeTutorial} />}
    </div>
  );
}
