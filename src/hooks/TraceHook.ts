import crypto from "crypto"
import { Hook, ToolContext, HookResult } from "./HookEngine"
import { appendTrace, appendIntentMapEntry, getGitRevision } from "../../.orchestration/TraceStore"

function randomId(): string {
	if (typeof crypto.randomUUID === "function") return crypto.randomUUID()
	return `trace-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

export class TraceHook implements Hook {
	async pre(ctx: ToolContext): Promise<HookResult> {
		return { allow: true }
	}

	async post(ctx: ToolContext, result: any): Promise<void> {
		if (ctx.toolName !== "write_file" && ctx.toolName !== "write_to_file") return

		const content = ctx.content || ""
		const lineCount = content.split("\n").length
		const hash = crypto.createHash("sha256").update(content).digest("hex")
		const revisionId = getGitRevision()

		const entry = {
			id: randomId(),
			timestamp: new Date().toISOString(),
			vcs: { revision_id: revisionId || undefined },
			mutation_class: ctx.mutationClass || "INTENT_EVOLUTION",
			files: [
				{
					relative_path: ctx.filePath,
					conversations: [
						{
							url: undefined as string | undefined,
							contributor: {
								entity_type: "AI",
								model_identifier: "roo",
							},
							ranges: [
								{
									start_line: 1,
									end_line: lineCount,
									content_hash: `sha256:${hash}`,
								},
							],
							related: [
								{ type: "specification", value: ctx.intentId },
								{ type: "intent", value: ctx.intentId },
							].filter((r) => r.value),
						},
					],
				},
			],
		}

		appendTrace(entry)
		if (ctx.intentId && ctx.filePath) appendIntentMapEntry(ctx.intentId, ctx.filePath)
	}
}
