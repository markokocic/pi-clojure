// SPDX-License-Identifier: EPL-2.0
// Copyright © 2026-present Marko Kocic <marko@euptera.com>

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { evalTool } from "./tools/eval";

export default function (pi: ExtensionAPI) {
  pi.registerTool(evalTool);
}
