import fs from "fs"
import path from "path"
import crypto from "crypto"
import { Hook, ToolContext, HookResult } from "./HookEngine"

function getAbsolutePath(ctx: ToolContext): string {
	const p = ctx.filePath || ""
	if (path.isAbsolute(p)) return p
	try {
		const { getWorkspaceRoot } = require("../../.orchestration/IntentStore") as {
			getWorkspaceRoot: () => string
		}
		return path.join(getWorkspaceRoot(), p)
	} catch {
		return p
	}
}

export class StaleHook implements Hook {
	async pre(ctx: ToolContext): Promise<HookResult> {
		if (ctx.toolName !== "write_file" && ctx.toolName !== "write_to_file") return { allow: true }

		if (!ctx.baseHash) return { allow: true }

		const absolutePath = getAbsolutePath(ctx)
		if (!fs.existsSync(absolutePath)) return { allow: true }

		const disk = fs.readFileSync(absolutePath, "utf8")
		const diskHash = crypto.createHash("sha256").update(disk).digest("hex")

		if (diskHash !== ctx.baseHash) return { allow: false, message: "STALE_FILE" }

		return { allow: true }
	}

	async post(ctx: ToolContext, result: any): Promise<void> {}
}
