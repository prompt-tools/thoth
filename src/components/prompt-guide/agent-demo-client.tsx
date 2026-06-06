"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Sparkles, Wand2, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OptionCard } from "./option-card";
import { OutputPanel } from "./output-panel";
import { CopyButton } from "./copy-button";
import { PromptGuideErrorBoundary } from "./error-boundary";
import { useAgentGuideController } from "./use-agent-guide-controller";
import type { CatalogOption } from "@/lib/prompt/agent/catalog-manifest";
import type { Precision } from "@/lib/prompt/agent/gradient";
import { PROVIDER_PRESETS } from "@/lib/prompt/agent/providers";
import {
  subscribeAgentLog,
  getAgentLog,
  clearAgentLog,
  type AgentLogEntry,
} from "@/lib/prompt/agent/debug-log";

/** Adapt the lean catalog option into the shape OptionCard expects. */
function toCardOption(option: CatalogOption) {
  return {
    id: option.id,
    label: { zh: option.label, en: option.label },
    plain: { zh: option.plain, en: option.plain },
    professionalTerms: [] as string[],
  };
}

function KeyGate({
  initialProviderId,
  readKeyFor,
  onSubmit,
}: {
  initialProviderId: string;
  readKeyFor: (id: string) => string;
  onSubmit: (providerId: string, key: string) => void;
}) {
  const [providerId, setProviderId] = useState(initialProviderId);
  // Start empty for deterministic SSR/first-render HTML; fill the saved key
  // after mount to avoid a hydration mismatch (localStorage is server-empty).
  const [value, setValue] = useState("");
  useEffect(() => {
    setValue(readKeyFor(initialProviderId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function switchProvider(id: string) {
    setProviderId(id);
    setValue(readKeyFor(id)); // restore that provider's saved key if any
  }

  const placeholder = providerId === "anthropic" ? "sk-ant-..." : "sk-...";

  return (
    <div className="mx-auto mt-10 max-w-md rounded-md border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-950">连接模型服务商</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        BYOK（自带 key）：key 仅保存在你浏览器的 localStorage。调用经本地代理（/api/llm）转发到服务商，绕开浏览器跨域限制。
      </p>

      <label className="mt-4 block text-xs font-medium text-slate-500">服务商</label>
      <select
        value={providerId}
        onChange={(e) => switchProvider(e.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
      >
        {PROVIDER_PRESETS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>

      <label className="mt-4 block text-xs font-medium text-slate-500">API Key</label>
      <input
        type="password"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
      />
      <Button
        type="button"
        onClick={() => onSubmit(providerId, value)}
        className="mt-4 w-full justify-center"
      >
        开始
      </Button>
      <p className="mt-3 text-xs text-slate-500">
        <Link href="/" className="text-teal-700 hover:underline">
          ← 返回线上版
        </Link>
      </p>
    </div>
  );
}

// Two user-facing tiers only. Internally we reuse the existing 3-level Precision
// scale (simple/standard/detailed) so all gradient/active-dimension logic is
// unchanged — "专业" maps to the most thorough end (detailed: asks every dim).
// NOTE: "standard" is now an internal-only value with no UI label — nothing sets
// it (default + restart use "simple"); it stays in the Precision type/order so the
// gradient logic is untouched. If a tier between simple/detailed is ever needed,
// add it back here rather than re-wiring the threshold checks.
const PRECISION_OPTIONS: { value: Precision; label: string; hint: string }[] = [
  { value: "simple", label: "简单", hint: "几个核心问题" },
  { value: "detailed", label: "专业", hint: "问得更全，每题可展开全部选项" },
];

function PrecisionSelector({
  value,
  onChange,
}: {
  value: Precision;
  onChange: (p: Precision) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-slate-500">提问精细度</span>
      <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
        {PRECISION_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            title={opt.hint}
            className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
              value === opt.value
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <span className="text-xs text-slate-400">
        {PRECISION_OPTIONS.find((o) => o.value === value)?.hint}
      </span>
    </div>
  );
}

function DescribeStep({
  onStart,
  precision,
  onPrecisionChange,
}: {
  onStart: (text: string) => void;
  precision: Precision;
  onPrecisionChange: (p: Precision) => void;
}) {
  const [text, setText] = useState("");
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <PrecisionSelector value={precision} onChange={onPrecisionChange} />
      <h2 className="mt-4 text-base font-semibold text-slate-950">用一句话说说你想要的图</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        随便说，比如「海边回眸的女生，胶片感」或「白底的耳机产品图」。AI 会据此判断该问哪些问题；不想写也可以直接开始。
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="例如：日落雪山的壮阔风景，电影感"
        className="mt-3 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm leading-6 focus:border-slate-900 focus:outline-none"
      />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="button" onClick={() => onStart(text)} className="justify-center">
          开始
        </Button>
        <button
          type="button"
          onClick={() => onStart("")}
          className="text-sm font-medium text-slate-500 underline-offset-2 hover:underline"
        >
          跳过，直接让 AI 问
        </button>
      </div>
    </section>
  );
}

/** Professional mode: a collapsible that reveals every catalog option for the
 *  current dimension, beyond the AI-narrowed `visibleOptions`. Selecting routes
 *  through the same `toggleDraft`, so picks behave identically.
 *  The call site keys this on the question id so the uncontrolled <details>
 *  open-state resets between questions instead of leaking open. */
function AllOptionsDisclosure({
  options,
  dimensionTitle,
  draft,
  suggestedIds,
  onToggle,
}: {
  options: CatalogOption[];
  dimensionTitle: string;
  draft: string[];
  suggestedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <details className="mt-4 rounded-md border border-slate-200 bg-slate-50/60">
      <summary
        className="cursor-pointer select-none px-4 py-2.5 text-sm font-medium text-slate-700"
        aria-label={`${dimensionTitle}：显示全部选项（${options.length}）`}
      >
        显示全部选项（{options.length}）
      </summary>
      <div className="border-t border-slate-200 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {options.map((option) => (
            <OptionCard
              key={option.id}
              option={toCardOption(option)}
              active={draft.includes(option.id)}
              onToggle={onToggle}
              suggested={suggestedIds.has(option.id)}
            />
          ))}
        </div>
      </div>
    </details>
  );
}

const EMPTY_LOG: AgentLogEntry[] = [];

function DebugLogPanel() {
  const log = useSyncExternalStore(
    subscribeAgentLog,
    getAgentLog,
    () => EMPTY_LOG
  );
  const json = JSON.stringify(log, null, 2);

  return (
    <details className="rounded-md border border-slate-200 bg-white">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-slate-700">
        调试日志（{log.length}）
      </summary>
      <div className="border-t border-slate-200 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <CopyButton label="复制全部 JSON" value={json} />
          <button
            type="button"
            onClick={clearAgentLog}
            className="text-xs font-medium text-slate-500 underline-offset-2 hover:underline"
          >
            清空
          </button>
          <span className="text-xs text-slate-400">
            记录每步的描述/请求/模型决策/提交，便于调试。复制后贴给我即可。
          </span>
        </div>
        {log.length === 0 ? (
          <p className="text-xs text-slate-400">暂无记录。</p>
        ) : (
          <ol className="max-h-80 space-y-1 overflow-auto text-xs">
            {log.map((e) => (
              <li key={e.id} className="border-b border-slate-100 pb-1">
                <span className="text-slate-400">{e.t.slice(11, 19)}</span>{" "}
                <span className="font-semibold text-indigo-700">{e.kind}</span>
                {e.data !== undefined ? (
                  <pre className="mt-0.5 whitespace-pre-wrap break-all text-slate-600">
                    {JSON.stringify(e.data)}
                  </pre>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </div>
    </details>
  );
}

export function AgentDemoClient() {
  return (
    <PromptGuideErrorBoundary>
      <AgentDemo />
    </PromptGuideErrorBoundary>
  );
}

function AgentDemo() {
  const {
    providerId,
    provider,
    phase,
    loading,
    error,
    history,
    decision,
    currentDimension,
    visibleOptions,
    suggestedIds,
    draft,
    draftText,
    setDraftText,
    rendered,
    polished,
    polishing,
    manifest,
    readKeyFor,
    saveKeyAndStart,
    startWithDescription,
    toggleDraft,
    submitStep,
    skipStep,
    finishNow,
    polish,
    restart,
    retryStep,
    reconfigure,
    precision,
    setPrecision,
    primaryType,
    autoFilledSummary,
  } = useAgentGuideController();

  if (phase === "needsKey") {
    return (
      <main className="min-h-screen px-4 py-5 text-slate-950">
        <KeyGate
          initialProviderId={providerId}
          readKeyFor={readKeyFor}
          onSubmit={saveKeyAndStart}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-5 text-slate-950 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-4">
        <header className="flex flex-col gap-2 border-b border-slate-200 pb-5">
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-600">
            <Sparkles className="h-4 w-4" />
            Agent 自适应向导 · 本地原型
            <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs text-indigo-800">BYOK</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-normal md:text-3xl">
            AI 决定下一步问什么
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            不再一次性铺开所有选择题：AI 根据你已有的选择，动态决定下一题与该题的候选选项。最终提示词仍由你选中的选项确定性拼接。
          </p>
          <p className="text-xs text-slate-500">
            <Link href="/" className="text-teal-700 hover:underline">
              ← 返回线上版
            </Link>
            {" · "}
            服务商：{provider.label}
            {" · "}
            <button type="button" onClick={reconfigure} className="text-teal-700 hover:underline">
              切换
            </button>
            {" · "}
            目录维度：{manifest.length}
          </p>
        </header>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">
            {error}
          </div>
        ) : null}

        {history.length > 0 ? (
          <section className="rounded-md border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold uppercase text-slate-500">已选</div>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {history.map((item) => {
                const dim = manifest.find((d) => d.questionId === item.questionId);
                const picks = item.freeText?.trim()
                  ? `${item.freeText.trim()}（自定义）`
                  : item.selectedOptionIds
                      .map((id) => dim?.options.find((o) => o.id === id)?.label ?? id)
                      .join("、");
                return (
                  <li key={item.questionId}>
                    <span className="text-slate-500">{dim?.title ?? item.questionId}：</span>
                    {picks}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {phase === "describe" ? (
          <DescribeStep
            onStart={startWithDescription}
            precision={precision}
            onPrecisionChange={setPrecision}
          />
        ) : null}

        {phase === "asking" ? (
          <section className="rounded-md border border-slate-200 bg-white p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <PrecisionSelector value={precision} onChange={setPrecision} />
              {primaryType !== "通用" ? (
                <span className="text-xs text-slate-400">识别为：{primaryType}</span>
              ) : null}
            </div>
            {loading || !currentDimension ? (
              <div className="flex items-center gap-2 py-10 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                AI 正在决定下一步…
              </div>
            ) : (
              <>
                <h2 className="text-base font-semibold text-slate-950">
                  {currentDimension.title}
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {decision?.helperText || currentDimension.helper}
                  {currentDimension.mode === "multi" ? "（可多选）" : "（单选）"}
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleOptions.map((option) => (
                    <OptionCard
                      key={option.id}
                      option={toCardOption(option)}
                      active={draft.includes(option.id)}
                      onToggle={toggleDraft}
                      suggested={suggestedIds.has(option.id)}
                    />
                  ))}
                </div>

                {precision === "detailed" ? (
                  <AllOptionsDisclosure
                    key={currentDimension.questionId}
                    options={currentDimension.options.filter(
                      (o) => !visibleOptions.some((v) => v.id === o.id)
                    )}
                    dimensionTitle={currentDimension.title}
                    draft={draft}
                    suggestedIds={suggestedIds}
                    onToggle={toggleDraft}
                  />
                ) : null}

                {visibleOptions.length === 0 ? (
                  <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    AI 没给出预设选项——你可以在下方直接输入，或
                    <button
                      type="button"
                      onClick={retryStep}
                      disabled={loading}
                      className="ml-1 font-medium text-teal-700 underline-offset-2 hover:underline disabled:opacity-50"
                    >
                      让 AI 重试
                    </button>
                  </div>
                ) : null}

                <div className="mt-4">
                  <label className="block text-xs font-medium text-slate-500">
                    都不合适？直接输入（会覆盖本题的选项）
                  </label>
                  <input
                    type="text"
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    placeholder={`例如：${currentDimension.title}的具体描述`}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    onClick={submitStep}
                    disabled={draft.length === 0 && draftText.trim().length === 0}
                    className="justify-center"
                  >
                    下一步
                  </Button>
                  <button
                    type="button"
                    onClick={skipStep}
                    className="text-sm font-medium text-slate-500 underline-offset-2 hover:underline"
                  >
                    跳过这一步
                  </button>
                  <button
                    type="button"
                    onClick={finishNow}
                    disabled={history.length === 0}
                    className="text-sm font-medium text-teal-700 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
                  >
                    够了，直接生成
                  </button>
                </div>
              </>
            )}
          </section>
        ) : null}

        {phase === "done" && rendered ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_430px]">
            <section className="rounded-md border border-slate-200 bg-white p-5">
              <h2 className="text-base font-semibold text-slate-950">完成</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                提示词已由你选中的选项确定性拼接。可选地让 AI 润色措辞（不改变语义）。
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  onClick={() => void polish()}
                  disabled={polishing}
                  className="justify-center"
                >
                  {polishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  {polishing ? "润色中…" : "AI 润色"}
                </Button>
                <button
                  type="button"
                  onClick={restart}
                  className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 underline-offset-2 hover:underline"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  重新开始
                </button>
              </div>

              {polished ? (
                <div className="mt-5 space-y-4">
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                      润色后中文 <CopyButton label="复制" value={polished.zh} />
                    </div>
                    <pre className="whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-950 p-4 text-sm leading-6 text-slate-50">
                      {polished.zh}
                    </pre>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                      润色后英文 <CopyButton label="复制" value={polished.en} />
                    </div>
                    <pre className="whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-800">
                      {polished.en}
                    </pre>
                  </div>
                </div>
              ) : null}
            </section>

            <div className="flex flex-col gap-4">
              {autoFilledSummary.length > 0 ? (
                <section className="rounded-md border border-amber-200 bg-amber-50 p-4">
                  <h3 className="text-sm font-semibold text-amber-800">
                    ✨ AI 自动补充（你没选，AI 据你已选风格补的，可在结果里删改）
                  </h3>
                  <ul className="mt-2 space-y-1 text-sm text-amber-900">
                    {autoFilledSummary.map((s) => (
                      <li key={s.questionId}>
                        <span className="font-medium">{s.title}</span>：{s.picks.join("、")}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <OutputPanel rendered={rendered} />
            </div>
          </div>
        ) : null}

        <DebugLogPanel />
      </div>
    </main>
  );
}
