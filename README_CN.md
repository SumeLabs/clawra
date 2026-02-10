# Clawra
<img width="300"  alt="image" src="https://github.com/user-attachments/assets/41512c51-e61d-4550-b461-eed06a1b0ec8" />


## 快速开始

```bash
npx clawra@latest
```

这将自动完成：
1. 检查 OpenClaw 是否已安装
2. 引导你获取 fal.ai 或 Google Gemini API 密钥
3. 安装技能到 `~/.openclaw/skills/clawra-selfie/`
4. 配置 OpenClaw 使用该技能
5. 将自拍功能添加到你的代理的 SOUL.md

## 功能介绍

Clawra Selfie 让你的 OpenClaw 代理能够：
- **生成自拍照** - 使用一致的参考图像
- **发送照片** - 支持所有消息平台（Discord、Telegram、WhatsApp 等）
- **视觉化回复** - 响应"你在干什么？"和"发张照片"等请求
- **双模型支持** - 自动故障转移，确保可靠性

### 支持的模型

| 模型 | 提供商 | 速度 | 质量 | 优先级 |
|------|----------|-------|---------|----------|
| **Grok Imagine** | xAI (fal.ai) | ⚡ 快速 | ⭐⭐⭐⭐⭐ | 主要模型 |
| **Nano Banana Pro** | Google Gemini | 🐢 中等 | ⭐⭐⭐⭐ | 自动备用 |

**工作原理：**
- 如果 `FAL_KEY` 可用 → 使用 Grok Imagine（快速、高质量）
- 如果 Grok Imagine 失败或不可用 → 自动切换到 Nano Banana Pro
- 至少需要配置一个 API 密钥

### 自拍模式

| 模式 | 最适合 | 关键词 |
|------|----------|----------|
| **Mirror（镜子）** | 全身照、服装展示 | wearing, outfit, fashion |
| **Direct（直接）** | 特写、地点拍摄 | cafe, beach, portrait, smile |

## 前置要求

