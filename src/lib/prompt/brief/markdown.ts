import type { RenderedPrompt } from "../types";

export function renderMarkdown(rendered: RenderedPrompt): string {
  const lines: string[] = [];

  const headingLabel = "Image";
  lines.push(`# ${headingLabel} Prompt Brief`);
  lines.push(`**Target:** ${rendered.targetToolId}`);
  lines.push(`**Work Type:** ${rendered.brief.workTypeId}`);
  lines.push("");
  lines.push("## Chinese Prompt");
  lines.push(rendered.zhPrompt);
  lines.push("");
  lines.push("## English Prompt");
  lines.push(rendered.enPrompt);
  lines.push("");
  lines.push("## Brief Items");
  lines.push("| Dimension | Selection |");
  lines.push("|-----------|-----------|");
  for (const item of rendered.brief.items) {
    const selection = item.freeText || item.selectedOptions.map((o) => o.label.zh).join("、");
    lines.push(`| ${item.title.zh} | ${selection} |`);
  }

  const uniqueWarnings = Array.from(new Set(rendered.warnings.map((w) => w.zh)));
  if (uniqueWarnings.length > 0) {
    lines.push("");
    lines.push("## Warnings");
    for (const warning of uniqueWarnings) {
      lines.push(`- ${warning}`);
    }
  }

  return lines.join("\n");
}
