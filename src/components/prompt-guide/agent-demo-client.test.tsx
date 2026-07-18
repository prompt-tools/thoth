import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("raw-content consent", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_AGENT_DEMO_BUILTIN", "1");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is explicit, off by default, and states the exact sampled fields and retention", async () => {
    const { AgentDemoClient } = await import("./agent-demo-client");
    render(<AgentDemoClient />);

    const consent = screen.getByRole("checkbox", { name: /20%/ });
    expect(consent).not.toBeChecked();
    expect(consent).toHaveAccessibleName(
      /本次人物描述、回答历史（含自由文本）和服务端重算的最终中文\/英文提示词/
    );
    expect(consent).toHaveAccessibleName(/模型消息与工具\/函数诊断内容/);
    expect(consent).toHaveAccessibleName(/稳定服务端按 20% 概率抽样/);
    expect(consent).toHaveAccessibleName(/原始内容最多保留 14 天/);
    expect(consent).toHaveAccessibleName(
      /未勾选时只记录不含内容的运行状态和错误指标/
    );

    const details = screen.getByText("完整采样字段与保留说明").closest("details");
    expect(details).not.toBeNull();
    expect(details).not.toHaveAttribute("open");
    expect(details).toHaveTextContent("Subject brief、每项回答的 questionId/所选选项 ID/自由文本");
    expect(details).toHaveTextContent("tool_calls[].function.name 与原样 arguments");
    expect(details).toHaveTextContent("Anthropic 的 stop_reason、text blocks、tool_use name 与 input");
    expect(details).toHaveTextContent("version、kind（provider/completion）、journeyId、release、route、turn、provider 记录的 delivery、recordedAt、expiresAt");
    expect(details).toHaveTextContent("provider response ID（OpenAI 的 id/tool_calls[].id、Anthropic 的 tool_use.id）");
    expect(details).toHaveTextContent("不晚于 recordedAt + 14 天的绝对 PXAT");
    expect(details).toHaveTextContent("ACL、备份、日志或 provider/all-media retention");
    expect(details).toHaveTextContent("生产 raw 保持 blocked/off");

    fireEvent.click(consent);
    expect(consent).toBeChecked();
  });
});
