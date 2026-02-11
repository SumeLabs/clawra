---
name: clawra-selfie
description: Generate and edit images using multiple AI providers (fal.ai, OpenAI, Google Gemini, x.ai) and send selfies to messaging channels via OpenClaw
allowed-tools: Bash(npm:*) Bash(npx:*) Bash(openclaw:*) Bash(curl:*) Read Write WebFetch
---

# Clawra Selfie

Generate and edit images using multiple AI providers and distribute them across messaging platforms (WhatsApp, Telegram, Discord, Slack, etc.) via OpenClaw.

## Supported Providers

| Provider | Model | Env Variable | API Key URL |
|----------|-------|-------------|-------------|
| **fal** (default) | Grok Imagine (via fal.ai) | `FAL_KEY` | https://fal.ai/dashboard/keys |
| **openai** | gpt-image-1 | `OPENAI_API_KEY` | https://platform.openai.com/api-keys |
| **google** | gemini-2.5-flash-image | `GEMINI_API_KEY` | https://aistudio.google.com/apikey |
| **xai** | grok-imagine-image (direct) | `XAI_API_KEY` | https://console.x.ai |

Set the provider via the `IMAGE_PROVIDER` environment variable (default: `fal`).

## Reference Image

The skill uses a fixed reference image hosted on jsDelivr CDN:

```
https://cdn.jsdelivr.net/gh/SumeLabs/clawra@main/assets/clawra.png
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
# Pick ONE provider and set its API key:
IMAGE_PROVIDER=fal               # Options: fal, openai, google, xai (default: fal)

FAL_KEY=your_fal_api_key          # For provider: fal
OPENAI_API_KEY=your_openai_key    # For provider: openai
GEMINI_API_KEY=your_gemini_key    # For provider: google
XAI_API_KEY=your_xai_key          # For provider: xai

OPENCLAW_GATEWAY_TOKEN=your_token  # From: openclaw doctor --generate-gateway-token
```

### Workflow

1. **Get user prompt** for how to edit the image
2. **Select provider** (from env var or default)
3. **Generate/edit image** via selected provider
4. **Extract image URL** from response
5. **Send to OpenClaw** with target channel(s)

## Step-by-Step Instructions

### Step 1: Collect User Input

Ask the user for:
- **User context**: What should the person in the image be doing/wearing/where?
- **Mode** (optional): `mirror` or `direct` selfie style
- **Target channel(s)**: Where should it be sent? (e.g., `#general`, `@username`, channel ID)
- **Platform** (optional): Which platform? (discord, telegram, whatsapp, slack)
- **Provider** (optional): Which image provider to use?

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

### Step 2: Generate/Edit Image

#### Provider: fal.ai (default)

```bash
REFERENCE_IMAGE="https://cdn.jsdelivr.net/gh/SumeLabs/clawra@main/assets/clawra.png"

JSON_PAYLOAD=$(jq -n \
  --arg image_url "$REFERENCE_IMAGE" \
  --arg prompt "$PROMPT" \
  '{image_url: $image_url, prompt: $prompt, num_images: 1, output_format: "jpeg"}')

curl -X POST "https://fal.run/xai/grok-imagine-image/edit" \
  -H "Authorization: Key $FAL_KEY" \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD"
```

**Response:**
```json
{
  "images": [{ "url": "https://v3b.fal.media/files/...", "width": 1024, "height": 1024 }],
  "revised_prompt": "Enhanced prompt text..."
}
```

#### Provider: OpenAI

```bash
curl -X POST "https://api.openai.com/v1/images/generations" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-image-1",
    "prompt": "A cute cat wearing a hat",
    "n": 1,
    "size": "1024x1024"
  }'
```

**Response:**
```json
{
  "data": [{ "b64_json": "..." }]
}
```

> Note: OpenAI gpt-image-1 returns base64-encoded images. Save the `b64_json` field to a file.

#### Provider: Google Gemini

```bash
curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=$GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{"parts": [{"text": "A cute cat wearing a hat"}]}],
    "generationConfig": {"responseModalities": ["IMAGE"]}
  }'
```

**Response:**
```json
{
  "candidates": [{
    "content": {
      "parts": [{ "inlineData": { "mimeType": "image/png", "data": "<BASE64>" } }]
    }
  }]
}
```

> Note: Google Gemini returns base64 inline data. Decode the `data` field and save to a file.

For image editing with Gemini, include the reference image as an `inlineData` part:
```bash
curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=$GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"contents\": [{
      \"parts\": [
        {\"text\": \"Edit this person to be wearing a santa hat\"},
        {\"inlineData\": {\"mimeType\": \"image/jpeg\", \"data\": \"<BASE64_IMAGE_DATA>\"}}
      ]
    }],
    \"generationConfig\": {\"responseModalities\": [\"IMAGE\"]}
  }"
```

#### Provider: x.ai (direct)

```bash
curl -X POST "https://api.x.ai/v1/images/generations" \
  -H "Authorization: Bearer $XAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "grok-imagine-image",
    "prompt": "A cute cat wearing a hat",
    "n": 1
  }'
```

