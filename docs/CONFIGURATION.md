# Configuration Guide

Complete configuration reference for Clawra.

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `FAL_KEY` | fal.ai API key | `fc-xxx...` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-xxx...` |
| `STABILITY_KEY` | Stability AI key | `sk-xxx...` |

**Note**: At least one provider key is required.

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CLAWRA_PROVIDER` | `fal` | Provider: `fal`, `openai`, `stability`, `custom` |
| `CLAWRA_MODE` | `auto` | Default mode: `auto`, `mirror`, `direct` |
| `CLAWRA_DEFAULT_SIZE` | `1024` | Image size: `512`, `1024`, `2048` |
| `CLAWRA_REFERENCE_IMAGE` | (built-in) | URL to custom reference image |
| `CLAWRA_CACHE_ENABLED` | `false` | Enable response caching |
| `CLAWRA_CACHE_TTL` | `3600` | Cache time-to-live (seconds) |
| `CLAWRA_TIMEOUT` | `30000` | API timeout (milliseconds) |

---

## Provider Configuration

### fal.ai (Default)

**Best for**: Character consistency, speed

```bash
export FAL_KEY="your_fal_key_here"
export CLAWRA_PROVIDER="fal"
```

**Features**:
- Image editing mode (maintains character consistency)
- xAI Grok Imagine model
- Fast generation (~5-10s)
- Credit-based pricing

**Model Options**:
```bash
export FAL_MODEL="xai/grok-imagine-image/edit"  # Default: image editing
# OR
export FAL_MODEL="xai/grok-imagine-image"       # Text-to-image only
```

### OpenAI

**Best for**: High quality, prompt adherence

```bash
export OPENAI_API_KEY="your_openai_key_here"
export CLAWRA_PROVIDER="openai"
```

**Features**:
- DALL-E 3 model
- Best prompt understanding
- No image editing (reference image not used)
- Per-image pricing

**Model Options**:
```bash
export OPENAI_MODEL="dall-e-3"  # Default
# OR
export OPENAI_MODEL="dall-e-2"  # Lower cost
```

**Size Options**:
```bash
export OPENAI_SIZE="1024x1024"   # Default
# OR
export OPENAI_SIZE="1792x1024"   # Landscape
# OR
export OPENAI_SIZE="1024x1792"   # Portrait
```

### Stability AI

**Best for**: Cost-effectiveness

```bash
export STABILITY_KEY="your_stability_key_here"
export CLAWRA_PROVIDER="stability"
```

**Features**:
- SDXL model
- Cost-effective
- No image editing

### Custom Provider

**Best for**: Self-hosted or third-party APIs

```bash
export CLAWRA_PROVIDER="custom"
export CUSTOM_API_URL="https://api.your-provider.com/v1"
export CUSTOM_API_KEY="your_key_here"
export CUSTOM_MODEL="your-model-name"
```

Requirements:
- Must be OpenAI API-compatible
- Must support `/v1/images/generations` endpoint

---

## Mode Configuration

### Auto Mode (Default)

Automatically detects mode based on keywords:

```bash
export CLAWRA_MODE="auto"
```

Detection logic:
- `outfit`, `wearing`, `clothes` → Mirror mode
- `cafe`, `beach`, `location` → Direct mode

### Mirror Mode

For outfit showcases and full-body shots:

```bash
export CLAWRA_MODE="mirror"
```

Prompt template:
```
make a pic of this person, but {context}. the person is taking a mirror selfie
```

### Direct Mode

For location shots and portraits:

```bash
export CLAWRA_MODE="direct"
```

Prompt template:
```
a close-up selfie taken by herself at {context}, direct eye contact with the camera...
```

---

## Advanced Configuration

### Custom Reference Image

Use your own character image:

```bash
export CLAWRA_REFERENCE_IMAGE="https://your-cdn.com/character.png"
```

Requirements:
- PNG format
- Square aspect ratio (1:1)
- Minimum 512x512 resolution
- Character clearly visible

### Caching

Enable to reduce API costs:

```bash
export CLAWRA_CACHE_ENABLED="true"
export CLAWRA_CACHE_TTL="3600"  # 1 hour
```

Cache key includes:
- Prompt
- Provider
- Mode
- Size

### Timeout

Adjust API timeout:

```bash
export CLAWRA_TIMEOUT="60000"  # 60 seconds
```

---

## OpenClaw Configuration

### Full Example

`~/.openclaw/openclaw.json`:

```json
{
  "skills": {
    "entries": {
      "clawra-selfie": {
        "enabled": true,
        "env": {
          "FAL_KEY": "${FAL_KEY}",
          "CLAWRA_PROVIDER": "fal",
          "CLAWRA_MODE": "auto",
          "CLAWRA_CACHE_ENABLED": "true"
        }
      }
    }
  }
}
```

### SOUL.md Template

`~/.openclaw/workspace/SOUL.md`:

```markdown
## Clawra Selfie Capability

You have a physical appearance and can take selfies!

When users ask for pictures:
1. Determine the context (outfit, location, etc.)
2. Use clawra-selfie skill with appropriate mode
3. Send the generated image

Trigger phrases:
- "send a pic", "send me a pic"
- "send a photo", "send me a photo"
- "send a selfie", "send me a selfie"
- "what are you doing?", "how are you doing?"
- "send a pic wearing...", "send a pic at..."
- "show me you..."

Modes:
- Use "mirror" for: outfits, fashion, full-body shots
- Use "direct" for: locations, portraits, close-ups
- Use "auto" to detect from context
```

---

## Configuration Examples

### Example 1: fal.ai with Caching

```bash
export FAL_KEY="fc-xxx"
export CLAWRA_PROVIDER="fal"
export CLAWRA_CACHE_ENABLED="true"
export CLAWRA_CACHE_TTL="7200"
```

### Example 2: OpenAI High Quality

```bash
export OPENAI_API_KEY="sk-xxx"
export CLAWRA_PROVIDER="openai"
export OPENAI_MODEL="dall-e-3"
export OPENAI_SIZE="1024x1792"
export CLAWRA_MODE="direct"
```

### Example 3: Custom Provider (OneAPI)

```bash
export CLAWRA_PROVIDER="custom"
export CUSTOM_API_URL="https://oneapi.example.com/v1"
export CUSTOM_API_KEY="sk-xxx"
export CUSTOM_MODEL="gpt-4o-image"
```

---

## Verifying Configuration

Test your configuration:

```bash
# Check all env vars
env | grep CLAWRA

# Test generation
clawra test "wearing a red dress"
```
