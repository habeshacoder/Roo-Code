import fs from "fs"
import path from "path"

const CANDIDATES = [
	path.join(process.cwd(), ".orchestration/agent_trace.jsonl"),
	path.join(process.cwd(), "src/.orchestration/agent_trace.jsonl"),
]

function findPath() {
	return CANDIDATES.find((p) => fs.existsSync(path.dirname(p))) || CANDIDATES[0]
}

export function appendTrace(entry: any) {
	const TRACE_PATH = findPath()
	const dir = path.dirname(TRACE_PATH)
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
	fs.appendFileSync(TRACE_PATH, JSON.stringify(entry) + "\n")
}
