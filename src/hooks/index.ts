import { HookEngine } from "./HookEngine"
import { IntentPreHook } from "./IntentPreHook"
import { ScopeHook } from "./ScopeHook"
import { TraceHook } from "./TraceHook"
import { StaleHook } from "./StaleHook"

export const hookEngine = new HookEngine([new IntentPreHook(), new ScopeHook(), new StaleHook(), new TraceHook()])
