import { Card } from "@/components/ui/Card";
import { Lightbulb } from "lucide-react";

interface RecommendationsPanelProps {
  recommendations: string[];
}

export function RecommendationsPanel({ recommendations }: RecommendationsPanelProps) {
  return (
    <Card>
      <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <Lightbulb className="w-5 h-5 text-blue-500" />
        Recomendações Personalizadas
      </h3>

      <div className="space-y-3">
        {recommendations.map((rec, i) => (
          <div key={i} className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3 sm:p-4">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
              {i + 1}
            </span>
            <p className="break-words text-sm leading-relaxed text-slate-700">{rec}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
