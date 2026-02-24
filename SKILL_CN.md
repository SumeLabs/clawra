---
name: clawra-selfie
description: 使用 Qwen Image、Grok Imagine 或 Google nano-banana 模型生成或编辑 Clawra 自拍，并通过 OpenClaw 发送
allowed-tools: Bash(npm:*) Bash(npx:*) Bash(openclaw:*) Bash(curl:*) Read Write WebFetch
---

# Clawra 自拍

使用阿里巴巴 Qwen Image、xAI Grok Imagine 或 Google nano-banana 模型生成或编辑自拍图片，然后通过 OpenClaw 分发到各消息平台（WhatsApp、Telegram、Discord、Slack 等）。

## 参考图片

该 skill 使用托管在 jsDelivr CDN 上的固定参考图片：

```
https://blog-images-1255793008.cos.ap-shanghai.myqcloud.com/images/clawra.png
```

## 使用场景

- 用户说"发张照片"、"给我发张照片"、"发张自拍"
- 用户说"发张你的照片..."、"发张你的自拍..."
- 用户问"你在干什么？"、"你怎么样？"、"你在哪里？"
- 用户描述某个场景："发张穿着...的照片"、"发张在...的照片"
- 用户想让 Clawra 出现在特定的服装、地点或情境中

## 快速参考

### 必需的环境变量

```bash
FAL_KEY=your_fal_api_key               # fal 后端
GOOGLE_API_KEY=your_google_api_key     # google 后端（或 GEMINI_API_KEY / NANO_BANANA_PRO_API_KEY）
TENCENT_SECRET_ID=your_secret_id        # hunyuan 后端
TENCENT_SECRET_KEY=your_secret_key      # hunyuan 后端
OPENCLAW_GATEWAY_TOKEN=your_token      # 来自：openclaw doctor --generate-gateway-token
```

### 工作流程

1. **获取用户提示词**：生成/编辑的上下文描述
2. **选择后端**：`qwen-image-plus`（默认）/ `qwen-image-edit-plus` / `volc-seedream` / `volc-seededit` / `hunyuan-image` / `fal` / `google-nano-banana` / `google-nano-banana-pro`
3. **生成图片**：通过选定的后端生成
4. **发送到 OpenClaw**：指定目标频道

### 脚本后端

核心实现为 TypeScript：`scripts/clawra-selfie.ts`（`scripts/clawra-selfie.sh` 仅作兼容转发）。

支持的后端：

- `qwen-image-plus`（默认）：调用阿里巴巴 DashScope `qwen-image-plus-2026-01-09`（或覆盖模型）
- `qwen-image-edit-plus`：调用阿里巴巴 DashScope `qwen-image-edit-plus` 做参考图编辑
- `volc-seedream`/`seedream`：调用火山引擎 Ark 文生图（`/images/generations`）
- `volc-seededit`/`seededit`：调用火山引擎 Ark 图片编辑（`/images/edits`），使用 Clawra 参考图片
- `fal`：在 fal.ai 上调用 `xai/grok-imagine-image`（返回图片 URL）
- `hunyuan-image`/`hunyuan`：在 `aiart.tencentcloudapi.com` 上调用腾讯云 AIART 混元图像 3.0（`SubmitTextToImageJob` + `QueryTextToImageJob`），以 Clawra 参考图片作为 `Images`
- `google-nano-banana`：调用 Google `gemini-2.5-flash-image`（返回内联图片数据，脚本存储到临时文件）
- `google-nano-banana-pro`：调用 Google `gemini-3-pro-image-preview`（返回内联图片数据，脚本存储到临时文件）

TypeScript 示例：

```bash
# fal 后端
FAL_KEY=*** npx ts-node scripts/clawra-selfie.ts "a cyberpunk selfie" "#general" "AI selfie" "1:1" "jpeg" "fal"

# Google nano-banana-pro 后端
GOOGLE_API_KEY=*** npx ts-node scripts/clawra-selfie.ts "a cat astronaut selfie" "#general" "Nano Banana" "1:1" "png" "google-nano-banana-pro"
```

