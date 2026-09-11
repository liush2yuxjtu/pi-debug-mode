# pi-debug-mode

pi-debug-mode adds a Cursor-style evidence-first Debug Mode to the [Pi coding agent](https://github.com/earendil-works/pi-mono). Its injected instructions tell Pi to wait for runtime evidence before changing code. The workflow asks Pi to compare hypotheses, add targeted probes, pause for human reproduction, inspect captured evidence, apply the smallest supported fix, and verify the result.

The canonical source is [github.com/liush2yuxjtu/pi-debug-mode](https://github.com/liush2yuxjtu/pi-debug-mode).

## Live preview — no click required

![Animated pi-debug-mode workflow preview](https://cdn.jsdelivr.net/gh/liush2yuxjtu/pi-debug-mode@v0.1.8/artifacts/demo/pi-debug-mode-preview.gif)

The animated preview runs inline and loops automatically. It is a real Pi TUI recording segment from the published extension, captured on a real machine.

[Watch the full real Pi TUI recording](https://cdn.jsdelivr.net/gh/liush2yuxjtu/pi-debug-mode@v0.1.8/artifacts/demo/pi-debug-mode-real-tui.mp4). The 80.92-second recording captures a live `/debug` run on a real machine with a published extension release and `openai-codex/gpt-5.6-sol`. It includes hypothesis generation, temporary `pi-debug` probes, the interactive `debug_reproduction` checkpoint, evidence inspection, the smallest fix, human verification, probe cleanup, and a passing test.

The source terminal session was recorded from tmux as an asciinema cast. Only long human-wait intervals were compressed. The TUI output and tool execution remain from the live run.

### 中文动态预览

![pi-debug-mode 中文动态工作流预览](https://cdn.jsdelivr.net/gh/liush2yuxjtu/pi-debug-mode@v0.1.8/artifacts/demo/pi-debug-mode-preview-zh.gif)

上方 GIF 会直接循环播放，无需点击。它来自真实机器上的真实 Pi TUI 录屏片段。

- [观看 57 秒真实中文 Pi TUI 录屏](https://cdn.jsdelivr.net/gh/liush2yuxjtu/pi-debug-mode@v0.1.8/artifacts/demo/pi-debug-mode-real-tui-zh.mp4)
- [观看 13 秒中文概念演示](https://cdn.jsdelivr.net/gh/liush2yuxjtu/pi-debug-mode@v0.1.8/artifacts/demo/pi-debug-mode-demo-zh.mp4)
- [打开中文交互演示](https://liush2yuxjtu.github.io/pi-debug-mode/demo-zh.html)

For another English route, [watch the original 13-second product demo](https://cdn.jsdelivr.net/gh/liush2yuxjtu/pi-debug-mode@v0.1.8/artifacts/demo/pi-debug-mode-demo.mp4), [watch the fresh 0.1.8 Guided replay](https://cdn.jsdelivr.net/gh/liush2yuxjtu/pi-debug-mode@v0.1.8/artifacts/demo/pi-debug-mode-demo-0.1.8.mp4), or open the [English interactive demo](https://liush2yuxjtu.github.io/pi-debug-mode/demo.html).

## Install

Install the pinned npm release:

```bash
pi install npm:pi-debug-mode@0.1.8
```

Or install the pinned GitHub release:

```bash
pi install git:github.com/liush2yuxjtu/pi-debug-mode@v0.1.8
```

Restart Pi, then run:

```text
/debug describe the bug and expected behavior
```

At each checkpoint, `debug_reproduction` shows exact steps and four choices:

1. `Fixed`
2. `Issue reproduced, please try again`
3. `Type prompt…`
4. `Autopilot — Agent 自行验证`

Autopilot changes the prompt guidance, not the tool surface. After the first checkpoint, Pi verifies commands, tests, APIs, logs, CLI/TUI behavior, UI logic, and artifacts with existing tools. It requests another checkpoint only for visual, click, touch, or aesthetic judgment, using `humanReason`. It does not start a background runner, simulate clicks, or bypass permissions.

The first checkpoint is a mode handoff. Machine paths use no second checkpoint. Human paths use at most two checkpoints. Autopilot does not claim that a check passed or that the issue is fixed.

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
3. `debug_reproduction` hands the reproduction to Guided mode or Autopilot.
4. In Autopilot, Pi runs machine-checkable verification with existing tools. It asks for human input only when visual, click, touch, or aesthetic judgment remains.
5. Pi reads the captured evidence and applies the smallest root-cause fix.
6. Pi repeats the same machine checks, removes temporary probes, and reports the evidence.

## Why not a normal debug prompt?

| Approach | Runtime evidence | Human checkpoint | Finish condition |
| --- | --- | --- | --- |
| Ordinary debug prompt | Depends on the prompt and the agent response | Optional | Defined by the prompt |
| Generic agent mode | Depends on that mode's tools and instructions | Depends on that mode | Defined by that mode |
| `pi-debug-mode` | Its injected instructions require competing hypotheses and targeted `pi-debug` probes before a fix | Uses `debug_reproduction` after instrumentation and after the fix | After user confirmation, its instructions call for probe cleanup and relevant validation |

Use an ordinary prompt for a direct question or a bug with an obvious static cause. Use a generic agent mode when its broader workflow matches the task. Use `pi-debug-mode` when runtime behavior must separate plausible causes before code changes.

## Permissions and security

Pi extensions run with the same system permissions as Pi. This package adds two commands and one interactive tool. Autopilot is one choice inside that existing tool. It does not start background services, send telemetry, or make network requests.

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
