import React, { useRef, useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ThemeColors {
  primary: string;
  accent: string;
  secondary: string;
  applied: string;
  interviewing: string;
  technical: string;
  offer: string;
  rejected: string;
  ghosted: string;
}

interface ThemeCustomizerProps {
  colors: ThemeColors;
  onColorChange: (key: keyof ThemeColors, value: string) => void;
  onReset: () => void;
  theme: 'dark' | 'light';
}

const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return [h * 360, s * 100, l * 100];
};

const hslToRgb = (h: number, s: number, l: number): string => {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (v: number) => {
    const hex = Math.round((v + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const ColorWheel: React.FC<{ color: string; onChange: (color: string) => void }> = ({ color, onChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 180;
    const radius = size / 2;
    const centerX = radius;
    const centerY = radius;

    // Draw color wheel
    for (let angle = 0; angle < 360; angle += 1) {
      const startAngle = (angle - 90) * (Math.PI / 180);
      const endAngle = (angle + 1 - 90) * (Math.PI / 180);

      const gradient = ctx.createLinearGradient(centerX, centerY, centerX + radius * Math.cos(startAngle), centerY + radius * Math.sin(startAngle));
      gradient.addColorStop(0, 'white');
      gradient.addColorStop(1, `hsl(${angle}, 100%, 50%)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.fill();
    }

    // Draw current color selector
    try {
      const rgb = parseInt(color.slice(1), 16);
      const r = (rgb >> 16) & 255;
      const g = (rgb >> 8) & 255;
      const b = rgb & 255;
      const hsl = rgbToHsl(r, g, b);
      
      const angle = hsl[0] * (Math.PI / 180);
      const distance = (radius * hsl[1]) / 100;
      const x = centerX + distance * Math.cos(angle - Math.PI / 2);
      const y = centerY + distance * Math.sin(angle - Math.PI / 2);

      ctx.strokeStyle = 'white';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.stroke();
    } catch (e) {
      // Invalid color
    }
  }, [color]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const size = 180;
    const radius = size / 2;
    const centerX = radius;
    const centerY = radius;

    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= radius) {
      let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      if (angle < 0) angle += 360;

      const saturation = (distance / radius) * 100;
      const hex = hslToRgb(angle, saturation, 50);
      onChange(hex);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={180}
      height={180}
      onClick={handleCanvasClick}
      className="cursor-crosshair border rounded-lg"
      style={{ borderColor: 'currentColor' }}
    />
  );
};

const COLOR_GROUPS = [
  {
    label: 'Theme Colors',
    colors: [
      { key: 'primary' as const, label: 'Primary' },
      { key: 'accent' as const, label: 'Accent' },
      { key: 'secondary' as const, label: 'Secondary' },
    ]
  },
  {
    label: 'Status Colors',
    colors: [
      { key: 'applied' as const, label: 'Applied' },
      { key: 'interviewing' as const, label: 'Interviewing' },
      { key: 'technical' as const, label: 'Technical' },
      { key: 'offer' as const, label: 'Offer' },
      { key: 'rejected' as const, label: 'Rejected' },
      { key: 'ghosted' as const, label: 'Ghosted' },
    ]
  }
];

export const ThemeCustomizer: React.FC<ThemeCustomizerProps> = ({ 
  colors, 
  onColorChange, 
  onReset, 
  theme 
}) => {
  const [selectedColor, setSelectedColor] = useState<keyof ThemeColors>('primary');

  return (
    <div className="space-y-6">
      {/* Color Wheel Section */}
      <div>
        <h4 className={cn(
          "text-xs font-bold uppercase tracking-widest mb-4",
          theme === 'dark' ? "text-slate-400" : "text-slate-500"
        )}>
          Color Wheel Picker
        </h4>
        <div className="flex flex-col items-center gap-4">
          <div className={cn(
            "p-4 rounded-lg border flex justify-center",
            theme === 'dark' ? "bg-slate-900/30 border-slate-800" : "bg-slate-50 border-slate-200"
          )}>
            <ColorWheel color={colors[selectedColor]} onChange={(color) => onColorChange(selectedColor, color)} />
          </div>
          <select
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value as keyof ThemeColors)}
            className={cn(
              "w-full px-3 py-2 rounded-lg border text-sm outline-none transition-all",
              theme === 'dark'
                ? "bg-slate-800 border-slate-700 text-white focus:ring-2 focus:ring-indigo-500/30"
                : "bg-white border-slate-200 text-slate-900 focus:ring-2 focus:ring-indigo-500/10"
            )}
          >
            <option value="primary">Primary Color</option>
            <option value="accent">Accent Color</option>
            <option value="secondary">Secondary Color</option>
            <option disabled>─ Status Colors ─</option>
            <option value="applied">Applied</option>
            <option value="interviewing">Interviewing</option>
            <option value="technical">Technical</option>
            <option value="offer">Offer</option>
            <option value="rejected">Rejected</option>
            <option value="ghosted">Ghosted</option>
          </select>
        </div>
      </div>

      {/* Manual Hex Input Section */}
      <div>
        <h4 className={cn(
          "text-xs font-bold uppercase tracking-widest mb-4",
          theme === 'dark' ? "text-slate-400" : "text-slate-500"
        )}>
          Or Edit Manually
        </h4>
        <div className="space-y-4">
          {COLOR_GROUPS.map((group) => (
            <div key={group.label}>
              <h5 className={cn(
                "text-xs font-semibold uppercase tracking-widest mb-2",
                theme === 'dark' ? "text-slate-500" : "text-slate-600"
              )}>
                {group.label}
              </h5>
              <div className="grid grid-cols-2 gap-3">
                {group.colors.map(({ key, label }) => (
                  <div key={key} className="flex flex-col gap-2">
                    <label className={cn(
                      "text-xs font-semibold",
                      theme === 'dark' ? "text-slate-300" : "text-slate-700"
                    )}>
                      {label}
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={colors[key]}
                        onChange={(e) => onColorChange(key, e.target.value)}
                        className="w-10 h-9 rounded-lg cursor-pointer border-0 p-1"
                      />
                      <input
                        type="text"
                        value={colors[key].toUpperCase()}
                        onChange={(e) => {
                          const val = e.target.value.startsWith('#') ? e.target.value : '#' + e.target.value;
                          if (/^#[0-9A-F]{6}$/i.test(val)) {
                            onColorChange(key, val);
                          }
                        }}
                        className={cn(
                          "flex-1 text-xs px-2 py-1.5 rounded-lg border outline-none transition-all",
                          theme === 'dark'
                            ? "bg-slate-800 border-slate-700 text-white focus:ring-2 focus:ring-indigo-500/30"
                            : "bg-slate-50 border-slate-200 text-slate-900 focus:ring-2 focus:ring-indigo-500/10"
                        )}
                        placeholder="HEX"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onReset}
        className={cn(
          "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border font-semibold text-sm transition-all",
          theme === 'dark'
            ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
            : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
        )}
      >
        <RotateCcw size={16} />
        Reset to Default
      </button>
    </div>
  );
};
