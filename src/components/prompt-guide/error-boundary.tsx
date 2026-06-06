"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

/** Catches render errors in the prompt guide client tree (F-S4). */
export class PromptGuideErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[PromptGuide] render error", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main
          role="alert"
          className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-3 px-6 text-center"
        >
          <p className="text-lg font-medium">向导加载出错</p>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            请刷新页面重试。若问题持续，请清除浏览器缓存后再打开。
          </p>
        </main>
      );
    }
    return this.props.children;
  }
}
