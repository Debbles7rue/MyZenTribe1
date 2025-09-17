// components/ui/tooltip.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  children: React.ReactNode;
}

interface TooltipTriggerProps {
  children: React.ReactElement;
  asChild?: boolean;
}

interface TooltipContentProps {
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
}

interface TooltipContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement>;
  contentRef: React.RefObject<HTMLDivElement>;
}

const TooltipContext = React.createContext<TooltipContextValue | null>(null);

export const Tooltip: React.FC<TooltipProps> & {
  Trigger: React.FC<TooltipTriggerProps>;
  Content: React.FC<TooltipContentProps>;
} = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <TooltipContext.Provider value={{ isOpen, setIsOpen, triggerRef, contentRef }}>
      {children}
    </TooltipContext.Provider>
  );
};

const TooltipTrigger: React.FC<TooltipTriggerProps> = ({ children, asChild = true }) => {
  const context = React.useContext(TooltipContext);
  if (!context) throw new Error('TooltipTrigger must be used within Tooltip');

  const { setIsOpen, triggerRef } = context;
  const childRef = (children as any).ref;
  const ref = childRef || triggerRef;

  const handleMouseEnter = () => setIsOpen(true);
  const handleMouseLeave = () => setIsOpen(false);
  const handleFocus = () => setIsOpen(true);
  const handleBlur = () => setIsOpen(false);

  if (asChild) {
    return React.cloneElement(children, {
      ref,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onFocus: handleFocus,
      onBlur: handleBlur,
      'aria-describedby': context.isOpen ? 'tooltip' : undefined,
    });
  }

  return (
    <span
      ref={triggerRef as React.RefObject<HTMLSpanElement>}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      aria-describedby={context.isOpen ? 'tooltip' : undefined}
    >
      {children}
    </span>
  );
};

const TooltipContent: React.FC<TooltipContentProps> = ({ 
  children, 
  side = 'top', 
  align = 'center',
  sideOffset = 8 
}) => {
  const context = React.useContext(TooltipContext);
  if (!context) throw new Error('TooltipContent must be used within Tooltip');

  const { isOpen, triggerRef, contentRef } = context;
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!isOpen || !triggerRef.current || !contentRef.current) return;

    const updatePosition = () => {
      const triggerRect = triggerRef.current!.getBoundingClientRect();
      const contentRect = contentRef.current!.getBoundingClientRect();
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const scrollX = window.scrollX || document.documentElement.scrollLeft;

      let top = 0;
      let left = 0;

      // Calculate position based on side
      switch (side) {
        case 'top':
          top = triggerRect.top - contentRect.height - sideOffset + scrollY;
          break;
        case 'bottom':
          top = triggerRect.bottom + sideOffset + scrollY;
          break;
        case 'left':
          left = triggerRect.left - contentRect.width - sideOffset + scrollX;
          top = triggerRect.top + (triggerRect.height - contentRect.height) / 2 + scrollY;
          break;
        case 'right':
          left = triggerRect.right + sideOffset + scrollX;
          top = triggerRect.top + (triggerRect.height - contentRect.height) / 2 + scrollY;
          break;
      }

      // Calculate horizontal position for top/bottom
      if (side === 'top' || side === 'bottom') {
        switch (align) {
          case 'start':
            left = triggerRect.left + scrollX;
            break;
          case 'center':
            left = triggerRect.left + (triggerRect.width - contentRect.width) / 2 + scrollX;
            break;
          case 'end':
            left = triggerRect.right - contentRect.width + scrollX;
            break;
        }
      }

      // Ensure tooltip stays within viewport
      const padding = 8;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (left < padding) left = padding;
      if (left + contentRect.width > viewportWidth - padding) {
        left = viewportWidth - contentRect.width - padding;
      }

      if (top < padding + scrollY) top = padding + scrollY;
      if (top + contentRect.height > viewportHeight + scrollY - padding) {
        top = viewportHeight + scrollY - contentRect.height - padding;
      }

      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isOpen, side, align, sideOffset]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      ref={contentRef}
      id="tooltip"
      role="tooltip"
      className="tooltip-content"
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        zIndex: 9999,
      }}
    >
      <div className="bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg max-w-sm">
        <div className="relative">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

Tooltip.Trigger = TooltipTrigger;
Tooltip.Content = TooltipContent;

// Add global styles for animations
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    .tooltip-content {
      animation: tooltip-fade-in 0.15s ease-out;
      pointer-events: none;
    }

    @keyframes tooltip-fade-in {
      from {
        opacity: 0;
        transform: translateY(2px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 640px) {
      .tooltip-content {
        display: none;
      }
    }
  `;
  document.head.appendChild(style);
}

export default Tooltip;
