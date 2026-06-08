import { Card } from "@/components/ui/Card";
import { AlertTriangle, CheckCircle } from "lucide-react";

interface AlertsPanelProps {
  alerts: string[];
}

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  return (
    <Card>
      <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-amber-500" />
        Alertas Inteligentes
      </h3>

      {alerts.length === 0 ? (
        <div className="flex items-start gap-3 rounded-xl bg-green-50 p-3">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-700">Nenhum alerta no momento. Continue mantendo uma rotina equilibrada!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="break-words text-sm text-amber-800">{alert}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
