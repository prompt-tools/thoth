import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { CopyButton } from "./copy-button";

// Helper: click + flush the microtask queue created by clipboard.writeText.
async function clickAndFlush(button: HTMLElement) {
  await act(async () => {
    fireEvent.click(button);
  });
}

describe("CopyButton timer cleanup (A3)", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
    // Only fake timer APIs the component owns. Leave Promise/microtask
    // scheduling alone so clipboard.writeText().then(...) still resolves
    // naturally inside `act`.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("does not set state after unmount when the copied-reset timer is still pending", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { unmount } = render(<CopyButton label="Copy" value="hello" />);
    await clickAndFlush(screen.getByRole("button", { name: /copy/i }));

    // The post-click "copied" state must have landed before we tear down,
    // otherwise the test doesn't exercise the unmount-while-timer-pending path.
    expect(screen.getByRole("button", { name: /已复制/ })).toBeTruthy();

    unmount();

    // Fire the 1200ms timer after the component is gone. Pre-A3 this would
    // have called setCopied(false) on an unmounted component and pinned a
    // closure on it until GC.
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    const allLogs = [
      ...errorSpy.mock.calls.flat(),
      ...warnSpy.mock.calls.flat(),
    ].map(String);
    expect(
      allLogs.some((line) => /unmounted|cannot.*state/i.test(line)),
    ).toBe(false);
  });

  it("clears a prior pending timer when copy is clicked rapidly twice", async () => {
    render(<CopyButton label="Copy" value="hello" />);

    await clickAndFlush(screen.getByRole("button", { name: /copy/i }));
    expect(screen.getByRole("button", { name: /已复制/ })).toBeTruthy();

    // Advance 500ms — still inside the 1200ms window — then click again.
    act(() => {
      vi.advanceTimersByTime(500);
    });
    await clickAndFlush(screen.getByRole("button", { name: /已复制/ }));
    expect(screen.getByRole("button", { name: /已复制/ })).toBeTruthy();

    // Cross the first timer's ORIGINAL 1200ms deadline (500 + 700).
    // Must NOT fire because the second click cleared it.
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(screen.getByRole("button", { name: /已复制/ })).toBeTruthy();

    // Cross the second timer's 1200ms deadline from the second click.
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.getByRole("button", { name: /^copy$/i })).toBeTruthy();
  });
});
