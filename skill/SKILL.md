---
name: clawra-selfie
description: Generate or edit Clawra selfies with Qwen Image, Grok Imagine, or Google nano-banana models and send them via OpenClaw
allowed-tools: Bash(npm:*) Bash(npx:*) Bash(openclaw:*) Bash(curl:*) Read Write WebFetch
---

# Clawra Selfie

Generate or edit selfie images with Alibaba Qwen Image, xAI Grok Imagine, or Google nano-banana models, then distribute them across messaging platforms (WhatsApp, Telegram, Discord, Slack, etc.) via OpenClaw.

## Reference Image

The skill uses a fixed reference image hosted on jsDelivr CDN:

```
http://tb0178hpn.hn-bkt.clouddn.com/clawra.png
```

## When to Use

- User says "send a pic", "send me a pic", "send a photo", "send a selfie"
- User says "send a pic of you...", "send a selfie of you..."
- User asks "what are you doing?", "how are you doing?", "where are you?"
- User describes a context: "send a pic wearing...", "send a pic at..."
- User wants Clawra to appear in a specific outfit, location, or situation

## Quick Reference

### Required Environment Variables

```bash
DASHSCOPE_API_KEY=your_key             # qwen platform (or ALIBABA_CLOUD_MODEL_STUDIO_API_KEY)
ARK_API_KEY=your_key                   # volc platform (or VOLCENGINE_API_KEY)
FAL_KEY=your_fal_api_key               # fal platform
GOOGLE_API_KEY=your_google_api_key     # google platform (or GEMINI_API_KEY / NANO_BANANA_PRO_API_KEY)
TENCENT_SECRET_ID=your_secret_id       # hunyuan platform
TENCENT_SECRET_KEY=your_secret_key     # hunyuan platform
# TENCENT_REFERENCE_IMAGE_URL=url      # optional, overrides default Clawra CDN image
# TENCENT_RESOLUTION=1024:1024         # optional
# TENCENT_REVISE=1                     # optional, prompt rewriting (default: 1)
# TENCENT_SEED=123                     # optional, fixed seed
OPENCLAW_GATEWAY_TOKEN=your_token      # From: openclaw doctor --generate-gateway-token
```

### Workflow

1. **Get user prompt** for generation/editing context
2. **Choose platform + operation**: `qwen|volc|fal|google|hunyuan` + `generate|edit`
3. **Generate/edit image** via selected model
4. **Send to OpenClaw** with target channel(s)

### Script Platforms

Core implementation is TypeScript in `scripts/clawra-selfie.ts` (`scripts/clawra-selfie.sh` is a wrapper that forwards to TS).

Supported platforms and full model names:

- `qwen`
  - `generate`: `qwen-image-plus-2026-01-09` (default)
  - `edit`: `qwen-image-edit-plus` (default)
- `volc`
  - `generate`: `doubao-seedream-5-0-260128` (default), `doubao-seedream-4-5-251128`, `doubao-seedream-4-0-250828`
  - `edit`: `doubao-seedream-5-0-260128` (default), `doubao-seedream-4-5-251128`, `doubao-seedream-4-0-250828`
- `fal`
  - `generate`: `xai/grok-imagine-image` (default)
  - `edit`: `xai/grok-imagine-image/edit` (default)
- `google`
  - `generate`: `gemini-3-pro-image-preview` (default), `gemini-2.5-flash-image`
- `hunyuan`
  - `edit`: `aiart/v20221229 SubmitTextToImageJob` (default)

Use `npx ts-node scripts/clawra-selfie.ts --list-models` to print the latest catalog.

## Step-by-Step Instructions

### Step 1: Collect User Input

Ask the user for:
- **User context**: What should the person in the image be doing/wearing/where?
- **Mode** (optional): `mirror` or `direct` selfie style
- **Target channel(s)**: Where should it be sent? (e.g., `#general`, `@username`, channel ID)
- **Platform** (optional): Which platform? (discord, telegram, whatsapp, slack)

