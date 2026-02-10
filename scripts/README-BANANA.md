# Clawra Selfie with Nano Banana Pro

使用 Google Gemini (Nano Banana Pro) 生成自拍图像的脚本。

## 🌟 特性

- ✅ 使用 Google Gemini 3 Pro Image Preview API
- ✅ 支持参考图像编辑 (image-to-image)
- ✅ 自动模式检测 (mirror/direct selfie)
- ✅ 集成 OpenClaw 消息发送
- ✅ 自动上传到图床 (imgur 或 fal.ai)
- ✅ 彩色日志输出
- ✅ 完整的错误处理

## 📋 前置要求

### 1. 获取 API Key
访问 [Google AI Studio](https://aistudio.google.com/apikey) 获取你的 API key。

### 2. 安装依赖
```bash
# macOS
brew install jq curl

# Linux (Debian/Ubuntu)
apt install jq curl

# OpenClaw (可选,用于发送消息)
npm install -g openclaw
```

## 🚀 使用方法

### 基础用法

```bash
# 设置 API key
export GEMINI_API_KEY="your_api_key_here"

# 生成图像并发送
./clawra-selfie-with-banana.sh "prompt" "#channel"
```

### 完整参数

```bash
./clawra-selfie-with-banana.sh <prompt> <channel> [caption] [mode] [reference_image]
```

**参数说明:**
- `prompt`: 图像描述 (必需)
- `channel`: 目标频道 (必需), 如 `#general`, `@username`
- `caption`: 消息标题 (可选, 默认: "Generated with Nano Banana Pro")
- `mode`: 自拍模式 (可选, 默认: auto)
  - `auto`: 根据关键词自动检测
  - `mirror`: 镜子自拍 (全身照)
  - `direct`: 直接自拍 (特写)
- `reference_image`: 参考图像 URL (可选, 默认使用 Clawra 官方图像)

## 📝 示例

### 1. 简单文本生成图像
```bash
GEMINI_API_KEY=your_key ./clawra-selfie-with-banana.sh \
  "A cyberpunk city at night with neon lights" \
  "#art-gallery"
```

### 2. Clawra 自拍 (自动模式检测)
```bash
# 会自动检测为 mirror 模式 (因为有 "wearing" 关键词)
GEMINI_API_KEY=your_key ./clawra-selfie-with-banana.sh \
  "wearing a red evening dress at a party" \
  "#selfies" \
  "Party time! 🎉"
```

### 3. 指定 direct 模式
```bash
# 近景肖像
GEMINI_API_KEY=your_key ./clawra-selfie-with-banana.sh \
  "at a cozy coffee shop with warm lighting" \
  "#daily-updates" \
  "Morning coffee ☕" \
  "direct"
```

### 4. 使用自定义参考图像
```bash
GEMINI_API_KEY=your_key ./clawra-selfie-with-banana.sh \
  "wearing sunglasses and a hat" \
  "#fun" \
  "New look! 😎" \
  "auto" \
  "https://example.com/my-photo.jpg"
```

### 5. 不发送消息,仅生成图像
```bash
# 使用一个无效的 channel,图像会保存在本地
GEMINI_API_KEY=your_key ./clawra-selfie-with-banana.sh \
  "beautiful sunset" \
  "local"
```

## 🔧 模式说明

### Mirror 模式
适用于展示服装、全身照、时尚内容

**触发关键词:**
- outfit, wearing, clothes, dress, suit, fashion, full-body, mirror

**提示词模板:**
```
make a pic of this person, but [你的描述]. the person is taking a mirror selfie
```

### Direct 模式
适用于近景肖像、地点拍摄、情感表达

**触发关键词:**
- cafe, restaurant, beach, park, city, close-up, portrait, face, eyes, smile

**提示词模板:**
```
a close-up selfie taken by herself at [你的描述], 
direct eye contact with the camera, looking straight into the lens, 
eyes centered and clearly visible, not a mirror selfie, 
phone held at arm's length, face fully visible
```

## 🌐 图像上传

脚本会自动尝试上传生成的图像:

1. **优先**: 如果设置了 `FAL_KEY` 环境变量,上传到 fal.ai storage
2. **备用**: 上传到 imgur 匿名图床

```bash
# 同时使用两个 API
export GEMINI_API_KEY="your_gemini_key"
export FAL_KEY="your_fal_key"  # 可选,用于上传

./clawra-selfie-with-banana.sh "prompt" "#channel"
```

## 🔄 与原版的区别

| 特性 | Grok Imagine (原版) | Nano Banana Pro (新版) |
|------|-------------------|---------------------|
| API 提供商 | xAI (fal.ai) | Google Gemini |
| API Key | FAL_KEY | GEMINI_API_KEY |
| 输入格式 | 简单 JSON | Multimodal content |
| 参考图像 | URL 直接传递 | Base64 编码 |
| 输出格式 | URL | Base64 (需上传) |
| 价格 | 按 fal.ai 计费 | 根据 Gemini 计费 |

## ⚠️ 注意事项

1. **API 限制**: Google Gemini API 有速率限制,注意不要频繁调用
2. **图像上传**: 生成的图像需要上传到图床才能发送,建议配置 FAL_KEY
3. **临时文件**: 脚本会在 `/tmp` 创建临时文件,执行完会自动清理
4. **OpenClaw**: 如果没有安装 OpenClaw CLI,会尝试直接调用 API

## 🐛 故障排查

### API Key 错误
```bash
# 检查 API key 是否设置
echo $GEMINI_API_KEY

# 测试 API key
curl -s "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"role":"user","parts":[{"text":"test"}]}]}'
```

### 图像上传失败
```bash
# 方案 1: 使用 fal.ai storage
export FAL_KEY="your_fal_key"

# 方案 2: 检查 imgur 连接
curl -I https://api.imgur.com/3/image

# 方案 3: 查看本地保存的图像
ls -lh /tmp/clawra_output_*.png
```

### OpenClaw 连接失败
```bash
# 检查 OpenClaw CLI
openclaw --version

# 检查 Gateway
curl http://localhost:18789/health

# 设置自定义 Gateway URL
export OPENCLAW_GATEWAY_URL="http://your-gateway:port"
export OPENCLAW_GATEWAY_TOKEN="your_token"
```

## 📚 相关资源

- [Google AI Studio](https://aistudio.google.com/)
- [Gemini API 文档](https://ai.google.dev/gemini-api/docs)
- [OpenClaw 文档](https://openclaw.dev)
- [Clawra 项目主页](https://github.com/SumeLabs/clawra)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request!

## 📄 许可证

MIT License
