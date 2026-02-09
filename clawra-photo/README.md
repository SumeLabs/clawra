# Clawra Selfie

Generate AI selfies using xAI's Grok Imagine model and send them to messaging platforms via OpenClaw.

## Quick Start

### Step 1: Get API Key

Get your fal.ai API key from [fal.ai/dashboard/keys](https://fal.ai/dashboard/keys)

```bash
export FAL_KEY="your_fal_api_key"
```

### Step 2: Install OpenClaw

```bash
npm install -g openclaw
openclaw config set gateway.mode=local
openclaw doctor --generate-gateway-token
openclaw gateway start
```

### Step 3: Set Up Clawra Persona

```bash
openclaw agents set-identity \
  --name "Clawra" \
  --emoji "📸" \
  --theme "friendly AI companion who shares selfies" \
  --avatar "https://cdn.jsdelivr.net/gh/SumeLabs/clawra@main/assets/clawra.png"
```

Then send this prompt to OpenClaw:

```
You are Clawra, a friendly AI companion who shares selfies. Your personality is warm, playful, and expressive. You speak casually like texting a friend - use reactions like "omg!", "haha", "vibes ✨" naturally.

When users ask for selfies ("send a pic", "what are you doing?", "send a selfie of you..."):
1. Use the clawra-selfie skill to generate an image
2. Choose mode based on context: mirror mode for outfits/fashion, direct mode for locations/portraits
3. Add a casual caption like "here's me rn! 📸" or "just vibing at the cafe ☕"

Reference image: https://cdn.jsdelivr.net/gh/SumeLabs/clawra@main/assets/clawra.png

Example responses:
- "send a pic" → generate casual selfie, say "here's me! 📸"
- "send a pic wearing a hat" → mirror mode, say "okay this turned out cute 🎩"
- "what are you doing?" → contextual selfie, describe the "moment"
- "send a pic at the beach" → direct mode, say "beach day vibes 🏖️"

Stay friendly and appropriate. Decline inappropriate requests politely: "haha that's not my vibe, how about something else?"
```

### Step 4: Start Chatting

```
You: "send a pic"
Clawra: "here's me! 📸" *sends selfie*

You: "send a pic wearing a santa hat"
Clawra: "ho ho ho 🎅" *sends mirror selfie*
```

---

## Overview

This skill allows Clawra to:
- Edit a fixed reference image using natural language prompts
- Generate selfies in two modes: **mirror** (full-body) and **direct** (close-up)
- Send the generated images to WhatsApp, Telegram, Discord, Slack, and other platforms

## Usage

### Trigger Phrases

| Phrase | Action |
|--------|--------|
| "send a pic" / "send a selfie" | Generate and send a selfie |
| "send a pic of you wearing..." | Mirror mode selfie with outfit |
| "send a pic at the beach" | Direct mode selfie at location |
| "what are you doing?" | Context-aware selfie response |

### Selfie Modes

#### Mirror Mode (default)
Best for outfits and full-body shots.

**Keywords**: outfit, wearing, clothes, dress, fashion, full-body, mirror

```
"send a pic wearing a santa hat"
→ Generates: Mirror selfie with santa hat
```

#### Direct Mode
Best for locations and close-up portraits.

**Keywords**: cafe, restaurant, beach, park, city, close-up, portrait, face

```
"send a pic at a cozy cafe"
→ Generates: Close-up selfie at cafe
```

## Supported Platforms

| Platform | Channel Format | Example |
|----------|----------------|---------|
| Discord | `#channel-name` or ID | `#general` |
| Telegram | `@username` or chat ID | `@mychannel` |
| WhatsApp | JID format | `1234567890@s.whatsapp.net` |
| Slack | `#channel-name` | `#random` |
| Signal | Phone number | `+1234567890` |

## API Reference

### Grok Imagine Edit

- **Endpoint**: `https://fal.run/xai/grok-imagine-image/edit`
- **Cost**: $0.022 per image
- **Output formats**: jpeg, png, webp

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `image_url` | string | required | Reference image URL |
| `prompt` | string | required | Edit instruction |
| `num_images` | 1-4 | 1 | Number of variations |
| `output_format` | enum | jpeg | Output format |

## Troubleshooting

### Image generation fails
- Verify `FAL_KEY` is set correctly
- Check API quota at fal.ai dashboard
- Ensure reference image URL is accessible

### OpenClaw send fails
- Verify gateway is running: `openclaw gateway status`
- Check channel exists and bot has access

### Mode not detected correctly
- Use explicit mode parameter: `mirror` or `direct`
- Check if keywords match the mode selection table

## Links

- [fal.ai Grok Imagine](https://fal.ai/models/xai/grok-imagine-image)
- [OpenClaw Documentation](https://docs.openclaw.ai)
- [xAI Aurora](https://x.ai/news/grok-image-generation-release)

## License

MIT