For image editing, add `image_url`:
```bash
curl -X POST "https://api.x.ai/v1/images/generations" \
  -H "Authorization: Bearer $XAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "grok-imagine-image",
    "prompt": "Edit this to wear a santa hat",
    "n": 1,
    "image_url": "https://example.com/photo.jpg"
  }'
```

**Response:**
```json
{
  "data": [{ "url": "https://..." }]
}
```

### Step 3: Send Image via OpenClaw

Use the OpenClaw messaging API to send the generated image:

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

## Complete Script Example

```bash
#!/bin/bash
# Multi-provider image generation and send

PROVIDER="${IMAGE_PROVIDER:-fal}"
USER_CONTEXT="$1"
CHANNEL="$2"
CAPTION="${3:-Generated with Clawra}"

# Route to provider
case "$PROVIDER" in
  fal)
    curl -s -X POST "https://fal.run/xai/grok-imagine-image" \
      -H "Authorization: Key $FAL_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"prompt\": \"$USER_CONTEXT\", \"num_images\": 1}"
    ;;
  openai)
    curl -s -X POST "https://api.openai.com/v1/images/generations" \
      -H "Authorization: Bearer $OPENAI_API_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"model\": \"gpt-image-1\", \"prompt\": \"$USER_CONTEXT\", \"n\": 1, \"size\": \"1024x1024\"}"
    ;;
  google)
    curl -s -X POST \
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=$GEMINI_API_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"contents\": [{\"parts\": [{\"text\": \"$USER_CONTEXT\"}]}], \"generationConfig\": {\"responseModalities\": [\"IMAGE\"]}}"
    ;;
  xai)
    curl -s -X POST "https://api.x.ai/v1/images/generations" \
      -H "Authorization: Bearer $XAI_API_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"model\": \"grok-imagine-image\", \"prompt\": \"$USER_CONTEXT\", \"n\": 1}"
    ;;
esac
```

For the full implementation with error handling, mode detection, and OpenClaw integration, see the scripts in `scripts/clawra-selfie.sh` or `scripts/clawra-selfie.ts`.

## Node.js/TypeScript Implementation

```typescript
import { getProvider } from "./providers";

// Generate image with any provider
const provider = getProvider("openai"); // or "fal", "google", "xai"
const result = await provider.generateImage({
  prompt: "A sunset over the ocean",
  numImages: 1,
  aspectRatio: "16:9",
  outputFormat: "jpeg",
});

console.log(result.images[0].url);

// Edit image (fal, google, xai support editing)
if (provider.editImage) {
  const edited = await provider.editImage({
    imageUrl: "https://example.com/photo.jpg",
    prompt: "Add a santa hat",
    numImages: 1,
  });
  console.log(edited.images[0].url);
}
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

## Provider-Specific Parameters

### fal.ai (Grok Imagine)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `image_url` | string | - | URL of image to edit |
| `prompt` | string | required | Generation/edit instruction |
| `num_images` | 1-4 | 1 | Number of images to generate |
| `aspect_ratio` | enum | "1:1" | 2:1, 16:9, 4:3, 1:1, 3:4, 9:16 |
| `output_format` | enum | "jpeg" | jpeg, png, webp |

### OpenAI (gpt-image-1)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `model` | string | "gpt-image-1" | Model to use |
| `prompt` | string | required | Image description |
| `n` | 1-10 | 1 | Number of images |
| `size` | enum | "1024x1024" | 1024x1024, 1536x1024, 1024x1536 |
| `output_format` | enum | "png" | png, jpeg, webp |

### Google Gemini

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `contents` | array | required | Prompt parts (text + optional image) |
| `responseModalities` | array | ["IMAGE"] | Must include "IMAGE" |
| `imageMimeType` | string | - | Output mime type |

### x.ai (Grok Imagine Direct)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `model` | string | "grok-imagine-image" | Model to use |
| `prompt` | string | required | Image description |
| `n` | number | 1 | Number of images |
| `image_url` | string | - | Source image for editing |
| `aspect_ratio` | enum | - | 1:1, 16:9, 9:16, etc. |

## Setup Requirements

### 1. Install dependencies (for Node.js usage)
```bash
npm install @fal-ai/client  # only needed for fal provider
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

- **API key missing**: Ensure the correct key is set for your chosen provider
- **Image generation failed**: Check prompt content and API quota
- **OpenClaw send failed**: Verify gateway is running and channel exists
- **Base64 responses**: OpenAI and Google return base64 data; scripts auto-save to temp files
- **Rate limits**: Each provider has its own rate limits; implement retry logic if needed

## Tips

1. **Mirror mode context examples** (outfit focus):
   - "wearing a santa hat"
   - "in a business suit"
   - "wearing a summer dress"

2. **Direct mode context examples** (location/portrait focus):
   - "a cozy cafe with warm lighting"
   - "a sunny beach at sunset"
   - "a busy city street at night"

3. **Provider selection**:
   - Use `fal` for quick Grok Imagine access via fal.ai proxy
   - Use `openai` for GPT-image-1's strong prompt following
   - Use `google` for Gemini's integrated image generation
   - Use `xai` for direct x.ai access without fal.ai proxy

4. **Mode selection**: Let auto-detect work, or explicitly specify for control
5. **Batch sending**: Generate once, send to multiple channels
6. **Scheduling**: Combine with OpenClaw scheduler for automated posts
