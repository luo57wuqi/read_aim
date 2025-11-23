import React, { useState, useRef, useEffect } from 'react';
import { MoveIcon } from './Icons';

interface DraggableSheetProps {
  children: React.ReactNode;
  title?: string;
  onClose: () => void;
  className?: string;
  initialOffset?: { x: number; y: number };
}

export const DraggableSheet: React.FC<DraggableSheetProps> = ({ 
    children, 
    title, 
    onClose, 
    className = '',
    initialOffset = { x: 0, y: 0 }
}) => {
  // Initialize position with the provided offset
  const [position, setPosition] = useState(initialOffset);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const sheetRef = useRef<HTMLDivElement>(null);

  // Update position if initialOffset changes (optional, usually only needed on mount)
  useEffect(() => {
      if (initialOffset.x !== 0 || initialOffset.y !== 0) {
          setPosition(initialOffset);
      }
  }, [initialOffset.x, initialOffset.y]);

  // Handle Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    // Enable dragging on both mobile and desktop if grabbed by header
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      e.preventDefault(); // Prevent text selection while dragging
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      // Touch events for mobile dragging support
      window.addEventListener('touchmove', (e) => {
          if (!isDragging) return;
          const touch = e.touches[0];
          setPosition({
            x: touch.clientX - dragOffset.x,
            y: touch.clientY - dragOffset.y
          });
      }, { passive: false });
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
      {/* Backdrop for closing on click outside - only strictly blocks clicks if not dragging */}
      <div 
        className="absolute inset-0 pointer-events-auto" 
        onClick={(e) => {
            // Only close if clicking the actual backdrop, not the card
            if (e.target === e.currentTarget) onClose();
        }}
      />

      {/* The Sheet/Modal */}
      <div 
        ref={sheetRef}
        className={`
            pointer-events-auto bg-white shadow-2xl border border-slate-200 flex flex-col
            fixed
            rounded-xl max-h-[80vh] min-w-[320px] max-w-lg
            animate-fade-in
            ${className}
        `}
        style={{
            // Use transform for performant movement
            transform: `translate(${position.x}px, ${position.y}px)`
        }}
      >
        {/* Header / Drag Handle */}
        <div 
            className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/80 backdrop-blur rounded-t-xl cursor-move select-none touch-none"
            onMouseDown={handleMouseDown}
            onTouchStart={(e) => {
                const touch = e.touches[0];
                setIsDragging(true);
                setDragOffset({
                  x: touch.clientX - position.x,
                  y: touch.clientY - position.y
                });
            }}
        >
            <div className="flex items-center gap-2 text-slate-500">
                <MoveIcon className="w-4 h-4 text-indigo-400" />
                <span className="font-semibold text-slate-700 text-sm">{title || 'Details'}</span>
            </div>
            <button 
                onClick={onClose}
                className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                onMouseDown={(e) => e.stopPropagation()} 
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto overscroll-contain p-0 bg-white rounded-b-xl" onMouseDown={(e) => e.stopPropagation()}>
            {children}
        </div>
      </div>
    </div>
  );
};