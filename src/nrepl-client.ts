// SPDX-License-Identifier: EPL-2.0
// Copyright © 2026-present Marko Kocic <marko@euptera.com>

import * as net from "node:net";

let bencodeModule: typeof import("bencode")["default"] | null = null;
const bencodePromise = import("bencode").then((m) => {
  bencodeModule = m.default;
});

async function getBencode() {
  if (bencodeModule) return bencodeModule;
  await bencodePromise;
  return bencodeModule!;
}

const DEFAULT_PORTS = [7888, 1666, 50505, 58885, 63333, 7889];

interface NreplMessage {
  id?: string;
  op?: string;
  session?: string;
  code?: string;
  ns?: string;
  "new-session"?: boolean;
  status?: string[];
  value?: string;
  out?: string;
  err?: string;
  vals?: string[];
  responses?: NreplMessage[];
  sessions?: string[];
}

function isUint8Array(val: unknown): val is Uint8Array {
  return val != null && typeof val === "object" && (val as Uint8Array).constructor.name === "Uint8Array";
}

function bufferToString(val: unknown): unknown {
  if (val == null) return val;
  if (typeof val === "number") return String(val);
  if (Buffer.isBuffer(val) || isUint8Array(val)) {
    return Buffer.from(val as Uint8Array).toString("utf8");
  }
  if (Array.isArray(val)) return val.map(bufferToString);
  if (typeof val === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      result[k] = bufferToString(v);
    }
    return result;
  }
  return val;
}

async function decodeMessage(data: Buffer): Promise<NreplMessage> {
  const b = await getBencode();
  const decoded = b.decode(data) as NreplMessage;
  return bufferToString(decoded) as NreplMessage;
}

async function encodeMessage(msg: NreplMessage): Promise<Buffer> {
  const b = await getBencode();
  return b.encode(msg);
}

let currentId = 0;
function nextId(): string {
  return String(++currentId);
}

export interface EvalOptions {
  host: string;
  port: number;
  code: string;
  ns?: string;
}

export interface EvalResult {
  vals: string[];
  out: string;
  err: string;
}

export async function evalExpr(opts: EvalOptions): Promise<EvalResult> {
  const { host, port, code, ns } = opts;
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let session: string | undefined;
    let cloneId: string | undefined;
    let evalId: string | undefined;
    const vals: string[] = [];
    let out = "";
    let err = "";
    let done = false;

    const cleanup = () => {
      try {
        socket.destroy();
      } catch {
        // ignore
      }
    };

    const finish = (result: EvalResult) => {
      cleanup();
      resolve(result);
    };

    socket.connect(port, host, async () => {
      cloneId = nextId();
      socket.write(await encodeMessage({ op: "clone", id: cloneId }));
    });

    socket.on("error", reject);

    let buffer = Buffer.alloc(0);
    let offset = 0;

    socket.on("data", async (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);

      while (offset < buffer.length) {
        try {
          const remaining = buffer.subarray(offset);
          const msg = await decodeMessage(remaining);
          // Bencode dictionary ends with 'e', find it to know bytes consumed
          // We need to count bytes manually since decode doesn't tell us
          const endIdx = findMessageEnd(remaining);
          if (endIdx === -1) {
            // Incomplete message, wait for more data
            break;
          }
          offset += endIdx;

          // Handle clone response
          if (msg.id === cloneId && msg["new-session"]) {
            session = msg["new-session"] as string;
            if (ns) {
              evalId = nextId();
              socket.write(await encodeMessage({ op: "ns", ns, session, id: evalId }));
            } else {
              evalId = nextId();
              socket.write(await encodeMessage({ op: "eval", code, session, id: evalId }));
            }
            continue;
          }

          // Handle eval response
          if (msg.id === evalId) {
            if (msg.value) vals.push(msg.value);
            if (msg.out) out += msg.out;
            if (msg.err) err += msg.err;
            if (msg.status?.includes("done")) {
              done = true;
              finish({ vals, out, err });
              return;
            }
          }
        } catch {
          // Incomplete message, wait for more data
          break;
        }
      }
    });

    socket.on("close", () => {
      if (!done) {
        reject(new Error("Connection closed unexpectedly"));
      }
    });
  });
}

// Find the end of a bencode message by counting delimiters
function findMessageEnd(data: Buffer): number {
  let i = 0;
  if (data[i] !== 0x64) return -1; // 'd' for dict
  i++;

  while (i < data.length) {
    const b = data[i];

    if (b === 0x65) {
      // 'e' - end of dict/list/int
      return i + 1;
    }
    if (b === 0x69) {
      // 'i' - integer
      i++;
      while (i < data.length && data[i] !== 0x65) i++;
      i++; // skip 'e'
      continue;
    }
    if (b >= 0x30 && b <= 0x39) {
      // '0'-'9' - string length prefix
      let len = 0;
      while (i < data.length && data[i] >= 0x30 && data[i] <= 0x39) {
        len = len * 10 + (data[i] - 0x30);
        i++;
      }
      if (i >= data.length || data[i] !== 0x3a) return -1; // ':'
      i++; // skip ':'
      i += len; // skip string data
      if (i > data.length) return -1;
      continue;
    }
    if (b === 0x6c) {
      // 'l' - list
      i++;
      let depth = 1;
      while (i < data.length && depth > 0) {
        if (data[i] === 0x65) {
          depth--;
          i++;
          continue;
        }
        if (data[i] === 0x6c) {
          depth++;
          i++;
          continue;
        }
        // String or int at start of list item
        if (data[i] >= 0x30 && data[i] <= 0x39) {
          let len = 0;
          while (i < data.length && data[i] >= 0x30 && data[i] <= 0x39) {
            len = len * 10 + (data[i] - 0x30);
            i++;
          }
          if (i >= data.length || data[i] !== 0x3a) break;
          i += len + 1;
          continue;
        }
        if (data[i] === 0x69) {
          i++;
          while (i < data.length && data[i] !== 0x65) i++;
          i++;
          continue;
        }
        break;
      }
      continue;
    }
    return -1;
  }
  return -1;
}

export interface DiscoveredEndpoint {
  host: string;
  port: number;
}

export async function findNreplPorts(
  host: string = "localhost",
  ports: number[] = DEFAULT_PORTS
): Promise<DiscoveredEndpoint[]> {
  const found: DiscoveredEndpoint[] = [];

  await Promise.all(
    ports.map(
      (port) =>
        new Promise<void>((resolve) => {
          const socket = new net.Socket();
          socket.setTimeout(100);

          socket.on("connect", () => {
            found.push({ host, port });
            socket.destroy();
          });

          socket.on("timeout", () => {
            socket.destroy();
          });

          socket.on("error", () => {
            socket.destroy();
          });

          socket.connect(port, host);
        })
    )
  );

  return found;
}
