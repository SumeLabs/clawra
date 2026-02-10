---
name: clawra-selfie
description: Edit Clawra's reference image with Grok Imagine or Nano Banana Pro and send selfies to messaging channels via OpenClaw
allowed-tools: Bash(npm:*) Bash(npx:*) Bash(openclaw:*) Bash(curl:*) Read Write WebFetch
---

# Clawra Selfie

Edit a fixed reference image using xAI's Grok Imagine (primary) or Google's Nano Banana Pro (fallback) and distribute it across messaging platforms (WhatsApp, Telegram, Discord, Slack, etc.) via OpenClaw.

## Supported Models

1. **Grok Imagine (Primary)**: xAI Aurora via fal.ai - Fast, high-quality image editing
2. **Nano Banana Pro (Fallback)**: Google Gemini 3 Pro Image - Used when FAL_KEY is unavailable or fails

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

### Environment Variables (Priority Order)

```bash
# Primary: Grok Imagine (xAI via fal.ai)
FAL_KEY=your_fal_api_key          # Get from https://fal.ai/dashboard/keys

# Fallback: Nano Banana Pro (Google Gemini)
GEMINI_API_KEY=your_gemini_key    # Get from https://aistudio.google.com/apikey

# OpenClaw (Required)
OPENCLAW_GATEWAY_TOKEN=your_token  # From: openclaw doctor --generate-gateway-token
```

**Fallback Logic:**
- If `FAL_KEY` is set and valid → Use Grok Imagine
- If `FAL_KEY` is missing or fails → Use Nano Banana Pro (requires `GEMINI_API_KEY`)
- If both fail → Return error

### Workflow

1. **Get user prompt** for how to edit the image
2. **Choose model**:
   - Try Grok Imagine (if FAL_KEY available)
   - Fallback to Nano Banana Pro (if GEMINI_API_KEY available)
3. **Edit image** via selected model with fixed reference
4. **Extract/upload image** (Gemini returns base64, needs upload)
5. **Send to OpenClaw** with target channel(s)

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

### Step 2: Edit Image (Multi-Model Support)

#### Option A: Grok Imagine (Primary)

Use the fal.ai API to edit the reference image:

```bash
REFERENCE_IMAGE="https://cdn.jsdelivr.net/gh/SumeLabs/clawra@main/assets/clawra.png"

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

#### Option B: Nano Banana Pro (Fallback)

Use Google Gemini API when fal.ai is unavailable:

```bash
REFERENCE_IMAGE="https://cdn.jsdelivr.net/gh/SumeLabs/clawra@main/assets/clawra.png"

# Download and encode reference image
TEMP_IMAGE="/tmp/clawra_ref.jpg"
curl -sL "$REFERENCE_IMAGE" -o "$TEMP_IMAGE"
BASE64_IMAGE=$(base64 < "$TEMP_IMAGE" | tr -d '\n')

# Build request payload
REQUEST_PAYLOAD=$(jq -n \
  --arg prompt "$PROMPT" \
  --arg b64 "$BASE64_IMAGE" \
  '{
    "contents": [{
      "role": "user",
      "parts": [
        {"text": $prompt},
        {"inlineData": {"mimeType": "image/jpeg", "data": $b64}}
      ]
    }],
    "generationConfig": {
      "responseModalities": ["IMAGE"],
      "temperature": 1.0
    }
  }')

