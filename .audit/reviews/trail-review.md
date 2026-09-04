reviewed by qoder/Auto

状态：这是修复前的历史评审。第 1、3、4 项已由 `.audit/reviews/disposition.md` 处理。第 2、5 项保留为公开发布门禁。

5 处标记：

1. 架构评审自证分数缺乏独立证据。`.audit/seo-architecture.md` 称 QODER 15.5/16、CODEX 10/16 并选 QODER 为 base，但完整评分表 `.audit/design/cross-judge.md` 未在材料中展开，无逐条准则证据。结合评审者即为 Qoder，存在模型家族自我背书风险。需公开 rubric 与逐条扣分依据后再采纳。

2. 网络级 Raw 媒体和 Pages 路由验证尚未执行。`.audit/final-local.json` 全绿，但 `tagged` / `published` phase 明确推迟；`browser-qa.json` 方法注明 "version-pinned Raw media fulfilled from matching tracked local files before tag publication"。发布前必须对真实 `v0.1.4` Raw URL 和 `liush2yuxjtu.github.io` 路由跑 `scripts/verify-release.mjs tagged published`。

3. 浏览器 QA 深度不足。`browser-qa.json` 只有 200 状态、标题、地标和空错误数组，无 viewport 尺寸、无交互 demo 步骤断言、未真实拉取外部媒体。`.audit/seo-launch.tsv 2026-09-04T11:57:13Z browser` 所称 "completed both demos" 缺乏可复现的交互证据。

4. 发布工作流改动未在材料中展示。`.github/workflows/release.yml` diff 仅 7 行，但无具体内容；`.audit/final-local.json` 中 "release workflow" pass 依赖本地文件检查。发布前需逐行确认：version gate 确实在 install 之前、local verifier 在 typecheck 之后、无 Pages deploy 步骤。

5. 标签创建顺序是硬依赖。README 与 `pi.image`/`pi.video` 已改为 `v0.1.4` Raw URL（`.audit/seo-architecture.md` Git tag 段落）。当前标签尚未创建；若 npm publish 或 Pi Gallery 更新先于 tag push，公开媒体直接 404。发布清单必须把 tag push 放在 npm / Gallery 之前。

Trail verdict: OK WITH FLAGS
