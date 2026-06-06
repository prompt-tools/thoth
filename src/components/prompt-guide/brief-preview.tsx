"use client";
import React from "react";
import type { RenderedPrompt } from "@/lib/prompt/types";

export function BriefPreview({ rendered }: { rendered: RenderedPrompt }) {
  return (
    <div className="space-y-3" data-testid="brief-items">
      {rendered.brief.items.map((item) => (
        <div key={item.questionId} className="rounded-md border border-slate-200 bg-white p-3">
          {/* TODO: bilingual when E3 is unscoped — currently zh-only per CLAUDE.md */}
          <div className="text-xs font-semibold text-slate-500">{item.title.zh}</div>
          <div className="mt-1 text-sm text-slate-900">
            {item.freeText || item.selectedOptions.map((option) => option.label.zh).join("、")}
          </div>
        </div>
      ))}
    </div>
  );
}
