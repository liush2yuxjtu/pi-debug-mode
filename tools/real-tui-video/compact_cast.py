#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "artifacts/demo/pi-debug-mode-real-tui.cast"
TARGET = ROOT / "artifacts/demo/pi-debug-mode-real-tui.compact.cast"
# Long stationary spans came from human/reproduction waits. Preserve short holds.
CUTS = [(0.0, 44.0, 2.0), (95.0, 106.0, 4.0), (158.0, 459.0, 5.0), (495.0, 517.0, 4.0)]

def remap(t: float) -> float:
    removed = 0.0
    for start, end, keep in CUTS:
        if t >= end:
            removed += (end - start) - keep
        elif t > start:
            ratio = (t - start) / (end - start)
            return start - removed + ratio * keep
        else:
            break
    return t - removed

with SOURCE.open() as src, TARGET.open("w") as dst:
    header = json.loads(next(src))
    header["title"] = "pi-debug-mode real TUI session"
    header["idle_time_limit"] = 2.0
    dst.write(json.dumps(header, separators=(",", ":")) + "\n")
    last = 0.0
    for line in src:
        event = json.loads(line)
        if float(event[0]) > 495.0:
            break
        event[0] = max(last, remap(float(event[0])))
        last = event[0]
        dst.write(json.dumps(event, separators=(",", ":"), ensure_ascii=False) + "\n")
print(json.dumps({"source": str(SOURCE), "target": str(TARGET), "duration": last}))
