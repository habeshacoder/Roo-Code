import { executeTool } from "../toolExecutor"
import fs from "fs"
import path from "path"
import os from "os"
import yaml from "js-yaml"

// to avoid hitting real file system, we'll use a temp directory for writes

// helper that returns a fresh tmp dir and cleans it up after assertion
function withTmpDir(fn: (tmp: string) => void | Promise<void>) {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tee-"))
	try {
		return fn(tmp)
	} finally {
		fs.rmSync(tmp, { recursive: true, force: true })
	}
}

describe("toolExecutor intent propagation", () => {
	beforeEach(() => {
		// reset module state by re-importing toolExecutor so activeIntentId clears
		vi.resetModules()
	})

	it("blocks write_file when no intent has been selected", async () => {
		await expect(executeTool("write_file", { path: "foo.txt", content: "hi" })).rejects.toThrow(/Missing intent/)
	})

	it("automatically attaches active intent to subsequent calls", async () => {
		// create a fake intents file with one intent
		withTmpDir((tmp) => {
			const orches = path.join(tmp, ".orchestration")
			fs.mkdirSync(orches, { recursive: true })
			const yamlContent = yaml.dump({ active_intents: [{ id: "X", owned_scope: ["**/*"] }] })
			fs.writeFileSync(path.join(orches, "active_intents.yaml"), yamlContent)

			// mock workspace detection to point at tmp dir
			vi.mock("../.orchestration/IntentStore", () => {
				const original = vi.importActual("../.orchestration/IntentStore")
				return { ...original, workspaceRootOverride: tmp }
			})

			// select the intent
			return executeTool("select_active_intent", { intent_id: "X" })
				.then((res) => {
					expect(res).toContain("<intent_context")
					// now attempt write without providing intent_id
					return executeTool("write_file", { path: path.join(tmp, "a.txt"), content: "hello" })
				})
				.then((res) => {
					expect(res.path).toContain("a.txt")
					const written = fs.readFileSync(path.join(tmp, "a.txt"), "utf8")
					expect(written).toBe("hello")
				})
		})
	})
})
