// SPDX-License-Identifier: EPL-2.0
// Copyright © 2026-present Marko Kocic <marko@euptera.com>

import { Type } from "@sinclair/typebox";
import { defineTool, type ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { indentMode } from "parinfer";

function detectImbalance(code: string): boolean {
  let depth = 0;
  let inString = false;
  let inChar = false;

  for (let i = 0; i < code.length; i++) {
    const ch = code[i];

    // Handle escape sequences in strings
    if ((inString || inChar) && ch === "\\" && i + 1 < code.length) {
      i++;
      continue;
    }

    // Toggle string/char state
    if (ch === '"' && !inChar) {
      inString = !inString;
      continue;
    }
    if (ch === "'" && !inString) {
      inChar = !inChar;
      continue;
    }

    if (inString || inChar) continue;

    // Skip comments
    if (ch === ";") {
      while (i + 1 < code.length && code[i] !== "\n") i++;
      continue;
    }

    // Count brackets
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    if (ch === ")" || ch === "]" || ch === "}") depth--;

    if (depth < 0) return true;
  }

  return depth !== 0;
}

function fixDelimiters(code: string): string {
  const result = indentMode(code, { forceBalance: true });
  return result.text ?? code;
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