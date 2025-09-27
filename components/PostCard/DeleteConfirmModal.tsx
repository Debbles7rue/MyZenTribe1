// components/PostCard/DeleteConfirmModal.tsx - Enhanced with better UX
"use client";

import { useEffect } from "react";

interface DeleteConfirmModalProps {
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmModal({ 
  isDeleting, 
  onConfirm, 
  onCancel 
}: DeleteConfirmModalProps) {
  
  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onCancel();
      } else if (e.key === 'Enter' && !isDeleting) {
        onConfirm();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isDeleting, onCancel, onConfirm]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isDeleting) {
      onCancel();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-modal">
          <div className="warning-icon">
            <span>⚠️</span>
          </div>
          
          <h2>Delete Post?</h2>
          
          <div className="warning-content">
            <p>This action cannot be undone. Your post will be permanently removed including:</p>
            <ul>
              <li>All photos and videos</li>
              <li>All comments and reactions</li>
              <li>All shares and engagement</li>
            </ul>
          </div>
          
          <div className="modal-buttons">
            <button 
              className="modal-cancel"
              onClick={onCancel}
              disabled={isDeleting}
              type="button"
            >
              Cancel
            </button>
            <button 
              className="modal-delete"
              onClick={onConfirm}
              disabled={isDeleting}
              type="button"
            >
              {isDeleting ? (
                <>
                  <span className="delete-spinner"></span>
                  Deleting...
                </>
              ) : (
                'Delete Post'
              )}
            </button>
          </div>
          
          <div className="keyboard-hint">
            Press <kbd>Esc</kbd> to cancel or <kbd>Enter</kbd> to confirm
          </div>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          backdrop-filter: blur(4px);
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal-content {
          background: white;
          border-radius: 20px;
          max-width: 440px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px rgba(0,0,0,0.3);
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .confirm-modal {
          padding: 32px;
          text-align: center;
        }

        .warning-icon {
          margin-bottom: 20px;
        }

        .warning-icon span {
          font-size: 48px;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
        }

        .confirm-modal h2 {
          margin: 0 0 20px 0;
          color: #dc2626;
          font-size: 24px;
          font-weight: 700;
          line-height: 1.2;
        }

        .warning-content {
          margin-bottom: 32px;
          text-align: left;
        }

        .warning-content p {
          margin: 0 0 16px 0;
          color: #4a5568;
          font-size: 15px;
          line-height: 1.6;
        }

        .warning-content ul {
          margin: 0;
          padding-left: 20px;
          color: #6b7280;
          font-size: 14px;
          line-height: 1.6;
        }

        .warning-content li {
          margin-bottom: 4px;
        }

        .modal-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-bottom: 20px;
        }

        .modal-cancel,
        .modal-delete {
          padding: 14px 24px;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          font-size: 15px;
          transition: all 0.2s ease;
          min-width: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .modal-cancel {
          background: #f8fafc;
          color: #4a5568;
          border: 1px solid #e2e8f0;
          flex: 1;
        }

        .modal-cancel:hover:not(:disabled) {
          background: #f1f5f9;
          border-color: #cbd5e0;
          transform: translateY(-1px);
        }

        .modal-cancel:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .modal-delete {
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          color: white;
          box-shadow: 0 4px 14px rgba(220,38,38,0.3);
          flex: 1;
        }

        .modal-delete:hover:not(:disabled) {
          background: linear-gradient(135deg, #b91c1c, #991b1b);
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(220,38,38,0.4);
        }

        .modal-delete:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .delete-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .keyboard-hint {
          font-size: 12px;
          color: #9ca3af;
          text-align: center;
        }

        .keyboard-hint kbd {
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          padding: 2px 6px;
          font-family: monospace;
          font-size: 11px;
          font-weight: 500;
          color: #374151;
        }

        /* Mobile Responsive */
        @media (max-width: 480px) {
          .modal-overlay {
            padding: 16px;
          }

          .confirm-modal {
            padding: 24px;
          }

          .warning-icon span {
            font-size: 40px;
          }

          .confirm-modal h2 {
            font-size: 20px;
            margin-bottom: 16px;
          }

          .warning-content {
            margin-bottom: 24px;
          }

          .warning-content p {
            font-size: 14px;
          }

          .warning-content ul {
            font-size: 13px;
          }

          .modal-buttons {
            flex-direction: column;
            gap: 8px;
          }

          .modal-cancel,
          .modal-delete {
            padding: 12px 20px;
            font-size: 14px;
          }

          .keyboard-hint {
            font-size: 11px;
          }

          .keyboard-hint kbd {
            font-size: 10px;
          }
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .modal-content {
            border: 2px solid #000;
          }

          .modal-cancel {
            border: 2px solid #000;
          }

          .modal-delete {
            background: #dc2626;
            border: 2px solid #000;
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .modal-overlay,
          .modal-content {
            animation: none;
          }

          .modal-cancel:hover,
          .modal-delete:hover {
            transform: none;
          }

          .delete-spinner {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
