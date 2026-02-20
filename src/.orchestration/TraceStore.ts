import fs from "fs"
import path from "path"

// Similar workspace root logic as IntentStore; use VS Code API when
// available so traces are written in the user project instead of the
// extension installation directory.
//
// Exported for the same reasons as IntentStore: tests can directly stub
// or spy on this helper rather than attempting to mock the "vscode"
// module, which leads to hoisting issues.
// override for tests
export let workspaceRootOverride: string | undefined = undefined

export function getWorkspaceRoot(): string {
	if (workspaceRootOverride) {
		return workspaceRootOverride
	}
	try {
		const vscode = require("vscode")
		const folders = vscode.workspace?.workspaceFolders
		if (folders && folders.length > 0) {
			return folders[0].uri.fsPath
		}
	} catch {
		// not running inside vscode
	}
	return process.cwd()
}

function findPath() {
	// recompute each call so tests can override cwd/vscode mocks
	const root = getWorkspaceRoot()
	const candidates = [
		path.join(root, ".orchestration/agent_trace.jsonl"),
		path.join(root, "src/.orchestration/agent_trace.jsonl"),
	]
	return candidates.find((p) => fs.existsSync(path.dirname(p))) || candidates[0]
}

export function appendTrace(entry: any) {
	const TRACE_PATH = findPath()
	console.debug(`[TraceStore] appending trace to ${TRACE_PATH}`)
	console.debug(entry)
	const dir = path.dirname(TRACE_PATH)
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
	fs.appendFileSync(TRACE_PATH, JSON.stringify(entry) + "\n")
}
