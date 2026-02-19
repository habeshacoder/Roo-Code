import fs from "fs"
import yaml from "js-yaml"
import path from "path"

const CANDIDATES = [
	path.join(process.cwd(), ".orchestration/active_intents.yaml"),
	path.join(process.cwd(), "src/.orchestration/active_intents.yaml"),
]

function findPath() {
	// Prefer a candidate that exists and is non-empty (workspace-root may be empty placeholder).
	for (const p of CANDIDATES) {
		if (!fs.existsSync(p)) continue
		try {
			const s = fs.readFileSync(p, "utf8").trim()
			if (s.length > 0) return p
		} catch (e) {
			return p
		}
	}
	return CANDIDATES[0]
}

export function loadIntents(): any {
	const PATH = findPath()
	if (!fs.existsSync(PATH)) return { active_intents: [] }
	const raw = fs.readFileSync(PATH, "utf8")
	const parsed = yaml.load(raw) as any
	return parsed || { active_intents: [] }
}

export function getIntent(id?: string) {
	if (!id) return null
	const db = loadIntents()
	return (db.active_intents || []).find((i: any) => i.id === id) || null
}
