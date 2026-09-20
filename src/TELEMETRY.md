# Usage funnel telemetry

Usage measurement is **off by default**. The extension performs no telemetry filesystem or network work unless all of the following are explicitly configured by the operator:

- `PI_USAGE_TELEMETRY=1`
- `PI_USAGE_TELEMETRY_PRIVACY_ACK=1`
- 可选：`PI_USAGE_TELEMETRY_ENDPOINT=https://...` 覆盖默认 collector；默认使用 `https://telemetry-peach.vercel.app/api/events`

`DO_NOT_TRACK=1` or `PI_TELEMETRY_DISABLED=1` always disables it.

## Events

The funnel emits only these event names:

- `install` — first opted-in real extension session on this machine (never an npm postinstall hook)
- `activated` — first opted-in session where the extension is actually loaded
- `first_success` — the user confirms a debug reproduction as `Fixed`
- `d7_retained` — another real success 7–8 days after first success
- `weekly_active` — at most once per UTC week

## Fields

Events contain only random anonymous install/event UUIDs, package name, package version, timestamp, OS, Node major version, and a CI boolean.

The extension does **not** send prompts, bug descriptions, reproduction steps, source code, file paths, repository names, tokens, emails, usernames, model output, or arbitrary text/properties. Network failures are ignored and never block the debug workflow.
