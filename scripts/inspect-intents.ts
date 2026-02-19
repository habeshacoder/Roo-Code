import { loadIntents, getIntent } from "../src/.orchestration/IntentStore"
import fs from "fs"
import path from "path"

console.log("CWD:", process.cwd())
const cands = [
	path.join(process.cwd(), ".orchestration/active_intents.yaml"),
	path.join(process.cwd(), "src/.orchestration/active_intents.yaml"),
]
for (const c of cands) console.log(c, fs.existsSync(c))

const db = loadIntents()
console.log("loaded:", JSON.stringify(db, null, 2))
console.log("get INT-001:", getIntent("INT-001"))
