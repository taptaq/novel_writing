# Human Draft Studio

一个面向长篇小说创作的 Web 工作台。项目重点不是“一键生成全文”，而是把 AI 放进立项、设定、人物图谱、章节写作和一致性审看这些真实写作流程里，同时尽量压低常见的“AI 味”。

## 当前能力

- 新建书籍时填写基础信息
  - 书名、类型、细分类型、目标受众
  - 篇幅类型：短篇 / 中篇 / 长篇
  - premise、叙事视角、故事结构
  - 计划章节数、目标单章字数
  - 世界观种子、风格目标
- 新建书籍时录入人物种子
  - 人物姓名、角色、简介
  - 所属势力、关联地点
- 自动初始化人物图谱基础节点与关系数据
- 人物图谱工作台
  - 默认人物关系视图
  - 支持切换 `人物` / `人物 + 势力` / `人物 + 势力 + 地点`
  - 支持点击节点后联动高亮与右侧详情
  - 支持导出当前视图为 `PNG`
- 作品工作区页面
  - 总览页
  - 大纲页
  - 设定页
  - AI 策略页
  - 人物图谱页
  - 章节写作页
- 篇幅策略会影响默认配置和页面提示
  - 短篇：轻量图谱、少量精准伏笔、按需资料检索
  - 中篇：标准图谱、章节级大纲、阶段性资料整理
  - 长篇：深度图谱、分卷规划、持续伏笔追踪和资料库沉淀
- AI 写作面板
  - 上下文续写
  - 去 AI 味改写
  - 结构建议
  - 一致性审看
- 写作技能预设
  - 帮我想清楚怎么写：拆解目标、问题和下一步
  - 整理本章要写什么：汇总本章目标、冲突、人物状态和伏笔
  - 整理设定和资料：沉淀设定卡、人物卡和资料待查清单
  - 去掉 AI 味：结合文风记忆做去 AI 味和文风校准
  - 规划整本书：提炼主线、人物成长和阶段推进
  - 拆章节大纲：拆解场景、转折和结尾钩子
  - 继续写一小段：按当前正文继续生成候选稿
  - 帮我改顺改好：从节奏、动机和句子质感修订正文
- AI 模型临时切换
  - 自动
  - Kimi
  - GLM
  - Mimo
  - MiniMax
  - Qwen
  - DeepSeek
  - 系统兜底
- 模型路由策略
  - `Kimi / GLM / Qwen`：`DMX -> 官方 -> 系统兜底`
  - `Mimo`：`DMX -> 系统兜底`
  - `MiniMax`：`DMX -> 系统兜底`
  - `DeepSeek`：`官方 -> 系统兜底`
- 数据库未就绪时提供 demo 数据回退，方便先看页面

## 技术栈

- `Next.js 14`
- `React 18`
- `TypeScript`
- `Prisma`
- `PostgreSQL / Supabase`
- `Vitest`
- `Zod`
- `Cytoscape.js`

## 项目结构

```text
.
├── prisma
│   ├── schema.prisma
│   ├── seed.ts
│   └── sql/pgvector.sql
├── src
│   ├── app
│   │   ├── api
│   │   └── novels
│   ├── components
│   ├── lib
│   │   ├── ai
│   │   ├── repositories
│   │   └── text
│   └── types
├── tests
└── docs
```

## 环境变量

推荐从 `.env.example` 复制到 `.env.local`：

```bash
cp .env.example .env.local
```

至少需要关注下面几组配置。

### 数据库

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
```

- `DATABASE_URL`：运行时连接，通常使用 Supabase pooler
- `DIRECT_URL`：Prisma schema push / migrate 使用的直连地址

### DMX 聚合模型

```env
DMX_API_KEY=""
DMX_BASE_URL="https://www.dmxapi.cn/v1"
DMX_MODEL_KIMI="kimi-k2.6-free"
DMX_MODEL_GLM="glm-5.1-free"
DMX_MODEL_MIMO="mimo-v2.5-free"
DMX_MODEL_MINIMAX="MiniMax-M2.7-free"
DMX_MODEL_QWEN="qwen3.5-plus-free"
```

### 官方模型兜底

```env
KIMI_API_KEY=""
KIMI_BASE_URL="https://api.moonshot.cn/v1"
KIMI_MODEL="moonshot-v1-8k"

