# Autopilot 提示评测报告

## 评测目标

指标是 20 个公开回归用例的严格通过率。用例检查 Autopilot 交接后的工具推进、机器路径与人工路径分流、case 级工具授权和安全边界。

这 20 个用例全部进入 Git。它们是公开 regression corpus，不是独立 heldout 集。独立 heldout 输入必须在候选冻结后由仓库外的 release runner 提供。

## 最终结果

最终候选通过 20/20。冻结历史基线通过 14/20。

| 分组 | 基线 | 候选 |
| --- | ---: | ---: |
| train | 8/10 | 10/10 |
| validation | 3/5 | 5/5 |
| regression | 3/5 | 5/5 |
| 总计 | 14/20 | 20/20 |

模型是 `openai-codex/gpt-5.6-luna`。Runner 使用 `pi --model luna --thinking minimal`。最终候选提示为 886 个 JavaScript 字符。历史 baseline 固定在 `evals/baseline.txt`，不随生产提示变化。

最终 A/B 运行包含 40 个配对进程。候选总 `usage.totalTokens` 为 143186。基线为 164211。候选总子进程时长为 403144ms。基线为 422708ms。两侧并发运行，累加时长不是墙钟时间。每个用例只采样一次，不能推导统计显著性。

`benchmark.json` 保存逐例断言、工具调用、最终回答、模型、Token 和匿名映射。`candidateAccepted` 为 `true`，因为候选 20/20，公开 regression 全通过，且没有基础测试或类型检查回归。

## Review 修复

PR review 发现并修复以下问题：

- A/B 身份现在在构造 variant 时显式保存。Runner 不再通过 prompt 内容相等判断 baseline。
- `--ids` 现在独立于默认 split。指定 ID 会跨 train、validation 和 regression 选择用例。
- 每个 case 现在保存 `allowedCommand`、`expected` 和 `allowedReadPaths`。合成 harness 拒绝其他命令和路径。
- `summarize.mjs` 默认把结果写到输入目录。只有显式传 `--out evals/benchmark.json` 才更新 Git 基准。
- 新 `/debug` 任务会重置 Autopilot。旧任务不会改变新任务的 Guided 起点。
- Autopilot 已开启后，人工检查点不再显示 Autopilot 选项。
- Autopilot prompt 不再要求 handoff 后再次调用检查点。它只要求继续原调试任务。
- 公开用例不再标记为 heldout。未来独立 heldout 不会进入公共提示作者数据。
- Grader 不会把“不能据此宣称已修复”识别成成功声明。

## 运行命令

```bash
cd "$(git rev-parse --show-toplevel)"
npm test
npm run typecheck
npm run verify:release -- --mode local
node --experimental-strip-types evals/run.mjs --split all --candidate evals/candidate.txt --out /tmp/pi-debug-mode-eval-rerun
node evals/summarize.mjs /tmp/pi-debug-mode-eval-rerun --out evals/benchmark.json
```

`run.mjs` 使用新 `--out` 目录，不覆盖已有轨迹。`--ids 02,08,13,18` 可复测指定用例。Runner 禁用默认扩展、skills、AGENTS.md、模板、内置工具和会话写入。每个进程最多 90 秒和 10 次工具调用。运行故障停止后续用例。

## 边界

模型真实执行了工具调用，但 API、日志和测试结果来自合成夹具。通过结果证明提示能正确分流这些固定场景，不证明真实项目一定修复成功。真实浏览器、手机触控、视觉和审美仍需对应控制技能或人工检查。

下一步最有价值的工作是用真实 UI 项目运行一组不公开的新 heldout 输入。不要根据当前 20 个公开用例继续调 prompt。
