import type OpenAI from "openai"

/**
 * Tool definition for selecting an active intent.
 * This tool must be called before any file mutations as part of the hook system protocol.
 */
const selectActiveIntentTool: OpenAI.Chat.ChatCompletionTool = {
	type: "function",
	function: {
		name: "select_active_intent",
		description:
			"Select an active intent context before performing file mutations. This is required by the hook system to enforce scope permissions, prevent stale file overwrites, and create audit trails. Returns an <intent_context> XML block with intent details.",
		parameters: {
			type: "object",
			properties: {
				intent_id: {
					type: "string",
					description: "The ID of the intent to activate (e.g., 'INT-001')",
				},
			},
			required: ["intent_id"],
			additionalProperties: false,
		},
	},
}

export default selectActiveIntentTool
