// SPDX-License-Identifier: EPL-2.0
// Copyright © 2026-present Marko Kocic <marko@euptera.com>

import { Type } from "@sinclair/typebox";
import { defineTool, type ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { evalExpr } from "../nrepl-client";

export const evalTool = defineTool({
  name: "clojure_eval",
  label: "Clojure Eval",
  description: "Evaluate Clojure code via nREPL",
  promptSnippet: "Evaluate Clojure code",
  parameters: Type.Object({
    code: Type.String({ description: "Clojure code to evaluate" }),
    port: Type.Number({ description: "nREPL port" }),
    host: Type.Optional(
      Type.String({ description: "nREPL host", default: "localhost" })
    ),
    ns: Type.Optional(Type.String({ description: "Target namespace" })),
  }),

  async execute(_toolCallId, params, signal, _onUpdate, _ctx) {
    try {
      const result = await evalExpr({
        host: params.host ?? "localhost",
        port: params.port,
        code: params.code,
        ns: params.ns,
      });

      const parts: string[] = [];

      if (result.vals.length > 0) {
        parts.push(`=> ${result.vals.join("\n=> ")}`);
      }

      if (result.out) {
        parts.push(`stdout: ${result.out}`);
      }

      if (result.err) {
        parts.push(`stderr: ${result.err}`);
      }

      const text =
        parts.length > 0 ? parts.join("\n") : "No output (nil or empty)";

      return {
        content: [{ type: "text", text }],
        details: result,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        details: { error: message },
        isError: true,
      };
    }
  },
});

export default function (pi: ExtensionAPI) {
  pi.registerTool(evalTool);
}
