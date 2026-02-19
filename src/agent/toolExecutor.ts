import fs from "fs"
import path from "path"
import { hookEngine } from "../hooks"

async function runOriginalTool(toolName: string, args: any): Promise<any> {
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

export async function executeTool(toolName: string, args: any) {
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

	await hookEngine.runPost(ctx, result)

	return result
}
