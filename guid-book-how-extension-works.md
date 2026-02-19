# Guide: How the Extension Intercepts Agent Tool Calls

## Overview

This extension uses a sophisticated middleware system to intercept, validate, and trace all tool calls made by AI agents. The system enforces an **intent-first protocol** where every file modification must be scoped to a specific intent, preventing unauthorized changes and creating a complete audit trail.

## Architecture Components

### Core Files

- **`src/agent/toolExecutor.ts`** - Main middleware entry point
- **`src/hooks/HookEngine.ts`** - Hook execution engine
- **`src/hooks/IntentPreHook.ts`** - Intent validation and context injection
- **`src/hooks/ScopeHook.ts`** - File path scope validation
- **`src/hooks/StaleHook.ts`** - Prevents stale file overwrites
- **`src/hooks/TraceHook.ts`** - Audit trail creation
- **`src/.orchestration/IntentStore.ts`** - Intent database
- **`src/.orchestration/TraceStore.ts`** - Trace storage
- **`src/core/prompts/sections/tool-use-guidelines.ts`** - Protocol enforcement in system prompt

## Flow: User Prompt → Final Result

### Step 1: User Submits Prompt

User types a request in the VS Code extension webview. The system builds a comprehensive prompt that includes the **MANDATORY PROTOCOL** requiring agents to call `select_active_intent` before any mutations.

### Step 2: Agent Calls Tool

The LLM/agent reasons about the task and issues a tool call. All tool calls go through `executeTool(toolName, args)` in `toolExecutor.ts`.

### Step 3: Hook Engine Intercepts (Pre-Hooks)

Before the tool executes, `HookEngine.runPre()` runs each hook in sequence:

#### Hook 1: IntentPreHook

**Applies to:** `select_active_intent` tool
**Function:**

- Validates intent ID against `active_intents.yaml`
- Returns `<intent_context>` XML with intent metadata:
    ```xml
    <intent_context>
      <id>INT-001</id>
      <scope>src/weather/**,src/utils/*</scope>
      <constraints>no-external-api,no-destructive-deletes</constraints>
    </intent_context>
    ```
- Injects this XML into the tool result
- **Block condition:** Invalid intent ID

#### Hook 2: ScopeHook

**Applies to:** `write_file` tool
**Function:**

- Retrieves active intent using `intent_id` from tool args
- Checks if target file path matches any pattern in intent's `owned_scope`
- Uses `minimatch` for pattern matching (e.g., `src/weather/**`)
- **Block condition:** File path outside authorized scope → "Scope violation: <path>"

#### Hook 3: StaleHook

**Applies to:** `write_file` tool
**Function:**

- Compares `base_hash` (provided by agent) with current file's SHA-256 hash
- Ensures file hasn't changed since agent read it
- **Block condition:** Hash mismatch → "STALE_FILE"

#### Hook 4: TraceHook (Pre-phase)

- Currently does nothing in pre-phase (acts in post-phase)

### Step 4: Tool Execution

If all pre-hooks return `allow: true`, the original tool executes:

- **`write_file`**: Writes content to disk with `fs.writeFileSync`
- **`read_file`**: Reads file from disk
- **`use_mcp_tool`**: Routes to MCP runner via `McpHub.callTool()`
- **`select_active_intent`**: Returns injected `<intent_context>` XML

### Step 5: Post-Hooks (Audit & Trace)

After successful execution, `HookEngine.runPost()` runs:

#### TraceHook (Post-phase)

**Applies to:** `write_file` tool
**Function:**

- Computes SHA-256 hash of written content
- Builds trace entry:
    ```json
    {
    	"id": "uuid",
    	"timestamp": "ISO-date",
    	"files": [
    		{
    			"relative_path": "src/weather/data.txt",
    			"conversations": [
    				{
    					"contributor": {
    						"entity_type": "AI",
    						"model_identifier": "roo"
    					},
    					"ranges": [
    						{
    							"start_line": 1,
    							"end_line": 42,
    							"content_hash": "sha256:abc123..."
    						}
    					],
    					"related": [
    						{
    							"type": "intent",
    							"value": "INT-001"
    						}
    					]
    				}
    			]
    		}
    	]
    }
    ```
