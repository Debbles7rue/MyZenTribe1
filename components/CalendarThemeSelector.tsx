// components/CalendarThemeSelector.tsx
"use client";

import React, { useState } from "react";

type CalendarTheme = "default" | "spring" | "summer" | "autumn" | "winter" | "nature" | "ocean";

interface ThemeOption {
  id: CalendarTheme;
  name: string;
  description: string;
  colors: string[];
  icon: string;
}

const themeOptions: ThemeOption[] = [
  {
    id: "default",
    name: "Classic",
    description: "Clean and professional",
    colors: ["#3b82f6", "#8b5cf6", "#f59e0b", "#059669", "#7c3aed"],
    icon: "⚡"
  },
  {
    id: "spring",
    name: "Spring",
    description: "Fresh greens and bright colors",
    colors: ["#10b981", "#22c55e", "#eab308", "#0ea5e9", "#16a34a"],
    icon: "🌸"
  },
  {
    id: "summer",
    name: "Summer",
    description: "Warm and vibrant",
    colors: ["#f97316", "#ef4444", "#f59e0b", "#ea580c", "#c2410c"],
    icon: "☀️"
  },
  {
    id: "autumn",
    name: "Autumn",
    description: "Rich earth tones",
    colors: ["#c2410c", "#dc2626", "#d97706", "#ea580c", "#b91c1c"],
    icon: "🍂"
  },
  {
    id: "winter",
    name: "Winter",
    description: "Cool blues and purples",
    colors: ["#2563eb", "#7c3aed", "#6366f1", "#8b5cf6", "#0284c7"],
    icon: "❄️"
  },
  {
    id: "nature",
    name: "Nature",
    description: "Forest and earth inspired",
    colors: ["#14b8a6", "#16a34a", "#65a30d", "#10b981", "#84cc16"],
    icon: "🌿"
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Blues and aquatic tones",
    colors: ["#0ea5e9", "#06b6d4", "#0284c7", "#0d9488", "#10b981"],
    icon: "🌊"
  }
];

interface Props {
  currentTheme: CalendarTheme;
  onThemeChange: (theme: CalendarTheme) => void;
  className?: string;
}

export default function CalendarThemeSelector({ currentTheme, onThemeChange, className = "" }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const currentThemeOption = themeOptions.find(theme => theme.id === currentTheme) || themeOptions[0];

  return (
    <div className={`theme-selector ${className}`}>
      <button
        className="theme-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        title="Change calendar theme"
      >
        <span className="theme-icon">{currentThemeOption.icon}</span>
        <span className="theme-name">{currentThemeOption.name}</span>
        <span className="theme-arrow">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <>
          <div className="theme-backdrop" onClick={() => setIsOpen(false)} />
          <div className="theme-dropdown" role="listbox">
            {themeOptions.map((theme) => (
              <button
                key={theme.id}
                className={`theme-option ${theme.id === currentTheme ? "active" : ""}`}
                onClick={() => {
                  onThemeChange(theme.id);
                  setIsOpen(false);
                }}
                role="option"
                aria-selected={theme.id === currentTheme}
              >
                <div className="theme-option-header">
                  <span className="theme-option-icon">{theme.icon}</span>
                  <div className="theme-option-info">
                    <span className="theme-option-name">{theme.name}</span>
                    <span className="theme-option-desc">{theme.description}</span>
                  </div>
                </div>
                <div className="theme-colors">
                  {theme.colors.map((color, index) => (
                    <div
                      key={index}
                      className="theme-color-dot"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <style jsx>{`
        .theme-selector {
          position: relative;
          display: inline-block;
        }

        .theme-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          transition: all 0.2s ease;
          min-width: 120px;
        }

        .theme-button:hover {
          background: #f9fafb;
          border-color: #d1d5db;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .theme-icon {
          font-size: 16px;
          width: 20px;
          text-align: center;
        }

        .theme-name {
          flex: 1;
          text-align: left;
        }

        .theme-arrow {
          font-size: 12px;
          opacity: 0.6;
          transition: transform 0.2s ease;
        }

        .theme-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 999;
        }

        .theme-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 4px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.15);
          z-index: 1000;
          overflow: hidden;
          min-width: 280px;
        }

        .theme-option {
          display: block;
          width: 100%;
          padding: 12px 16px;
          background: none;
          border: none;
          cursor: pointer;
          transition: background 0.2s ease;
          text-align: left;
        }

        .theme-option:hover {
          background: #f9fafb;
        }

        .theme-option.active {
          background: #f3f4f6;
          border-left: 3px solid #7c3aed;
        }

        .theme-option-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .theme-option-icon {
          font-size: 18px;
          width: 24px;
          text-align: center;
        }

        .theme-option-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .theme-option-name {
          font-weight: 600;
          color: #111827;
          font-size: 14px;
        }

        .theme-option-desc {
          font-size: 12px;
          color: #6b7280;
        }

        .theme-colors {
          display: flex;
          gap: 6px;
          padding-left: 36px;
        }

        .theme-color-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.8);
          box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }

        /* Mobile responsive */
        @media (max-width: 640px) {
          .theme-dropdown {
            position: fixed;
            top: auto;
            bottom: 0;
            left: 0;
            right: 0;
            margin: 0;
            border-radius: 16px 16px 0 0;
            max-height: 60vh;
            overflow-y: auto;
          }

          .theme-option {
            padding: 16px 20px;
          }
        }
      `}</style>
    </div>
  );
}
