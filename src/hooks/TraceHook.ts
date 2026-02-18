import crypto from "crypto"
import { Hook, ToolContext, HookResult } from "./HookEngine"
import { appendTrace } from "../.orchestration/TraceStore"

export class TraceHook implements Hook {
	async pre(ctx: ToolContext): Promise<HookResult> {
		return { allow: true }
	}

	async post(ctx: ToolContext, result: any): Promise<void> {
		if (ctx.toolName !== "write_file") return

		const hash = crypto
			.createHash("sha256")
			.update(ctx.content || "")
			.digest("hex")

		const entry = {
			id: (crypto as any).randomUUID ? (crypto as any).randomUUID() : `trace-${Date.now()}`,
			timestamp: new Date().toISOString(),
			files: [
				{
					relative_path: ctx.filePath,
					conversations: [
						{
							contributor: {
								entity_type: "AI",
								model_identifier: "roo",
							},
							ranges: [
								{
									start_line: 1,
									end_line: (ctx.content || "").split("\n").length,
									content_hash: `sha256:${hash}`,
								},
							],
							related: [
								{
									type: "intent",
									value: ctx.intentId,
								},
							],
						},
					],
				},
			],
		}

		appendTrace(entry)
	}
}
