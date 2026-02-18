import { hookEngine } from "../hooks"

async function runOriginalTool(toolName: string, args: any): Promise<any> {
	// Minimal fallback implementation so the executor compiles and runs.
	// Projects can replace this with the real dispatcher.
	throw new Error(`runOriginalTool not implemented for tool: ${toolName}`)
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