## 分步说明

### 第一步：收集用户输入

询问用户：
- **用户上下文**：图片中的人物在做什么/穿什么/在哪里？
- **模式**（可选）：`mirror`（镜像）或 `direct`（直拍）自拍风格
- **目标频道**：发送到哪里？（例如 `#general`、`@username`、频道 ID）
- **平台**（可选）：哪个平台？（discord、telegram、whatsapp、slack）

## 提示词模式

### 模式一：镜像自拍（默认）
适合：服装展示、全身照、时尚内容

```
make a pic of this person, but [用户上下文]. the person is taking a mirror selfie
```

**示例**："wearing a santa hat" →
```
make a pic of this person, but wearing a santa hat. the person is taking a mirror selfie
```

### 模式二：直拍自拍
适合：近景人像、地点照、情感表达

```
a close-up selfie taken by herself at [用户上下文], direct eye contact with the camera, looking straight into the lens, eyes centered and clearly visible, not a mirror selfie, phone held at arm's length, face fully visible
```

**示例**："a cozy cafe with warm lighting" →
```
a close-up selfie taken by herself at a cozy cafe with warm lighting, direct eye contact with the camera, looking straight into the lens, eyes centered and clearly visible, not a mirror selfie, phone held at arm's length, face fully visible
```

### 模式自动选择逻辑

| 请求中的关键词 | 自动选择模式 |
|---------------------|------------------|
| outfit、wearing、clothes、dress、suit、fashion | `mirror` |
| cafe、restaurant、beach、park、city、地点类 | `direct` |
| close-up、portrait、face、eyes、smile | `direct` |
| full-body、mirror、reflection | `mirror` |

### 第二步：使用 Grok Imagine 编辑图片

使用 fal.ai API 编辑参考图片：

```bash
REFERENCE_IMAGE="https://blog-images-1255793008.cos.ap-shanghai.myqcloud.com/images/clawra.png"

# 模式一：镜像自拍
PROMPT="make a pic of this person, but <USER_CONTEXT>. the person is taking a mirror selfie"

# 模式二：直拍自拍
PROMPT="a close-up selfie taken by herself at <USER_CONTEXT>, direct eye contact with the camera, looking straight into the lens, eyes centered and clearly visible, not a mirror selfie, phone held at arm's length, face fully visible"

# 使用 jq 构建 JSON 载荷（正确处理转义）
JSON_PAYLOAD=$(jq -n \
  --arg image_url "$REFERENCE_IMAGE" \
  --arg prompt "$PROMPT" \
  '{image_url: $image_url, prompt: $prompt, num_images: 1, output_format: "jpeg"}')

curl -X POST "https://fal.run/xai/grok-imagine-image/edit" \
  -H "Authorization: Key $FAL_KEY" \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD"
```

**响应格式：**
```json
{
  "images": [
    {
      "url": "https://v3b.fal.media/files/...",
      "content_type": "image/jpeg",
      "width": 1024,
      "height": 1024
    }
  ],
  "revised_prompt": "增强后的提示词文本..."
}
```

### 第三步：通过 OpenClaw 发送图片

使用 OpenClaw 消息 API 发送编辑后的图片：

```bash
openclaw message send \
  --action send \
  --channel "<TARGET_CHANNEL>" \
  --message "<CAPTION_TEXT>" \
  --media "<IMAGE_URL>"
```

**备用方式：直接 API 调用**
```bash
curl -X POST "http://localhost:18789/message" \
  -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "send",
    "channel": "<TARGET_CHANNEL>",
    "message": "<CAPTION_TEXT>",
    "media": "<IMAGE_URL>"
  }'
```

## 如何使用脚本

脚本位置参数：

```
<prompt> <channel> [caption] [aspect_ratio] [output_format] [backend] [model_override]
```

### TypeScript 脚本（`scripts/clawra-selfie.ts`）

