import fs from "fs"
import { executeTool } from "../src/agent/toolExecutor"

async function main() {
	try {
		console.log("Calling select_active_intent for INT-001")
		const sel = await executeTool("select_active_intent", { intent_id: "INT-001" })
		console.log("select result:\n", sel)

		const target = "src/weather/test_out.txt"
		// compute base hash of existing file if present
		let baseHash: string | undefined = undefined
		if (fs.existsSync(target)) {
			const disk = fs.readFileSync(target, "utf8")
			const crypto = await import("crypto")
			baseHash = crypto.createHash("sha256").update(disk).digest("hex")
		}

		console.log("Writing file to", target)
		const wr = await executeTool("write_file", {
			path: target,
			content: "hello from test runner\n",
			intent_id: "INT-001",
			base_hash: baseHash,
		})
		console.log("write result:\n", wr)

		console.log("Last lines of agent_trace.jsonl:")
		if (fs.existsSync(".orchestration/agent_trace.jsonl")) {
			const lines = fs.readFileSync(".orchestration/agent_trace.jsonl", "utf8").trim().split(/\n+/)
			console.log(lines.slice(-3).join("\n"))
		} else {
			console.log("no trace file found")
		}
	} catch (err) {
		console.error(err)
		process.exit(1)
	}
}

main()
