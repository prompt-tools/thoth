import { describe, it, expect } from "vitest";
import { buildAnswerTool, buildAnswerRequest, parseAnswer } from "./answerer.mjs";
import { llmAnswer, buildAnswerPrompt } from "./answerer.mjs";

const anthropic = { format: "anthropic", baseURL: "https://api.anthropic.com", routingModel: "claude-haiku-4-5-20251001" };
const openai = { format: "openai", baseURL: "https://api.deepseek.com", routingModel: "deepseek-chat" };
const VIS = ["image_subject:pet_animal", "image_subject:wildlife"];

describe("buildAnswerTool", () => {
  it("constrains pick to the visible ids via enum", () => {
    const tool = buildAnswerTool(VIS);
    expect(tool.name).toBe("answer");
    expect(tool.parameters.properties.pick.items.enum).toEqual(VIS);
    expect(tool.parameters.required).toContain("pick");
  });
});

describe("buildAnswerRequest", () => {
  it("anthropic: /v1/messages, version header, own max_tokens, system top-level, tool_choice type tool", () => {
    const tool = buildAnswerTool(VIS);
    const req = buildAnswerRequest(anthropic, "KEY", { system: "S", userText: "U", tool });
    expect(req.endpoint).toBe("https://api.anthropic.com/v1/messages");
    expect(req.headers["x-api-key"]).toBe("KEY");
    expect(req.headers["anthropic-version"]).toBe("2023-06-01");
    expect(typeof req.body.max_tokens).toBe("number");
    expect(req.body.system).toBe("S");
    expect(req.body.tools[0].input_schema).toEqual(tool.parameters);
    expect(req.body.tool_choice).toEqual({ type: "tool", name: "answer" });
  });

  it("openai-shaped: /chat/completions, bearer, system as a message, function tool_choice", () => {
    const tool = buildAnswerTool(VIS);
    const req = buildAnswerRequest(openai, "KEY", { system: "S", userText: "U", tool });
    expect(req.endpoint).toBe("https://api.deepseek.com/chat/completions");
    expect(req.headers.authorization).toBe("Bearer KEY");
    expect(req.body.messages[0]).toEqual({ role: "system", content: "S" });
    expect(req.body.messages[1]).toEqual({ role: "user", content: "U" });
    expect(req.body.tool_choice).toEqual({ type: "function", function: { name: "answer" } });
  });
});

describe("parseAnswer", () => {
  const anthRes = (input) => ({ content: [{ type: "tool_use", name: "answer", input }] });
  const ctx = (mode) => ({ visibleIds: VIS, mode, min: undefined, max: undefined });

  it("single: keeps one valid pick, drops stray ids", () => {
    const a = parseAnswer(anthRes({ pick: ["image_subject:wildlife", "bogus:id"] }), anthropic, ctx("single"));
    expect(a).toEqual({ pickedIds: ["image_subject:wildlife"], freeText: undefined, skipped: false, kind: "pick" });
  });

  it("multi: clamps to max (default = #visible) and keeps order", () => {
    const a = parseAnswer(anthRes({ pick: VIS }), anthropic, ctx("multi"));
    expect(a.pickedIds).toEqual(VIS);
    expect(a.kind).toBe("pick");
  });

  it("skip:true with empty pick → kind skip", () => {
    const a = parseAnswer(anthRes({ pick: [], skip: true }), anthropic, ctx("single"));
    expect(a).toEqual({ pickedIds: [], freeText: undefined, skipped: true, kind: "skip" });
  });

  it("free_text dim → returns the free_text only", () => {
    const a = parseAnswer(anthRes({ pick: [], free_text: "赛博朋克霓虹" }), anthropic, { ...ctx("free_text") });
    expect(a).toEqual({ pickedIds: [], freeText: "赛博朋克霓虹", skipped: false, kind: "freetext" });
  });

  it("no valid pick and not skipping → null (caller falls back)", () => {
    expect(parseAnswer(anthRes({ pick: ["bogus:id"] }), anthropic, ctx("single"))).toBeNull();
  });

  it("malformed (no tool input) → null", () => {
    expect(parseAnswer({ content: [{ type: "text", text: "hi" }] }, anthropic, ctx("single"))).toBeNull();
  });

  it("openai wire: parses JSON-string tool_call arguments", () => {
    const oaiRes = (input) => ({ choices: [{ message: { tool_calls: [{ function: { name: "answer", arguments: JSON.stringify(input) } }] } }] });
    const a = parseAnswer(oaiRes({ pick: ["image_subject:wildlife"] }), openai, { visibleIds: VIS, mode: "single", min: undefined, max: undefined });
    expect(a).toEqual({ pickedIds: ["image_subject:wildlife"], freeText: undefined, skipped: false, kind: "pick" });
  });
});

describe("buildAnswerPrompt", () => {
  it("embeds the seed, the question title, and the visible option ids+labels", () => {
    const dim = { questionId: "subject", title: "主体是什么", helper: "选主体", mode: "single" };
    const visible = [{ id: "image_subject:pet_animal", label: "宠物动物" }, { id: "image_subject:wildlife", label: "野生动物" }];
    const { system, userText } = buildAnswerPrompt(dim, visible, "一只橘猫", []);
    expect(system).toContain("一只橘猫");
    expect(userText).toContain("主体是什么");
    expect(userText).toContain("image_subject:pet_animal");
    expect(userText).toContain("宠物动物");
  });
});

describe("llmAnswer", () => {
  const provider = { format: "anthropic", baseURL: "https://api.anthropic.com", routingModel: "claude-haiku-4-5-20251001" };
  const dim = { questionId: "subject", title: "主体", helper: "选主体", mode: "single" };
  const shown = { visible: [{ id: "image_subject:pet_animal", label: "宠物动物" }, { id: "image_subject:wildlife", label: "野生动物" }] };
  const okFetch = (input) => async () => ({ ok: true, status: 200, json: async () => ({ content: [{ type: "tool_use", name: "answer", input }] }) });

  it("returns the model's valid pick (fallback:false)", async () => {
    const ans = await llmAnswer(dim, shown, { seed: "一只橘猫", priorAnswers: [], bounds: {}, provider, apiKey: "K", fetchImpl: okFetch({ pick: ["image_subject:pet_animal"] }) });
    expect(ans).toMatchObject({ pickedIds: ["image_subject:pet_animal"], kind: "pick", fallback: false });
  });

  it("falls back to the first visible id (counted) when the call throws", async () => {
    const boom = async () => { throw new Error("network"); };
    const ans = await llmAnswer(dim, shown, { seed: "x", priorAnswers: [], bounds: {}, provider, apiKey: "K", fetchImpl: boom });
    expect(ans).toEqual({ pickedIds: ["image_subject:pet_animal"], freeText: undefined, skipped: false, kind: "pick", fallback: true });
  });

  it("falls back when the model returns no valid pick (counted)", async () => {
    const ans = await llmAnswer(dim, shown, { seed: "x", priorAnswers: [], bounds: {}, provider, apiKey: "K", fetchImpl: okFetch({ pick: ["bogus:id"] }) });
    expect(ans.fallback).toBe(true);
    expect(ans.pickedIds).toEqual(["image_subject:pet_animal"]);
  });
});
