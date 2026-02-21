import { buildNativeToolsArray } from "../src/core/task/build-tools"

async function main() {
	const provider: any = { getMcpHub: () => null, context: {} }
	// minimal ModelInfo stub
	const dummyModelInfo: any = { contextWindow: 4096, supportsPromptCache: false }
	const tools = await buildNativeToolsArray({
		provider,
		cwd: process.cwd(),
		mode: undefined,
		customModes: undefined,
		experiments: {},
		apiConfiguration: {},
		modelInfo: dummyModelInfo,
	})
	console.log(tools.map((t: any) => (t.function && t.function.name) || t.name))
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
