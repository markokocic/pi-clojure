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
| `clojure_find_nrepl_port` | Finds nREPL port by checking port files or trying default ports |
| `clojure_paren_repair` | Fixes unbalanced delimiters in Clojure/ClojureScript/Babashka code. Standalone — no nREPL required. |

### clojure_eval

Evaluates Clojure code via nREPL.


**Note:** Requires an existing nREPL connection. Use `clojure_find_nrepl_port` to find a running nREPL, or start one manually.


#### Features

- Evaluates Clojure code via nREPL protocol
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

### clojure_find_nrepl_port

Finds the nREPL port by checking for port files in the current directory or trying common default ports. Validates the connection by evaluating `(+ 1 1)`.

#### Features

- Checks for common nREPL port files:
  - `.nrepl-port`
  - `nrepl-port`
  - `.shadow-cljs/nrepl.port`
  - `.cider-nrepl.port`
- Falls back to default ports: 7888, 1666, 50505, 58885, 63333, 7889
- Validates by connecting and evaluating `(+ 1 1)`

#### Parameters

None.

#### Usage

```clojure
;; Find the nREPL port
(clojure_find_nrepl_port {})
;; Returns: Found nREPL port 7888 at localhost:7888
```

### clojure_paren_repair

Fixes unbalanced delimiters in Clojure, ClojureScript, and Babashka code using [parinfer](https://www.npmjs.com/package/parinfer). **Standalone tool — does not require nREPL or any running process.**

Works with all Clojure-type source files: .clj, .cljs, .cljc, .bb

#### Features

- Works with Clojure, ClojureScript, and Babashka
- Detects unbalanced `(`, `[`, `{`, `)`, `]`, `}`
- Auto-inserts missing closing delimiters
- Handles strings, comments, and escape sequences
- Built on [parinfer](https://www.npmjs.com/package/parinfer) (pure JS, no native dependencies)

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `code` | string | Clojure code with potentially unbalanced delimiters |
| `check` | boolean | (optional) Only check if balanced, don't fix |

#### Usage

```clojure
;; Fix unbalanced delimiters
(clojure_paren_repair { code: "(defn foo [x]" })
;; Returns: Fixed delimiters:
;; ```clojure
;; (defn foo [x])
;; ```

;; Check if balanced (without fixing)
(clojure_paren_repair { code: "(defn foo [x])", check: true })
;; Returns: Code has balanced delimiters
```

#### Examples

| Input | Output |
|-------|--------|
| `(defn foo [x]` | `(defn foo [x])` |
| `((foo [bar] [baz]` | `((foo [bar] [baz]))` |
| `(defn foo [x y] x)` | `(defn foo [x y] x)` (no change) |

## License

EPL-2.0

Copyright © 2026-present Marko Kocic <marko@euptera.com>