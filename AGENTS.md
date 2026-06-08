# Codex Instructions

When the user asks for ideas, advice, wording, drafts, or discussion, do not edit files or implement changes. Only make code or file changes when the user explicitly asks to build, change, implement, or update something.

When a Codex task is done, only send a macOS Notification Center notification if the Codex desktop window is not the frontmost visible app/window or may reasonably be hidden behind other windows. Prefer checking the frontmost application/window first when possible. If reliable visibility detection is unavailable, do not notify while actively answering in Codex; explain the limitation if it matters.

For MyMeteo work, read `MYMETEO_PROJECT_CONTEXT.md` before answering or changing files. Treat it as the shared product memory for the app's decisions, trade-offs, and design philosophy.

For MyMeteo changelog updates: do not update the changelog automatically when making app changes. If a change seems changelog-worthy, suggest the exact changelog entry to the user first and ask whether they want it added. Only edit the changelog after explicit user approval.

If a durable MyMeteo product decision changes during implementation, consider whether `MYMETEO_PROJECT_CONTEXT.md` should be updated too. Do not update it during advice-only discussion unless the user explicitly asks.
