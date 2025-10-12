// components/album/constants/scrapbookAssets.ts

// Types
export type ElementType = 'photo' | 'video' | 'text' | 'sticker' | 'frame' | 'label' | 'decoration';

export type AlbumElement = {
  id: string;
  type: ElementType;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  fontSize?: number;
  fontColor?: string;
  fontFamily?: string;
  frameStyle?: string;
  labelStyle?: string;
  decorationType?: string;
};

export type AlbumPage = {
  id: string;
  pageId?: string; // Database ID for existing pages
  elements: AlbumElement[];
  backgroundColor: string;
  backgroundImage?: string;
  template: string;
};

// Sticker Library
export const STICKER_LIBRARY = {
  emotions: [
    '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', 
    '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', 
    '😜', '🤪', '😝', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', 
    '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😔', '😟', '😕', 
    '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', 
    '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', 
    '😥', '😓'
  ],
  hearts: [
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', 
    '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️'
  ],
  celebration: [
    '🎉', '🎊', '🎈', '🎁', '🎂', '🎄', '🎃', '🎆', '🎇', '🧨', 
    '✨', '🎐', '🎀', '🎗️', '🎟️', '🎫', '🎖️', '🏆', '🏅', '🥇', 
    '🥈', '🥉'
  ],
  nature: [
    '🌸', '💮', '🏵️', '🌺', '🌻', '🌷', '🌹', '🥀', '🌼', '🌵', 
    '🌲', '🌳', '🌴', '🌱', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃', 
    '🌾', '🌙', '☀️', '⭐', '🌟', '✨', '⚡', '🔥', '💫', '🌈'
  ],
  animals: [
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', 
    '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦄', 
    '🐴', '🐝', '🦋', '🐌', '🐞', '🐢', '🐙', '🦀', '🐠', '🐟', 
    '🐬', '🐳', '🐋', '🦈'
  ],
  food: [
    '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', 
    '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🍔', '🍕', 
    '🌭', '🥪', '🌮', '🌯', '🍿', '🍩', '🍪', '🎂', '🍰', '🧁', 
    '🍫', '🍬', '🍭', '🍮'
  ]
};

