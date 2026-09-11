# Autopilot 提示评测

20 个固定用例，测试 Agent 在收到 Autopilot 结果后是否继续调用工具、正确选择人工视觉分支、保留授权边界。借鉴 Eve 的逐用例断言、严格门禁、训练/验证/保留集，以及 Pi Skill Creator 的基线对比、轨迹评分和 token 统计。这里不是 Eve 应用，不安装 Eve、不调用 AI Gateway、不声称执行过 `eve eval --strict`。

## 文件

- `cases.json`：20 个中文任务，train 10、validation 5、heldout 5。分组不随结果变化。
- `harness.ts`：加载真实 Debug Mode 注册逻辑，夹具用户第一次选择 Autopilot；随后人工检查点返回取消。Bash/read 是合成后端，不执行 shell 或读取宿主项目。
- `run.mjs`：用 Pi JSON 输出记录真实模型工具调用；每对 A/B 同时启动，最多两个进程。
- `candidate.txt`：已接受的 Autopilot 提示副本，不被插件自动加载。
- `benchmark.json`：最终 40 次配对运行的脱敏评分、调用、最终回答、模型与 token 数据。
- `REPORT.md`：结果解释和未通过项。
- `results/`：忽略于 Git 的原始轨迹、stderr、匿名提示快照和映射。提交中不包含会话或凭据。

## 运行

在插件目录执行，Node 需支持 TypeScript strip-types：

```bash
node --experimental-strip-types evals/run.mjs --split all --candidate evals/candidate.txt --out /tmp/pi-debug-mode-eval-rerun
node evals/summarize.mjs /tmp/pi-debug-mode-eval-rerun
```

`--candidate PATH` 指定候选；`--ids 02,08,13,18` 只复测指定用例；`--limit 1` 用于先验证 runner；`--split all` 跑全套。使用新的输出目录，避免覆盖证据。runner 退出码 0 为该次所有用例通过，1 为行为断言失败，2 为模型、CLI 或超时等运行故障。基线失败意味着配对 runner 也返回 1，不等于候选失败；候选门禁看报告里的 `candidateAccepted`。

实际模型参数固定为 `pi --provider openai-codex --model luna --thinking minimal`。JSON 轨迹核对实际模型名称包含 luna；本次解析为 `gpt-5.6-luna`。不自动改模型或回退供应商。每次最多 90 秒、10 次工具 preflight，超限后停止工具或进程；运行故障停止后续用例。禁用默认扩展、skills、AGENTS.md、模板、内置工具和会话写入，仅显式加载评测夹具。

只使用现有 Pi 登录；runner 不读取或打印密钥。工具后端只允许合成检查，不访问生产环境。真正调用 Pi 的过程会使用模型额度。

## 改进协议

1. 当前 `src/protocol.ts` 是生产提示。先保存轨迹，再依据 train 的失败改候选。每轮只改一个提示假设。
2. 候选冻结后跑 validation，最后跑 heldout。被测 Agent 只得到任务和夹具资料，不得到分组、断言或评分。
3. 两侧随机标记 A/B；程序评分只接触匿名标签，评分完成后才记录身份映射。没有另用付费 LLM judge。
4. 所有 20 个用例通过、heldout 不退步才允许接受候选。摘要器只输出决策，不修改真实插件。
5. heldout 失败则停止，不按答案继续改提示；后续迭代需要新的未见保留集。

## 评分边界

- 真实执行的是模型与工具调用；API、日志、测试结果都是合成夹具。不是实际应用测试，也不是完整修复或真实 TUI 视觉验收。
- 第一轮检查点用于模式交接，不算已经取得人工观感。视觉用例必须在交接后再次提交 humanReason；混合用例先机器检查。
- 断言检查有效工具结果、检查点次数、人工分支、越权尝试、失败说明等。文本正则是启发式，不能全面证明语义正确；部分无效探索命令仍可能存在于通过轨迹中。
- 每个最终配对只跑一次，没有统计显著性保证。Token 是实际 JSON `usage.totalTokens` 累加，含缓存输入。Token 不是账单金额，也不只代表新增输出。中间迭代额外消耗不包含在最终 A/B 的 40 次总数中。
- 该项目不增加评审 UI、slash command、自动后台任务或 `eval_review` 工具。逐例证据保留在 JSON，结果用文本交付。
