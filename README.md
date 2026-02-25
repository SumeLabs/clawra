# Clawra Plus
<img width="300" alt="Clawra" src="https://github.com/user-attachments/assets/41512c51-e61d-4550-b461-eed06a1b0ec8" />

语言：中文（默认）| [English](README_EN.md)

仓库地址：`https://github.com/kevin1sMe/clawra-plus`

这是一个基于原始 Clawra fork 后持续升级的版本，目标是把「AI 自拍能力」从单一后端扩展为可切换、多供应商、可维护的稳定方案。

## 这个升级版新增了什么

- 多后端生图/编辑：支持 Qwen、Volcengine Seedream/SeedEdit、Tencent Hunyuan、fal、Google nano-banana
- Hunyuan 异步任务增强：轮询策略为每 1 秒 1 次，最多 120 秒
- 生成耗时可观测：每次生图都会输出模型信息和本次耗时
- TS 单实现：核心逻辑只在 `scripts/clawra-selfie.ts`（`*.sh` 仅兼容包装）
- 中英文技能文档：包含 `SKILL.md` 与 `SKILL_CN.md`
- 保持 OpenClaw 集成：生成后直接投递到 Discord/Telegram/WhatsApp/Slack 等渠道

## 平台与模型

当前脚本使用统一结构：`platform -> operation(generate/edit) -> model(完整 API 名称)`。

| Platform | Operation | 默认模型（可调用全名） | 关键配置 |
|---|---|---|---|
| `qwen` | `generate` / `edit` | `qwen-image-plus-2026-01-09` / `qwen-image-edit-plus` | `DASHSCOPE_API_KEY` |
| `volc` | `generate` / `edit` | `doubao-seedream-4-0-250828` / `doubao-seedream-4-0-250828` | `ARK_API_KEY` |
| `fal` | `generate` | `xai/grok-imagine-image` | `FAL_KEY` |
| `google` | `generate` | `gemini-3-pro-image-preview` | `GOOGLE_API_KEY` |
| `hunyuan` | `edit` | `aiart/v20221229 SubmitTextToImageJob` | `TENCENT_SECRET_ID` + `TENCENT_SECRET_KEY` |

查看完整模型列表：

```bash
npx ts-node scripts/clawra-selfie.ts --list-models
```

## 快速开始

### 方式 A：安装器（适合快速体验）

```bash
npx clawra@latest
```

安装器会：

1. 检查 OpenClaw 环境
2. 安装 skill 到 `~/.openclaw/skills/clawra-selfie/`
3. 更新 `~/.openclaw/openclaw.json`
4. 注入必要的 persona 模板

说明：当前安装器流程默认引导 `fal` key，其他平台请使用方式 B 手动配置环境变量。

### 方式 B：手动安装（推荐给多平台用户）

```bash
git clone https://github.com/kevin1sMe/clawra-plus ~/.openclaw/skills/clawra-selfie
```

然后在 `~/.openclaw/openclaw.json` 中启用：

```json
{
  "skills": {
    "entries": {
      "clawra-selfie": {
        "enabled": true,
        "env": {
          "OPENCLAW_GATEWAY_TOKEN": "your_gateway_token",
          "DASHSCOPE_API_KEY": "optional_for_qwen",
          "ARK_API_KEY": "optional_for_seedream",
          "FAL_KEY": "optional_for_fal",
          "GOOGLE_API_KEY": "optional_for_google",
          "TENCENT_SECRET_ID": "optional_for_hunyuan",
          "TENCENT_SECRET_KEY": "optional_for_hunyuan"
        }
      }
    }
  }
}
```

## 直接调用脚本

```bash
npx ts-node scripts/clawra-selfie.ts "A stylish mirror selfie in a cafe" "#general" "Qwen" "1:1" "png" "qwen" "generate"
```

```bash
npx ts-node scripts/clawra-selfie.ts --list-models
```

参数格式：

```text
<prompt> <channel> [caption] [aspect_ratio] [output_format] [platform] [operation] [model]
```

## 运行时输出（新版）

每次生成完成后会输出：

- 模型名（`Model`）
- 生图耗时（`Generation time`）
- 图片地址/文件（`Media`）

其中 Hunyuan 平台任务超时策略为 120 秒，轮询频率为 1 秒。

## 常用环境变量

```bash
# Qwen
DASHSCOPE_API_KEY=your_key
QWEN_IMAGE_EDIT_IMAGE_URL=https://example.com/input.png  # 可选，qwen-image-edit-plus 参考图
QWEN_IMAGE_EDIT_IMAGE_PATH=/path/to/input.png            # 可选，优先于 URL

# Volcengine
ARK_API_KEY=your_key

# fal
FAL_KEY=your_key

# Google
GOOGLE_API_KEY=your_key

# Tencent Hunyuan
TENCENT_SECRET_ID=your_secret_id
TENCENT_SECRET_KEY=your_secret_key
TENCENT_REGION=ap-guangzhou
TENCENT_AIART_ENDPOINT=aiart.tencentcloudapi.com

# OpenClaw
OPENCLAW_GATEWAY_TOKEN=your_token

# 可选：设置平台默认模型
DEFAULT_MODEL_QWEN_GENERATE=qwen-image-plus-2026-01-09
DEFAULT_MODEL_QWEN_EDIT=qwen-image-edit-plus
DEFAULT_MODEL_VOLC_GENERATE=doubao-seedream-4-0-250828
DEFAULT_MODEL_VOLC_EDIT=doubao-seedream-4-0-250828
DEFAULT_MODEL_FAL_GENERATE=xai/grok-imagine-image
DEFAULT_MODEL_GOOGLE_GENERATE=gemini-3-pro-image-preview
DEFAULT_MODEL_HUNYUAN_EDIT="aiart/v20221229 SubmitTextToImageJob"
```

## 项目结构

```text
clawra-plus/
├── bin/                    # npx 安装器
├── scripts/                # Shell / TypeScript 调用脚本
├── skill/                  # OpenClaw skill 定义与镜像脚本
├── SKILL.md                # 英文技能说明
├── SKILL_CN.md             # 中文技能说明
├── templates/              # SOUL 注入模板
└── assets/                 # 参考图片
```

## License

MIT
