"use client";

interface RiskMatrixProps {
  matrix: number[][];  // matrix[likelihood-1][impact-1] = count
}

function cellColor(l: number, i: number) {
  const score = l * i;
  if (score >= 15) return { bg: "bg-red-500",    text: "text-white",     label: "Critical" };
  if (score >= 10) return { bg: "bg-orange-400", text: "text-white",     label: "High" };
  if (score >= 5)  return { bg: "bg-yellow-300", text: "text-gray-800",  label: "Medium" };
  return              { bg: "bg-green-300",   text: "text-gray-800",  label: "Low" };
}

export default function RiskMatrix({ matrix }: RiskMatrixProps) {
  const impacts    = [1, 2, 3, 4, 5];
  const likelihoods = [5, 4, 3, 2, 1]; // top = high likelihood

  const totalRisks = matrix.flat().reduce((s, c) => s + c, 0);

  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-xs flex-wrap">
        {[
          { label: "Critical (L×I ≥ 15)", bg: "bg-red-500" },
          { label: "High (L×I 10–14)",    bg: "bg-orange-400" },
          { label: "Medium (L×I 5–9)",    bg: "bg-yellow-300" },
          { label: "Low (L×I 1–4)",       bg: "bg-green-300" },
        ].map(({ label, bg }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-sm inline-block ${bg}`} />
            <span className="text-gray-600">{label}</span>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
      <div className="flex min-w-[320px]">
        {/* Y-axis label */}
        <div className="flex items-center justify-center pr-2" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontSize: "11px", color: "#6b7280", letterSpacing: "0.05em" }}>
          LIKELIHOOD →
        </div>

        <div className="flex-1">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="w-8" />
                {impacts.map(i => (
                  <th key={i} className="text-center text-xs font-semibold text-gray-500 pb-1 w-1/5">
                    {i}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {likelihoods.map(l => (
                <tr key={l}>
                  <td className="text-center text-xs font-semibold text-gray-500 pr-2 w-8">{l}</td>
                  {impacts.map(i => {
                    const { bg, text } = cellColor(l, i);
                    const count = matrix[l - 1]?.[i - 1] ?? 0;
                    return (
                      <td key={i} className={`${bg} ${text} text-center font-bold text-sm border border-white`} style={{ height: 52, verticalAlign: "middle" }}>
                        {count > 0 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white bg-opacity-30 font-bold">
                            {count}
                          </span>
                        ) : (
                          <span className="opacity-40 text-xs">{l * i}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-center text-xs text-gray-500 mt-1 font-semibold tracking-wide">IMPACT →</div>
        </div>
      </div>
      </div>

      <p className="text-xs text-gray-500">
        Numbers in coloured cells = count of risks at that L×I intersection. Grey numbers = L×I score when no risks present. Total assessed: <strong>{totalRisks}</strong>
      </p>
    </div>
  );
}
