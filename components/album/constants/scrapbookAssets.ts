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
  polaroid: {
    name: '📷 Polaroid',
    border: '12px solid white',
    shadow: '0 4px 8px rgba(0,0,0,0.3)',
    padding: '12px 12px 40px 12px',
    background: 'white'
  },
  vintage: {
    name: '🖼️ Vintage',
    border: '8px solid #d4a574',
    shadow: '0 2px 4px rgba(0,0,0,0.2)',
    padding: '8px',
    background: '#f5e6d3'
  },
  torn: {
    name: '📄 Torn Paper',
    border: 'none',
    shadow: '0 3px 6px rgba(0,0,0,0.2)',
    clipPath: 'polygon(0 2%, 3% 0, 97% 0, 100% 3%, 100% 97%, 98% 100%, 2% 100%, 0 98%)',
    background: 'white'
  },
  floral: {
    name: '🌸 Floral',
    border: '6px solid #ffc0cb',
    shadow: '0 2px 4px rgba(255,192,203,0.4)',
    borderRadius: '20px',
    background: '#fff0f5'
  },
  film: {
    name: '🎞️ Film Strip',
    border: '8px solid #333',
    shadow: '0 3px 6px rgba(0,0,0,0.3)',
    background: 'repeating-linear-gradient(90deg, transparent, transparent 8px, #333 8px, #333 12px)',
    padding: '8px'
  },
  scalloped: {
    name: '✂️ Scalloped',
    border: '4px solid #fff',
    shadow: '0 2px 4px rgba(0,0,0,0.2)',
    borderRadius: '50% 50% 50% 50% / 10% 10% 10% 10%',
    background: 'white'
  },
  stamp: {
    name: '📮 Postage Stamp',
    border: '3px dashed #d32f2f',
    shadow: '0 2px 4px rgba(0,0,0,0.2)',
    padding: '6px',
    background: 'white'
  },
  rustic: {
    name: '🪵 Rustic Wood',
    border: '10px solid #8b4513',
    shadow: '0 4px 8px rgba(0,0,0,0.3)',
    background: 'linear-gradient(45deg, #8b4513 25%, #a0522d 25%, #a0522d 50%, #8b4513 50%, #8b4513 75%, #a0522d 75%, #a0522d)',
    padding: '10px'
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
