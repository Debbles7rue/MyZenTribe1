// components/album/AlbumElement.tsx
"use client";

import React from 'react';
import { AlbumElement as ElementType, FRAME_STYLES, LABEL_STYLES, getWashiTapeStyle } from './constants/scrapbookAssets';

type Props = {
  element: ElementType;
  isSelected: boolean;
  isEditable: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  onResizeStart: (corner: string, e: React.MouseEvent) => void;
};

export default function AlbumElement({ 
  element, 
  isSelected, 
  isEditable,
  onMouseDown, 
  onClick,
  onResizeStart 
}: Props) {
  
  return (
    <div
      className={`absolute transition-all ${
        isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
      }`}
      style={{
        left: `${element.x}%`,
        top: `${element.y}%`,
        width: `${element.width}%`,
        height: `${element.height}%`,
        transform: `rotate(${element.rotation}deg)`,
        zIndex: element.zIndex,
        cursor: isEditable ? 'move' : 'default',
        pointerEvents: isEditable ? 'auto' : 'none'
      }}
      onMouseDown={onMouseDown}
      onClick={onClick}
    >
      {/* Photo */}
      {element.type === 'photo' && (
        <img 
          src={element.content} 
          alt="" 
          className="w-full h-full object-cover rounded-lg shadow-lg"
          draggable={false}
        />
      )}

      {/* Frame with Photo */}
      {element.type === 'frame' && element.frameStyle && (
        <div 
          className="w-full h-full flex items-center justify-center"
          style={{
            ...FRAME_STYLES[element.frameStyle as keyof typeof FRAME_STYLES],
            boxShadow: FRAME_STYLES[element.frameStyle as keyof typeof FRAME_STYLES].shadow
          }}
        >
          <div className="w-full h-full overflow-hidden" style={{
            borderRadius: FRAME_STYLES[element.frameStyle as keyof typeof FRAME_STYLES].borderRadius
          }}>
            <img 
              src={element.content} 
              alt="" 
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        </div>
      )}

      {/* Video */}
      {element.type === 'video' && (
        <video 
          src={element.content}
          controls
          className="w-full h-full object-cover rounded-lg shadow-lg"
        />
      )}

      {/* Text */}
      {element.type === 'text' && (
        <div 
          className="p-2 flex items-center justify-center h-full"
          style={{
            fontSize: `${element.fontSize}px`,
            color: element.fontColor,
            fontFamily: element.fontFamily,
            textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
            wordBreak: 'break-word',
            textAlign: 'center'
          }}
        >
          {element.content}
        </div>
      )}

      {/* Label */}
      {element.type === 'label' && element.labelStyle && (
        <div 
          className="w-full h-full flex items-center justify-center p-2 rounded-lg shadow-md"
          style={{
            backgroundColor: LABEL_STYLES[element.labelStyle as keyof typeof LABEL_STYLES].bg,
            border: LABEL_STYLES[element.labelStyle as keyof typeof LABEL_STYLES].border,
            fontSize: `${element.fontSize}px`,
            color: element.fontColor,
            fontFamily: element.fontFamily,
            fontWeight: 'bold'
          }}
        >
          {element.content}
        </div>
      )}

      {/* Sticker */}
      {element.type === 'sticker' && (
        <div 
          className="flex items-center justify-center w-full h-full"
          style={{ 
            fontSize: `${Math.min(element.width, element.height) * 0.8}px`,
            lineHeight: 1
          }}
        >
          {element.content}
        </div>
      )}

      {/* Decoration */}
      {element.type === 'decoration' && (
        <div 
          className="flex items-center justify-center w-full h-full"
          style={{ fontSize: `${element.fontSize}px` }}
        >
          {element.content.includes('Washi Tape') ? (
            <div 
              className="w-full h-full"
              style={{
                background: getWashiTapeStyle(element.content),
                borderRadius: '4px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
            />
          ) : (
            <span>{element.content.split(' - ')[0]}</span>
          )}
        </div>
      )}

      {/* Resize Handles - Only show when selected and editable */}
      {isSelected && isEditable && (
        <>
          <div
            className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-nw-resize z-10"
            onMouseDown={(e) => {
              e.stopPropagation();
              onResizeStart('nw', e);
            }}
          />
          <div
            className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-ne-resize z-10"
            onMouseDown={(e) => {
              e.stopPropagation();
              onResizeStart('ne', e);
            }}
          />
          <div
            className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-sw-resize z-10"
            onMouseDown={(e) => {
              e.stopPropagation();
              onResizeStart('sw', e);
            }}
          />
          <div
            className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-se-resize z-10"
            onMouseDown={(e) => {
              e.stopPropagation();
              onResizeStart('se', e);
            }}
          />
        </>
      )}
    </div>
  );
}
