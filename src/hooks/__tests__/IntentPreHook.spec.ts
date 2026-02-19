import { IntentPreHook } from "../IntentPreHook"
import * as IntentStore from "../../.orchestration/IntentStore"

describe("IntentPreHook", () => {
	it("injects intent context when intent exists", async () => {
		const hook = new IntentPreHook()
		vi.spyOn(IntentStore, "getIntent").mockReturnValue({ id: "INT-001", owned_scope: [], constraints: [] })

		const res = await hook.pre({ toolName: "select_active_intent", args: { intent_id: "INT-001" } as any })
		expect(res.allow).toBe(true)
		expect(res.injectedContext).toContain("<id>INT-001</id>")
	})

	it("blocks when intent is missing", async () => {
		const hook = new IntentPreHook()
		vi.spyOn(IntentStore, "getIntent").mockReturnValue(null)

		const res = await hook.pre({ toolName: "select_active_intent", args: { intent_id: "NOPE" } as any })
		expect(res.allow).toBe(false)
	})
})
