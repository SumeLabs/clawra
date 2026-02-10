#!/bin/bash
# clawra-selfie-with-banana.sh
# Generate an image with Google Nano Banana Pro (Gemini 3 Pro Image) and send it via OpenClaw
#
# Usage: ./clawra-selfie-with-banana.sh "<prompt>" "<channel>" [options]
#
# Environment variables required:
#   GEMINI_API_KEY - Your Google AI Studio API key
#
# Example:
#   GEMINI_API_KEY=your_key ./clawra-selfie-with-banana.sh "A sunset over mountains" "#art" "Check this out!"

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${CYAN}[STEP]${NC} $1"
}

# Check required environment variables
if [ -z "${GEMINI_API_KEY:-}" ]; then
    log_error "GEMINI_API_KEY environment variable not set"
    echo "Get your API key from: https://aistudio.google.com/apikey"
    exit 1
fi

# Check for jq
if ! command -v jq &> /dev/null; then
    log_error "jq is required but not installed"
    echo "Install with: brew install jq (macOS) or apt install jq (Linux)"
    exit 1
fi

# Check for openclaw
if ! command -v openclaw &> /dev/null; then
    log_warn "openclaw CLI not found - will attempt direct API call"
    USE_CLI=false
else
    USE_CLI=true
fi

# Parse arguments
PROMPT="${1:-}"
CHANNEL="${2:-}"
CAPTION="${3:-Generated with Nano Banana Pro}"
MODE="${4:-auto}"  # auto, mirror, direct
REFERENCE_IMAGE="${5:-}"  # Optional reference image URL

if [ -z "$PROMPT" ] || [ -z "$CHANNEL" ]; then
    cat << 'EOF'
Usage: ./clawra-selfie-with-banana.sh <prompt> <channel> [caption] [mode] [reference_image]

Arguments:
  prompt          - Image description (required)
  channel         - Target channel (required) e.g., #general, @user
  caption         - Message caption (default: 'Generated with Nano Banana Pro')
  mode            - Selfie mode (default: auto) Options: auto, mirror, direct
  reference_image - Reference image URL for editing (optional)

Modes:
  auto   - Auto-detect based on keywords in prompt
  mirror - Full-body mirror selfie (good for outfits)
  direct - Close-up direct selfie (good for portraits)

Environment:
  GEMINI_API_KEY  - Your Google AI Studio API key (required)
                    Get from: https://aistudio.google.com/apikey

Examples:
  # Text-to-image generation
  GEMINI_API_KEY=your_key ./clawra-selfie-with-banana.sh \
    "A cyberpunk city at night" "#art"

  # Clawra selfie with auto-detection
  GEMINI_API_KEY=your_key ./clawra-selfie-with-banana.sh \
    "wearing a red dress at a party" "#selfies"

  # Direct selfie mode with caption
  GEMINI_API_KEY=your_key ./clawra-selfie-with-banana.sh \
    "at a cozy coffee shop" "#updates" "Morning coffee!" "direct"

  # Image editing with reference
  GEMINI_API_KEY=your_key ./clawra-selfie-with-banana.sh \
    "wearing sunglasses and a hat" "#fun" "New look!" "auto" \
    "https://example.com/reference.jpg"

EOF
    exit 1
fi

# Fixed reference image for Clawra
CLAWRA_REFERENCE="https://cdn.jsdelivr.net/gh/SumeLabs/clawra@main/assets/clawra.png"

# Determine the reference image to use
if [ -n "$REFERENCE_IMAGE" ]; then
    USED_REFERENCE="$REFERENCE_IMAGE"
    log_info "Using custom reference image: $REFERENCE_IMAGE"
else
    USED_REFERENCE="$CLAWRA_REFERENCE"
    log_info "Using Clawra default reference image"
fi

# Auto-detect mode based on keywords
if [ "$MODE" = "auto" ]; then
    if echo "$PROMPT" | grep -qiE "outfit|wearing|clothes|dress|suit|fashion|full-body|mirror"; then
        MODE="mirror"
    elif echo "$PROMPT" | grep -qiE "cafe|restaurant|beach|park|city|close-up|portrait|face|eyes|smile"; then
        MODE="direct"
    else
        MODE="mirror"  # default
    fi
    log_info "Auto-detected mode: $MODE"
fi

# Construct the full prompt based on mode
if [ "$MODE" = "direct" ]; then
    FULL_PROMPT="a close-up selfie taken by herself at $PROMPT, direct eye contact with the camera, looking straight into the lens, eyes centered and clearly visible, not a mirror selfie, phone held at arm's length, face fully visible"
else
    FULL_PROMPT="make a pic of this person, but $PROMPT. the person is taking a mirror selfie"
fi

log_step "Generating image with Nano Banana Pro (Gemini 3 Pro Image)..."
log_info "Mode: $MODE"
log_info "Prompt: $FULL_PROMPT"

# Prepare the request payload
# Note: Gemini API uses multimodal content format
REQUEST_PAYLOAD=$(jq -n \
    --arg prompt "$FULL_PROMPT" \
    --arg ref_url "$USED_REFERENCE" \
    '{
        "contents": [{
            "role": "user",
            "parts": [
                {
                    "text": $prompt
                },
                {
                    "inlineData": {
                        "mimeType": "image/jpeg",
                        "data": ""
                    }
                }
            ]
        }],
        "generationConfig": {
            "responseModalities": ["IMAGE"],
            "temperature": 1.0,
            "candidateCount": 1
        }
    }')

