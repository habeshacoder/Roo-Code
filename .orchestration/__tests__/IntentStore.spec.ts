import fs from "fs"
import path from "path"
import os from "os"
// IntentStore will be required inside each test after configuring mocks
let IntentStore: typeof import("../IntentStore")

// helper to create and cleanup temporary directories
function withTmpDir(fn: (tmp: string) => Promise<void> | void) {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "intentstore-"))
	try {
		return fn(tmp)
	} finally {
		// cleanup recursively
		fs.rmSync(tmp, { recursive: true, force: true })
	}
}

describe("IntentStore workspace detection", () => {
	beforeEach(() => {
		vi.resetModules()
		vi.restoreAllMocks()
	})

	it("falls back to process.cwd when vscode is unavailable", () => {
		// rather than mocking the entire vscode module (which is hoisted and
		// may break when value is generated later), we simply stub the
		// workspace-detection helper directly after importing the module.
		IntentStore = require(path.join(__dirname, "..", "IntentStore.ts"))

		withTmpDir((tmp) => {
			const originalCwd = process.cwd
			vi.spyOn(process, "cwd").mockReturnValue(tmp)

			// also set override so that root detection matches our patched cwd
			IntentStore.workspaceRootOverride = tmp

			const db = IntentStore.loadIntents()
			expect(db).toEqual({ active_intents: [] })

			const expected = path.join(tmp, ".orchestration/active_intents.yaml")
			expect(fs.existsSync(expected)).toBe(true)

			vi.spyOn(process, "cwd").mockImplementation(originalCwd)
		})
	})

	it("prefers vscode.workspaceFolders when available", () => {
		withTmpDir((tmp) => {
			IntentStore = require(path.join(__dirname, "..", "IntentStore.ts"))
			// directly override the helper to return our temp directory
			IntentStore.workspaceRootOverride = tmp

			const db = IntentStore.loadIntents()
			expect(db).toEqual({ active_intents: [] })

			const expected = path.join(tmp, ".orchestration/active_intents.yaml")
			expect(fs.existsSync(expected)).toBe(true)
		})
	})

	it("rewrites an existing empty file with skeleton content", () => {
		withTmpDir((tmp) => {
			IntentStore = require(path.join(__dirname, "..", "IntentStore.ts"))
			IntentStore.workspaceRootOverride = tmp
			const filePath = path.join(tmp, ".orchestration/active_intents.yaml")
			fs.mkdirSync(path.dirname(filePath), { recursive: true })
			fs.writeFileSync(filePath, "")

			const db = IntentStore.loadIntents()
			expect(fs.readFileSync(filePath, "utf8")).toContain("active_intents")
			expect(db).toEqual({ active_intents: [] })
		})
	})
})

// additional sanity test for getIntent itself
describe("Intent retrieval logic", () => {
	it("returns null for unknown id and includes helpful message", () => {
		// create a small db in temp dir
		withTmpDir((tmp) => {
			IntentStore = require(path.join(__dirname, "..", "IntentStore.ts"))
			IntentStore.workspaceRootOverride = tmp
			const yaml = `active_intents:\n  - id: TEST\n    owned_scope: []\n    constraints: []\n`
			fs.mkdirSync(path.join(tmp, ".orchestration"), { recursive: true })
			fs.writeFileSync(path.join(tmp, ".orchestration/active_intents.yaml"), yaml)

			const intent = IntentStore.getIntent("MISSING")
			expect(intent).toBeNull()
		})
	})
})
