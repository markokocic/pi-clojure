# pi-clojure

A set of Clojure development tools implemented in pure JavaScript for the [pi-coding-agent](https://github.com/badlogic/pi-mono).

## Why this project?

Existing solutions for Clojure evaluation in AI coding agents (e.g., [clojure-mcp](https://github.com/bhauman/clojure-mcp), [clojure-mcp-light](https://github.com/bhauman/clojure-mcp-light)) either:
- Introduce the overhead of MCP (Model Context Protocol) as an additional communication layer
- Rely on CLI tools for execution, which adds process spawn overhead

These approaches can create performance bottlenecks, especially on resource-constrained systems. Additionally, MCP introduces complexity in setup and maintenance.

This project takes a different approach: implementing Clojure evaluation as native pi tools that communicate directly with nREPL via TCP sockets. This eliminates any middleware layer, providing:

- **Zero overhead**: Direct tool invocation without MCP protocol translation
- **Direct execution**: Code evaluated directly via nREPL without CLI process spawning overhead
- **Simpler architecture**: No external dependencies or protocol adapters

## Installation

```bash
pi install npm:pi-clojure
```

## Tools

| Tool | Description |
|------|-------------|
| `clojure_eval` | Evaluates Clojure code via nREPL |

### clojure_eval

Evaluates Clojure code via nREPL.

#### Features

- Evaluates Clojure code via nREPL protocol
- Discovers nREPL endpoints on common ports
- Supports custom namespaces
- Handles stdout/stderr output

#### Configuration

##### Default nREPL Ports

The extension auto-detects nREPL on these ports:
- 7888, 1666, 50505, 58885, 63333, 7889

##### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `code` | string | Clojure code to evaluate |
| `port` | number | nREPL port (required) |
| `host` | string | nREPL host (default: localhost) |
| `ns` | string | Target namespace |

#### Usage

Start nREPL in your Clojure project:

```bash
clj -M:nrepl
```

Then use the `clojure_eval` tool in pi-coding-agent to evaluate code.

## License

EPL-2.0

Copyright © 2026-present Marko Kocic <marko@euptera.com>