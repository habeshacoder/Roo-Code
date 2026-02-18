import { Hook, ToolContext, HookResult } from "./HookEngine"
import { getIntent } from "../.orchestration/IntentStore"
import { minimatch } from "minimatch"

export class ScopeHook implements Hook {
	async pre(ctx: ToolContext): Promise<HookResult> {
		if (ctx.toolName !== "write_file") return { allow: true }

		const intent = getIntent(ctx.intentId as string)
		if (!intent) return { allow: false, message: "Missing intent" }

		const ok = intent.owned_scope.some((p: string) => minimatch(ctx.filePath || "", p))

		if (!ok)
			return {
				allow: false,
				message: `Scope violation: ${ctx.filePath}`,
			}

		return { allow: true }
	}

	async post(ctx: ToolContext, result: any): Promise<void> {}
}
