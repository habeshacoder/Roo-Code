import { ScopeHook } from "../ScopeHook"
import * as IntentStore from "../../.orchestration/IntentStore"

describe("ScopeHook", () => {
	it("allows when path matches intent scope", async () => {
		const hook = new ScopeHook()
		vi.spyOn(IntentStore, "getIntent").mockReturnValue({ id: "INT-001", owned_scope: ["src/**"] })

		const res = await hook.pre({ toolName: "write_file", intentId: "INT-001", filePath: "src/foo/bar.ts" } as any)
		expect(res.allow).toBe(true)
	})

	it("blocks when path outside scope", async () => {
		const hook = new ScopeHook()
		vi.spyOn(IntentStore, "getIntent").mockReturnValue({ id: "INT-001", owned_scope: ["src/foo/**"] })

		const res = await hook.pre({ toolName: "write_file", intentId: "INT-001", filePath: "other/x.ts" } as any)
		expect(res.allow).toBe(false)
	})
})
