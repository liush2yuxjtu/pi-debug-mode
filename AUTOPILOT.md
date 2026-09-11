# Debug Autopilot

Autopilot 只改变给 Agent 的提示，不是后台执行器，不启动 tmux，不模拟用户点击，不设置自动重试循环。

## 使用

重载扩展后，`debug_reproduction` 保留原来三个结果，并增加 `Autopilot — Agent 自行验证`。选中后，扩展把自主验证提示作为工具结果交给 Agent。

只通过现有检查点的 Autopilot 选项开启，不新增 slash command。状态仅保存在当前会话分支，支持重载和恢复，不写全局默认。新会话和旧版状态默认 Guided。

## 行为

- 首个工具调用必须是 `debug_reproduction`。Agent 不得先搜索或读取文件来跳过模式交接。
- 提示要求 Agent 继续原调试任务，不得以“开关已开启”或“检查点调用成功”结束。未知验证命令时先查项目配置和证据，不能用无关命令充数。
- 机器路径包含命令、测试、API、日志、CLI/TUI、UI 逻辑和产物检查。模式交接后，Agent 不得再次调用 `debug_reproduction`。
- 人工路径包含视觉、点击体验、触控跟手性和审美判断。第一次 Autopilot 返回不算人工结论。Agent 先完成机器检查，再调用一次带 `humanReason` 的 `debug_reproduction`。人工路径最多两次检查点。
- 权限、登录、支付、同意与破坏性操作审批不被绕过。
- Agent 必须拿到真实运行证据，使用相同复现条件复测，清理自身探针后再验证。缺证据就报告限制，不冒称成功。

## 验证

在本目录执行 `npm test` 和 `npm run typecheck`。20 个模型行为用例和复现命令见 `evals/GUIDE.md` 与 `evals/REPORT.md`。这些测试不等同于真人视觉验收或真实模型行为保证。

实现：`src/index.ts`；提示与结果协议：`src/protocol.ts`。
