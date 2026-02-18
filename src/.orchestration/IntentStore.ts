import fs from "fs"
import yaml from "js-yaml"

const PATH = ".orchestration/active_intents.yaml"

export function loadIntents(): any {
	return yaml.load(fs.readFileSync(PATH, "utf8"))
}

export function getIntent(id: string) {
	const db = loadIntents()
	return db.active_intents.find((i: any) => i.id === id)
}
