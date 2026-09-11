# Autopilot 提示评测

20 个公开回归用例测试 Agent 是否在 Autopilot 交接后继续工作，是否正确区分机器路径和人工判断，是否保留授权边界。工具后端使用合成夹具，不连接真实项目或生产系统。

这些 20 个用例全部进入 Git。它们是公开 regression corpus，不是独立 heldout 集。发布前的独立 heldout 用例必须放在仓库外的 release runner 中，或在候选冻结后重新生成。

## 文件

- `cases.json` 保存 20 个公开用例。分组为 train 10、validation 5、regression 5。
- 每个用例保存 `allowedCommand`、`expected` 和 `allowedReadPaths`。harness 只接受当前用例授权的命令和路径。
- `baseline.txt` 保存历史 Autopilot 提示。后续生产提示变化不会改写 baseline。
- `candidate.txt` 保存当前候选提示。它不会被 Pi 自动加载。
- `harness.ts` 加载真实扩展注册逻辑，并提供不访问宿主文件的合成 `read` 和 `bash` 工具。
- `run.mjs` 使用 Pi JSON 输出执行匿名 A/B，支持 `--ids` 目标复测和有界超时。
- `summarize.mjs` 汇总结果。默认把摘要写在输入结果目录，使用 `--out evals/benchmark.json` 才会更新 Git 中的基准文件。
- `benchmark.json` 保存最后一轮 40 次配对运行的评分、调用、最终回答、模型和 Token 数据。
- `REPORT.md` 记录指标、决策和边界。

## 运行

在仓库根目录执行：

```bash
cd "$(git rev-parse --show-toplevel)"
npm test
npm run typecheck
node --experimental-strip-types evals/run.mjs --split all --candidate evals/candidate.txt --out /tmp/pi-debug-mode-eval-rerun
node evals/summarize.mjs /tmp/pi-debug-mode-eval-rerun --out evals/benchmark.json
```

`--candidate PATH` 指定候选。`--ids 02,08,13,18` 选择指定用例，并独立于默认 split。`--limit 1` 先跑一个用例。每次使用新的 `--out` 目录，避免覆盖已有轨迹。runner 退出码 0 表示本次所有用例通过，1 表示行为断言失败，2 表示模型、CLI 或超时等运行故障。

Runner 固定使用 `pi --provider openai-codex --model luna --thinking minimal`。JSON 轨迹必须确认实际模型名称包含 `luna`。Runner 禁用默认扩展、skills、AGENTS.md、模板、内置工具和会话写入，只加载显式评测夹具。每个进程最多 90 秒和 10 次工具调用。运行故障停止后续用例。

只使用现有 Pi 登录。Runner 不读取或打印密钥。合成工具不执行宿主 shell，不访问生产环境。

## 改进规则

1. `baseline.txt` 是固定控制臂。不要从当前 `src/protocol.ts` 读取 baseline。
2. 每轮只改一个提示假设。先跑 train，再跑 validation，最后跑 public regression。
3. A/B 标签随机生成，身份在构造时保存。评分完成后才写入映射。
4. 候选只有在 20 个公开 regression 用例全部通过、现有单元测试通过、类型检查通过时才可接受。
5. 公开 regression 通过不等于独立 heldout 通过。要声明独立泛化能力，必须在候选冻结后用仓库外的新 heldout 输入运行 release runner。

## 评分边界

- 真实执行的是模型工具调用。API、日志、测试结果来自合成夹具。
- 首次 `debug_reproduction` 是模式交接。视觉用例必须再次带 `humanReason` 的检查点。混合用例先完成机器检查。
- 评分检查有效工具结果、检查点次数、人工分支、授权命令、失败说明和最终报告。文本正则是启发式，不能证明真实项目修复。
- 公开用例和提示都在 Git 中。它们适合防回归，不适合证明未来候选的独立泛化。
- 该项目不增加评审 UI、slash command、自动后台任务或 `eval_review` 工具。逐例证据写入结果目录，摘要写入指定输出文件。
