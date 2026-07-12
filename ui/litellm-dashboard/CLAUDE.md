## NeoX branding (neox-branded branch)

This branch is a NeoX fork. NeoX-specific changes are layered on top of the upstream LiteLLM tag. When upgrading to a new upstream version, cherry-pick the NeoX commits onto the new tag and resolve conflicts.

Files modified for NeoX branding:
- `src/app/layout.tsx` — page title "NeoX Gateway", favicon `/ui/neox-favicon.svg`
- `src/app/chat/layout.tsx` — `enable_chat_ui` DB gate removed so chat is always accessible
- `src/app/login/LoginPage.tsx` — dark canvas, NeoX logo, styled SSO popover
- `src/app/globals.css` — dark CSS variable block in `.dark {}`
- `src/components/navbar.tsx` — dark `#12161b` navbar, NeoX SVG mark + "NeoX Gateway" text
- `src/components/chat/ChatPage.tsx` — dark-themed sidebar/UI (kept but no longer the route handler — see below)
- `src/components/chat/ConversationList.tsx` — dark inline styles; antd `Modal/Avatar/Text` instead of shadcn
- `src/components/chat/ChatMessages.tsx` — dark inline styles; antd `Tooltip/Collapse` instead of shadcn
- `src/components/chat/useChatHistory.ts` — `generateUUID()` helper (HTTP fallback for `crypto.randomUUID`)
- `tailwind.config.js`, `ui_colors.json` — NeoX mint `#3ddc97` palette
- `public/neox-favicon.svg` — NeoX favicon

### Chat architecture (v1.92.0+)

The chat route is now `app/chat/` (a Next.js app-router layout), not `components/chat/ChatPage.tsx`. The active chain:

```
app/chat/layout.tsx         ← auth check, ChatShell provider (NeoX: enable_chat_ui gate removed)
app/chat/page.tsx           ← conversation page (upstream, uses useChatShell())
components/chat/ChatShell.tsx ← sidebar + nav; embeds ConversationList
components/chat/ChatMessages.tsx ← still used, dark-themed
```

`ChatPage.tsx` is kept but not on any route. Our `ConversationList` dark inline styles (`color: "#e6edf3"` for titles) conflict with `ChatShell`'s light `bg-sidebar` background — if you see nearly invisible text in the sidebar when conversations exist, that's the issue.

### Rebase gotchas

When cherry-picking NeoX commits onto a new upstream tag, expect these conflicts after resolution to still cause TypeScript errors caught only by the build (no local `node_modules`):

- **Missing antd imports** after conflict resolution: audit every file for `<Modal>`, `<Collapse>`, `<Avatar>`, icon components used in JSX without a matching `from "antd"` / `from "@ant-design/icons"` import.
- **Shadcn vs antd prop mismatch**: shadcn `Tooltip` takes `children+TooltipTrigger`, antd takes `title=`. If a conflict left shadcn imports but antd usage, the build fails with "Property 'title' does not exist on type TooltipProps".
- **Path renames between upstream versions**: e.g. `playground/llm_calls/` → `llm_calls/` in v1.92.0.
- **Hook signature changes**: check `useChatHistory` arity, `ConversationList` Props.
- **JSX structural mismatches**: a `</div>` where `</ScrollArea>` should be, left by conflict markers.
- **MCP PKCE commit** (e0d5c28db0 on v1.83.7 base): skip when rebasing — v1.92.0+ already has `_raise_preemptive_401_for_unauthenticated_servers` that supersedes it.

No `node_modules` locally? Submit to Cloud Build and fix one TypeScript error per cycle (~3 min each). Running `npm ci && npx tsc --noEmit` locally would catch all at once.

Never put LiteLLM tokens or API keys in `localStorage`. `localStorage` survives browser close. Prefer `httpOnly` cookies, or `sessionStorage` at most, understanding that any web storage is readable by injected scripts (XSS), and only httpOnly cookies are not

When you fix lint violations that are grandfathered in `eslint-suppressions.json`, run `eslint . --prune-suppressions` and commit the updated baseline so the gate ratchets down instead of leaving a stale suppression

`src/lib/http/schema.d.ts` is generated from the proxy's OpenAPI spec; never hand-edit it. After changing a backend route or response model that the dashboard consumes, run `npm run gen:api` and commit the result (CI `Check UI API Types Sync` enforces this)
