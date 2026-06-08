import { Card } from "@/components/ui/Card";
import { getRiskColor, getRiskLabel } from "@/lib/recommendations";
import type { FatigueAnalysis } from "@/types/dailyRecord";

interface RiskIndicatorProps {
  analysis: FatigueAnalysis;
}

export function RiskIndicator({ analysis }: RiskIndicatorProps) {
  const color = getRiskColor(analysis.level);
  const label = getRiskLabel(analysis.level);
  const pct = analysis.score;

  return (
    <Card>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-semibold text-slate-800">Índice de Risco de Fadiga</h3>
        <span
          className="w-fit rounded-full px-3 py-1 text-sm font-semibold text-white"
          style={{ backgroundColor: color }}
        >
          {label}
        </span>
      </div>

      <div className="mb-4 flex items-end gap-3 sm:gap-4">
        <span className="text-4xl font-black text-slate-900 sm:text-5xl">{pct}</span>
        <span className="text-slate-400 text-lg mb-1">/100</span>
      </div>

      <div className="w-full bg-slate-100 rounded-full h-3 mb-4">
        <div
          className="h-3 rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>

      {analysis.factors.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Fatores detectados</p>
          <ul className="space-y-1">
            {analysis.factors.slice(0, 4).map((f, i) => (
              <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