- Appends to `agent_trace.jsonl` (append-only ledger)

### Step 6: Agent Receives Result

- Tool result (or error) returns to agent
- If blocked, agent must handle error (retry, rebase, or ask user)
- If successful, agent continues with next step

## Error Handling Scenarios

| Scenario       | Hook          | Error Message             | Agent Response                                     |
| -------------- | ------------- | ------------------------- | -------------------------------------------------- |
| Invalid intent | IntentPreHook | "Invalid intent ID"       | Select valid intent or create new one              |
| Out of scope   | ScopeHook     | "Scope violation: <path>" | Request scope expansion or use different intent    |
| Stale file     | StaleHook     | "STALE_FILE"              | Re-read file, merge changes, provide new base_hash |
| Missing intent | System        | Protocol violation        | Call `select_active_intent` first                  |

## Data Persistence

### 1. Intent Database (`active_intents.yaml`)

```yaml
active_intents:
    - id: INT-001
      description: "Weather data processing"
      owned_scope: ["src/weather/**", "src/utils/*"]
      constraints: ["no-external-api", "no-destructive-deletes"]
      created_at: "2024-01-15T10:30:00Z"
```

### 2. Audit Trail (`agent_trace.jsonl`)

- Append-only JSON Lines file
- Links every file modification to specific intent
- Records content hashes for verification
- Enables reproducibility and accountability

## System Prompt Integration

The system prompt (`tool-use-guidelines.ts`) enforces the protocol:

```markdown
MANDATORY PROTOCOL FOR MUTATIONS:

- Before calling any mutating tool (for example 'write_file', 'edit_file', 'create_directory', or 'move_file'), you MUST first call the 'select_active_intent(intent_id)' tool and wait for the returned '<intent_context>' before proceeding.

Example:

1. select_active_intent({ "intent_id": "INT-001" })
2. wait for '<intent_context>' result
3. write_file({ "path": "src/foo/bar.ts", "content": "...", "intent_id": "INT-001", "base_hash": "<hash>" })
```

## Testing the Flow

Example test script (`scripts/test-tool.ts`):

```typescript
// 1. Select intent
await executeTool("select_active_intent", { intent_id: "INT-001" })

// 2. Write file (with scope and stale checks)
await executeTool("write_file", {
	path: "src/weather/test.txt",
	content: "hello",
	intent_id: "INT-001",
	base_hash: computedHash,
})

// 3. Verify trace was created
// Check .orchestration/agent_trace.jsonl
```

## Extensibility

The hook system is designed for extension:

1. **Add new hooks** - Implement `Hook` interface and add to `HookEngine` constructor
2. **Modify existing hooks** - Adjust validation logic as needed
3. **Custom post-processing** - Add hooks that update `intent_map.md`, `CLAUDE.md`, or other artifacts

## Security Benefits

1. **Least Privilege**: Each intent has minimal necessary file access
2. **Auditability**: Complete trace of all modifications
3. **Conflict Prevention**: Stale detection prevents overwrites
4. **Intent-Driven**: All changes explicitly linked to business intent

## Flow Diagram

```
User Prompt
    ↓
Agent Tool Call → executeTool()
    ↓
Pre-Hooks:
├── IntentPreHook (validate intent)
├── ScopeHook (check file scope)
└── StaleHook (prevent overwrites)
    ↓
Tool Execution (if all hooks allow)
    ↓
Post-Hooks:
└── TraceHook (create audit trail)
    ↓
Result → Agent
```

This middleware architecture ensures that AI agents work within defined boundaries, creating a safe, traceable, and governable development environment.
