import { Hook } from "./HookEngine"
import { getIntent } from "../.orchestration/IntentStore"

export class IntentPreHook implements Hook {
	async pre(ctx) {
		if (ctx.toolName !== "select_active_intent") return { allow: true }

		const intent = getIntent(ctx.args.intent_id)
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

	async post() {}
}
