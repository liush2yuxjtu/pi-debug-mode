# Usage funnel telemetry

Usage measurement is **off by default**. The extension performs no telemetry filesystem or network work unless all of the following are explicitly configured by the operator:

- `PI_USAGE_TELEMETRY=1`
- `PI_USAGE_TELEMETRY_PRIVACY_ACK=1`
- `PI_USAGE_TELEMETRY_ENDPOINT=https://...`

`DO_NOT_TRACK=1` or `PI_TELEMETRY_DISABLED=1` always disables it.

## Events

The funnel emits only these event names:

- `first_install` — first opted-in launch on this machine (not an npm postinstall hook)
- `first_launch` — same first real extension session
- `first_success` — the user confirms a debug reproduction as `Fixed`
- `returning_user` — first opted-in use on a later UTC day
- `weekly_active` — at most once per UTC week

## Fields

Events contain only random anonymous install/event UUIDs, package name, package version, timestamp, OS, Node major version, and a CI boolean.

The extension does **not** send prompts, bug descriptions, reproduction steps, source code, file paths, repository names, tokens, emails, usernames, model output, or arbitrary text/properties. Network failures are ignored and never block the debug workflow.
