"use client";

interface RadarChartProps {
  scores: Record<string, number>; // { "A.5": 60, "A.6": 40, "A.7": 80, "A.8": 50 }
}

const AXES = [
  { key: "A.5", label: "Organizational", angle: -90 },
  { key: "A.8", label: "Technological",  angle:   0 },
  { key: "A.7", label: "Physical",       angle:  90 },
  { key: "A.6", label: "People",         angle: 180 },
];

const CX = 160, CY = 160, R = 110;
const LEVELS = [20, 40, 60, 80, 100];

function polar(angle: number, r: number) {
  const rad = (angle * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function polygonPoints(scores: number[]) {
  return AXES.map(({ angle }, i) => {
    const r = (scores[i] / 100) * R;
    const p = polar(angle, r);
    return `${p.x},${p.y}`;
  }).join(" ");
}

function gridPoints(pct: number) {
  return AXES.map(({ angle }) => {
    const p = polar(angle, (pct / 100) * R);
    return `${p.x},${p.y}`;
  }).join(" ");
}

const GRADE_COLOR = (s: number) =>
  s >= 70 ? "#22c55e" : s >= 40 ? "#f97316" : "#ef4444";

export default function RadarChart({ scores }: RadarChartProps) {
  const values = AXES.map(({ key }) => scores[key] ?? 0);
  const avg = Math.round(values.reduce((s, v) => s + v, 0) / values.length);

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width={320} height={320} viewBox="0 0 320 320">
        {/* Grid polygons */}
        {LEVELS.map(pct => (
          <polygon
            key={pct}
            points={gridPoints(pct)}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={1}
          />
        ))}

        {/* Grid level labels */}
        {LEVELS.map(pct => {
          const p = polar(-90, (pct / 100) * R);
          return (
            <text key={pct} x={p.x + 4} y={p.y} fontSize={9} fill="#9ca3af">
              {pct}%
            </text>
          );
        })}

        {/* Axis lines */}
        {AXES.map(({ angle }) => {
          const p = polar(angle, R);
          return <line key={angle} x1={CX} y1={CY} x2={p.x} y2={p.y} stroke="#d1d5db" strokeWidth={1} />;
        })}

        {/* Data polygon */}
        <polygon
          points={polygonPoints(values)}
          fill="#3b82f6"
          fillOpacity={0.2}
          stroke="#3b82f6"
          strokeWidth={2}
        />

        {/* Data points */}
        {AXES.map(({ angle, key }, i) => {
          const r = (values[i] / 100) * R;
          const p = polar(angle, r);
          return (
            <circle key={key} cx={p.x} cy={p.y} r={5} fill="#3b82f6" stroke="white" strokeWidth={2} />
          );
        })}

        {/* Axis labels */}
        {AXES.map(({ angle, label, key }) => {
          const p = polar(angle, R + 22);
          const score = scores[key] ?? 0;
          const anchor = angle === 0 ? "start" : angle === 180 ? "end" : "middle";
          return (
            <g key={key}>
              <text x={p.x} y={p.y - 4} textAnchor={anchor} fontSize={11} fontWeight={600} fill="#374151">
                {label}
              </text>
              <text x={p.x} y={p.y + 10} textAnchor={anchor} fontSize={10} fill={GRADE_COLOR(score)}>
                {score}%
              </text>
            </g>
          );
        })}

        {/* Center score */}
        <text x={CX} y={CY - 8} textAnchor="middle" fontSize={22} fontWeight="bold" fill="#1d4ed8">{avg}%</text>
        <text x={CX} y={CY + 8} textAnchor="middle" fontSize={10} fill="#6b7280">Overall</text>
      </svg>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
        {AXES.map(({ key, label }) => {
          const s = scores[key] ?? 0;
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: GRADE_COLOR(s) }} />
              <span className="text-xs text-gray-600">{key}</span>
              <span className="ml-auto text-xs font-bold" style={{ color: GRADE_COLOR(s) }}>{s}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
