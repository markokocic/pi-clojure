// SPDX-License-Identifier: EPL-2.0
// Copyright © 2026-present Marko Kocic <marko@euptera.com>

import { Type } from "@sinclair/typebox";
import { defineTool, type ExtensionAPI } from "@mariozechner/pi-coding-agent";
import * as fs from "node:fs";
import * as path from "node:path";
import { evalExpr } from "../nrepl-client";

// Common nREPL port file names
const PORT_FILES = [
  ".nrepl-port",
  "nrepl-port",
  ".shadow-cljs/nrepl.port",
  ".cider-nrepl.port",
];

// Default ports to try if no port file is found
const DEFAULT_PORTS = [7888, 1666, 50505, 58885, 63333, 7889];

async function readPortFile(filePath: string): Promise<number | null> {
  try {
    const content = await fs.promises.readFile(filePath, "utf8");
    const port = parseInt(content.trim(), 10);
    return isNaN(port) ? null : port;
  } catch {
    return null;
  }
}

async function findPortInDirectory(dir: string): Promise<number | null> {
  for (const file of PORT_FILES) {
    const filePath = path.join(dir, file);
    const port = await readPortFile(filePath);
    if (port !== null) {
      return port;
    }
  }
  return null;
}

async function validatePort(host: string, port: number): Promise<boolean> {
  try {
    const result = await evalExpr({ host, port, code: "(+ 1 1)" });
    return result.vals.length > 0 && result.vals[0] === "2";
  } catch {
    return false;
  }
}

export const findNreplPortTool = defineTool({
  name: "clojure_find_nrepl_port",
  label: "Clojure Find nREPL Port",
  description:
    "Find nREPL port by checking port files in current directory or trying default ports. Validates by evaluating (+ 1 1).",
  promptSnippet: "Find nREPL port in current directory",
  parameters: Type.Object({}),

  async execute(_toolCallId, _params, _signal, _onUpdate, _ctx) {
    const cwd = process.cwd();
    const host = "localhost";

    // 1. Try to find port file in current directory
    const portFromFile = await findPortInDirectory(cwd);
    if (portFromFile !== null) {
      const isValid = await validatePort(host, portFromFile);
      if (isValid) {
        return {
          content: [
            {
              type: "text",
              text: `Found nREPL port ${portFromFile} (from port file) at ${host}:${portFromFile}`,
            },
          ],
          details: { host, port: portFromFile, source: "port-file" },
        };
      }
    }

    // 2. Try default ports sequentially
    for (const port of DEFAULT_PORTS) {
      const isValid = await validatePort(host, port);
      if (isValid) {
        return {
          content: [
            {
              type: "text",
              text: `Found nREPL port ${port} at ${host}:${port}`,
            },
          ],
          details: { host, port, source: "default-ports" },
        };
      }
    }

    // 3. No valid port found
    return {
      content: [
        {
          type: "text",
          text: "No nREPL port found. Start nREPL and try again.",
        },
      ],
      details: { host, port: null, source: null },
      isError: true,
    };
  },
});

export default function (pi: ExtensionAPI) {
  pi.registerTool(findNreplPortTool);
}
