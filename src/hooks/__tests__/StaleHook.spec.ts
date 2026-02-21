import { StaleHook } from "../StaleHook"
import fs from "fs"
import crypto from "crypto"

describe("StaleHook", () => {
	const tmp = ".tmp-stale-test.txt"
	beforeEach(() => {
		if (fs.existsSync(tmp)) fs.unlinkSync(tmp)
	})
	afterEach(() => {
		if (fs.existsSync(tmp)) fs.unlinkSync(tmp)
	})

	it("allows when no baseHash provided", async () => {
		const hook = new StaleHook()
		const res = await hook.pre({ toolName: "write_file" } as any)
		expect(res.allow).toBe(true)
	})

	it("blocks when baseHash differs from disk", async () => {
		fs.writeFileSync(tmp, "original")
		const diskHash = crypto.createHash("sha256").update("original").digest("hex")

		const hook = new StaleHook()
		const res = await hook.pre({ toolName: "write_file", baseHash: diskHash + "x", filePath: tmp } as any)
		expect(res.allow).toBe(false)
	})
})
