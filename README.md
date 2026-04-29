# Human Draft Studio

一个面向小说创作的 Web 工作台。它不主打“一键生成整本书”，而是把 AI 放进更真实的写作流程里：建书、整理设定、看人物关系、沉淀文风、写章节、做一致性检查。

当前这版产品重点是两件事：

- 流程更清楚：用户始终知道“我现在在哪一步、下一步该做什么”
- AI 更像助手：优先给建议、整理、改写和校准，不直接抢走创作主导权

## 现在的主流程

整个项目现在已经整理成一条比较直白的链路：

1. 首页先决定从哪里开始
   - 继续已有项目
   - 或直接新建一本书
2. 新建页按 3 步建书
   - 选创建方式
   - 填核心信息
   - 补扩展内容
3. 进入作品总览
   - 页面会直接给出“推荐下一步”
   - 不需要用户自己猜先去结构、设定还是写作
4. 再进入具体模块推进
   - 结构
   - 设定
   - 图谱
   - 文风
   - AI 策略
   - 写作

## 当前功能

### 1. 建书

- 支持快速新建
  - 直接填写书名、类型、细分类型、目标受众、叙事视角、故事结构等核心信息
- 支持 AI 解析设定创建
  - 可粘贴设定原文
  - 可上传 `txt` / `md`
  - 会先生成结构化预览，再决定是否回填到表单
- 当前不直接解析 `docx` / `pdf`
  - 需要先转成 `txt` 或 `md`
- 支持篇幅类型
  - `短篇`
  - `中篇`
  - `长篇`
- 篇幅类型会影响默认建议
  - 建议章节数
  - 单章目标字数
  - 图谱 / 大纲 / 伏笔 / 资料 / 文风的侧重点
- 新建时可录入人物种子
  - 默认有人物 1
  - 可继续新增人物 2、人物 3……
- 新建时可选填文风参考样文
  - 最多 3 段
  - 后续也能继续追加

### 2. 作品总览

- 总览页顶部会显示“推荐下一步”
- 推荐逻辑会根据当前数据状态变化
  - 没有人物时先去补人物
  - 没有大纲时先去整理结构
  - 还没开写时先去确认第一章
  - 已有章节时优先回到写作
- 各信息块补了轻量空状态提示
  - 不会只剩一大片空白

### 3. 结构 / 设定 / 图谱

- 结构页用于查看当前大纲与推进状态
- 设定页用于查看实体与基础设定
- 人物图谱页当前偏“查阅和理解关系”
  - 默认以人物关系为主
  - 可切换范围：
    - `人物`
    - `人物 + 势力`
    - `人物 + 势力 + 地点`
  - 支持点击节点查看详情
  - 支持联动高亮
  - 支持 `PNG` 导出
  - 支持放大查看
- 图谱当前不主打拖拽编辑
  - 这一版更偏“快速看懂关系”，不是重型绘图工具

### 4. 文风工作区

- 独立的文风页已经接通
- 可维护文风资产
  - 文风摘要
  - 风格规则
  - 避免规则
  - 对白规则
  - 叙述规则
  - 节奏规则
  - 意象规则
- 可追加参考样文
- 可基于样文重新提炼文风规则
- 样文校验已接上
  - 单段参考样文至少 20 个字符

### 5. 章节写作

- 写作页右侧栏已经重排成“先信息，后动作”
  - 本章目标
  - 前文记忆
  - 人物与伏笔
  - 本次要做什么
- 写到后面不容易忘前文
  - 系统会自动整理前几章简要回顾
  - 会提炼当前故事线
  - 会列出未回收线索
- AI 写作面板支持 4 种模式
  - `上下文续写`
  - `去 AI 味改写`
  - `结构建议`
  - `一致性审看`
- 常用写作技能已经做成可直接点的预设
  - 帮我想清楚怎么写
  - 整理本章要写什么
  - 整理设定和资料
  - 去掉 AI 味
  - 规划整本书
  - 拆章节大纲
  - 继续写一小段
  - 帮我改顺改好
- 模型、文风开关等高级设置已收进“更多设置”
  - 默认不抢主视线

### 6. AI 模型与路由

- 页面里支持临时切换模型
  - `自动`
  - `Kimi`
  - `GLM`
  - `Mimo`
  - `MiniMax`
  - `Qwen`
  - `DeepSeek`
  - `系统兜底`