# Call Gemini API
RESPONSE=$(curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$REQUEST_PAYLOAD")

# Extract base64 image data
IMAGE_DATA=$(echo "$RESPONSE" | jq -r '.candidates[0].content.parts[] | select(.inlineData) | .inlineData.data')

# Save and upload (since Gemini returns base64)
echo "$IMAGE_DATA" | base64 -d > "/tmp/clawra_output.png"

# Upload to image hosting (imgur or fal.ai storage)
if [ -n "${FAL_KEY:-}" ]; then
  # Upload to fal.ai
  UPLOAD_RESPONSE=$(curl -s -X POST "https://fal.ai/api/files/upload" \
    -H "Authorization: Key $FAL_KEY" \
    -F "file=@/tmp/clawra_output.png")
  IMAGE_URL=$(echo "$UPLOAD_RESPONSE" | jq -r '.url')
else
  # Upload to imgur
  IMGUR_RESPONSE=$(curl -s -X POST "https://api.imgur.com/3/image" \
    -H "Authorization: Client-ID 546c25a59c58ad7" \
    -F "image=@/tmp/clawra_output.png")
  IMAGE_URL=$(echo "$IMGUR_RESPONSE" | jq -r '.data.link')
fi
```

**Response Format:**
```json
{
  "candidates": [{
    "content": {
      "parts": [{
        "inlineData": {
          "mimeType": "image/png",
          "data": "base64_encoded_image_data..."
        }
      }]
    }
  }]
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

## Complete Script Example (With Fallback)

```bash
#!/bin/bash
# clawra-selfie-multi-model.sh
# Supports both Grok Imagine and Nano Banana Pro

# Check for at least one API key
if [ -z "${FAL_KEY:-}" ] && [ -z "${GEMINI_API_KEY:-}" ]; then
  echo "Error: Neither FAL_KEY nor GEMINI_API_KEY is set"
  echo "Set at least one:"
  echo "  - FAL_KEY from https://fal.ai/dashboard/keys"
  echo "  - GEMINI_API_KEY from https://aistudio.google.com/apikey"
  exit 1
fi

# Determine which model to use
if [ -n "${FAL_KEY:-}" ]; then
  MODEL="grok-imagine"
  echo "Using primary model: Grok Imagine (xAI)"
else
  MODEL="nano-banana-pro"
  echo "Using fallback model: Nano Banana Pro (Google Gemini)"
fi

# Fixed reference image
REFERENCE_IMAGE="https://cdn.jsdelivr.net/gh/SumeLabs/clawra@main/assets/clawra.png"

USER_CONTEXT="$1"
CHANNEL="$2"
MODE="${3:-auto}"  # mirror, direct, or auto
CAPTION="${4:-Edited with Grok Imagine}"

if [ -z "$USER_CONTEXT" ] || [ -z "$CHANNEL" ]; then
  echo "Usage: $0 <user_context> <channel> [mode] [caption]"
  echo "Modes: mirror, direct, auto (default)"
  echo "Example: $0 'wearing a cowboy hat' '#general' mirror"
  echo "Example: $0 'a cozy cafe' '#general' direct"
  exit 1
fi

# Auto-detect mode based on keywords
if [ "$MODE" == "auto" ]; then
  if echo "$USER_CONTEXT" | grep -qiE "outfit|wearing|clothes|dress|suit|fashion|full-body|mirror"; then
    MODE="mirror"
  elif echo "$USER_CONTEXT" | grep -qiE "cafe|restaurant|beach|park|city|close-up|portrait|face|eyes|smile"; then
    MODE="direct"
  else
    MODE="mirror"  # default
  fi
  echo "Auto-detected mode: $MODE"
fi

# Construct the prompt based on mode
if [ "$MODE" == "direct" ]; then
  EDIT_PROMPT="a close-up selfie taken by herself at $USER_CONTEXT, direct eye contact with the camera, looking straight into the lens, eyes centered and clearly visible, not a mirror selfie, phone held at arm's length, face fully visible"
else
  EDIT_PROMPT="make a pic of this person, but $USER_CONTEXT. the person is taking a mirror selfie"
fi

echo "Mode: $MODE"
echo "Model: $MODEL"
echo "Editing reference image with prompt: $EDIT_PROMPT"

# Edit image based on selected model
if [ "$MODEL" == "grok-imagine" ]; then
  # Grok Imagine via fal.ai
  JSON_PAYLOAD=$(jq -n \
    --arg image_url "$REFERENCE_IMAGE" \
    --arg prompt "$EDIT_PROMPT" \
    '{image_url: $image_url, prompt: $prompt, num_images: 1, output_format: "jpeg"}')

  RESPONSE=$(curl -s -X POST "https://fal.run/xai/grok-imagine-image/edit" \
    -H "Authorization: Key $FAL_KEY" \
    -H "Content-Type: application/json" \
    -d "$JSON_PAYLOAD")

  # Extract image URL directly
  IMAGE_URL=$(echo "$RESPONSE" | jq -r '.images[0].url')

  if [ "$IMAGE_URL" == "null" ] || [ -z "$IMAGE_URL" ]; then
    echo "Error: Grok Imagine failed, trying fallback..."
    if [ -n "${GEMINI_API_KEY:-}" ]; then
      MODEL="nano-banana-pro"
      echo "Switching to Nano Banana Pro"
    else
      echo "Response: $RESPONSE"
      exit 1
    fi
  fi
fi

if [ "$MODEL" == "nano-banana-pro" ]; then
  # Nano Banana Pro via Google Gemini
  # Download reference image
  TEMP_REF="/tmp/clawra_ref_$$.jpg"
  curl -sL "$REFERENCE_IMAGE" -o "$TEMP_REF"
  BASE64_IMAGE=$(base64 < "$TEMP_REF" | tr -d '\n')
  rm -f "$TEMP_REF"

  # Build Gemini request
  GEMINI_PAYLOAD=$(jq -n \
    --arg prompt "$EDIT_PROMPT" \
    --arg b64 "$BASE64_IMAGE" \
    '{
      "contents": [{
        "role": "user",
        "parts": [
          {"text": $prompt},
          {"inlineData": {"mimeType": "image/jpeg", "data": $b64}}
        ]
      }],
      "generationConfig": {
        "responseModalities": ["IMAGE"],
        "temperature": 1.0
      }
    }')

  RESPONSE=$(curl -s -X POST \
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent" \
    -H "x-goog-api-key: $GEMINI_API_KEY" \
    -H "Content-Type: application/json" \
    -d "$GEMINI_PAYLOAD")

  # Extract base64 image
  IMAGE_DATA=$(echo "$RESPONSE" | jq -r '.candidates[0].content.parts[] | select(.inlineData) | .inlineData.data')

  if [ -z "$IMAGE_DATA" ] || [ "$IMAGE_DATA" == "null" ]; then
    echo "Error: Nano Banana Pro failed"
    echo "Response: $RESPONSE"
    exit 1
  fi

  # Save image
  TEMP_OUTPUT="/tmp/clawra_output_$$.png"
  echo "$IMAGE_DATA" | base64 -d > "$TEMP_OUTPUT"

  # Upload to image hosting
  if [ -n "${FAL_KEY:-}" ]; then
    echo "Uploading to fal.ai storage..."
    UPLOAD_RESPONSE=$(curl -s -X POST "https://fal.ai/api/files/upload" \
      -H "Authorization: Key $FAL_KEY" \
      -F "file=@$TEMP_OUTPUT")
    IMAGE_URL=$(echo "$UPLOAD_RESPONSE" | jq -r '.url // empty')
  fi

  if [ -z "${IMAGE_URL:-}" ]; then
    echo "Uploading to imgur..."
    IMGUR_RESPONSE=$(curl -s -X POST "https://api.imgur.com/3/image" \
      -H "Authorization: Client-ID 546c25a59c58ad7" \
      -F "image=@$TEMP_OUTPUT")
    IMAGE_URL=$(echo "$IMGUR_RESPONSE" | jq -r '.data.link // empty')
  fi

  rm -f "$TEMP_OUTPUT"

  if [ -z "$IMAGE_URL" ]; then
    echo "Error: Failed to upload image"
    exit 1
  fi
fi

echo "Image edited: $IMAGE_URL"
echo "Sending to channel: $CHANNEL"

# Send via OpenClaw
openclaw message send \
  --action send \
  --channel "$CHANNEL" \
  --message "$CAPTION" \
  --media "$IMAGE_URL"

echo "Done!"
```

## Node.js/TypeScript Implementation

```typescript
import { fal } from "@fal-ai/client";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const REFERENCE_IMAGE = "https://cdn.jsdelivr.net/gh/SumeLabs/clawra@main/assets/clawra.png";

interface GrokImagineResult {
  images: Array<{
    url: string;
    content_type: string;
    width: number;
    height: number;
  }>;
  revised_prompt?: string;
}

type SelfieMode = "mirror" | "direct" | "auto";

function detectMode(userContext: string): "mirror" | "direct" {
  const mirrorKeywords = /outfit|wearing|clothes|dress|suit|fashion|full-body|mirror/i;
  const directKeywords = /cafe|restaurant|beach|park|city|close-up|portrait|face|eyes|smile/i;

  if (directKeywords.test(userContext)) return "direct";
  if (mirrorKeywords.test(userContext)) return "mirror";
  return "mirror"; // default
}

function buildPrompt(userContext: string, mode: "mirror" | "direct"): string {
  if (mode === "direct") {
    return `a close-up selfie taken by herself at ${userContext}, direct eye contact with the camera, looking straight into the lens, eyes centered and clearly visible, not a mirror selfie, phone held at arm's length, face fully visible`;
  }
  return `make a pic of this person, but ${userContext}. the person is taking a mirror selfie`;
}

