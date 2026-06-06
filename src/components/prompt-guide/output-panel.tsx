"use client";
import React, { useMemo } from "react";
import { Clipboard } from "lucide-react";
import type { RenderedPrompt } from "@/lib/prompt/types";
import { renderMarkdown } from "@/lib/prompt/brief";
import { CopyButton } from "./copy-button";
import { BriefPreview } from "./brief-preview";

interface OutputPanelProps {
  rendered: RenderedPrompt;
}

export function OutputPanel({ rendered }: OutputPanelProps) {
  const jsonBrief = useMemo(() => JSON.stringify(rendered.brief, null, 2), [rendered.brief]);
  const markdownBrief = useMemo(() => renderMarkdown(rendered), [rendered]);

  return (
    <aside className="self-start rounded-md border border-slate-200 bg-white p-4 lg:sticky lg:top-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-950">实时输出</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">{rendered.adaptationNote.zh}</p>
        </div>
        <Clipboard className="h-5 w-5 text-slate-500" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <CopyButton label="复制中文" value={rendered.zhPrompt} />
        <CopyButton label="复制英文" value={rendered.enPrompt} />
        <CopyButton label="复制 JSON" value={jsonBrief} />
        <CopyButton label="复制 Markdown" value={markdownBrief} />
      </div>

      {rendered.warnings.length > 0 ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
          {Array.from(new Set(rendered.warnings.map((warning) => warning.zh))).map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}

      <div className="mt-5 space-y-5">
        <section>
          <div className="mb-2 text-xs font-semibold uppercase text-slate-500">Brief</div>
          <BriefPreview rendered={rendered} />
        </section>

        <section>
          <div className="mb-2 text-xs font-semibold uppercase text-slate-500">中文 Prompt</div>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-950 p-4 text-sm leading-6 text-slate-50">
            {rendered.zhPrompt}
          </pre>
        </section>

        <section>
          <div className="mb-2 text-xs font-semibold uppercase text-slate-500">English Prompt</div>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-800">
            {rendered.enPrompt}
          </pre>
        </section>
      </div>
    </aside>
  );
}