// Frame Styles
export const FRAME_STYLES = {
  // DECORATIVE FRAMES
  polaroid: {
    name: '📷 Polaroid',
    border: '12px solid white',
    shadow: '0 4px 8px rgba(0,0,0,0.3)',
    padding: '12px 12px 40px 12px',
    background: 'white',
    category: 'decorative'
  },
  vintage: {
    name: '🖼️ Vintage',
    border: '8px solid #d4a574',
    shadow: '0 2px 4px rgba(0,0,0,0.2)',
    padding: '8px',
    background: '#f5e6d3',
    category: 'decorative'
  },
  torn: {
    name: '📄 Torn Paper',
    border: 'none',
    shadow: '0 3px 6px rgba(0,0,0,0.2)',
    clipPath: 'polygon(0 2%, 3% 0, 97% 0, 100% 3%, 100% 97%, 98% 100%, 2% 100%, 0 98%)',
    background: 'white',
    category: 'decorative'
  },
  floral: {
    name: '🌸 Floral',
    border: '6px solid #ffc0cb',
    shadow: '0 2px 4px rgba(255,192,203,0.4)',
    borderRadius: '20px',
    background: '#fff0f5',
    category: 'decorative'
  },
  film: {
    name: '🎞️ Film Strip',
    border: '8px solid #333',
    shadow: '0 3px 6px rgba(0,0,0,0.3)',
    background: 'repeating-linear-gradient(90deg, transparent, transparent 8px, #333 8px, #333 12px)',
    padding: '8px',
    category: 'decorative'
  },
  scalloped: {
    name: '✂️ Scalloped',
    border: '4px solid #fff',
    shadow: '0 2px 4px rgba(0,0,0,0.2)',
    borderRadius: '50% 50% 50% 50% / 10% 10% 10% 10%',
    background: 'white',
    category: 'decorative'
  },
  stamp: {
    name: '📮 Postage Stamp',
    border: '3px dashed #d32f2f',
    shadow: '0 2px 4px rgba(0,0,0,0.2)',
    padding: '6px',
    background: 'white',
    category: 'decorative'
  },
  rustic: {
    name: '🪵 Rustic Wood',
    border: '10px solid #8b4513',
    shadow: '0 4px 8px rgba(0,0,0,0.3)',
    background: 'linear-gradient(45deg, #8b4513 25%, #a0522d 25%, #a0522d 50%, #8b4513 50%, #8b4513 75%, #a0522d 75%, #a0522d)',
    padding: '10px',
    category: 'decorative'
  },
  double: {
    name: '🎨 Double Border',
    border: '8px solid white',
    shadow: '0 0 0 3px #8b5cf6, 0 4px 8px rgba(0,0,0,0.2)',
    padding: '8px',
    background: 'white',
    category: 'decorative'
  },
  gold: {
    name: '✨ Gold Frame',
    border: '12px solid #ffd700',
    shadow: '0 4px 8px rgba(255,215,0,0.4)',
    background: 'linear-gradient(135deg, #ffd700, #ffed4e, #ffd700)',
    padding: '12px',
    category: 'decorative'
  },
  neon: {
    name: '💫 Neon Glow',
    border: '4px solid #ff00ff',
    shadow: '0 0 20px #ff00ff, 0 0 40px #ff00ff',
    padding: '8px',
    background: '#1a1a1a',
    category: 'decorative'
  },
  cork: {
    name: '📌 Cork Board',
    border: '16px solid #c19a6b',
    shadow: '0 4px 8px rgba(0,0,0,0.3)',
    background: 'radial-gradient(circle, #d2b48c 0%, #c19a6b 100%)',
    padding: '16px',
    category: 'decorative'
  },
  
  // SHAPE CROPS
  circle: {
    name: '⭕ Circle',
    clipPath: 'circle(50% at 50% 50%)',
    border: '4px solid white',
    shadow: '0 4px 8px rgba(0,0,0,0.2)',
    category: 'shape'
  },
  star: {
    name: '⭐ Star',
    clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
    border: '4px solid #ffd700',
    shadow: '0 4px 8px rgba(255,215,0,0.4)',
    category: 'shape'
  },
  heart: {
    name: '💕 Heart',
    clipPath: 'path("M12,21.35L10.55,20.03C5.4,15.36 2,12.27 2,8.5C2,5.41 4.42,3 7.5,3C9.24,3 10.91,3.81 12,5.08C13.09,3.81 14.76,3 16.5,3C19.58,3 22,5.41 22,8.5C22,12.27 18.6,15.36 13.45,20.03L12,21.35Z")',
    border: '4px solid #ff69b4',
    shadow: '0 4px 8px rgba(255,105,180,0.4)',
    category: 'shape'
  },
  hexagon: {
    name: '⬡ Hexagon',
    clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
    border: '4px solid white',
    shadow: '0 4px 8px rgba(0,0,0,0.2)',
    category: 'shape'
  },
  octagon: {
    name: '⬢ Octagon',
    clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
    border: '4px solid white',
    shadow: '0 4px 8px rgba(0,0,0,0.2)',
    category: 'shape'
  },
  diamond: {
    name: '💎 Diamond',
    clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
    border: '4px solid #00d4ff',
    shadow: '0 4px 8px rgba(0,212,255,0.4)',
    category: 'shape'
  },
  cloud: {
    name: '☁️ Cloud',
    clipPath: 'polygon(0% 35%, 7% 25%, 15% 18%, 30% 15%, 45% 15%, 60% 18%, 75% 25%, 88% 35%, 95% 50%, 93% 65%, 85% 75%, 70% 82%, 50% 85%, 30% 82%, 15% 75%, 7% 65%, 3% 50%)',
    border: '4px solid white',
    shadow: '0 4px 8px rgba(0,0,0,0.2)',
    category: 'shape'
  },
  shield: {
    name: '🛡️ Shield',
    clipPath: 'polygon(50% 0%, 100% 20%, 100% 60%, 50% 100%, 0% 60%, 0% 20%)',
    border: '4px solid #4169e1',
    shadow: '0 4px 8px rgba(65,105,225,0.4)',
    category: 'shape'
  },
  flower: {
    name: '🌼 Flower',
    clipPath: 'polygon(50% 0%, 55% 20%, 75% 15%, 65% 35%, 85% 40%, 70% 50%, 85% 60%, 65% 65%, 75% 85%, 55% 80%, 50% 100%, 45% 80%, 25% 85%, 35% 65%, 15% 60%, 30% 50%, 15% 40%, 35% 35%, 25% 15%, 45% 20%)',
    border: '4px solid #ff69b4',
    shadow: '0 4px 8px rgba(255,105,180,0.4)',
    category: 'shape'
  },
  speech: {
    name: '💬 Speech Bubble',
    clipPath: 'polygon(0% 0%, 100% 0%, 100% 75%, 75% 75%, 75% 100%, 50% 75%, 0% 75%)',
    border: '4px solid white',
    shadow: '0 4px 8px rgba(0,0,0,0.2)',
    category: 'shape'
  },
  ticket: {
    name: '🎫 Ticket Stub',
    clipPath: 'polygon(0% 0%, 90% 0%, 95% 5%, 100% 5%, 100% 15%, 95% 15%, 95% 85%, 100% 85%, 100% 95%, 95% 95%, 90% 100%, 0% 100%)',
    border: '3px dashed #9c27b0',
    shadow: '0 2px 4px rgba(156,39,176,0.3)',
    category: 'shape'
  },
  triangle: {
    name: '▲ Triangle',
    clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
    border: '4px solid white',
    shadow: '0 4px 8px rgba(0,0,0,0.2)',
    category: 'shape'
  }
};

