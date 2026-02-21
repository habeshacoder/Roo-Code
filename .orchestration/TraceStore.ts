import fs from "fs"
import path from "path"
import { execSync } from "child_process"

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
	// Only use root-level .orchestration folder (moved from src/)
	const candidates = [path.join(root, ".orchestration/agent_trace.jsonl")]
	// Find first candidate whose parent directory exists, or fall back to first candidate
	return candidates.find((p) => fs.existsSync(path.dirname(p))) || candidates[0]
}

/** Returns current git HEAD revision (sha) or null if not a git repo / error. */
export function getGitRevision(): string | null {
	try {
		const root = getWorkspaceRoot()
		const out = execSync("git rev-parse HEAD", { cwd: root, encoding: "utf8" })
		return (out && out.trim()) || null
	} catch {
		return null
	}
}

const INTENT_MAP_PATH = () => path.join(getWorkspaceRoot(), ".orchestration", "intent_map.md")

/** Ensure intent_map.md records that this file is linked to the given intent. */
export function appendIntentMapEntry(intentId: string, relativePath: string) {
	const mapPath = INTENT_MAP_PATH()
	const dir = path.dirname(mapPath)
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
	let content = ""
	if (fs.existsSync(mapPath)) content = fs.readFileSync(mapPath, "utf8")
	const fileLine = `- ${relativePath}`
	if (content.includes(fileLine)) return
	const lines = content.split("\n")
	let inIntent = false
	let lastFileLineIndex = -1
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]
		if (line === undefined) continue
		if (line.startsWith(intentId + " ") || line === intentId) inIntent = true
		else if (inIntent && line.trim() === "Files:") lastFileLineIndex = i
		else if (inIntent && line.startsWith("- ")) lastFileLineIndex = i
		else if (inIntent && line.trim() !== "" && !line.startsWith("- ")) inIntent = false
	}
	if (lastFileLineIndex >= 0) {
		lines.splice(lastFileLineIndex + 1, 0, fileLine)
		fs.writeFileSync(mapPath, lines.join("\n"))
	}
}

export function appendTrace(entry: any) {
	const TRACE_PATH = findPath() as string
	console.debug(`[TraceStore] appending trace to ${TRACE_PATH}`)
	console.debug(entry)
	const dir = path.dirname(TRACE_PATH)
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
	fs.appendFileSync(TRACE_PATH, JSON.stringify(entry) + "\n")
}
