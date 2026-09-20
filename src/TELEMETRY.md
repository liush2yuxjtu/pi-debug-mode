# Usage funnel telemetry

Usage measurement is **off by default**. The extension performs no telemetry filesystem or network work until the user grants consent with `/debug-telemetry on`, or an operator explicitly opts in through environment variables.

This package uses the shared [`@nyn5255/telemetry`](https://www.npmjs.com/package/@nyn5255/telemetry) SDK and the shared collector, so all published packages contribute to one funnel with one schema and one consent model. It replaces the earlier package-specific funnel, which used different event names and its own state directory; the old opt-in environment variables still count as consent, so nobody who opted in before is silently turned off.

## Consent

| Path | Effect |
| --- | --- |
| `/debug-telemetry status` | Show current state, collector, fields, never-sent list, retention |
| `/debug-telemetry on` | Show the privacy notice, then ask for confirmation before enabling |
| `/debug-telemetry off` | Revoke and stop sending immediately |
| `PI_DEBUG_MODE_TELEMETRY=1` / `=0` | Process override |
| `PI_USAGE_TELEMETRY=1` + `PI_USAGE_TELEMETRY_PRIVACY_ACK=1` | Legacy opt-in from the previous funnel, still honored |
| `DO_NOT_TRACK=1` or `PI_TELEMETRY_DISABLED=1` | Always off; overrides every other setting |

Consent is stored in `~/.config/pi-debug-mode/telemetry.json` (`%LOCALAPPDATA%` on Windows) with owner-only permissions. A corrupt or unreadable file fails closed to "no consent". Revoking consent does not erase the anonymous install id: deleting it would make a later re-opt-in look like a brand new install.

## Events

The collector accepts only schema-v1 events from this package:

| Event | Trigger in this package |
| --- | --- |
| `install` | First opted-in session after the extension loads |
| `activated` | A debug session actually starts (`/debug`) |
| `first_success` | A reproduction checkpoint ends in `Fixed` |
| `weekly_active` | Derived once per UTC week from real use |
| `d7_retained` | Derived from a success 7–8 days after the first success |
| `feedback` | Not used by this package |

## Fields

Events contain only: `schema_version`, `event`, `event_id`, `anonymous_install_id` (random UUID, regenerated if the local state is lost), `package`, `version`, `timestamp`, `os`, `node_major`, `ci`, `feature`, and `week` for weekly events.

The extension does **not** send prompts, bug descriptions, reproduction steps, source code, file paths, repository names, tokens, emails, usernames, model output, IP addresses, or any arbitrary text. The collector rejects unknown fields, so a future bug cannot quietly widen this list.

## Collector and retention

- Endpoint: `https://telemetry-peach.vercel.app/api/events`, the same collector the previous migration already pointed at (override with `PI_DEBUG_MODE_TELEMETRY_ENDPOINT` or the legacy `PI_USAGE_TELEMETRY_ENDPOINT`).
- The collector stores no IP address, user agent, or forwarding header; its database schema has no column for them.
- Pseudonymous rows are deleted after 180 days.
- The collector is a serverless function: the hosting platform may keep short-lived technical request logs outside this package's control. The consent prompt says so rather than promising more than can be verified.

## Failure behavior

Telemetry is at-most-once: no retries and no offline spool. The network deadline is 1000 ms and failures are ignored, so telemetry never blocks or delays a debug session. Counts are therefore lower bounds, not exact user numbers; npm downloads include CI, mirrors, and reinstalls and are not users.
