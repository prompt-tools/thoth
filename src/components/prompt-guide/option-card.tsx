"use client";
import React from "react";
import { Check, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface OptionCardProps {
  option: {
    id: string;
    label: { zh: string; en: string };
    plain: { zh: string; en: string };
    professionalTerms: string[];
    riskHint?: { zh: string; en: string };
    usageHint?: { zh: string; en: string };
  };
  active: boolean;
  onToggle: (id: string) => void;
  suggested?: boolean;
}

export function OptionCard({ option, active, onToggle, suggested = false }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(option.id)}
      aria-pressed={active}
      className={cn(
        "min-h-36 rounded-md border bg-white p-4 text-left transition hover:border-slate-400 hover:shadow-soft",
        active ? "border-slate-950 ring-4 ring-slate-100" : "border-slate-200"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-950">{option.label.zh}</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{option.plain.zh}</p>
        </div>
        <span
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
            active ? "border-slate-950 bg-slate-950 text-white" : "border-slate-300 bg-white"
          )}
          aria-hidden="true"
        >
          {active ? <Check className="h-3.5 w-3.5" /> : null}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {option.professionalTerms.slice(0, 3).map((term) => (
          <span key={term} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
            {term}
          </span>
        ))}
      </div>
      {option.usageHint ? (
        <div className="mt-2">
          <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 border border-indigo-100">
            {option.usageHint.zh}
          </span>
        </div>
      ) : null}
      {suggested ? (
        <div className="mt-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
            <Star className="h-3 w-3" />
            推荐
          </span>
        </div>
      ) : null}
      {option.riskHint ? <p className="mt-3 text-xs leading-5 text-amber-700">{option.riskHint.zh}</p> : null}
    </button>
  );
}
