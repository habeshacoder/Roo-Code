import fs from "fs"
import yaml from "js-yaml"
import path from "path"

// Determine the user’s workspace root if running inside VS Code.
// process.cwd() may point at the extension installation directory when
// executing in the extension host, so we attempt to use the VS Code API
// if available. Fallback to cwd for scripts and tests.
//
// Exported so unit tests can override or spy on the behaviour without
// relying on mocking the entire "vscode" module, which is hoisted by
// Vitest and can yield unpredictable results when the target value is
// computed within the test.
// During unit tests we may want to bypass the filesystem detection logic
// entirely and point at our temporary directory. Tests can set this
// variable; production code should never touch it.
export let workspaceRootOverride: string | undefined = undefined

export function getWorkspaceRoot(): string {
	if (workspaceRootOverride) {
		return workspaceRootOverride
	}
	try {
		// require dynamically so calling code outside of an extension
		// host (e.g. test runners) doesn’t crash when vscode isn’t present.
		const vscode = require("vscode")
		const folders = vscode.workspace?.workspaceFolders
		if (folders && folders.length > 0) {
			return folders[0].uri.fsPath
		}
	} catch {
		// ignore – not running in VS Code
	}
	return process.cwd()
}

function findPath() {
	// compute candidates each time so that tests can alter process.cwd or
	// mock vscode and have the change take effect.
	const root = getWorkspaceRoot()
	// Only use root-level .orchestration folder (moved from src/)
	const candidates = [path.join(root, ".orchestration/active_intents.yaml")]

	// Prefer a candidate that exists and is non-empty (workspace-root may be empty placeholder).
	for (const p of candidates) {
		if (!fs.existsSync(p)) continue
		try {
			const s = fs.readFileSync(p, "utf8").trim()
			if (s.length > 0) return p
		} catch (e) {
			return p
		}
	}
	return candidates[0]
}

export function loadIntents(): any {
	const PATH = findPath()
	// if the file doesn’t exist yet, create a stub so users aren’t
	// confused by a completely missing database. We don’t populate any
	// intents here because semantics should be provided by the user.
	if (!fs.existsSync(PATH)) {
		const dir = path.dirname(PATH)
		fs.mkdirSync(dir, { recursive: true })
		fs.writeFileSync(PATH, "active_intents: []\n", "utf8")
		return { active_intents: [] }
	}

	// make sure an existing-but-empty file gets initialized as well
	let raw = fs.readFileSync(PATH, "utf8")
	if (raw.trim().length === 0) {
		raw = "active_intents: []\n"
		fs.writeFileSync(PATH, raw, "utf8")
	}

	const parsed = yaml.load(raw) as any
	return parsed || { active_intents: [] }
}

export function getIntent(id?: string) {
	if (!id) return null
	const db = loadIntents()
	return (db.active_intents || []).find((i: any) => i.id === id) || null
}