- 当前路由优先级
  - `Kimi`：`DMX -> 官方 -> 系统兜底`
  - `GLM`：`DMX -> 官方 -> 系统兜底`
  - `Qwen`：`DMX -> 官方 -> 系统兜底`
  - `Mimo`：`DMX -> 系统兜底`
  - `MiniMax`：`DMX -> 系统兜底`
  - `DeepSeek`：`官方 -> 系统兜底`
- 当数据库未配置时，页面会自动回退到 demo 数据
  - 方便先看流程和样式

## 当前页面

- `/`
  - 首页
- `/novels`
  - 作品列表
- `/novels/new`
  - 新建作品
- `/novels/[novelSlug]`
  - 作品总览
- `/novels/[novelSlug]/outline`
  - 结构页
- `/novels/[novelSlug]/world`
  - 设定页
- `/novels/[novelSlug]/graph`
  - 人物图谱页
- `/novels/[novelSlug]/style`
  - 文风工作区
- `/novels/[novelSlug]/insights`
  - AI 策略页
- `/novels/[novelSlug]/chapters/[chapterSlug]`
  - 章节写作页

## 当前 API

- `POST /api/novels`
  - 创建作品
- `POST /api/novels/parse-setup`
  - 解析设定原文，生成建书回填草稿
- `GET /api/novels/[novelSlug]/workspace`
  - 获取作品工作区数据
- `GET /api/novels/[novelSlug]/style`
  - 获取文风工作区数据
- `PATCH /api/novels/[novelSlug]/style`
  - 保存文风规则
- `POST /api/novels/[novelSlug]/style/samples`
  - 新增参考样文
- `POST /api/novels/[novelSlug]/style/rebuild`
  - 根据样文重新提炼文风规则
- `POST /api/ai/assist`
  - 发起章节 AI 辅助
- `GET /api/health`
  - 健康检查

## 技术栈

- `Next.js 14`
- `React 18`
- `TypeScript`
- `Prisma`
- `PostgreSQL / Supabase`
- `Vitest`
- `Zod`
- `Cytoscape.js`

## 目录结构

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

## 数据模型

当前 Prisma schema 里已经覆盖这些核心实体：

- `ProjectSetting`
- `Novel`
- `Volume`
- `Chapter`
- `ChapterVersion`
- `StoryEntity`
- `EntityRelation`
- `OutlineNode`
- `Foreshadow`
- `AiSuggestion`
- `NovelStyleProfile`
- `NovelStyleSample`

另外保留了 `prisma/sql/pgvector.sql`。

这意味着后面如果要继续做这些方向，会比较顺手：

- 向量检索
- 长文本记忆
- 资料召回
- 设定检索

## 环境变量

推荐先复制：

```bash
cp .env.example .env.local
```

### 数据库

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
```

- `DATABASE_URL`
  - 运行时连接
  - 一般用 Supabase pooler
- `DIRECT_URL`
  - Prisma `db push` / `migrate` 用的直连地址

### 应用名

```env
APP_NAME="Human Draft Studio"
```

### DMX 主模型

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

### 系统最终兜底

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

### 3. 同步数据库表结构

```bash
npm run db:push
```

如果你明确要走 migration：

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

## 开发说明

- 当前测试脚本已经固定了本地 `esbuild` 路径
  - 用来规避某些环境下的 `esbuild` 版本冲突
- 如果数据库没配好，首页和作品库会自动回退到 demo 数据
- 如果 AI Key 没配全，模型路由会按当前可用 provider 自动跳过缺失配置

## 这版产品的定位

这不是一个“输入一句话，自动吐完整小说”的工具。

它更适合下面这类用法：

- 你已经有题材和设定，想把书更快搭起来
- 你会写，但容易忘前文、忘伏笔、忘人物状态
- 你想让 AI 帮你整理、校准、续写、去 AI 味
- 你不希望整个创作过程被黑箱生成接管

## 现阶段还没做完的部分

下面这些方向还可以继续加强：

1. 图谱页直接编辑节点和关系
2. 章节版本 diff 与采纳落盘
3. 更完整的资料检索 / 设定召回
4. 更强的长篇记忆与跨章一致性检查
5. 更清晰的 provider / fallback 可观测信息