## Prompt Modes

### Mode 1: Mirror Selfie (default)
Best for: outfit showcases, full-body shots, fashion content

```
make a pic of this person, but [user's context]. the person is taking a mirror selfie
```

**Example**: "wearing a santa hat" →
```
make a pic of this person, but wearing a santa hat. the person is taking a mirror selfie
```

### Mode 2: Direct Selfie
Best for: close-up portraits, location shots, emotional expressions

```
a close-up selfie taken by herself at [user's context], direct eye contact with the camera, looking straight into the lens, eyes centered and clearly visible, not a mirror selfie, phone held at arm's length, face fully visible
```

**Example**: "a cozy cafe with warm lighting" →
```
a close-up selfie taken by herself at a cozy cafe with warm lighting, direct eye contact with the camera, looking straight into the lens, eyes centered and clearly visible, not a mirror selfie, phone held at arm's length, face fully visible
```

### Mode Selection Logic

| Keywords in Request | Auto-Select Mode |
|---------------------|------------------|
| outfit, wearing, clothes, dress, suit, fashion | `mirror` |
| cafe, restaurant, beach, park, city, location | `direct` |
| close-up, portrait, face, eyes, smile | `direct` |
| full-body, mirror, reflection | `mirror` |

### Step 2: Edit Image with Grok Imagine

Use the fal.ai API to edit the reference image:

```bash
REFERENCE_IMAGE="http://tb0178hpn.hn-bkt.clouddn.com/clawra.png"

# Mode 1: Mirror Selfie
PROMPT="make a pic of this person, but <USER_CONTEXT>. the person is taking a mirror selfie"

# Mode 2: Direct Selfie
PROMPT="a close-up selfie taken by herself at <USER_CONTEXT>, direct eye contact with the camera, looking straight into the lens, eyes centered and clearly visible, not a mirror selfie, phone held at arm's length, face fully visible"

# Build JSON payload with jq (handles escaping properly)
JSON_PAYLOAD=$(jq -n \
  --arg image_url "$REFERENCE_IMAGE" \
  --arg prompt "$PROMPT" \
  '{image_url: $image_url, prompt: $prompt, num_images: 1, output_format: "jpeg"}')

curl -X POST "https://fal.run/xai/grok-imagine-image/edit" \
  -H "Authorization: Key $FAL_KEY" \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD"
```

**Response Format:**
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
  "revised_prompt": "Enhanced prompt text..."
}
```

### Step 3: Send Image via OpenClaw

Use the OpenClaw messaging API to send the edited image:

```bash
openclaw message send \
  --action send \
  --channel "<TARGET_CHANNEL>" \
  --message "<CAPTION_TEXT>" \
  --media "<IMAGE_URL>"
```

**Alternative: Direct API call**
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

## How to Use the Scripts

Script arguments:

```
<prompt> <channel> [caption] [aspect_ratio] [output_format] [platform] [operation] [model]
```

Use TypeScript directly via `npx ts-node scripts/clawra-selfie.ts`.

```bash
# qwen generate (default model) — DASHSCOPE_API_KEY
DASHSCOPE_API_KEY=*** \
  npx ts-node scripts/clawra-selfie.ts "wearing a santa hat, mirror selfie" "#general" "Holiday vibes" "1:1" "png" "qwen" "generate"

# qwen edit (explicit model) — DASHSCOPE_API_KEY
DASHSCOPE_API_KEY=*** QWEN_IMAGE_EDIT_IMAGE_URL=https://example.com/input.png \
  npx ts-node scripts/clawra-selfie.ts "换成电影海报风格" "#general" "Qwen Edit" "3:4" "png" "qwen" "edit" "qwen-image-edit-plus"

# volc generate — ARK_API_KEY
ARK_API_KEY=*** \
  npx ts-node scripts/clawra-selfie.ts "a cyberpunk city selfie" "#art" "Seedream" "1:1" "png" "volc" "generate" "doubao-seedream-5-0-260128"

