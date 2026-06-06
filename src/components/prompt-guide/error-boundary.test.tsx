import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { PromptGuideErrorBoundary } from "./error-boundary";

function ThrowingChild(): never {
  throw new Error("test render failure");
}

describe("PromptGuideErrorBoundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders fallback UI when a child throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <PromptGuideErrorBoundary>
        <ThrowingChild />
      </PromptGuideErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("向导加载出错");
  });
});
