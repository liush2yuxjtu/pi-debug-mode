#!/usr/bin/env python3
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument("locale", nargs="?", choices=["en", "zh"], default="en")
args = parser.parse_args()

if args.locale == "zh":
    source = ROOT / "artifacts/demo/pi-debug-mode-real-tui-zh.cast"
    target = ROOT / "artifacts/demo/pi-debug-mode-real-tui-zh.compact.cast"
    cuts: list[tuple[float, float, float]] = []
    stop_at = 89.0
    title = "pi-debug-mode 真实中文 TUI 会话"
else:
    source = ROOT / "artifacts/demo/pi-debug-mode-real-tui.cast"
    target = ROOT / "artifacts/demo/pi-debug-mode-real-tui.compact.cast"
    # Long stationary spans came from human/reproduction waits. Preserve short holds.
    cuts = [(0.0, 44.0, 2.0), (95.0, 106.0, 4.0), (158.0, 459.0, 5.0)]
    stop_at = 495.0
    title = "pi-debug-mode real TUI session"

def remap(t: float) -> float:
    removed = 0.0
    for start, end, keep in cuts:
        if t >= end:
            removed += (end - start) - keep
        elif t > start:
            ratio = (t - start) / (end - start)
            return start - removed + ratio * keep
        else:
            break
    return t - removed

with source.open() as src, target.open("w") as dst:
    header = json.loads(next(src))
    header["title"] = title
    header["idle_time_limit"] = 2.0
    dst.write(json.dumps(header, separators=(",", ":"), ensure_ascii=False) + "\n")
    last = 0.0
    for line in src:
        event = json.loads(line)
        if float(event[0]) > stop_at:
            break
        event[0] = max(last, remap(float(event[0])))
        last = event[0]
        dst.write(json.dumps(event, separators=(",", ":"), ensure_ascii=False) + "\n")
print(json.dumps({"source": str(source), "target": str(target), "duration": last}, ensure_ascii=False))
