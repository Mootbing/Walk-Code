<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# WalkCode

When the user says `/walk`, `/walkcode`, or asks to hand off the active task to Railway, stop normal work and use the WalkCode skill/workflow. Write `.walk/current-summary.md`, then run:

```bash
npm run walkcode -- handoff --summary-file .walk/current-summary.md
```

The command handles branch upload, polling, auto-sync, and cloud conflict escalation.

# React Bits MCP

Use the global `shadcn` MCP server for React Bits registry work. The React Bits namespace is `@react-bits` and its shadcn registry URL is `https://reactbits.dev/r/{name}.json`. Only add a project-level `components.json` registry entry when the target project actually needs React Bits components installed.
