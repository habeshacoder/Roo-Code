import fs from "fs"
import crypto from "crypto"
import { Hook, ToolContext, HookResult } from "./HookEngine"

export class StaleHook implements Hook {
	async pre(ctx: ToolContext): Promise<HookResult> {
		if (ctx.toolName !== "write_file") return { allow: true }

		if (!ctx.baseHash) return { allow: true }

		const disk = fs.readFileSync(ctx.filePath || "", "utf8")
		const diskHash = crypto.createHash("sha256").update(disk).digest("hex")

		if (diskHash !== ctx.baseHash) return { allow: false, message: "STALE_FILE" }

		return { allow: true }
	}

	async post(ctx: ToolContext, result: any): Promise<void> {}
}
