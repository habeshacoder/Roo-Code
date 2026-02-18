import { Hook, ToolContext, HookResult } from "./HookEngine"
import { getIntent } from "../.orchestration/IntentStore"

export class IntentPreHook implements Hook {
	async pre(ctx: ToolContext): Promise<HookResult> {
		if (ctx.toolName !== "select_active_intent") return { allow: true }

		const intent = getIntent(ctx.args?.intent_id || ctx.intentId)
		if (!intent) return { allow: false, message: "Invalid intent ID" }

		const xml = `
<intent_context>
	<id>${intent.id}</id>
	<scope>${intent.owned_scope.join(",")}</scope>
	<constraints>${intent.constraints.join(",")}</constraints>
</intent_context>
`

		ctx.intentId = intent.id

		return { allow: true, injectedContext: xml }
	}

	async post(ctx: ToolContext, result: any): Promise<void> {}
}