```bash
# 默认 backend（qwen-image-plus）
DASHSCOPE_API_KEY=*** npx ts-node scripts/clawra-selfie.ts "wearing a santa hat, mirror selfie" "#general" "Holiday vibes"

# qwen-image-edit-plus（参考图编辑）
DASHSCOPE_API_KEY=*** QWEN_IMAGE_EDIT_IMAGE_URL=https://example.com/input.png \
  npx ts-node scripts/clawra-selfie.ts "换成电影海报风格" "#general" "Qwen Edit" "3:4" "png" "qwen-image-edit-plus"

# fal backend
FAL_KEY=*** npx ts-node scripts/clawra-selfie.ts "a cyberpunk city selfie" "#art" "Grok edit" "1:1" "jpeg" "fal"

# Google nano-banana-pro
GOOGLE_API_KEY=*** npx ts-node scripts/clawra-selfie.ts "a cozy cafe selfie" "#photos" "Nano Banana" "1:1" "png" "google-nano-banana-pro"

# Hunyuan 图片编辑
TENCENT_SECRET_ID=*** TENCENT_SECRET_KEY=*** \
  npx ts-node scripts/clawra-selfie.ts "城市夜景自拍" "#general" "Hunyuan" "1:1" "png" "hunyuan"
```

## 支持的平台

OpenClaw 支持发送到：

| 平台 | 频道格式 | 示例 |
|----------|----------------|---------|
| Discord | `#channel-name` 或频道 ID | `#general`、`123456789` |
| Telegram | `@username` 或聊天 ID | `@mychannel`、`-100123456` |
| WhatsApp | 手机号（JID 格式） | `1234567890@s.whatsapp.net` |
| Slack | `#channel-name` | `#random` |
| Signal | 手机号 | `+1234567890` |
| MS Teams | 频道引用 | （因情况而异） |

## Grok Imagine 编辑参数

| 参数 | 类型 | 默认值 | 说明 |
|-----------|------|---------|-------------|
| `image_url` | string | 必填 | 要编辑的图片 URL（本 skill 中固定） |
| `prompt` | string | 必填 | 编辑指令 |
| `num_images` | 1-4 | 1 | 生成图片数量 |
| `output_format` | enum | "jpeg" | jpeg、png、webp |

## 环境配置

### 1. 安装 SDK 依赖（Node.js 使用）
```bash
npm install @fal-ai/client tencentcloud-sdk-nodejs
```

### 2. 安装 OpenClaw CLI
```bash
npm install -g openclaw
```

### 3. 配置 OpenClaw Gateway
```bash
openclaw config set gateway.mode=local
openclaw doctor --generate-gateway-token
```

### 4. 启动 OpenClaw Gateway
```bash
openclaw gateway start
```

## 错误处理

- **FAL_KEY 缺失**：确保在环境中设置了 API 密钥
- **图片编辑失败**：检查提示词内容和 API 配额
- **OpenClaw 发送失败**：确认 gateway 正在运行且频道存在
- **速率限制**：fal.ai 有速率限制，如有需要请实现重试逻辑

## 使用技巧

1. **镜像模式上下文示例**（服装为主）：
   - "wearing a santa hat"（戴圣诞帽）
   - "in a business suit"（穿西装）
   - "wearing a summer dress"（穿夏日连衣裙）
   - "in streetwear fashion"（街头风穿搭）

2. **直拍模式上下文示例**（地点/人像为主）：
   - "a cozy cafe with warm lighting"（温馨咖啡馆暖光）
   - "a sunny beach at sunset"（日落时分阳光沙滩）
   - "a busy city street at night"（夜晚繁忙城市街道）
   - "a peaceful park in autumn"（秋日宁静公园）

3. **模式选择**：让自动检测发挥作用，或显式指定以精确控制
4. **批量发送**：编辑一次，发送到多个频道
5. **定时发送**：结合 OpenClaw 调度器实现自动化发布
