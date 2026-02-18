export interface ToolContext {
	toolName: string
	args: any
	intentId?: string
	filePath?: string
	content?: string
	baseHash?: string
}

export interface HookResult {
	allow: boolean
	message?: string
	injectedContext?: string
}

export interface Hook {
	pre(ctx: ToolContext): Promise<HookResult>
	post(ctx: ToolContext, result: any): Promise<void>
}

export class HookEngine {
	constructor(private hooks: Hook[]) {}

	async runPre(ctx: ToolContext) {
		let injected = ""
		for (const h of this.hooks) {
			const r = await h.pre(ctx)
			if (!r.allow) throw new Error(r.message || "Hook blocked")
			if (r.injectedContext) injected += r.injectedContext
		}
		return injected
	}

	async runPost(ctx: ToolContext, result: any) {
		for (const h of this.hooks) await h.post(ctx, result)
	}
}
