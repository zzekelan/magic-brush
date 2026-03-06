# Magic Brush

[English](README.md) | [简体中文](README.zh-CN.md)

Magic Brush 是一个由 LLM 驱动的生成式世界互动叙事运行时。

> 每次行动都不只是得到一次回应，  
> 而是在持续创造这个世界。  

Magic Brush 基于结构化的 `Judge -> Narrate` 双阶段引擎构建，既面向 Web 沉浸式文字体验，也面向开发者集成与调试。

## 主要特性

- 生成式世界体验：每次行动都会跨回合持续塑造世界
- 双阶段回合引擎：`Judge -> Narrate`，输出结构化 JSON
- Web 和 REPL 具备带 onboarding 的持续会话，并支持 `/reset`、`/exit`
- 推荐完整体验方式：Web；同时提供 CLI REPL 与单轮 CLI runtime 入口
- OpenAI 兼容接口（可接入兼容 Chat Completions 的服务）

## 推荐体验方式：Web

这是最接近完整沉浸式文字生成世界体验的入口。

1. 安装依赖

```bash
bun install
```

2. 配置 API 环境变量

```bash
cp .env.example apps/api/.env
```

至少需要设置：

- `LLM_BASE_URL`
- `LLM_API_KEY`
- `LLM_MODEL`
- `LLM_TIMEOUT_MS`（可选，默认 `30000`）
- `LLM_JUDGE_TEMPERATURE`（可选，默认 `0`，范围 `[0, 2]`）
- `LLM_NARRATE_TEMPERATURE`（可选，默认 `1.0`，范围 `[0, 2]`）

3. （可选）配置前端环境变量

```bash
cp apps/frontend/.env.example apps/frontend/.env
```

4. 启动前端与API

```bash
bun run dev:frontend
bun run dev:api
```

5. 打开浏览器体验

- 前端: `http://localhost:5173`
- API: `http://localhost:8787`

## 其他入口

单轮 CLI 适合直接调用 runtime，不包含会话 onboarding：

```bash
cp .env.example .env
bun run turn "look around"
```

可选：

```bash
bun run turn --debug "look around"
```

CLI REPL 会保持连续会话，并支持 onboarding、`/reset`、`/exit`：

```bash
bun run turn:repl
```

## 测试命令

```bash
bun run test
bun run test:all
```

## 面向开发者

二次开发、架构等细节请看：`DEVELOPMENT.md`