GLM_API_KEY=""
GLM_BASE_URL="https://open.bigmodel.cn/api/paas/v4"
GLM_MODEL="glm-4.5-air"

QWEN_API_KEY=""
QWEN_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"
QWEN_MODEL="qwen-plus"

DEEPSEEK_API_KEY=""
DEEPSEEK_BASE_URL="https://api.deepseek.com"
DEEPSEEK_MODEL="deepseek-v4-flash"
```

### 系统兜底模型

```env
LLM_API_KEY=""
LLM_BASE_URL="https://api.openai.com/v1"
LLM_MODEL="gpt-4o-mini"
```

## 本地启动

建议 Node 版本：

- `20.19.0`

### 1. 安装依赖

```bash
npm install
```

### 2. 生成 Prisma Client

```bash
npm run prisma:generate
```

### 3. 建表 / 同步表结构

```bash
npm run db:push
```

如果你确实要走 migration 流程：

```bash
npm run prisma:migrate
```

### 4. 灌入种子数据

```bash
npm run db:seed
```

### 5. 启动开发环境

```bash
npm run dev
```

### 6. 常用检查

```bash
npm run test
npm run typecheck
npm run build
```

## 已有页面

- `/` 首页
- `/novels` 作品列表
- `/novels/new` 新建作品
- `/novels/[novelSlug]` 工作区总览
- `/novels/[novelSlug]/outline` 大纲页
- `/novels/[novelSlug]/world` 设定页
- `/novels/[novelSlug]/insights` AI 策略页
  - 展示已融合的写作技能预设
- `/novels/[novelSlug]/graph` 人物图谱页
  - 默认人物视图
  - 可切换更多实体范围
  - 可点击节点查看关系详情
  - 可导出当前视图 PNG
- `/novels/[novelSlug]/style` 文风资产页
- `/novels/[novelSlug]/chapters/[chapterSlug]` 章节写作页

## AI 设计原则

- AI 默认输出的是建议稿，不是直接代写终稿
- 优先保证人物口吻、情节逻辑和节奏稳定
- 尽量减少常见“AI 味”
  - 少堆形容词
  - 少空泛情绪总结
  - 少整齐排比
  - 少万能文学腔
- 当主模型失败时，按既定路由自动回退到官方模型或系统兜底模型

## 文风资产

- 新建书籍时可选填 `1` 到 `3` 段参考样文
- 进入作品后可在 `文风` 页面继续追加样文、编辑规则、重新提炼
- `续写` 与 `去 AI 味改写` 默认读取当前作品文风资产
- 如需对照效果，可在单次 AI 请求里临时关闭文风约束
- 章节写作页可临时切换写作技能预设，预设会自动带入对应任务模式和自然语言指令

相关代码主要在：

- `src/lib/ai/prompts.ts`
- `src/lib/ai/providers.ts`
- `src/lib/ai/router.ts`
- `src/lib/ai/writing-engine.ts`
- `src/lib/novel-writing-skills.ts`
- `src/components/chapter-composer.tsx`

## 数据库说明

当前 Prisma schema 已覆盖这些核心实体：

- `Novel`
- `Volume`
- `Chapter`
- `ChapterVersion`
- `StoryEntity`
- `EntityRelation`
- `OutlineNode`
- `Foreshadow`
- `AiSuggestion`
- `ProjectSetting`

另外保留了 `prisma/sql/pgvector.sql`，后续如果要做向量检索、长文本记忆或资料召回，可以继续接入。

## 现阶段更适合继续补的方向

1. 给图谱页补图上直接编辑关系和节点维护
2. 给章节页补版本 diff 和建议采纳落盘
3. 增加资料检索 / 设定召回能力
4. 增加文笔风格投喂与训练模块
5. 给 AI 调用结果补更清晰的 provider / fallback 可观测信息