// Label Styles
export const LABEL_STYLES = {
  tag: {
    name: '🏷️ Gift Tag',
    bg: '#fff9c4',
    border: '2px solid #f9a825',
    shape: 'tag'
  },
  banner: {
    name: '🎀 Banner',
    bg: '#ffebee',
    border: '2px solid #e91e63',
    shape: 'banner'
  },
  ribbon: {
    name: '🎗️ Ribbon',
    bg: '#e3f2fd',
    border: '2px solid #2196f3',
    shape: 'ribbon'
  },
  badge: {
    name: '⭐ Badge',
    bg: '#fff3e0',
    border: '2px solid #ff9800',
    shape: 'badge'
  },
  ticket: {
    name: '🎫 Ticket',
    bg: '#f3e5f5',
    border: '2px dashed #9c27b0',
    shape: 'ticket'
  },
  sticker: {
    name: '✨ Sticker',
    bg: '#e8f5e9',
    border: '2px solid #4caf50',
    shape: 'circle'
  }
};

// Decorative Elements
export const DECORATIONS = {
  washiTape: [
    '🎨 Washi Tape - Stripes',
    '🎨 Washi Tape - Dots',
    '🎨 Washi Tape - Floral',
    '🎨 Washi Tape - Stars'
  ],
  clips: [
    '📎 Paper Clip',
    '📌 Push Pin',
    '🖇️ Binder Clip'
  ],
  accents: [
    '🎀 Bow',
    '⭐ Star',
    '💝 Heart',
    '🌟 Sparkle',
    '🦋 Butterfly',
    '🌺 Flower'
  ]
};

// Background Color Presets
export const BACKGROUND_COLORS = [
  '#ffffff', // White
  '#f3f4f6', // Gray
  '#fef3c7', // Yellow
  '#dbeafe', // Blue
  '#fce7f3', // Pink
  '#d1fae5', // Green
  '#fee2e2', // Red
  '#e0e7ff', // Indigo
  '#fdf4ff', // Purple
  '#f0fdf4', // Mint
  '#fff7ed', // Orange
  '#fef2f2'  // Rose
];

// Template Layouts
export const TEMPLATES = {
  freeform: { name: '🎨 Freeform', icon: '🎨' },
  grid: { name: '⊞ Grid (2x2)', icon: '⊞' },
  feature: { name: '⭐ Feature', icon: '⭐' },
  mosaic: { name: '🎭 Mosaic', icon: '🎭' }
};

// Font Families
export const FONT_FAMILIES = [
  'Arial',
  'Georgia',
  'Times New Roman',
  'Comic Sans MS',
  'Courier New',
  'Verdana',
  'Helvetica',
  'Impact'
];

// Helper function to get washi tape style
export function getWashiTapeStyle(decoration: string) {
  if (decoration.includes('Stripes')) {
    return 'repeating-linear-gradient(45deg, #ff6b9d, #ff6b9d 10px, #ffc371 10px, #ffc371 20px)';
  } else if (decoration.includes('Dots')) {
    return 'radial-gradient(circle, #c3a6ff 25%, transparent 25%), radial-gradient(circle, #c3a6ff 25%, transparent 25%)';
  } else if (decoration.includes('Floral')) {
    return 'repeating-linear-gradient(90deg, #ffd1dc, #ffd1dc 10px, #ffe4e1 10px, #ffe4e1 20px)';
  } else {
    return 'repeating-linear-gradient(45deg, #ffd700, #ffd700 5px, #ffed4e 5px, #ffed4e 10px)';
  }
}
