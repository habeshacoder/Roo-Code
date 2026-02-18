import fs from "fs"
import yaml from "js-yaml"

const PATH = ".orchestration/active_intents.yaml"

export function loadIntents(): any {
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
