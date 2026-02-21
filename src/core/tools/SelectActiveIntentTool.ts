import { Task } from "../task/Task"
import { formatResponse } from "../prompts/responses"
import { BaseTool, ToolCallbacks } from "./BaseTool"
import type { ToolUse } from "../../shared/tools"
import { executeTool } from "../../agent/toolExecutor"

interface SelectActiveIntentParams {
	intent_id: string
}

export class SelectActiveIntentTool extends BaseTool<"select_active_intent"> {
	readonly name = "select_active_intent" as const

	async execute(params: SelectActiveIntentParams, task: Task, callbacks: ToolCallbacks): Promise<void> {
		const { intent_id } = params
		const { pushToolResult, handleError } = callbacks

		try {
			if (!intent_id) {
				task.consecutiveMistakeCount++
				task.recordToolError("select_active_intent")
				pushToolResult(await task.sayAndCreateMissingParamError("select_active_intent", "intent_id"))
				return
			}

			task.consecutiveMistakeCount = 0

			// Execute through the hook system
			const result = await executeTool("select_active_intent", { intent_id })

			// The hook system returns an XML intent context
			pushToolResult(result || "No intent context returned")
		} catch (error) {
			await handleError("selecting active intent", error as Error)
		}
	}

	override async handlePartial(task: Task, block: ToolUse<"select_active_intent">): Promise<void> {
		const intent_id: string | undefined = block.params.intent_id

		if (!intent_id) {
			return
		}

		const partialMessage = JSON.stringify({
			tool: "selectActiveIntent",
			intent_id,
		})

		await task.ask("tool", partialMessage, block.partial).catch(() => {})
	}
}

export const selectActiveIntentTool = new SelectActiveIntentTool()
