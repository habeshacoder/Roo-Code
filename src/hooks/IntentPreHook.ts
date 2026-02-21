import { Hook, ToolContext, HookResult } from "./HookEngine"
import { getIntent } from "../../.orchestration/IntentStore"

export class IntentPreHook implements Hook {
	async pre(ctx: ToolContext): Promise<HookResult> {
		if (ctx.toolName !== "select_active_intent") return { allow: true }

		const intent = getIntent(ctx.args?.intent_id || ctx.intentId)
		if (!intent)
			return {
				allow: false,
				message:
					"No active intent found. Make sure .orchestration/active_intents.yaml\n" +
					"contains an entry matching the provided intent_id.",
			}

		const scope = (intent.owned_scope || []).join(",")
		const constraints = (intent.constraints || []).join(",")
		const xml = `
<intent_context>
	<id>${intent.id}</id>
	<scope>${scope}</scope>
	<constraints>${constraints}</constraints>
</intent_context>
`

		ctx.intentId = intent.id

		return { allow: true, injectedContext: xml }
	}

	async post(ctx: ToolContext, result: any): Promise<void> {}
}
