import fs from "fs"
import path from "path"
import { Hook, ToolContext, HookResult } from "./HookEngine"
import { getIntent, getWorkspaceRoot } from "../../.orchestration/IntentStore"
import { minimatch } from "minimatch"

function isIntentIgnored(intentId: string): boolean {
	const root = getWorkspaceRoot()
	const candidates = [path.join(root, ".orchestration", ".intentignore"), path.join(root, ".intentignore")]
	for (const p of candidates) {
		if (!fs.existsSync(p)) continue
		try {
			const content = fs.readFileSync(p, "utf8")
			const lines = content
				.split("\n")
				.map((l) => l.trim())
				.filter(Boolean)
			if (lines.some((line) => line === intentId || minimatch(intentId, line))) return true
		} catch {
			// ignore read errors
		}
	}
	return false
}

export class ScopeHook implements Hook {
	async pre(ctx: ToolContext): Promise<HookResult> {
		if (ctx.toolName !== "write_file" && ctx.toolName !== "write_to_file") return { allow: true }

		const intentId = ctx.intentId as string
		if (intentId && isIntentIgnored(intentId))
			return { allow: false, message: `Intent ${intentId} is listed in .intentignore; changes are excluded.` }

		const intent = getIntent(intentId)
		if (!intent)
			return {
				allow: false,
				message:
					"You must cite a valid active Intent ID. Call select_active_intent(intent_id) first and use an id from .orchestration/active_intents.yaml.",
			}

		const scope = intent.owned_scope || []
		const ok = scope.some((p: string) => minimatch(ctx.filePath || "", p))

		if (!ok)
			return {
				allow: false,
				message: `Scope Violation: ${ctx.intentId} is not authorized to edit ${ctx.filePath}. Request scope expansion in active_intents.yaml.`,
			}

		return { allow: true }
	}

	async post(ctx: ToolContext, result: any): Promise<void> {}
}
