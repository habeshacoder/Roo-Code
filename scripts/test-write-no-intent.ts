import { executeTool } from "../src/agent/toolExecutor"

async function main() {
	try {
		console.log("Attempting write_file without intent_id...")
		const res = await executeTool("write_file", { path: "src/weather/unauthorized.txt", content: "no intent" })
		console.log("write result:", res)
	} catch (err) {
		console.error("Error:", err instanceof Error ? err.message : err)
		process.exit(1)
	}
}

main()
