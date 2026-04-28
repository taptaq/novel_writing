---
name: humanize-novel-prose
description: 将小说、网文、短篇、章节、对白、旁白和场景描写改写得更有人味，削弱 AI 腔、套话感、平均化措辞和机械节奏，并从用户提供的样文、既有章节或指定作者风格中提炼可复用的文风记忆。Use when Codex needs to revise fiction prose, dialogue, narration, scene writing, or chapter drafts to de-AI the language, preserve plot while improving voice, imitate a target style without flat copying, build or update a persistent style-memory file, or continue learning an evolving novel-specific writing style across sessions.
---

# 先做什么

先读 [references/style-memory.md](references/style-memory.md)。

如果用户给了样文、旧章节、作者片段、角色对白样本或设定资料，再读这些材料，并把它们和 `style-memory.md` 对照。不要急着直接改写，先判断当前任务更像：

- 去 AI 味
- 贴近某种既有文风
- 延续同一部长篇的稳定 voice
- 强化角色口吻、叙事温度或场景呼吸感

如果用户没有给样文，只做“去 AI 味 + 保剧情”的基础人味化，不要假装学到了某个明确文风。

# 核心原则

- 保住剧情事实、人物关系、时间顺序、叙事视角和信息密度。
- 优先改掉“像 AI 写的地方”，不要为了花哨而过度重写。
- 学的是风格机制，不是照抄表层句子。
- 结论只写进 `style-memory.md` 中那些有证据支持的条目；推测要单独标成“待验证”。
- 每次完成改写后，都更新一次 `style-memory.md`，让这个技能逐步积累稳定风格记忆。

# 去 AI 味流程

按下面顺序工作：

1. 先诊断原文中的 AI 痕迹。
2. 再提炼或刷新目标文风。
3. 再做一轮保守改写。
4. 再做一轮“人味增强”微调。
5. 最后复查是否改坏了剧情、人物口吻或节奏。

诊断时，优先检查这些问题：

- 抽象判断太多，缺少可感知细节
- 句子长度过于平均，停顿位置过于工整
- 情绪直接宣告，缺少动作、反应、迟疑和反常
- 对白过分完整、礼貌、解释型
- 比喻安全但无记忆点
- 转场靠总结句硬推
- 用词正确却没有人物的偏见、身份感和局部粗糙度

具体改写手法见 [references/deai-rules.md](references/deai-rules.md)。

# 学习文风流程

如果用户提供样文或既有章节，先从样本里提炼“可复用规则”，再写入 `style-memory.md`。提炼时只记录高价值信息：

- 叙事距离：贴脸、半贴脸、旁观、冷峻、絮叨
- 句法节奏：短句多还是长句多，是否喜欢半句顿挫、突转、回钩
- 常用意象：身体、天气、器物、气味、声音、微动作
- 情绪表达方式：直说、侧写、反讽、克制、延迟爆发
- 对白纹理：是否打断、留白、岔开话题、嘴硬、话不说满
- 人称与视角限制：哪些信息可以说，哪些只能让读者自己悟到
- 禁忌：哪些词、句式、总结习惯一出现就会破坏风格

不要把样文机械拆成“华丽/细腻/有氛围”这种空结论。每个结论都尽量附一个很短的例证或改写提示。

如果有多个来源，先分成两层：

- 稳定风格：跨章节都成立的规律
- 当前项目风格：只适用于这一部作品、这一角色或这一卷

项目级差异优先级高于通用规则。

# 改写输出方式

默认直接给出改写后的正文。

只有在用户明确想看分析过程，或原文问题很多时，才在正文前附一个极短诊断，格式控制在几条内：

- 这段最重的 AI 痕迹是什么
- 这次主要往哪个文风方向压
- 为了保剧情，哪些信息我刻意没动

除非用户要求，不要把解释写得比正文还长。

# 更新风格记忆

每次完成任务后，都回写 [references/style-memory.md](references/style-memory.md)。

更新时遵守这些规则：

- 新增“这次确认了什么”
- 删除或降级被新样本推翻的推测
- 把高频偏好写成正向规则
- 把明显破坏文风的表达写成负向规则
- 只保留对下次改写真的有帮助的内容

如果用户给的是新项目，或明显换了作者方向，不要粗暴覆盖旧记忆。先在 `style-memory.md` 里开新的项目块。

如果当前工作目录里已经有项目专属的 `.novel-style-memory.md`，优先读取它；完成后同步更新它，并只把可迁移的通用经验回写到技能自带的 `references/style-memory.md`。

# 质量闸门

交付前逐项自查：

- 是否保住了原段落的事实与推进
- 是否减少了解释腔、概括腔和正确废话
- 是否让人物说话更像“这个人”而不是“会说话的模型”
- 是否出现了更具体的感官、动作、迟疑、偏见或局部失衡
- 是否保留了该有的粗粝、不整齐和言外之意
- 是否避免把文本修成过于圆滑、统一、无刺的样子

如果用户要求“更像人写的”，优先增加人的局部不匀称：话说半截、意识跳针、动作先于解释、判断带私心、观察有取舍，而不是单纯堆辞藻。

# 参考文件

- 去 AI 味规则与常见病灶：[references/deai-rules.md](references/deai-rules.md)
- 完整工作流与任务分型：[references/revision-workflow.md](references/revision-workflow.md)
- 持续累积的文风记忆：[references/style-memory.md](references/style-memory.md)
