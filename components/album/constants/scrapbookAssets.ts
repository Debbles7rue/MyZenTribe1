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
export const FRAME_STYLES: {
  [key: string]: {
    name: string;
    border?: string;
    shadow: string;
    padding?: string;
    background?: string;
    borderRadius?: string;
    clipPath?: string;
    category: 'decorative' | 'shape';
    isPureShape?: boolean;
  }
} = {
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
  rainbow: {
    name: '🌈 Rainbow',
    border: '8px solid transparent',
    shadow: '0 0 0 8px rgba(255,255,255,0.3), 0 4px 8px rgba(0,0,0,0.2)',
    background: 'linear-gradient(to right, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3)',
    padding: '8px',
    category: 'decorative'
  },
  notebook: {
    name: '📓 Notebook',
    border: '8px solid white',
    shadow: '0 4px 8px rgba(0,0,0,0.2)',
    background: 'repeating-linear-gradient(white 0px, white 24px, #e0e0e0 24px, #e0e0e0 25px)',
    padding: '8px',
    category: 'decorative'
  },
  watercolor: {
    name: '🎨 Watercolor',
    border: 'none',
    shadow: '0 4px 12px rgba(139,92,246,0.3)',
    clipPath: 'polygon(1% 3%, 5% 0%, 10% 2%, 15% 0%, 20% 3%, 25% 1%, 30% 2%, 35% 0%, 40% 2%, 45% 1%, 50% 0%, 55% 2%, 60% 1%, 65% 0%, 70% 3%, 75% 1%, 80% 2%, 85% 0%, 90% 3%, 95% 1%, 99% 2%, 100% 5%, 98% 10%, 100% 15%, 99% 20%, 100% 25%, 98% 30%, 100% 35%, 99% 40%, 100% 45%, 98% 50%, 100% 55%, 99% 60%, 100% 65%, 98% 70%, 100% 75%, 99% 80%, 100% 85%, 98% 90%, 99% 95%, 97% 99%, 95% 100%, 90% 98%, 85% 100%, 80% 99%, 75% 100%, 70% 98%, 65% 100%, 60% 99%, 55% 100%, 50% 98%, 45% 100%, 40% 99%, 35% 100%, 30% 98%, 25% 100%, 20% 99%, 15% 100%, 10% 98%, 5% 99%, 2% 97%, 0% 95%, 2% 90%, 0% 85%, 1% 80%, 0% 75%, 2% 70%, 0% 65%, 1% 60%, 0% 55%, 2% 50%, 0% 45%, 1% 40%, 0% 35%, 2% 30%, 0% 25%, 1% 20%, 0% 15%, 2% 10%, 0% 5%)',
    background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(236,72,153,0.1))',
    padding: '12px',
    category: 'decorative'
  },
  glitter: {
    name: '✨ Gold Glitter',
    border: '10px solid transparent',
    shadow: '0 0 20px rgba(255,215,0,0.6), 0 4px 8px rgba(0,0,0,0.3)',
    background: 'radial-gradient(circle at 20% 50%, #ffd700 0%, transparent 50%), radial-gradient(circle at 80% 20%, #ffed4e 0%, transparent 50%), radial-gradient(circle at 40% 80%, #ffd700 0%, transparent 50%), radial-gradient(circle at 60% 60%, #ffed4e 0%, transparent 50%), linear-gradient(135deg, #ffd700, #ffed4e)',
    padding: '10px',
    category: 'decorative'
  },
  metallic: {
    name: '🌙 Silver Metallic',
    border: '8px solid transparent',
    shadow: '0 4px 8px rgba(192,192,192,0.5)',
    background: 'linear-gradient(135deg, #e8e8e8 0%, #c0c0c0 25%, #e8e8e8 50%, #c0c0c0 75%, #e8e8e8 100%)',
    padding: '8px',
    category: 'decorative'
  },
  comic: {
    name: '📚 Comic Book',
    border: '6px solid #000',
    shadow: '4px 4px 0px #ffff00, 8px 8px 0px #000',
    background: 'white',
    padding: '6px',
    category: 'decorative'
  },
  confetti: {
    name: '🎊 Confetti',
    border: '10px solid white',
    shadow: '0 4px 8px rgba(0,0,0,0.2)',
    background: 'radial-gradient(circle at 10% 20%, #ff6b9d 0%, transparent 30%), radial-gradient(circle at 90% 80%, #ffc371 0%, transparent 30%), radial-gradient(circle at 70% 30%, #c3a6ff 0%, transparent 30%), radial-gradient(circle at 30% 70%, #6effc3 0%, transparent 30%), radial-gradient(circle at 50% 50%, #ff9a9e 0%, transparent 30%), white',
    padding: '10px',
    category: 'decorative'
  },
  stitched: {
    name: '🧵 Stitched',
    border: '8px solid #f5f5f5',
    shadow: '0 0 0 2px #333, 0 4px 8px rgba(0,0,0,0.2)',
    background: 'repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(51,51,51,0.1) 10px, rgba(51,51,51,0.1) 11px)',
    padding: '8px',
    category: 'decorative'
  },
  brushstroke: {
    name: '🖌️ Brush Strokes',
    border: 'none',
    shadow: '0 4px 8px rgba(0,0,0,0.2)',
    clipPath: 'polygon(2% 5%, 8% 2%, 15% 4%, 22% 1%, 30% 3%, 38% 2%, 45% 4%, 52% 1%, 60% 3%, 68% 2%, 75% 4%, 82% 1%, 90% 3%, 95% 5%, 98% 10%, 100% 18%, 99% 25%, 100% 33%, 98% 40%, 100% 48%, 99% 55%, 100% 63%, 98% 70%, 100% 78%, 99% 85%, 97% 92%, 94% 97%, 88% 99%, 82% 98%, 75% 99%, 68% 97%, 60% 99%, 52% 98%, 45% 99%, 38% 97%, 30% 99%, 22% 98%, 15% 99%, 8% 97%, 3% 94%, 1% 88%, 2% 82%, 0% 75%, 2% 68%, 1% 60%, 0% 52%, 2% 45%, 1% 38%, 0% 30%, 2% 22%, 1% 15%, 0% 8%)',
    background: 'white',
    padding: '12px',
    category: 'decorative'
  },
  carnival: {
    name: '🎪 Carnival',
    border: '12px solid transparent',
    shadow: '0 4px 8px rgba(0,0,0,0.3)',
    background: 'repeating-linear-gradient(45deg, #ff0000 0px, #ff0000 20px, #ffffff 20px, #ffffff 40px, #ff0000 40px, #ff0000 60px, #ffff00 60px, #ffff00 80px)',
    padding: '12px',
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
    clipPath: 'polygon(50% 15%, 60% 5%, 75% 5%, 90% 20%, 90% 40%, 75% 60%, 50% 90%, 25% 60%, 10% 40%, 10% 20%, 25% 5%, 40% 5%)',
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

// Helper function to get frames by category
export function getFramesByCategory(category: 'decorative' | 'shape') {
  return Object.entries(FRAME_STYLES).filter(([_, style]) => style.category === category);
}

// Get all frame categories
export const FRAME_CATEGORIES = {
  decorative: '🎨 Decorative Frames',
  shape: '⭐ Shape Crops'
};
