// SPDX-License-Identifier: EPL-2.0
// Copyright © 2026-present Marko Kocic <marko@euptera.com>

import { Type } from "@sinclair/typebox";
import { defineTool, type ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { indentMode } from "parinfer";

// Pattern to detect if code likely has delimiter errors
// This is a simple heuristic - unmatched parens at the end
function detectImbalance(code: string): boolean {
  let depth = 0;
  let inString = false;
  let stringChar = "";
  let inChar = false;

  for (let i = 0; i < code.length; i++) {
    const ch = code[i];

    // Handle escape
    if ((inString || inChar) && ch === "\\" && i + 1 < code.length) {
      i++;
      continue;
    }

    // Toggle strings
    if (ch === '"' && !inChar) {
      inString = !inString;
      continue;
    }
    if (ch === "'" && !inString) {
      inChar = !inChar;
      continue;
    }

    // Skip contents of strings
    if (inString || inChar) continue;

    // Skip comments
    if (ch === ";") {
      while (i + 1 < code.length && code[i] !== "\n") i++;
      continue;
    }

    // Count brackets
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    if (ch === ")" || ch === "]" || ch === "}") depth--;

    // Early exit if we find a clear imbalance
    if (depth < 0) return true;
  }

  return depth !== 0;
}

export function fixDelimiters(code: string): string {
  return indentMode(code, { forceBalance: true }).text ?? code;
}

export const parenRepairTool = defineTool({
  name: "clojure_paren_repair",
  label: "Clojure Paren Repair",
  description: "Fix unbalanced delimiters in Clojure code using parinfer. Standalone tool — works with Clojure, ClojureScript, and Babashka. Does not require nREPL.",
  promptSnippet: "Fix unbalanced delimiters in Clojure code",
  parameters: Type.Object({
    code: Type.String({ description: "Clojure code with potentially unbalanced delimiters" }),
    check: Type.Optional(
      Type.Boolean({ description: "Only check if delimiters are balanced, don't fix" })
    ),
  }),

  async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
    const code = String(params.code);
    const check = params.check === true;

    const isImbalanced = detectImbalance(code);

    if (check) {
      return {
        content: [
          {
            type: "text",
            text: isImbalanced ? "Code has unbalanced delimiters" : "Code has balanced delimiters",
          },
        ],
        details: { balanced: !isImbalanced },
      };
    }

    if (!isImbalanced) {
      return {
        content: [{ type: "text", text: "Code is already balanced" }],
        details: { changed: false, balanced: true },
      };
    }

    const repaired = fixDelimiters(code);
    const changed = code !== repaired;

    return {
      content: [
        {
          type: "text",
          text: changed
            ? `Fixed delimiters:\n\`\`\`clojure\n${repaired}\n\`\`\``
            : "Could not repair delimiters",
        },
      ],
      details: { changed, balanced: !detectImbalance(repaired) },
    };
  },
});

export default function (pi: ExtensionAPI) {
  pi.registerTool(parenRepairTool);
}