async function editAndSend(
  userContext: string,
  channel: string,
  mode: SelfieMode = "auto",
  caption?: string
): Promise<string> {
  // Configure fal.ai client
  fal.config({
    credentials: process.env.FAL_KEY!
  });

  // Determine mode
  const actualMode = mode === "auto" ? detectMode(userContext) : mode;
  console.log(`Mode: ${actualMode}`);

  // Construct the prompt
  const editPrompt = buildPrompt(userContext, actualMode);

  // Edit reference image with Grok Imagine
  console.log(`Editing image: "${editPrompt}"`);

  const result = await fal.subscribe("xai/grok-imagine-image/edit", {
    input: {
      image_url: REFERENCE_IMAGE,
      prompt: editPrompt,
      num_images: 1,
      output_format: "jpeg"
    }
  }) as { data: GrokImagineResult };

  const imageUrl = result.data.images[0].url;
  console.log(`Edited image URL: ${imageUrl}`);

  // Send via OpenClaw
  const messageCaption = caption || `Edited with Grok Imagine`;

  await execAsync(
    `openclaw message send --action send --channel "${channel}" --message "${messageCaption}" --media "${imageUrl}"`
  );

  console.log(`Sent to ${channel}`);
  return imageUrl;
}

// Usage Examples

// Mirror mode (auto-detected from "wearing")
editAndSend(
  "wearing a cyberpunk outfit with neon lights",
  "#art-gallery",
  "auto",
  "Check out this AI-edited art!"
);
// → Mode: mirror
// → Prompt: "make a pic of this person, but wearing a cyberpunk outfit with neon lights. the person is taking a mirror selfie"

