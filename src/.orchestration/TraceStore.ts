import fs from "fs"

const TRACE_PATH = ".orchestration/agent_trace.jsonl"

export function appendTrace(entry: any) {
	fs.appendFileSync(TRACE_PATH, JSON.stringify(entry) + "\n")
}
