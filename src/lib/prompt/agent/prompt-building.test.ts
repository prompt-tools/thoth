import { describe, it, expect } from "vitest";
import "../init";
import { describeHistory, buildTurnRequest, parseTurnResponse } from "./client";
import { buildAgentGuidance, AGENT_SYSTEM_PROMPT } from "./system-prompt";
import { buildCatalogManifest } from "./catalog-manifest";
import { OPTION_CONFLICTS, ENTRY_ROUTES } from "./audit-model";
import { getProvider } from "./providers";

const manifest = buildCatalogManifest();

describe("describeHistory", () => {
  it("empty history without description asks for the first dimension", () => {
    const text = describeHistory([], manifest);
    expect(text).toContain("尚未做出任何选择");
    expect(text).not.toContain("需求描述");
  });

  it("empty history WITH description embeds the intent", () => {
    const text = describeHistory([], manifest, "海边回眸的女生，胶片感");
    expect(text).toContain("需求描述");
    expect(text).toContain("海边回眸的女生，胶片感");
    expect(text).toContain("尚未做出任何选择");
  });

  it("blank / whitespace description is treated as no description", () => {
    expect(describeHistory([], manifest, "   ")).not.toContain("需求描述");
  });

  it("renders a free-text history item as the user's custom input", () => {
    const text = describeHistory(
      [{ questionId: "subject", selectedOptionIds: [], freeText: "一台 MacBook Pro" }],
      manifest
    );
    expect(text).toContain("一台 MacBook Pro");
    expect(text).toContain("用户自定义输入");
  });

  it("populated history lists prior picks and still carries the description", () => {
    const subject = manifest.find((d) => d.questionId === "subject");
    const optId = subject!.options[0].id;
    const text = describeHistory(
      [{ questionId: "subject", selectedOptionIds: [optId] }],
      manifest,
      "白底耳机产品图"
    );
    expect(text).toContain("白底耳机产品图");
    expect(text).toContain("已做出的选择");
    expect(text).toContain(subject!.options[0].label);
  });

  it("no longer contains done/收尾 instructions", () => {
    const text = describeHistory(
      [{ questionId: "subject", selectedOptionIds: ["image_subject:single_person"] }],
      manifest
    );
    expect(text).not.toContain("done");
    expect(text).not.toContain("收尾");
    expect(text).not.toContain("目标轮数");
  });
});

describe("buildAgentGuidance", () => {
  const guidance = buildAgentGuidance();

  it("includes every hard conflict pair", () => {
    for (const c of OPTION_CONFLICTS.filter((x) => x.relation === "conflict")) {
      expect(guidance).toContain(c.a);
      expect(guidance).toContain(c.b);
    }
  });

  it("includes the portrait-only product boundary section", () => {
    expect(guidance).toContain("产品边界");
    for (const r of ENTRY_ROUTES) expect(guidance).toContain(r.primaryType);
    expect(guidance).toContain("不能作为画面主体");
  });

  it("includes the framing-depth guidance", () => {
    expect(guidance).toContain("景别控深");
  });

  it("system prompt no longer mentions done/收尾", () => {
    expect(AGENT_SYSTEM_PROMPT).not.toContain("收尾准则");
    expect(AGENT_SYSTEM_PROMPT).not.toContain("目标轮数");
    expect(AGENT_SYSTEM_PROMPT).not.toContain("done=true");
  });

  it("system prompt mentions select_options tool", () => {
    expect(AGENT_SYSTEM_PROMPT).toContain("select_options");
  });

  it("system prompt says model does NOT decide dimension or done", () => {
    expect(AGENT_SYSTEM_PROMPT).toContain("不决定");
  });
});

describe("buildTurnRequest (C-9b)", () => {
  const provider = getProvider("deepseek");

  it("tool name is select_options", () => {
    const { proxyReq } = buildTurnRequest(provider, "test-key", { manifest, history: [] });
    const body = proxyReq.body as Record<string, unknown>;
    const tools = body.tools as Array<{ function?: { name?: string } }>;
    expect(tools[0]?.function?.name).toBe("select_options");
  });

  it("systemText includes current dimension info", () => {
    const { proxyReq } = buildTurnRequest(provider, "test-key", { manifest, history: [] });
    const body = proxyReq.body as Record<string, unknown>;
    const messages = body.messages as Array<{ role: string; content: string }>;
    const systemMsg = messages.find((m) => m.role === "system")?.content ?? "";
    expect(systemMsg).toContain("当前维度");
  });
});

describe("parseTurnResponse (C-9b)", () => {
  const provider = getProvider("deepseek");

  it("drops invalid option ids from the response", () => {
    const { ctx } = buildTurnRequest(provider, "test-key", { manifest, history: [] });
    const currentDim = manifest.find((d) => d.questionId === ctx.currentQuestionId)!;
    const fakeResp = {
      choices: [{
        message: {
          tool_calls: [{
            function: {
              name: "select_options",
              arguments: JSON.stringify({
                visibleOptionIds: [...currentDim.options.map(o => o.id), "image_fake:nonexistent"],
                helperText: "test",
              }),
            },
          }],
        },
      }],
    };
    const result = parseTurnResponse(provider, fakeResp, ctx);
    expect(result.droppedInvalidOptionIds).toContain("image_fake:nonexistent");
    expect(result.decision).not.toBeNull();
    expect(result.decision!.visibleOptionIds).not.toContain("image_fake:nonexistent");
  });

  it("fallback to all options when model returns empty visibleOptionIds", () => {
    const { ctx } = buildTurnRequest(provider, "test-key", { manifest, history: [] });
    const currentDim = manifest.find((d) => d.questionId === ctx.currentQuestionId)!;
    const fakeResp = {
      choices: [{
        message: {
          tool_calls: [{
            function: {
              name: "select_options",
              arguments: JSON.stringify({ visibleOptionIds: [], helperText: "test" }),
            },
          }],
        },
      }],
    };
    const result = parseTurnResponse(provider, fakeResp, ctx);
    expect(result.decision).not.toBeNull();
    expect(result.decision!.visibleOptionIds).toEqual(currentDim.options.map(o => o.id));
  });
});
