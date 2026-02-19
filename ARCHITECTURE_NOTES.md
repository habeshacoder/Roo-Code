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
- Scope enforcement![alt text](<Intent-Based Orchestration-2026-02-19-100510.png>)
- Optimistic locking

Post-Hooks:

- Content hashing
- Agent trace logging

## Sidecar Storage

.orchestration/

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
- Optimistic locking

Post-Hooks:

- Content hashing
- Agent trace logging

## Sidecar Storage

.orchestration/

- active_intents.yaml
- agent_trace.jsonl
- intent_map.md
- CLAUDE.md

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
