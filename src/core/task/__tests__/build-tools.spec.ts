import { buildNativeToolsArray } from "../build-tools"

// simple fake provider implementing the minimal interface used by build-tools
const fakeProvider = {
	getMcpHub: () => null,
	context: {},
}

describe("buildNativeToolsArray", () => {
	it("always includes select_active_intent", async () => {
		const tools = await buildNativeToolsArray({
			provider: fakeProvider as any,
			cwd: process.cwd(),
			mode: undefined,
			customModes: undefined,
			experiments: {},
			apiConfiguration: {},
			disabledTools: [],
			modelInfo: { contextWindow: 1000, supportsPromptCache: false } as any,
		})
		const names = tools.map((t) => (t as any).function?.name || (t as any).name)
		expect(names).toContain("select_active_intent")
	})
})
