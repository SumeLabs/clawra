# Clawra
<img width="300" alt="image" src="https://github.com/user-attachments/assets/41512c51-e61d-4550-b461-eed06a1b0ec8" />

[![npm version](https://img.shields.io/npm/v/clawra)](https://www.npmjs.com/package/clawra)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Add selfie superpowers to your OpenClaw agent using AI image generation

Clawra enables your OpenClaw agent to generate and send AI selfies across messaging platforms (Discord, Telegram, WhatsApp, Slack, Signal, MS Teams).

## ✨ Features

- **🤳 AI Selfies** - Generate consistent character selfies using reference images
- **🎨 Multiple Modes** - Mirror (outfit/fashion) and Direct (location/portrait) modes
- **🌐 Multi-Provider** - Support for fal.ai, OpenAI, Stability AI, and custom APIs
- **💬 Cross-Platform** - Send to Discord, Telegram, WhatsApp, Slack, and more
- **⚡ Easy Setup** - One-command installation with `npx`

## 🚀 Quick Start

```bash
npx clawra@latest
```

This interactive installer will:
1. Check OpenClaw is installed
2. Guide you to get an image generation API key
3. Install the skill to `~/.openclaw/skills/clawra-selfie/`
4. Configure OpenClaw to use the skill
5. Add selfie capabilities to your agent's SOUL.md

## 📖 Documentation

- [Installation Guide](./docs/INSTALLATION.md) - Detailed setup instructions
- [Configuration Guide](./docs/CONFIGURATION.md) - Provider configuration
- [Usage Examples](./docs/USAGE.md) - Usage patterns and examples
- [Troubleshooting](./docs/TROUBLESHOOTING.md) - Common issues and solutions
- [API Reference](./docs/API.md) - API documentation

## 🎨 Image Generation Providers

Clawra supports multiple image generation providers:

| Provider | Setup | Best For |
|----------|-------|----------|
| **fal.ai** (Default) | `FAL_KEY=xxx` | xAI Grok Imagine, fast generation |
| **OpenAI** | `OPENAI_API_KEY=xxx` | DALL-E 3, high quality |
| **Stability AI** | `STABILITY_KEY=xxx` | SDXL, cost-effective |
| **Custom API** | `CUSTOM_API_URL=xxx` | Any OpenAI-compatible endpoint |

### Provider Comparison

| Feature | fal.ai | OpenAI | Stability AI |
|---------|--------|--------|--------------|
| Image Edit | ✅ | ❌ | ❌ |
| Text-to-Image | ✅ | ✅ | ✅ |
| Speed | Fast | Medium | Fast |
| Cost | $ | $$ | $ |
| Quality | High | Highest | High |

## 💬 Usage Examples

Once installed, your agent responds to:

```
"Send me a selfie"
"Send a pic wearing a cowboy hat"
"What are you doing right now?"
"Show me you at a coffee shop"
```

### Selfie Modes

| Mode | Best For | Keywords | Example Prompt |
|------|----------|----------|----------------|
| **Mirror** | Full-body, outfits | `wearing`, `outfit`, `fashion` | "wearing a red dress" |
| **Direct** | Close-ups, locations | `cafe`, `beach`, `portrait` | "at a sunny beach" |

## 🔧 Manual Installation

See [Installation Guide](./docs/INSTALLATION.md) for detailed manual setup.

## 🛠️ Configuration

### Environment Variables

```bash
# Required (at least one provider)
FAL_KEY=your_fal_key_here
# OR
OPENAI_API_KEY=your_openai_key
# OR
STABILITY_KEY=your_stability_key

# Optional
CLAWRA_MODE=auto          # Default: auto (mirror/direct detection)
CLAWRA_DEFAULT_SIZE=1024  # Image size: 512, 1024, 2048
```

See [Configuration Guide](./docs/CONFIGURATION.md) for all options.

## 🌟 Advanced Features

### Custom Reference Image

Use your own reference image for consistent character appearance:

```bash
export CLAWRA_REFERENCE_IMAGE="https://your-cdn.com/your-image.png"
```

### Caching

Enable caching to save API costs:

```bash
export CLAWRA_CACHE_ENABLED=true
export CLAWRA_CACHE_TTL=3600  # Cache TTL in seconds
```

### Batch Processing

Generate once, send to multiple channels:

```bash
# Generated image will be sent to all specified channels
clawra generate "wearing a santa hat" --channels "#general,#random,@user"
```

## 🐛 Troubleshooting

### Common Issues

**Issue**: "FAL_KEY not found"
**Solution**: Set your API key: `export FAL_KEY=your_key_here`

**Issue**: "Failed to generate image"
**Solution**: Check API quota and retry. See [Troubleshooting](./docs/TROUBLESHOOTING.md)

**Issue**: "OpenClaw not connected"
**Solution**: Ensure OpenClaw gateway is running: `openclaw gateway start`

## 📚 Project Structure

```
clawra/
├── bin/
│   └── cli.js              # npx installer
├── docs/                   # Documentation
│   ├── INSTALLATION.md
│   ├── CONFIGURATION.md
│   ├── USAGE.md
│   ├── TROUBLESHOOTING.md
│   └── API.md
├── skill/
│   ├── SKILL.md           # Skill definition
│   ├── scripts/           # Generation scripts
│   └── assets/            # Reference image
├── src/                   # Source code (new)
│   ├── providers/         # Image provider implementations
│   └── utils/             # Utilities
├── templates/
│   └── soul-injection.md  # Persona template
└── package.json
```

## 🤝 Contributing

We welcome contributions! See [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Setup

```bash
git clone https://github.com/SumeLabs/clawra.git
cd clawra
npm install
npm test
```

## 📄 License

MIT © [SumeLabs](https://github.com/SumeLabs)

## 🙏 Acknowledgments

- [OpenClaw](https://github.com/openclaw/openclaw) - The platform that makes this possible
- [fal.ai](https://fal.ai) - Default image generation provider
- xAI - Grok Imagine model

---

<p align="center">
  Made with ❤️ for the OpenClaw community
</p>
