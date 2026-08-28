# pi-debug-mode

Evidence-first debugging workflow for [Pi](https://github.com/earendil-works/pi-mono), inspired by Cursor Debug Mode.

It guides Pi through competing hypotheses, targeted runtime instrumentation, human reproduction, evidence-backed fixes, and final verification.

## Install

```bash
pi install npm:pi-debug-mode
```

Or install directly from GitHub:

```bash
pi install git:github.com/liush2yuxjtu/pi-debug-mode
```

Restart Pi, then run:

```text
/debug describe the bug and expected behavior
```

At each checkpoint, `debug_reproduction` shows exact steps and three choices:

1. `Fixed`
2. `Issue reproduced, please try again`
3. `Type prompt…`

Use `/debug-stop` to leave debug mode without claiming a fix.

## How it works

1. Inspect the real execution path and list competing hypotheses.
2. Add minimal `pi-debug` runtime probes that distinguish them.
3. Ask for one exact reproduction through an interactive checkpoint.
4. Read captured evidence and apply the smallest root-cause fix.
5. Verify once more, then remove every temporary probe.

## Sources

- [Cursor Debug Mode docs](https://cursor.com/for/debugging)
- [Cursor Debug Mode announcement](https://cursor.com/blog/debug-mode)

## License

MIT
