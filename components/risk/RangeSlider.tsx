"use client";

interface RangeSliderProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  valueLabelMap?: Record<number, string>;
  color?: "blue" | "orange" | "purple";
  onChange: (v: number) => void;
}

const TRACK_COLORS = {
  blue:   "accent-blue-600",
  orange: "accent-orange-500",
  purple: "accent-purple-600",
};

const BADGE_COLORS: Record<number, string> = {
  1: "bg-green-100 text-green-800",
  2: "bg-lime-100 text-lime-800",
  3: "bg-yellow-100 text-yellow-800",
  4: "bg-orange-100 text-orange-800",
  5: "bg-red-100 text-red-800",
};

export default function RangeSlider({
  label, value, min = 1, max = 5, valueLabelMap, color = "blue", onChange,
}: RangeSliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  const valueLabel = valueLabelMap?.[value] ?? String(value);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${BADGE_COLORS[value] ?? "bg-gray-100 text-gray-700"}`}>
            {valueLabel}
          </span>
          <span className="text-sm font-bold text-gray-900 w-5 text-right">{value}</span>
        </div>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${TRACK_COLORS[color]}`}
          style={{
            background: `linear-gradient(to right, currentColor ${pct}%, #e5e7eb ${pct}%)`,
          }}
        />
        <div className="flex justify-between mt-1">
          {Array.from({ length: max - min + 1 }, (_, i) => i + min).map(n => (
            <span key={n} className="text-xs text-gray-400" style={{ width: "20%" + (n === min ? " text-left" : n === max ? " text-right" : " text-center") }}>
              {n}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
