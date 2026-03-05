# Magic Brush

[English](README.md) | [简体中文](README.zh-CN.md)

Magic Brush 是一个LLM驱动的沉浸式文字互动冒险运行时。

> 落笔之处，世界开始生长。  

> 从一个行动开始，创造你的世界。  
> 故事将沿着你的选择持续推进。  

## 主要特性

- 双阶段回合引擎：`Judge -> Narrate`，输出结构化 JSON
- 会话状态可持续传递，支持 `/reset`, `/exit`
- OpenAI 兼容接口（可接入兼容 Chat Completions 的服务）
- 支持 Web / CLI / REPL

## 推荐体验方式：Web

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

## CLI 体验（可选）

```bash
cp .env.example .env
bun run turn "look around"
```

可选：

```bash
bun run turn --debug "look around"
bun run turn:repl
```

## 测试命令

```bash
bun run test
bun run test:all
```

## 面向开发者

二次开发、架构等细节请看：`DEVELOPMENT.md`
