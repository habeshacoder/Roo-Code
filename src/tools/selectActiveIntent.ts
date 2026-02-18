export const selectActiveIntent = {
	name: "select_active_intent",
	description: "Select active intent context",
	schema: {
		type: "object",
		properties: {
			intent_id: { type: "string" },
		},
		required: ["intent_id"],
	},
}
