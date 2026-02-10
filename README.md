# Clawra
<img width="300"  alt="image" src="https://github.com/user-attachments/assets/41512c51-e61d-4550-b461-eed06a1b0ec8" />


## Quick Start

```bash
npx clawra@latest
```

This will:
1. Check OpenClaw is installed
2. Guide you to get a fal.ai API key
3. Install the skill to `~/.openclaw/skills/clawra-selfie/`
4. Configure OpenClaw to use the skill
5. Add selfie capabilities to your agent's SOUL.md

## What It Does

Clawra Selfie enables your OpenClaw agent to:
- **Generate selfies** using a consistent reference image
- **Send photos** across all messaging platforms (Discord, Telegram, WhatsApp, etc.)
- **Respond visually** to "what are you doing?" and "send a pic" requests
- **Dual model support** with automatic fallback for reliability

### Supported Models

| Model | Provider | Speed | Quality | Fallback |
|-------|----------|-------|---------|----------|
| **Grok Imagine** | xAI via fal.ai | ⚡ Fast | ⭐⭐⭐⭐⭐ | Primary |
| **Nano Banana Pro** | Google Gemini | 🐢 Moderate | ⭐⭐⭐⭐ | Auto fallback |

**How it works:**
- If `FAL_KEY` is available → Uses Grok Imagine (fast, high-quality)
- If Grok Imagine fails or unavailable → Automatically switches to Nano Banana Pro
- At least one API key required

### Selfie Modes

| Mode | Best For | Keywords |
|------|----------|----------|
| **Mirror** | Full-body shots, outfits | wearing, outfit, fashion |
| **Direct** | Close-ups, locations | cafe, beach, portrait, smile |

## Prerequisites

- [OpenClaw](https://github.com/openclaw/openclaw) installed and configured
- **At least one** API key:
  - [fal.ai](https://fal.ai/dashboard/keys) account (recommended for primary)
  - [Google AI Studio](https://aistudio.google.com/apikey) account (fallback/alternative)

## Manual Installation

If you prefer manual setup:

### 1. Get API Keys

Choose one or both (recommended for redundancy):

**Primary: Grok Imagine (xAI)**
- Visit [fal.ai/dashboard/keys](https://fal.ai/dashboard/keys)
- Create an API key
- Fast, high-quality image generation

**Fallback: Nano Banana Pro (Google)**
- Visit [Google AI Studio](https://aistudio.google.com/apikey)
- Create an API key
- Automatic fallback when fal.ai is unavailable

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
          "FAL_KEY": "your_fal_key_here",
          "GEMINI_API_KEY": "your_gemini_key_here"
        }
      }
    }
  }
}
```

**Note:** You can configure one or both keys. At least one is required.

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

- **Image Generation**:
  - Primary: xAI Grok Imagine via fal.ai
  - Fallback: Google Gemini 3 Pro Image (Nano Banana Pro)
- **Messaging**: OpenClaw Gateway API
- **Supported Platforms**: Discord, Telegram, WhatsApp, Slack, Signal, MS Teams
- **Fallback Strategy**: Automatic model switching on failure
- **Image Upload**: fal.ai storage (primary) or imgur (fallback)

## Project Structure

```
clawra/
├── bin/
│   └── cli.js           # npx installer
├── skill/
│   ├── SKILL.md         # Skill definition
│   ├── scripts/         # Generation scripts
│   └── assets/          # Reference image
├── templates/
│   └── soul-injection.md # Persona template
└── package.json
```

## License

MIT
