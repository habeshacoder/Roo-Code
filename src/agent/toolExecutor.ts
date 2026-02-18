import { hookEngine } from "../hooks"

export async function executeTool(toolName, args) {
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