# Download reference image and encode to base64
log_info "Downloading reference image..."
TEMP_IMAGE="/tmp/clawra_ref_$$.jpg"
if curl -sL "$USED_REFERENCE" -o "$TEMP_IMAGE"; then
    BASE64_IMAGE=$(base64 < "$TEMP_IMAGE" | tr -d '\n')
    rm -f "$TEMP_IMAGE"
    log_info "Reference image encoded"
else
    log_error "Failed to download reference image"
    exit 1
fi

# Update payload with base64 image
REQUEST_PAYLOAD=$(echo "$REQUEST_PAYLOAD" | jq \
    --arg b64 "$BASE64_IMAGE" \
    '.contents[0].parts[1].inlineData.data = $b64')

# Generate image via Google Gemini API
log_step "Calling Gemini API..."
RESPONSE=$(curl -s -X POST \
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent" \
    -H "x-goog-api-key: $GEMINI_API_KEY" \
    -H "Content-Type: application/json" \
    -d "$REQUEST_PAYLOAD")

# Check for errors in response
if echo "$RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
    ERROR_MSG=$(echo "$RESPONSE" | jq -r '.error.message // .error // "Unknown error"')
    log_error "Image generation failed: $ERROR_MSG"
    echo "Full response: $RESPONSE"
    exit 1
fi

# Extract image data from response
# Gemini returns base64 image in the response
IMAGE_DATA=$(echo "$RESPONSE" | jq -r '.candidates[0].content.parts[] | select(.inlineData) | .inlineData.data' 2>/dev/null)

if [ -z "$IMAGE_DATA" ] || [ "$IMAGE_DATA" = "null" ]; then
    log_error "Failed to extract image data from response"
    echo "Response: $RESPONSE"
    exit 1
fi

log_info "Image generated successfully!"

# Save image temporarily and upload to a hosting service
# (In production, you might want to use a proper image hosting service)
TEMP_OUTPUT="/tmp/clawra_output_$$.png"
echo "$IMAGE_DATA" | base64 -d > "$TEMP_OUTPUT"

log_info "Image saved to: $TEMP_OUTPUT"

# For this example, we'll need to upload the image somewhere
# Let's use a simple approach with fal.ai storage or imgur
log_step "Uploading image..."

# Try to upload to fal.ai storage if FAL_KEY is available
if [ -n "${FAL_KEY:-}" ]; then
    log_info "Uploading to fal.ai storage..."
    
    UPLOAD_RESPONSE=$(curl -s -X POST "https://fal.ai/api/files/upload" \
        -H "Authorization: Key $FAL_KEY" \
        -F "file=@$TEMP_OUTPUT")
    
    IMAGE_URL=$(echo "$UPLOAD_RESPONSE" | jq -r '.url // empty')
    
    if [ -z "$IMAGE_URL" ]; then
        log_warn "Failed to upload to fal.ai, trying alternative..."
    fi
fi

# Fallback: try imgur anonymous upload
if [ -z "${IMAGE_URL:-}" ]; then
    log_info "Uploading to imgur..."
    
    IMGUR_RESPONSE=$(curl -s -X POST "https://api.imgur.com/3/image" \
        -H "Authorization: Client-ID 546c25a59c58ad7" \
        -F "image=@$TEMP_OUTPUT")
    
    IMAGE_URL=$(echo "$IMGUR_RESPONSE" | jq -r '.data.link // empty')
    
    if [ -z "$IMAGE_URL" ]; then
        log_error "Failed to upload image to hosting service"
        log_info "Image saved locally at: $TEMP_OUTPUT"
        echo "You can manually upload and use it."
        exit 1
    fi
fi

log_info "Image URL: $IMAGE_URL"

# Clean up temp file
rm -f "$TEMP_OUTPUT"

# Send via OpenClaw
log_step "Sending to channel: $CHANNEL"

if [ "$USE_CLI" = true ]; then
    # Use OpenClaw CLI
    openclaw message send \
        --action send \
        --channel "$CHANNEL" \
        --message "$CAPTION" \
        --media "$IMAGE_URL"
else
    # Direct API call to local gateway
    GATEWAY_URL="${OPENCLAW_GATEWAY_URL:-http://localhost:18789}"
    GATEWAY_TOKEN="${OPENCLAW_GATEWAY_TOKEN:-}"

    curl -s -X POST "$GATEWAY_URL/message" \
        -H "Content-Type: application/json" \
        ${GATEWAY_TOKEN:+-H "Authorization: Bearer $GATEWAY_TOKEN"} \
        -d "{
            \"action\": \"send\",
            \"channel\": \"$CHANNEL\",
            \"message\": \"$CAPTION\",
            \"media\": \"$IMAGE_URL\"
        }"
fi

log_info "Done! Image sent to $CHANNEL"

# Output JSON for programmatic use
echo ""
echo "--- Result ---"
jq -n \
    --arg url "$IMAGE_URL" \
    --arg channel "$CHANNEL" \
    --arg prompt "$FULL_PROMPT" \
    --arg mode "$MODE" \
    '{
        success: true,
        image_url: $url,
        channel: $channel,
        prompt: $prompt,
        mode: $mode,
        model: "nano-banana-pro"
    }'