# volc edit — ARK_API_KEY
ARK_API_KEY=*** \
  npx ts-node scripts/clawra-selfie.ts "换成海边度假风格" "#art" "Seededit" "1:1" "png" "volc" "edit" "doubao-seedream-4-5-251128"

# fal generate — FAL_KEY
FAL_KEY=*** \
  npx ts-node scripts/clawra-selfie.ts "a cyberpunk city selfie" "#art" "Grok" "1:1" "jpeg" "fal" "generate" "xai/grok-imagine-image"

# fal edit — FAL_KEY + FAL_EDIT_IMAGE_URL
FAL_KEY=*** FAL_EDIT_IMAGE_URL=https://example.com/input.png \
  npx ts-node scripts/clawra-selfie.ts "switch to beach vacation style" "#art" "Grok edit" "1:1" "jpeg" "fal" "edit" "xai/grok-imagine-image/edit"

# hunyuan edit — TENCENT_SECRET_ID + TENCENT_SECRET_KEY
TENCENT_SECRET_ID=*** TENCENT_SECRET_KEY=*** \
  npx ts-node scripts/clawra-selfie.ts "城市夜景自拍" "#general" "Hunyuan" "1:1" "png" "hunyuan" "edit" "aiart/v20221229 SubmitTextToImageJob"

# google generate (pro) — GOOGLE_API_KEY
GOOGLE_API_KEY=*** \
  npx ts-node scripts/clawra-selfie.ts "a cozy cafe selfie" "#photos" "Pro" "1:1" "png" "google" "generate" "gemini-3-pro-image-preview"

# google generate (flash) — GOOGLE_API_KEY
GOOGLE_API_KEY=*** \
  npx ts-node scripts/clawra-selfie.ts "a cat astronaut selfie" "#photos" "Flash" "1:1" "png" "google" "generate" "gemini-2.5-flash-image"
```

## Supported Platforms

OpenClaw supports sending to:

| Platform | Channel Format | Example |
|----------|----------------|---------|
| Discord | `#channel-name` or channel ID | `#general`, `123456789` |
| Telegram | `@username` or chat ID | `@mychannel`, `-100123456` |
| WhatsApp | Phone number (JID format) | `1234567890@s.whatsapp.net` |
| Slack | `#channel-name` | `#random` |
| Signal | Phone number | `+1234567890` |
| MS Teams | Channel reference | (varies) |

## Grok Imagine Edit Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `image_url` | string | required | URL of image to edit (fixed in this skill) |
| `prompt` | string | required | Edit instruction |
| `num_images` | 1-4 | 1 | Number of images to generate |
| `output_format` | enum | "jpeg" | jpeg, png, webp |

## Setup Requirements

### 1. Install SDK dependencies (for Node.js usage)
```bash
npm install @fal-ai/client tencentcloud-sdk-nodejs
```

### 2. Install OpenClaw CLI
```bash
npm install -g openclaw
```

### 3. Configure OpenClaw Gateway
```bash
openclaw config set gateway.mode=local
openclaw doctor --generate-gateway-token
```

### 4. Start OpenClaw Gateway
```bash
openclaw gateway start
```

## Error Handling

- **FAL_KEY missing**: Ensure the API key is set in environment
- **Image edit failed**: Check prompt content and API quota
- **OpenClaw send failed**: Verify gateway is running and channel exists
- **Rate limits**: fal.ai has rate limits; implement retry logic if needed

## Tips

1. **Mirror mode context examples** (outfit focus):
   - "wearing a santa hat"
   - "in a business suit"
   - "wearing a summer dress"
   - "in streetwear fashion"

2. **Direct mode context examples** (location/portrait focus):
   - "a cozy cafe with warm lighting"
   - "a sunny beach at sunset"
   - "a busy city street at night"
   - "a peaceful park in autumn"

3. **Mode selection**: Let auto-detect work, or explicitly specify for control
4. **Batch sending**: Edit once, send to multiple channels
5. **Scheduling**: Combine with OpenClaw scheduler for automated posts
