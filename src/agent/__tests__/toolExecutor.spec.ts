import { executeTool } from "../toolExecutor"
import fs from "fs"
import path from "path"
import os from "os"
import yaml from "js-yaml"

// to avoid hitting real file system, we'll use a temp directory for writes

// helper that returns a fresh tmp dir and cleans it up after assertion
async function withTmpDir(fn: (tmp: string) => void | Promise<void>) {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tee-"))
	try {
		return await fn(tmp)
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
		await expect(executeTool("write_file", { path: "foo.txt", content: "hi" })).rejects.toThrow(
			/valid active Intent ID|Missing intent/,
		)
	})

	it("automatically attaches active intent to subsequent calls", async () => {
		await withTmpDir(async (tmp) => {
			const orches = path.join(tmp, ".orchestration")
			fs.mkdirSync(orches, { recursive: true })
			const yamlContent = yaml.dump({
				active_intents: [{ id: "X", owned_scope: ["**/*"], constraints: [] }],
			})
			fs.writeFileSync(path.join(orches, "active_intents.yaml"), yamlContent)

			// IntentStore/TraceStore use getWorkspaceRoot() which falls back to process.cwd() when vscode has no workspace
			const origCwd = process.cwd()
			process.chdir(tmp)
			try {
				const res = await executeTool("select_active_intent", { intent_id: "X" })
				expect(res).toContain("<intent_context")
				const writeRes = await executeTool("write_file", {
					path: path.join(tmp, "a.txt"),
					content: "hello",
				})
				expect(writeRes.path).toContain("a.txt")
				const written = fs.readFileSync(path.join(tmp, "a.txt"), "utf8")
				expect(written).toBe("hello")
			} finally {
				process.chdir(origCwd)
			}
		})
	})
})
