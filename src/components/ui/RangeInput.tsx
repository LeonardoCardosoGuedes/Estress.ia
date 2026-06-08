"use client";

import { InputHTMLAttributes, forwardRef } from "react";

interface RangeInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  value: number;
  min?: number;
  max?: number;
  error?: string;
  leftLabel?: string;
  rightLabel?: string;
}

export const RangeInput = forwardRef<HTMLInputElement, RangeInputProps>(
  ({ label, value, min = 1, max = 5, error, leftLabel, rightLabel, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <label className="min-w-0 text-sm font-medium text-slate-700">{label}</label>
          <span className="text-lg font-bold text-blue-600">{value}</span>
        </div>
        <input
          ref={ref}
          type="range"
          min={min}
          max={max}
          value={value}
          className="w-full h-2 rounded-full accent-blue-600 cursor-pointer"
          {...props}
        />
        {(leftLabel || rightLabel) && (
          <div className="flex justify-between gap-3 text-xs text-slate-400">
            <span className="min-w-0">{leftLabel}</span>
            <span className="min-w-0 text-right">{rightLabel}</span>
          </div>
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

RangeInput.displayName = "RangeInput";
