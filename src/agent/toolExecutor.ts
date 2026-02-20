import fs from "fs"
import path from "path"
import { hookEngine } from "../hooks"

async function runOriginalTool(toolName: string, args: any): Promise<any> {
	console.debug(`[toolExecutor] runOriginalTool: ${toolName}`, args)
	switch (toolName) {
		case "select_active_intent":
			// Return the injected intent context (XML) so callers receive it.
			return args._intentContext || null

		case "write_file": {
			const p = args.path
			if (!p) throw new Error("write_file missing 'path'")
			const dir = path.dirname(p)
			if (dir && dir !== ".") fs.mkdirSync(dir, { recursive: true })
			fs.writeFileSync(p, args.content || "", "utf8")
			return { path: p }
		}

		case "read_file": {
			const p = args.path
			if (!p) throw new Error("read_file missing 'path'")
			return fs.readFileSync(p, "utf8")
		}

		case "use_mcp_tool": {
			// Try to route to real MCP runner when running inside the extension host.
			// Dynamic import prevents pulling `vscode` at module load time when running
			// scripts outside the extension host (like test scripts).
			if (process.env.SKIP_MCP_RUNNER === "1") {
				throw new Error(`runOriginalTool not implemented for tool: ${toolName}`)
			}

			try {
				const { ClineProvider } = await import("../core/webview/ClineProvider")
				const provider = await ClineProvider.getInstance()
				const mcpHub = provider?.getMcpHub()
				if (mcpHub) {
					const serverName = (args.server_name || args.serverName) as string | undefined
					const toolNameArg = (args.tool_name || args.toolName) as string | undefined
					const toolArgs = (args.arguments || args.tool_arguments) as Record<string, unknown> | undefined
					if (!serverName || !toolNameArg) throw new Error("use_mcp_tool missing server_name/tool_name")
					const res = await mcpHub.callTool(serverName, toolNameArg, toolArgs)
					return res
				}
			} catch (err) {
				// fallthrough to not-implemented fallback
				console.warn("MCP runner not available, falling back:", err)
			}

			throw new Error(`runOriginalTool not implemented for tool: ${toolName}`)
		}

		default:
			throw new Error(`runOriginalTool not implemented for tool: ${toolName}`)
	}
}

// track the currently active intent id chosen by the model.  This allows
// later mutating tools to automatically inherit the intent even if the model
// forgets to explicitly pass it again.  It also lets the hook system reject
// writes when *no* intent has ever been selected (intent is required).  The
// variable is kept in this module because executeTool is the central dispatcher
// for all native tool calls.
let activeIntentId: string | undefined

export async function executeTool(toolName: string, args: any) {
	// simple debug output so we can see exactly what tools are invoked
	console.debug(`[toolExecutor] call: ${toolName}`, args)
	// if the tool isn't the selection tool and we haven't been given an intent_id
	// explicitly, propagate the current active intent automatically. this mirrors
	// how the extension host would maintain a session-level active intent.
	if (toolName !== "select_active_intent" && !args.intent_id && activeIntentId) {
		args.intent_id = activeIntentId
	}

	const ctx = {
		toolName,
		args,
		intentId: args.intent_id,
		filePath: args.path,
		content: args.content,
		baseHash: args.base_hash,
	}

	const injected = await hookEngine.runPre(ctx)

	if (injected) args._intentContext = injected

	const result = await runOriginalTool(toolName, args)

	// remember intent selection so subsequent calls inherit it
	if (toolName === "select_active_intent" && args.intent_id) {
		activeIntentId = args.intent_id
	}

	// let hooks observe post-call info (traces etc)
	await hookEngine.runPost(ctx, result)

	console.debug(`[toolExecutor] result: ${toolName}`, result)

	return result
}
