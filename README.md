# Clawra
<img width="300"  alt="image" src="https://github.com/user-attachments/assets/41512c51-e61d-4550-b461-eed06a1b0ec8" />


## Quick Start

```bash
npx clawra@latest
```

This will:
1. Check OpenClaw is installed
2. Guide you to select image provider(s) and enter API key(s)
3. Install the skill to `~/.openclaw/skills/clawra-selfie/`
4. Configure OpenClaw to use the skill
5. Add selfie capabilities to your agent's SOUL.md

## What It Does

Clawra Selfie enables your OpenClaw agent to:
- **Generate selfies** using a consistent reference image
- **Send photos** across all messaging platforms (Discord, Telegram, WhatsApp, etc.)
- **Respond visually** to "what are you doing?" and "send a pic" requests

### Selfie Modes

| Mode | Best For | Keywords |
|------|----------|----------|
| **Mirror** | Full-body shots, outfits | wearing, outfit, fashion |
| **Direct** | Close-ups, locations | cafe, beach, portrait, smile |

## Supported Providers

| Provider | Model | Env Variable | API Key URL |
|----------|-------|-------------|-------------|
| **fal** (default) | Grok Imagine via fal.ai | `FAL_KEY` | [fal.ai/dashboard/keys](https://fal.ai/dashboard/keys) |
| **openai** | gpt-image-1 | `OPENAI_API_KEY` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| **google** | gemini-2.5-flash-image | `GEMINI_API_KEY` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| **xai** | grok-imagine-image (direct) | `XAI_API_KEY` | [console.x.ai](https://console.x.ai) |

## Prerequisites

- [OpenClaw](https://github.com/openclaw/openclaw) installed and configured
- At least one provider API key (see table above)

## Manual Installation

If you prefer manual setup:

### 1. Get API Key

Choose a provider and get its API key from the table above.

### 2. Clone the Skill

```bash
git clone https://github.com/SumeLabs/clawra ~/.openclaw/skills/clawra-selfie
```

### 3. Configure OpenClaw

Add to `~/.openclaw/openclaw.json`:

```json
{
  "skills": {
    "entries": {
      "clawra-selfie": {
        "enabled": true,
        "env": {
          "IMAGE_PROVIDER": "fal",
          "FAL_KEY": "your_fal_key_here"
        }
      }
    }
  }
}
```

Set `IMAGE_PROVIDER` to your chosen provider (`fal`, `openai`, `google`, or `xai`) and include the corresponding API key:

| IMAGE_PROVIDER | Required Env Key |
|---------------|-----------------|
| `fal` | `FAL_KEY` |
| `openai` | `OPENAI_API_KEY` |
| `google` | `GEMINI_API_KEY` |
| `xai` | `XAI_API_KEY` |

You can configure multiple providers at once:

```json
{
  "skills": {
    "entries": {
      "clawra-selfie": {
        "enabled": true,
        "env": {
          "IMAGE_PROVIDER": "openai",
          "FAL_KEY": "your_fal_key",
          "OPENAI_API_KEY": "your_openai_key",
          "GEMINI_API_KEY": "your_gemini_key",
          "XAI_API_KEY": "your_xai_key"
        }
      }
    }
  }
}
```

### 4. Update SOUL.md

Add the selfie persona to `~/.openclaw/workspace/SOUL.md`:

```markdown
## Clawra Selfie Capability

You have a physical appearance and can take selfies!
When users ask for pictures, use the clawra-selfie skill.
```

## Usage Examples

Once installed, your agent responds to:

```
"Send me a selfie"
"Send a pic wearing a cowboy hat"
"What are you doing right now?"
"Show me you at a coffee shop"
```

## Reference Image

The skill uses a fixed reference image hosted on CDN:

```
https://cdn.jsdelivr.net/gh/SumeLabs/clawra@main/assets/clawra.png
```

This ensures consistent appearance across all generated images.

## Technical Details

- **Image Generation**: Multiple providers (fal.ai, OpenAI, Google Gemini, x.ai)
- **Provider Selection**: Via `IMAGE_PROVIDER` env variable
- **Messaging**: OpenClaw Gateway API
- **Supported Platforms**: Discord, Telegram, WhatsApp, Slack, Signal, MS Teams

## Project Structure

```
clawra/
├── bin/
│   └── cli.js              # npx installer (multi-provider)
├── scripts/
│   ├── providers/           # Provider abstraction layer
│   │   ├── types.ts         # Shared interface
│   │   ├── fal.ts           # fal.ai provider
│   │   ├── openai.ts        # OpenAI provider
│   │   ├── google.ts        # Google Gemini provider
│   │   ├── xai.ts           # x.ai direct provider
│   │   └── index.ts         # Factory function
│   ├── clawra-selfie.ts     # TypeScript implementation
│   └── clawra-selfie.sh     # Bash implementation
├── skill/
│   ├── SKILL.md             # Skill definition
│   ├── scripts/             # Generation scripts (copy)
│   └── assets/              # Reference image
├── templates/
│   └── soul-injection.md    # Persona template
├── tsconfig.json
└── package.json
```

## License

MIT
