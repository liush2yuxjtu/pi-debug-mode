# Autopilot 提示 hill climb 结果

## 目标

指标是 20 个固定用例的严格通过率。目标是 20/20。候选必须保持保留集不低于基线。至少完成三轮候选尝试后才允许停止。

评测模型是 `openai-codex/gpt-5.6-luna`。Runner 通过 `pi --model luna --thinking minimal` 启动。每个用例使用相同的合成夹具、工具权限、超时和模型。夹具不访问真实项目或生产系统。

## 最终结果

最终候选通过 20/20。基线通过 16/20。

| 分组 | 基线 | 候选 |
| --- | ---: | ---: |
| train | 8/10 | 10/10 |
| validation | 4/5 | 5/5 |
| heldout | 4/5 | 5/5 |
| 总计 | 16/20 | 20/20 |

候选提示长度从 2543 个 JavaScript 字符降到 943 个。候选总 `usage.totalTokens` 为 171149。基线为 168697。Token 数包含缓存输入，不能直接当作账单金额。候选总子进程时长为 397303ms。基线为 398869ms。两侧并发运行，累加时长不是墙钟时间。

`benchmark.json` 保存最终 40 次配对运行的逐例断言、工具调用、最终回答、模型、Token 和匿名映射。候选通过严格门禁，已接受为生产提示。

## 接受的改动

1. 把 Autopilot 建模成两条路径。机器路径在模式交接后禁止再次调用 `debug_reproduction`。人工路径最多调用两次，第二次必须带 `humanReason`。
2. 强制首个工具调用是 `debug_reproduction`。这避免 Agent 先搜索或读文件，再跳过模式交接。
3. 明确第一次 Autopilot 返回不是人工判断。视觉、触控、点击和审美任务必须保留第二次人工检查点。
4. 保留权限、登录、同意、支付和破坏性操作边界。提示不创建后台执行器，也不绕过审批。
5. 修正 grader。`不能据此宣称已修复` 不能被识别成成功声明。该修复有回归测试。

## Hill climb 记录

- baseline。旧提示 16/20，heldout 4/5。证据保存在 `evals/benchmark.json`。
- attempt 1。精简提示 19/20。视觉后续检查仍可能缺失。未接受。
- attempt 2。增加视觉分支说明。仍为 19/20。未接受。
- attempt 3。增加“视觉判断未完成不能结束”。目标用例通过，但完整训练与验证采样仍有波动。未接受。
- attempt 4。增加完成不变量。机器用例出现重复检查点。未接受。
- attempt 5。增加机器路径和人工路径状态机。修复重复检查点，但旧 grader 错误标记两条真实失败说明。未接受，先修 grader。
- attempt 6。增加首个工具调用要求。目标用例出现三次视觉检查点。未接受。
- attempt 7。允许第一次调用带 `humanReason`，禁止中间的无 `humanReason` 调用，并限制人工路径为两次。20/20。未接受为生产提示，因为安全边界说明还未补回。
- attempt 8。补回权限、登录、同意、支付和安全检查说明。完整 A/B 20/20。接受。

本轮 decision log：`/tmp/pi-debug-mode-hillclimb/decision.tsv`。它是本地审计记录，不进 Git。

## 可复现命令

```bash
cd /Users/liushiyuwin/.pi/agent/packages/pi-debug-mode
npm test
npm run typecheck
node --experimental-strip-types evals/run.mjs --split all --candidate evals/candidate.txt --out /tmp/pi-debug-mode-hillclimb/rerun
node evals/summarize.mjs /tmp/pi-debug-mode-hillclimb/rerun
```

每次运行必须使用新的 `--out` 目录。Runner 不覆盖已有证据。`run.mjs` 支持 `--ids 02,08,13,18` 做目标用例复测。

## 边界

这组 eval 证明模型在合成工具轨迹中能继续工作和正确分流。它不证明真实项目一定修复成功，也不替代真实浏览器、手机触控或真人审美验收。每个最终用例只采样一次，不能给出统计显著性结论。

下一步最有价值的验证是用真实 UI 项目运行同一提示，并加入真实浏览器交互轨迹。不要针对当前 20 个用例继续调参，否则会污染保留集。
