"use client";
import React from "react";
import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const COPIED_FEEDBACK_MS = 1200;

export function CopyButton({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const [fallbackValue, setFallbackValue] = useState<string | null>(null);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
    };
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (resetTimerRef.current !== null) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = window.setTimeout(() => {
        setCopied(false);
        resetTimerRef.current = null;
      }, COPIED_FEEDBACK_MS);
    } catch (e: unknown) {
      // Clipboard API can reject for permission, focus, or insecure-context
      // reasons. Log so the underlying cause is visible during debugging, and
      // show the fallback textarea so the user can still copy manually.
      console.warn("[copy] clipboard write failed — falling back to textarea", e);
      setFallbackValue(value);
    }
  }

  return (
    <>
      <Button type="button" onClick={() => void handleCopy()} className="h-9">
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "已复制" : label}
      </Button>
      {fallbackValue && (
        <div className="mt-2" role="status" aria-live="polite">
          <p className="mb-1 text-xs text-amber-800">
            自动复制失败，请手动选中下方文本复制：
          </p>
          <textarea
            readOnly
            value={fallbackValue}
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            className="w-full h-20 text-xs font-mono rounded border border-amber-200 bg-amber-50 p-2"
          />
        </div>
      )}
    </>
  );
}
