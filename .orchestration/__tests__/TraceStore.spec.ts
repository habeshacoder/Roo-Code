import fs from "fs"
import path from "path"
import os from "os"
let TraceStore: typeof import("../TraceStore")

function withTmpDir(fn: (tmp: string) => Promise<void> | void) {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tracestore-"))
	try {
		return fn(tmp)
	} finally {
		fs.rmSync(tmp, { recursive: true, force: true })
	}
}

describe("TraceStore workspace detection", () => {
	beforeEach(() => {
		vi.resetModules()
		vi.restoreAllMocks()
	})

	it("writes to process.cwd when vscode is unavailable", () => {
		TraceStore = require(path.join(__dirname, "..", "TraceStore.ts"))

		withTmpDir((tmp) => {
			vi.spyOn(process, "cwd").mockReturnValue(tmp)
			vi.spyOn(TraceStore, "getWorkspaceRoot").mockReturnValue(tmp)
			TraceStore.appendTrace({ foo: "bar" })
			const expected = path.join(tmp, ".orchestration/agent_trace.jsonl")
			expect(fs.existsSync(expected)).toBe(true)
			const content = fs.readFileSync(expected, "utf8")
			expect(content.trim()).toBe(JSON.stringify({ foo: "bar" }))
		})
	})

	it("respects vscode.workspaceFolders when available", () => {
		withTmpDir((tmp) => {
			TraceStore = require(path.join(__dirname, "..", "TraceStore.ts"))
			vi.spyOn(TraceStore, "getWorkspaceRoot").mockReturnValue(tmp)

			TraceStore.appendTrace({ baz: 123 })
			const expected = path.join(tmp, ".orchestration/agent_trace.jsonl")
			expect(fs.existsSync(expected)).toBe(true)
			expect(fs.readFileSync(expected, "utf8").trim()).toBe(JSON.stringify({ baz: 123 }))
		})
	})
})