// Direct mode (auto-detected from "cafe")
editAndSend(
  "a cozy cafe with warm lighting",
  "#photography",
  "auto"
);
// → Mode: direct
// → Prompt: "a close-up selfie taken by herself at a cozy cafe with warm lighting, direct eye contact..."

// Explicit mode override
editAndSend("casual street style", "#fashion", "direct");
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

### 1. Install fal.ai client (for Node.js usage)
```bash
npm install @fal-ai/client
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

### API Key Issues
- **No API keys**: Set either `FAL_KEY` or `GEMINI_API_KEY`
- **FAL_KEY missing**: Will automatically fallback to Nano Banana Pro
- **Both keys invalid**: Check key validity and API quotas

### Model-Specific Issues
- **Grok Imagine failed**: Automatically retries with Nano Banana Pro if `GEMINI_API_KEY` is available
- **Nano Banana Pro failed**: Check Gemini API quota and rate limits
- **Image upload failed**: For Gemini, ensure image hosting (imgur/fal.ai) is accessible

### OpenClaw Issues
- **OpenClaw send failed**: Verify gateway is running and channel exists
- **Gateway token missing**: Run `openclaw doctor --generate-gateway-token`

### Rate Limits
- **fal.ai**: Has rate limits; implement retry logic if needed
- **Gemini**: Has daily quota limits; monitor usage at https://aistudio.google.com
- **imgur**: Anonymous uploads have hourly limits

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
