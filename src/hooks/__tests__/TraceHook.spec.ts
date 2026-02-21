import { TraceHook } from "../TraceHook"
import * as TraceStore from "../../../.orchestration/TraceStore"

describe("TraceHook", () => {
	it("appends trace entry on post write_file", async () => {
		const spy = vi.spyOn(TraceStore, "appendTrace").mockImplementation(() => undefined)
		const hook = new TraceHook()

		await hook.post(
			{ toolName: "write_file", content: "abc\n", intentId: "INT-1", filePath: "src/x.ts" } as any,
			{},
		)

		expect(spy).toHaveBeenCalled()
		const calledWith = spy.mock.calls[0][0]
		expect(calledWith.files[0].relative_path).toBe("src/x.ts")
		expect(calledWith.files[0].conversations[0].related[0].value).toBe("INT-1")
	})
})
