# pi-debug-mode

pi-debug-mode adds a Cursor-style evidence-first Debug Mode to the [Pi coding agent](https://github.com/earendil-works/pi-mono). Its injected instructions tell Pi to wait for runtime evidence before changing code. The workflow asks Pi to compare hypotheses, add targeted probes, pause for human reproduction, inspect captured evidence, apply the smallest supported fix, and verify the result.

The canonical source is [github.com/liush2yuxjtu/pi-debug-mode](https://github.com/liush2yuxjtu/pi-debug-mode).

## Real TUI demo

[![Real pi-debug-mode session in the Pi TUI](https://raw.githubusercontent.com/liush2yuxjtu/pi-debug-mode/v0.1.4/artifacts/demo/pi-debug-mode-real-tui-poster.png)](https://raw.githubusercontent.com/liush2yuxjtu/pi-debug-mode/v0.1.4/artifacts/demo/pi-debug-mode-real-tui.mp4)

[Watch the real Pi TUI recording](https://raw.githubusercontent.com/liush2yuxjtu/pi-debug-mode/v0.1.4/artifacts/demo/pi-debug-mode-real-tui.mp4). The recording captures a live `/debug` run on a real machine with a published extension release and `openai-codex/gpt-5.6-sol`. It includes hypothesis generation, temporary `pi-debug` probes, the interactive `debug_reproduction` checkpoint, evidence inspection, the smallest fix, human verification, probe cleanup, and a passing test.

The source terminal session was recorded from tmux as an asciinema cast. Only long human-wait intervals were compressed. The TUI output and tool execution remain from the live run.

### 中文演示

[![pi-debug-mode 真实中文 TUI 调试](https://raw.githubusercontent.com/liush2yuxjtu/pi-debug-mode/v0.1.4/artifacts/demo/pi-debug-mode-real-tui-zh-poster.png)](https://raw.githubusercontent.com/liush2yuxjtu/pi-debug-mode/v0.1.4/artifacts/demo/pi-debug-mode-real-tui-zh.mp4)

- [观看 57 秒真实中文 Pi TUI 录屏](https://raw.githubusercontent.com/liush2yuxjtu/pi-debug-mode/v0.1.4/artifacts/demo/pi-debug-mode-real-tui-zh.mp4)
- [观看 13 秒中文概念演示](https://raw.githubusercontent.com/liush2yuxjtu/pi-debug-mode/v0.1.4/artifacts/demo/pi-debug-mode-demo-zh.mp4)
- [打开中文交互演示](https://liush2yuxjtu.github.io/pi-debug-mode/demo-zh.html)

For a short English preview, [watch the 13-second product demo](https://raw.githubusercontent.com/liush2yuxjtu/pi-debug-mode/v0.1.4/artifacts/demo/pi-debug-mode-demo.mp4) or open the [English interactive demo](https://liush2yuxjtu.github.io/pi-debug-mode/demo.html). Both interactive demos are deterministic simulations.

## Install

Install the pinned npm release:

```bash
pi install npm:pi-debug-mode@0.1.4
```

Or install the pinned GitHub release:

```bash
pi install git:github.com/liush2yuxjtu/pi-debug-mode@v0.1.4
```

Restart Pi, then run:

```text
/debug describe the bug and expected behavior
```

At each checkpoint, `debug_reproduction` shows exact steps and these choices:

1. `Fixed`
2. `Issue reproduced, please try again`
3. `Type prompt…`

If you invoke `/debug` while Pi is busy, the extension waits for the current agent work to settle before it starts the debug task. It never overrides the active turn.

Use `/debug-stop` to leave Debug Mode without claiming a fix.

## Uninstall

For an npm install, run:

```bash
pi remove npm:pi-debug-mode
```

For a GitHub install, run:

```bash
pi remove git:github.com/liush2yuxjtu/pi-debug-mode
```

## How it works

1. Pi inspects the real execution path and lists competing hypotheses.
2. Pi adds minimal `pi-debug` runtime probes that distinguish the hypotheses.
3. `debug_reproduction` asks you to follow one exact reproduction.
4. Pi reads the captured evidence and applies the smallest root-cause fix.
5. You verify the same flow. Pi then removes the temporary probes.

## Why not a normal debug prompt?

| Approach | Runtime evidence | Human checkpoint | Finish condition |
| --- | --- | --- | --- |
| Ordinary debug prompt | Depends on the prompt and the agent response | Optional | Defined by the prompt |
| Generic agent mode | Depends on that mode's tools and instructions | Depends on that mode | Defined by that mode |
| `pi-debug-mode` | Its injected instructions require competing hypotheses and targeted `pi-debug` probes before a fix | Uses `debug_reproduction` after instrumentation and after the fix | After user confirmation, its instructions call for probe cleanup and relevant validation |

Use an ordinary prompt for a direct question or a bug with an obvious static cause. Use a generic agent mode when its broader workflow matches the task. Use `pi-debug-mode` when runtime behavior must separate plausible causes before code changes.

## Permissions and security

Pi extensions run with the same system permissions as Pi. This package adds two commands and one interactive tool. It does not start background services, send telemetry, or make network requests.

A debug session may ask Pi to add temporary runtime probes and read local logs. Review proposed tool calls. Do not reproduce a bug with secrets in inputs or logs.

Report vulnerabilities through [GitHub Security Advisories](https://github.com/liush2yuxjtu/pi-debug-mode/security/advisories/new). Report normal bugs through [GitHub Issues](https://github.com/liush2yuxjtu/pi-debug-mode/issues).

## Public sites

- Read the [English product site](https://liush2yuxjtu.github.io/pi-debug-mode/).
- Read the [Chinese product site](https://liush2yuxjtu.github.io/pi-debug-mode/zh/).

## FAQ

### When should I use pi-debug-mode?

Use it for bugs that need runtime evidence, competing hypotheses, or a human reproduction step before code changes.

### What data leaves my machine?

The extension itself sends no telemetry and makes no network requests. Your configured Pi model provider may receive prompts, tool outputs, and logs that Pi sends during the session.

### Does it prove every fix?

No. Its instructions require evidence before a fix and ask for final verification, but weak probes, an incomplete reproduction, or missing tests can still leave a bug unresolved.

## Sources

- [Cursor Debug Mode documentation](https://cursor.com/for/debugging)
- [Cursor Debug Mode announcement](https://cursor.com/blog/debug-mode)

## License

MIT
