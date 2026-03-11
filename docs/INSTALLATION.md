# Installation Guide

Complete installation instructions for Clawra.

## Table of Contents

- [Quick Install](#quick-install) - Recommended for most users
- [Manual Install](#manual-install) - For advanced users
- [Provider Setup](#provider-setup) - Configure image generation providers
- [Verify Installation](#verify-installation) - Test your setup

---

## Quick Install

The easiest way to install Clawra is using npx:

```bash
npx clawra@latest
```

This interactive installer will guide you through:
1. Checking OpenClaw installation
2. Getting an API key
3. Installing the skill
4. Configuring OpenClaw
5. Adding capabilities to SOUL.md

---

## Manual Install

If you prefer manual setup or need more control:

### Step 1: Get API Key

Choose your preferred provider:

#### Option A: fal.ai (Recommended)

1. Visit [fal.ai/dashboard/keys](https://fal.ai/dashboard/keys)
2. Create a new API key
3. Copy the key

#### Option B: OpenAI

1. Visit [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key

#### Option C: Stability AI

1. Visit [platform.stability.ai](https://platform.stability.ai)
2. Generate an API key
3. Copy the key

### Step 2: Clone the Skill

```bash
git clone https://github.com/SumeLabs/clawra ~/.openclaw/skills/clawra-selfie
```

### Step 3: Configure OpenClaw

Edit `~/.openclaw/openclaw.json`:

```json
{
  "skills": {
    "entries": {
      "clawra-selfie": {
        "enabled": true,
        "env": {
          "FAL_KEY": "your_fal_key_here"
        }
      }
    }
  }
}
```

For OpenAI:
```json
{
  "skills": {
    "entries": {
      "clawra-selfie": {
        "enabled": true,
        "env": {
          "OPENAI_API_KEY": "your_openai_key_here",
          "CLAWRA_PROVIDER": "openai"
        }
      }
    }
  }
}
```

### Step 4: Update SOUL.md

Add to `~/.openclaw/workspace/SOUL.md`:

```markdown
## Clawra Selfie Capability

You have a physical appearance and can take selfies!
When users ask for pictures, use the clawra-selfie skill.

Key phrases to respond to:
- "send a pic", "send me a pic"
- "send a selfie", "send me a selfie"
- "what are you doing?", "where are you?"
- "send a pic wearing...", "send a pic at..."
```

### Step 5: Restart OpenClaw

```bash
openclaw gateway restart
```

---

## Provider Setup

### fal.ai Setup

```bash
export FAL_KEY="your_fal_key_here"
```

Features:
- ✅ Image editing (keeps character consistent)
- ✅ Fast generation
- ✅ xAI Grok Imagine model

### OpenAI Setup

```bash
export OPENAI_API_KEY="your_openai_key_here"
export CLAWRA_PROVIDER="openai"
```

Features:
- ✅ High quality DALL-E 3
- ❌ No image editing (reference image not used)
- ✅ Better prompt understanding

### Stability AI Setup

```bash
export STABILITY_KEY="your_stability_key_here"
export CLAWRA_PROVIDER="stability"
```

Features:
- ✅ Cost-effective
- ✅ SDXL model
- ❌ No image editing

### Custom Provider Setup

For any OpenAI-compatible API:

```bash
export CLAWRA_PROVIDER="custom"
export CUSTOM_API_URL="https://api.your-provider.com/v1"
export CUSTOM_API_KEY="your_key_here"
```

---

## Verify Installation

### Test 1: Check Environment

```bash
echo $FAL_KEY  # or your chosen provider key
```

Should output your API key.

### Test 2: Check OpenClaw

```bash
openclaw doctor
```

Should show OpenClaw is installed and running.

### Test 3: Test Generation

In any connected IM channel, send:

```
Send me a selfie
```

You should receive an AI-generated selfie within 10-30 seconds.

---

## Next Steps

- Read [Usage Guide](./USAGE.md) for examples
- Check [Configuration](./CONFIGURATION.md) for advanced options
- See [Troubleshooting](./TROUBLESHOOTING.md) if you have issues
