// components/SiteHeader.tsx
// ONLY REPLACE THE CSS SECTION - Keep all your existing JSX/HTML exactly as is
// Find the <style jsx global>{`...`}</style> section and replace just the CSS with this:

      <style jsx global>{`
        .site-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: linear-gradient(to bottom, #ffffff, #fafafa);
          border-bottom: 1px solid rgba(147, 51, 234, 0.1);
          backdrop-filter: blur(10px);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .header-container {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 20px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        /* Brand Logo */
        .brand-logo {
          display: flex;
          align-items: center;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.5px;
          transition: transform 0.2s ease;
          flex-shrink: 0;
        }

        .brand-logo:hover {
          transform: scale(1.05);
        }

        .brand-my {
          color: #6b7280;
        }

        .brand-zen {
          color: #9333ea;
          background: linear-gradient(135deg, #9333ea, #c084fc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .brand-tribe {
          color: #1f2937;
        }

        /* Desktop Navigation - NOW ALWAYS VISIBLE */
        .desktop-nav {
          display: flex;
          align-items: center;
          gap: 4px;
          flex: 1;
          justify-content: center;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .desktop-nav::-webkit-scrollbar {
          display: none;
        }

        .nav-link {
          position: relative;
          padding: 8px 16px;
          font-size: 15px;
          font-weight: 500;
          color: #4b5563;
          border-radius: 8px;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .nav-link:hover {
          color: #1f2937;
          background: rgba(147, 51, 234, 0.05);
        }

        .nav-link.active {
          color: #9333ea;
          background: rgba(147, 51, 234, 0.1);
        }

        /* Profile Dropdown */
        .profile-dropdown {
          position: relative;
          display: inline-flex;
          align-items: center;
        }

        .dropdown-trigger {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 14px;
          background: none;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-family: inherit;
          font-size: 15px;
          font-weight: 500;
          color: #4b5563;
          transition: all 0.2s ease;
        }

        .dropdown-trigger:hover {
          color: #1f2937;
          background: rgba(147, 51, 234, 0.05);
        }

        .dropdown-trigger.active {
          color: #9333ea;
          background: rgba(147, 51, 234, 0.1);
          font-weight: 600;
        }

        .dropdown-icon {
          transition: transform 0.2s ease;
        }

        .dropdown-trigger[aria-expanded="true"] .dropdown-icon {
          transform: rotate(180deg);
        }

        .profile-menu {
          position: absolute;
          top: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%);
          min-width: 200px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
          border: 1px solid rgba(147, 51, 234, 0.1);
          overflow: hidden;
          animation: slideDown 0.2s ease;
          z-index: 1000;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        .menu-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          color: #4b5563;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .menu-item:hover {
          background: rgba(147, 51, 234, 0.05);
          color: #9333ea;
        }

        .menu-item svg {
          opacity: 0.6;
        }

        /* Desktop Actions - NOW ALWAYS VISIBLE */
        .desktop-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .sign-out-btn {
          padding: 8px 20px;
          background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
          color: #4b5563;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .sign-out-btn:hover {
          background: linear-gradient(135deg, #e5e7eb, #d1d5db);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .login-btn {
          padding: 8px 24px;
          background: linear-gradient(135deg, #9333ea, #c084fc);
          color: white;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .login-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(147, 51, 234, 0.3);
        }

        /* Hamburger Button - Still available as backup */
        .hamburger-btn {
          display: none;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: white;
          border: 1px solid rgba(147, 51, 234, 0.2);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .hamburger-btn:hover {
          background: rgba(147, 51, 234, 0.05);
        }

        .hamburger-icon {
          position: relative;
          width: 20px;
          height: 14px;
        }

        .hamburger-icon span {
          position: absolute;
          left: 0;
          width: 100%;
          height: 2px;
          background: #4b5563;
          border-radius: 1px;
          transition: all 0.3s ease;
        }

        .hamburger-icon span:nth-child(1) {
          top: 0;
        }

        .hamburger-icon span:nth-child(2) {
          top: 6px;
        }

        .hamburger-icon span:nth-child(3) {
          top: 12px;
        }

        .hamburger-icon.open span:nth-child(1) {
          top: 6px;
          transform: rotate(45deg);
        }

        .hamburger-icon.open span:nth-child(2) {
          opacity: 0;
        }

        .hamburger-icon.open span:nth-child(3) {
          top: 6px;
          transform: rotate(-45deg);
        }

        /* Mobile Menu Panel - Still available */
        .mobile-menu-panel {
          position: fixed;
          top: 64px;
          left: 0;
          right: 0;
          bottom: 0;
          background: white;
          transform: translateX(100%);
          transition: transform 0.3s ease;
          overflow-y: auto;
          z-index: 99;
        }

        .mobile-menu-panel.open {
          transform: translateX(0);
        }

        .mobile-nav {
          padding: 20px;
        }

        .mobile-nav-link {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          color: #4b5563;
          font-size: 16px;
          font-weight: 500;
          border-radius: 12px;
          transition: all 0.2s ease;
        }

        .mobile-nav-link:hover {
          background: rgba(147, 51, 234, 0.05);
          color: #9333ea;
          transform: translateX(4px);
        }

        .nav-icon {
          font-size: 20px;
          width: 28px;
          text-align: center;
        }

        .mobile-section-divider {
          height: 1px;
          background: rgba(147, 51, 234, 0.1);
          margin: 12px 0;
        }

        .mobile-sign-out {
          width: 100%;
          margin-top: 20px;
          padding: 14px;
          background: linear-gradient(135deg, #fef2f2, #fee2e2);
          color: #dc2626;
          border: 1px solid rgba(220, 38, 38, 0.2);
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .mobile-sign-out:hover {
          background: linear-gradient(135deg, #fee2e2, #fecaca);
          transform: scale(0.98);
        }

        .mobile-login-btn {
          display: block;
          padding: 16px;
          background: linear-gradient(135deg, #9333ea, #c084fc);
          color: white;
          text-align: center;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .mobile-login-btn:hover {
          transform: scale(0.98);
          box-shadow: 0 4px 20px rgba(147, 51, 234, 0.3);
        }

        .loading-placeholder {
          width: 100px;
          height: 40px;
        }

        /* Mobile Responsive adjustments */
        @media (max-width: 768px) {
          .header-container {
            padding: 0 12px;
            gap: 8px;
          }
          
          .brand-logo {
            font-size: 18px;
          }
          
          .nav-link {
            padding: 6px 10px;
            font-size: 13px;
          }
          
          .dropdown-trigger {
            padding: 6px 10px;
            font-size: 13px;
          }
          
          .sign-out-btn {
            padding: 6px 12px;
            font-size: 12px;
          }
          
          .login-btn {
            padding: 6px 14px;
            font-size: 12px;
          }
        }

        @media (max-width: 640px) {
          .header-container {
            padding: 0 8px;
            gap: 4px;
          }
          
          .brand-logo {
            font-size: 16px;
          }
          
          .nav-link {
            padding: 4px 8px;
            font-size: 12px;
          }
          
          .dropdown-trigger {
            padding: 4px 8px;
            font-size: 12px;
          }
          
          .dropdown-icon {
            width: 10px;
            height: 6px;
          }
          
          .sign-out-btn,
          .login-btn {
            padding: 4px 10px;
            font-size: 11px;
          }
          
          /* Hide some nav items on very small screens if needed */
          .desktop-nav {
            gap: 2px;
          }
        }

        @media (max-width: 480px) {
          /* On very small screens, you might want to show hamburger */
          /* Uncomment below to show hamburger on tiny screens */
          /*
          .hamburger-btn {
            display: flex;
          }
          .desktop-nav {
            display: none;
          }
          .desktop-actions {
            display: none;
          }
          */
          
          .nav-link {
            padding: 4px 6px;
            font-size: 11px;
          }
        }
      `}</style>