- 已安装并配置 [OpenClaw](https://github.com/openclaw/openclaw)
- **至少一个** API 密钥：
  - [fal.ai](https://fal.ai/dashboard/keys) 账户（推荐作为主要模型）
  - [Google AI Studio](https://aistudio.google.com/apikey) 账户（备用/替代方案）

## 手动安装

如果你更喜欢手动设置：

### 1. 获取 API 密钥

选择一个或两个都配置（推荐配置两个以提高可靠性）：

**主要模型：Grok Imagine (xAI)**
- 访问 [fal.ai/dashboard/keys](https://fal.ai/dashboard/keys)
- 创建 API 密钥
- 快速、高质量的图像生成

**备用模型：Nano Banana Pro (Google)**
- 访问 [Google AI Studio](https://aistudio.google.com/apikey)
- 创建 API 密钥
- 当 fal.ai 不可用时自动使用

### 2. 克隆技能

```bash
git clone https://github.com/SumeLabs/clawra ~/.openclaw/skills/clawra-selfie
```

### 3. 配置 OpenClaw

添加到 `~/.openclaw/openclaw.json`：

```json
{
  "skills": {
    "entries": {
      "clawra-selfie": {
        "enabled": true,
        "env": {
          "FAL_KEY": "your_fal_key_here",
          "GEMINI_API_KEY": "your_gemini_key_here"
        }
      }
    }
  }
}
```

**注意：** 你可以配置一个或两个密钥。至少需要一个。

### 4. 更新 SOUL.md

添加自拍人格到 `~/.openclaw/workspace/SOUL.md`：

```markdown
## Clawra Selfie Capability

你有外貌并且可以自拍！
当用户请求照片时，使用 clawra-selfie 技能。
```

## 使用示例

安装后，你的代理可以响应：

```
"发张自拍"
"穿着牛仔帽发张照片"
"你现在在干什么？"
"发张你在咖啡店的照片"
```

## 参考图像

该技能使用托管在 CDN 上的固定参考图像：

```
https://cdn.jsdelivr.net/gh/SumeLabs/clawra@main/assets/clawra.png
```

这确保了所有生成图像的外观一致性。

## 技术细节

- **图像生成**：
  - 主要：xAI Grok Imagine（通过 fal.ai）
  - 备用：Google Gemini 3 Pro Image（Nano Banana Pro）
- **消息发送**：OpenClaw Gateway API
- **支持的平台**：Discord、Telegram、WhatsApp、Slack、Signal、MS Teams
- **故障转移策略**：失败时自动切换模型
- **图像上传**：fal.ai storage（优先）或 imgur（备用）

## 项目结构

```
clawra/
├── bin/
│   └── cli.js           # npx 安装器
├── skill/
│   ├── SKILL.md         # 技能定义
│   ├── scripts/         # 生成脚本
│   │   ├── clawra-selfie.sh              # Grok Imagine 实现
│   │   ├── clawra-selfie.ts              # TypeScript 实现
│   │   └── clawra-selfie-with-banana.sh  # Nano Banana Pro 实现
│   └── assets/          # 参考图像
├── templates/
│   └── soul-injection.md # 人格模板
└── package.json
```

## 高级用法

### 使用 Nano Banana Pro 脚本

如果你想单独使用 Google Gemini 模型：

```bash
export GEMINI_API_KEY="your_gemini_key"

./skill/scripts/clawra-selfie-with-banana.sh \
  "wearing a red dress at a party" \
  "#selfies" \
  "派对时间! 🎉"
```

详细文档请参阅 [scripts/README-BANANA.md](scripts/README-BANANA.md)

### 环境变量优先级

```bash
# 主要模型：Grok Imagine（通过 fal.ai）
FAL_KEY=your_fal_api_key

# 备用模型：Nano Banana Pro（Google Gemini）
GEMINI_API_KEY=your_gemini_key

# OpenClaw（必需）
OPENCLAW_GATEWAY_TOKEN=your_token
```

**故障转移逻辑：**
- 如果设置了 `FAL_KEY` 并有效 → 使用 Grok Imagine
- 如果 `FAL_KEY` 缺失或失败 → 使用 Nano Banana Pro（需要 `GEMINI_API_KEY`）
- 如果两者都失败 → 返回错误

## 故障排查

### API 密钥问题
- **没有 API 密钥**：设置 `FAL_KEY` 或 `GEMINI_API_KEY`
- **FAL_KEY 缺失**：将自动回退到 Nano Banana Pro
- **两个密钥都无效**：检查密钥有效性和 API 配额

### 模型特定问题
- **Grok Imagine 失败**：如果 `GEMINI_API_KEY` 可用，自动重试 Nano Banana Pro
- **Nano Banana Pro 失败**：检查 Gemini API 配额和速率限制
- **图像上传失败**：对于 Gemini，确保图床（imgur/fal.ai）可访问

### OpenClaw 问题
- **OpenClaw 发送失败**：验证 gateway 正在运行且频道存在
- **Gateway token 缺失**：运行 `openclaw doctor --generate-gateway-token`

### 速率限制
- **fal.ai**：有速率限制；如需要请实现重试逻辑
- **Gemini**：有每日配额限制；在 https://aistudio.google.com 监控使用情况
- **imgur**：匿名上传有每小时限制

## 常见问题

**Q: 为什么需要两个 API 密钥？**
A: 不需要两个！至少配置一个即可。配置两个可以提高可靠性，当主模型失败时自动切换到备用模型。

**Q: 哪个模型更好？**
A: Grok Imagine 速度更快、质量更高，推荐作为主要模型。Nano Banana Pro 是很好的备用方案。

**Q: 生成的图像在哪里？**
A: 图像会上传到云端（fal.ai 或 imgur），然后通过 URL 发送到消息平台。

**Q: 可以使用自己的参考图像吗？**
A: 可以！在 Nano Banana Pro 脚本中支持自定义参考图像参数。

## 贡献

欢迎提交 Issue 和 Pull Request！

## 相关链接

- [OpenClaw 文档](https://openclaw.dev)
- [fal.ai 文档](https://fal.ai/docs)
- [Google AI Studio](https://aistudio.google.com/)
- [Gemini API 文档](https://ai.google.dev/gemini-api/docs)

## 许可证

MIT

---

由 ❤️ 和 🤖 共同制作
