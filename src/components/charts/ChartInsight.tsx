interface ChartInsightProps {
  children: string;
}

export function ChartInsight({ children }: ChartInsightProps) {
  return (
    <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-600">
      <span className="font-semibold text-slate-800">Interpretacao: </span>
      {children}
    </p>
  );
}

