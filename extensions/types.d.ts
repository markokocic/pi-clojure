// SPDX-License-Identifier: EPL-2.0

declare module "@mariozechner/pi-coding-agent" {
  export type UnknownPrimitive = string | number | boolean | null | undefined;
  export type JsonValue = UnknownPrimitive | JsonValue[] | { [key: string]: JsonValue };

  export interface ExtensionAPI {
    registerTool(tool: unknown): void;
    on(event: string, handler: (...args: unknown[]) => unknown): void;
  }

  export interface ToolResult {
    content: Array<{ type: "text"; text: string }>;
    details?: JsonValue;
    isError?: boolean;
  }

  export interface ToolDefinition {
    name: string;
    label: string;
    description: string;
    promptSnippet?: string;
    promptGuidelines?: string[];
    parameters?: unknown;
    execute?: (
      toolCallId: string,
      params: Record<string, JsonValue>,
      signal: AbortSignal | undefined,
      onUpdate: ((result: ToolResult) => void) | undefined,
      ctx: unknown
    ) => Promise<ToolResult>;
  }

  export function defineTool<T extends ToolDefinition>(tool: T): T;
}

declare module "parinfer" {
  interface ParinferOptions {
    cursorX?: number;
    cursorLine?: number;
    selectionStartLine?: number;
    forceBalance?: boolean;
    returnParens?: boolean;
  }

  interface ParinferResult {
    text: string | undefined;
    cursorX?: number;
    cursorLine?: number;
    tabStops?: Array<{ x: number; lineNo: number }>;
    previewCursorLine?: number;
    changed?: boolean;
    error?: { message: string; location: { x: number; lineNo: number } };
  }

  export function indentMode(text: string, options?: ParinferOptions): ParinferResult;
  export function parenMode(text: string, options?: ParinferOptions): ParinferResult;
  export function smartMode(text: string, options?: ParinferOptions): ParinferResult;
}

declare module "bencode" {
  const bencode: {
    encode: (obj: unknown) => Buffer;
    decode: (data: Buffer | Uint8Array) => unknown;
  };
  export default bencode;
}