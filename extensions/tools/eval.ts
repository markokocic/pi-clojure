// SPDX-License-Identifier: EPL-2.0
// Copyright © 2026-present Marko Kocic <marko@euptera.com>

import { Type } from "@sinclair/typebox";
import { Text } from "@mariozechner/pi-tui";
import { defineTool, type ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { evalExpr } from "../nrepl-client";

export const evalTool = defineTool({
  name: "clojure_eval",
  label: "Clojure Eval",
  description: "Evaluate Clojure code via nREPL. Requires an existing nREPL connection (see clojure_find_nrepl_port to find one).",
  promptSnippet: "Evaluate Clojure code",
  parameters: Type.Object({
    code: Type.String({ description: "Clojure code to evaluate" }),
    port: Type.Number({ description: "nREPL port" }),
    host: Type.Optional(
      Type.String({ description: "nREPL host", default: "localhost" })
    ),
    ns: Type.Optional(Type.String({ description: "Target namespace" })),
  }),

  async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
    try {
      const result = await evalExpr({
        host: String(params.host ?? "localhost"),
        port: Number(params.port),
        code: String(params.code),
        ns: params.ns != null ? String(params.ns) : undefined,
      });

      const lines: string[] = [];

      lines.push(params.code);

      if (result.vals.length > 0) {
        lines.push(`=> ${result.vals.join("\n=> ")}`);
      }

      if (result.out) {
        lines.push(`stdout: ${result.out}`);
      }

      if (result.err) {
        lines.push(`stderr: ${result.err}`);
      }

      const text = lines.join("\n");

      return {
        content: [{ type: "text", text }],
        details: { code: params.code, vals: result.vals, out: result.out, err: result.err },
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

  renderCall(args, _theme, _context) {
    const code = args.code as string;
    const firstLine = code.split("\n")[0]!;
    const display = firstLine.length > 50 ? firstLine.slice(0, 50) + "..." : firstLine;
    return new Text(`clojure> ${display}`, 0, 0);
  },

  renderResult(result, { expanded }, theme, _context) {
    const details = result.details as { code?: string; vals?: string[]; out?: string; err?: string } | undefined;
    if (!details) {
      const text = result.content[0];
      return new Text(text?.type === "text" ? text.text : "", 0, 0);
    }

    const lines: string[] = [];
    let lineCount = 0;

    // Error case
    if (details.err) {
      const firstErrLine = details.err.split("\n")[0] ?? details.err;
      if (expanded) {
        lines.push(theme.fg("muted", details.code ?? ""));
        lines.push(theme.fg("error", `stderr: ${details.err}`));
        lineCount = lines.length;
      } else {
        return new Text(theme.fg("error", `stderr: ${firstErrLine}`), 0, 0);
      }
    } else {
      // Show code in muted
      lines.push(theme.fg("muted", details.code ?? ""));
      lineCount++;

      // Show vals
      if (details.vals && details.vals.length > 0) {
        const valStr = details.vals.join("\n=> ");
        if (expanded) {
          lines.push(theme.fg("accent", `=> ${valStr}`));
          lineCount += details.vals.length;
        } else {
          // Collapsed: show first value only
          lines.push(theme.fg("accent", `=> ${details.vals[0]}${details.vals.length > 1 ? " ..." : ""}`));
          lineCount++;
        }
      }

      // Show stdout
      if (details.out) {
        const outLines = details.out.split("\n");
        if (expanded) {
          lines.push(theme.fg("success", `stdout: ${details.out}`));
          lineCount += outLines.length;
        } else {
          lines.push(theme.fg("success", `stdout: ${outLines[0]}${outLines.length > 1 ? " ..." : ""}`));
          lineCount++;
        }
      }
    }

    const text = lines.join("\n");
    const MAX_LINES = 20;
    const textLines = text.split("\n");

    if (expanded || textLines.length <= MAX_LINES) {
      return new Text(text, 0, 0);
    }

    const visible = textLines.slice(0, MAX_LINES - 1).join("\n");
    const remaining = textLines.length - (MAX_LINES - 1);
    return new Text(visible + "\n" + theme.fg("dim", `... ${remaining} more lines (Ctrl+O to expand)`), 0, 0);
  },
});

export default function (pi: ExtensionAPI) {
  pi.registerTool(evalTool);
}
