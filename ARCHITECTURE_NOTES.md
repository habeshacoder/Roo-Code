# TRP1 Roo Code Governed IDE Architecture

## Overview

This extension upgrades Roo Code into an Intent-Driven AI-Native IDE by injecting a deterministic Hook Middleware between the agent and tool execution.

## Core Innovation

Intent → AST → Trace linkage via sidecar orchestration database.

## Execution Flow

User → Agent → select_active_intent → Hook injects context → write_file → Hook logs trace.

## Hook Engine

Central interceptor wrapping all tools.

Pre-Hooks:

- Intent selection validation
- Scope enforcement
- Optimistic locking (StaleHook)
- .intentignore: intents listed there are excluded from writes

Post-Hooks:

- Content hashing
- Agent trace logging

## Sidecar Storage

.orchestration/

## Implementation Notes

- **Two execution paths**: (1) `select_active_intent` and script/test `write_file` go through `executeTool()` in `src/agent/toolExecutor.ts`. (2) Real UI `write_to_file` goes through `WriteToFileTool.handle()` in `src/core/tools/WriteToFileTool.ts`; hooks are invoked there (pre before write, post after save) with the same `HookEngine`.
- **Gatekeeper**: ScopeHook blocks `write_to_file` when no valid intent is selected; message: "You must cite a valid active Intent ID. Call select_active_intent(intent_id) first..."
- **Trace schema**: Each entry in `agent_trace.jsonl` includes `id`, `timestamp`, `vcs.revision_id` (git HEAD), `mutation_class` (AST_REFACTOR | INTENT_EVOLUTION), `files[].relative_path`, `conversations[].ranges[].content_hash` (sha256), `related[]` with type specification/intent.
- **intent_map.md**: Updated by TraceHook when appending a trace so the intent’s "Files:" section lists the modified file.

## Sidecar Files

- active_intents.yaml
- agent_trace.jsonl
- intent_map.md
- CLAUDE.md (shared brain)

## Semantic Git Layer

agent_trace.jsonl records:

- Intent ID
- Content hash
- File path
- Mutation range

## Parallel Safety

StaleHook prevents overwrite when file changed.

## Prompt Governance

System prompt enforces intent handshake.

## Result

Roo becomes a governed AI-native IDE with full intent traceability.

## Sequence Diagram (prompt → intent → tool → trace)

```mermaid
sequenceDiagram
	participant User
	participant Webview as Webview/UI
	participant Provider as ClineProvider
	participant LLM as Agent/LLM
	participant Executor as ToolExecutor
	participant Hooks as HookEngine
	participant Disk as Workspace
	participant Trace as AgentTrace (.orchestration)

	User->>Webview: Submit prompt
	Webview->>Provider: build system prompt (includes "select_active_intent" rule)
	Provider->>LLM: systemPrompt + user prompt
	LLM->>Executor: select_active_intent(intent_id)
	Executor->>Hooks: runPre(select_active_intent)
	Hooks->>Trace: IntentPreHook loads intent (active_intents.yaml)
	Hooks-->>Executor: injected <intent_context>
	Executor-->>LLM: return intent_context
	LLM->>Executor: write_file(path, content, intent_id, base_hash)
	Executor->>Hooks: runPre(write_file)
	Hooks->>Disk: StaleHook verifies base_hash
	Hooks->>Disk: ScopeHook verifies owned_scope
	Executor->>Disk: write file
	Executor->>Hooks: runPost(write_file)
	Hooks->>Trace: TraceHook appends entry to agent_trace.jsonl
	Hooks-->>Executor: post-hook done
	Executor-->>LLM: tool result
	LLM-->>User: final response
```
