import { describe, it, expect } from "vitest";
import { routePrimaryType } from "./routing";

describe("routePrimaryType", () => {
  it("人像 signal → 人像", () => {
    expect(routePrimaryType("一个女生在海边")).toBe("人像");
  });

  it("猫和女孩 → 人像 (人优先 over 动物)", () => {
    expect(routePrimaryType("一个女孩和她的猫")).toBe("人像");
  });

  it("纯产品词 → 产品/静物", () => {
    expect(routePrimaryType("白色耳机产品图")).toBe("产品/静物");
  });

  it("纯场景词 → 场景/氛围", () => {
    expect(routePrimaryType("星空下的山脉")).toBe("场景/氛围");
  });

  it("纯动物词 → 动物", () => {
    expect(routePrimaryType("一只橘猫在沙发上")).toBe("动物");
  });

  it("纯食物词 → 食物/饮品", () => {
    expect(routePrimaryType("精致的寿司摆盘")).toBe("食物/饮品");
  });

  it("empty string → 通用", () => {
    expect(routePrimaryType("")).toBe("通用");
  });

  it("gibberish → 通用", () => {
    expect(routePrimaryType("xyzabc123")).toBe("通用");
  });

  it("english signal hits", () => {
    expect(routePrimaryType("portrait of a woman")).toBe("人像");
    expect(routePrimaryType("product photo of headphones")).toBe("产品/静物");
  });

  it("multiple signals of same type → that type", () => {
    expect(routePrimaryType("城市夜景 street city")).toBe("场景/氛围");
  });
});
