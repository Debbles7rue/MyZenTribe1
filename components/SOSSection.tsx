"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import SOSButton from "@/components/SOSButton";
import { getEmergencySettings } from "@/lib/sos";
import type { EmergencySettings } from "@/lib/sos";

// Dynamically import modal to avoid SSR issues
const EditSOSModal = dynamic(() => import("@/components/EditSOSModal"), { 
  ssr: false 
});

export default function SOSSection() {
  const [showEditModal, setShowEditModal] = useState(false);
  const [settings, setSettings] = useState<EmergencySettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Load settings to check if SOS is enabled
  const loadSettings = async () => {
    setLoading(true);
    const data = await getEmergencySettings();
    setSettings(data);
    setLoading(false);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleEditClick = () => {
    setShowEditModal(true);
  };

  const handleModalClose = () => {
    setShowEditModal(false);
  };

  const handleModalSaved = () => {
    loadSettings(); // Reload settings after save
  };

  return (
    <div className="sos-section">
      {/* SOS Button Container */}
      <div className="sos-container">
        {/* Main SOS Button */}
        {settings?.sos_enabled ? (
          <SOSButton 
            fixed={false} 
            className="sos-button-main"
            message="Emergency — please check on me."
          />
        ) : (
          <button 
            onClick={handleEditClick}
            className="sos-button-setup"
            aria-label="Setup SOS"
          >
            Setup SOS
          </button>
        )}

        {/* Edit Link */}
        <button
          onClick={handleEditClick}
          className="sos-edit-link"
          aria-label="Edit emergency contacts"
        >
          <svg 
            className="edit-icon" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" 
            />
          </svg>
          Edit
        </button>
      </div>

      {/* Status Indicator */}
      {!loading && (
        <div className="sos-status">
          {settings?.sos_enabled ? (
            <div className="status-active">
              <span className="status-dot active"></span>
              <span className="status-text">
                SOS Active • {settings.emergency_contact_name || "Contact set"}
              </span>
            </div>
          ) : (
            <div className="status-inactive">
              <span className="status-dot inactive"></span>
              <span className="status-text">SOS Not Configured</span>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <EditSOSModal 
          onClose={handleModalClose}
          onSaved={handleModalSaved}
        />
      )}

      <style jsx>{`
        .sos-section {
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.2);
          margin: 20px 0;
          position: relative;
          overflow: hidden;
        }

        .sos-section::before {
          content: "";
          position: absolute;
          top: -50%;
          right: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          animation: pulse 4s ease-in-out infinite;
        }

        .sos-container {
          display: flex;
          align-items: center;
          gap: 16px;
          position: relative;
          z-index: 1;
        }

        .sos-button-main {
          padding: 16px 32px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(239, 68, 68, 0.4);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .sos-button-main::before {
          content: "";
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.5);
          transform: translate(-50%, -50%);
          transition: width 0.6s, height 0.6s;
        }

        .sos-button-main:hover::before {
          width: 300px;
          height: 300px;
        }

        .sos-button-main:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 30px rgba(239, 68, 68, 0.5);
        }

        .sos-button-main:active {
          transform: translateY(0);
        }

        .sos-button-setup {
          padding: 16px 32px;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 2px dashed rgba(255, 255, 255, 0.5);
          border-radius: 12px;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .sos-button-setup:hover {
          background: rgba(255, 255, 255, 0.3);
          border-color: white;
          transform: translateY(-2px);
        }

        .sos-edit-link {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .sos-edit-link:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-1px);
        }

        .edit-icon {
          width: 16px;
          height: 16px;
        }

        .sos-status {
          margin-top: 16px;
          position: relative;
          z-index: 1;
        }

        .status-active,
        .status-inactive {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          backdrop-filter: blur(10px);
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: pulse-dot 2s infinite;
        }

        .status-dot.active {
          background: #10b981;
          box-shadow: 0 0 10px #10b981;
        }

        .status-dot.inactive {
          background: #fbbf24;
          box-shadow: 0 0 10px #fbbf24;
        }

        .status-text {
          color: white;
          font-size: 14px;
          font-weight: 500;
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.2;
          }
        }

        @keyframes pulse-dot {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        /* Mobile Responsive */
        @media (max-width: 640px) {
          .sos-section {
            padding: 16px;
            margin: 16px;
          }

          .sos-container {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }

          .sos-button-main,
          .sos-button-setup {
            width: 100%;
            padding: 14px 24px;
            font-size: 16px;
          }

          .sos-edit-link {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
