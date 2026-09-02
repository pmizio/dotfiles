# Provider usage bars

Standalone Pi usage extension for connected provider accounts.

## Flow

```text
Pi auth
  ↓
providers/*.ts
  ↓
UsageReport / UsageMetric
  ↓
renderer.ts → UsageView
  ↓
ui.ts → footer and /usage
```

Provider adapters own authentication, API requests, and wire-format parsing. Every adapter returns the same `UsageReport` shape. The renderer and UI do not inspect provider IDs or API fields.

## Current adapters

- Codex individual and Business subscriptions
- Anthropic OAuth subscription usage
- GitHub Copilot allowance and credit usage

## Commands

```text
/usage
/usage refresh
```

The footer shows one compact current-usage bar per connected provider. `/usage` shows all metrics, plans, values, and reset times.

The extension is auto-discovered from:

```text
~/.pi/agent/extensions/provider-usage-bars/index.ts
```

To add a provider, add an adapter under `providers/` and include it in `providers/index.ts`. No renderer or UI changes should be needed.
