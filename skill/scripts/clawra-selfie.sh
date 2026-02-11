#!/bin/bash
# clawra-selfie.sh
# Generate an image with multiple AI providers and send it via OpenClaw
#
# Supported providers (set via IMAGE_PROVIDER env var):
#   fal    - fal.ai / Grok Imagine    (requires FAL_KEY)
#   openai - OpenAI gpt-image-1       (requires OPENAI_API_KEY)
#   google - Google Gemini             (requires GEMINI_API_KEY)
#   xai    - x.ai direct              (requires XAI_API_KEY)
#
# Usage: ./clawra-selfie.sh "<prompt>" "<channel>" ["<caption>"] [aspect_ratio] [output_format]
#
# Example:
#   FAL_KEY=your_key ./clawra-selfie.sh "A sunset over mountains" "#art" "Check this out!"
#   IMAGE_PROVIDER=openai OPENAI_API_KEY=xxx ./clawra-selfie.sh "A sunset" "#art"

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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
CAPTION="${3:-Generated with Clawra}"
ASPECT_RATIO="${4:-1:1}"
OUTPUT_FORMAT="${5:-jpeg}"
PROVIDER="${IMAGE_PROVIDER:-fal}"

if [ -z "$PROMPT" ] || [ -z "$CHANNEL" ]; then
    echo "Usage: $0 <prompt> <channel> [caption] [aspect_ratio] [output_format]"
    echo ""
    echo "Arguments:"
    echo "  prompt        - Image description (required)"
    echo "  channel       - Target channel (required) e.g., #general, @user"
    echo "  caption       - Message caption (default: 'Generated with Clawra')"
    echo "  aspect_ratio  - Image ratio (default: 1:1) Options: 2:1, 16:9, 4:3, 1:1, 3:4, 9:16"
    echo "  output_format - Image format (default: jpeg) Options: jpeg, png, webp"
    echo ""
    echo "Environment:"
    echo "  IMAGE_PROVIDER   - Provider to use (default: fal)"
    echo "                     Options: fal, openai, google, xai"
    echo "  FAL_KEY          - Required for provider: fal"
    echo "  OPENAI_API_KEY   - Required for provider: openai"
    echo "  GEMINI_API_KEY   - Required for provider: google"
    echo "  XAI_API_KEY      - Required for provider: xai"
    echo ""
    echo "Example:"
    echo "  $0 \"A cyberpunk city at night\" \"#art-gallery\" \"AI Art!\""
    echo "  IMAGE_PROVIDER=openai $0 \"A sunset\" \"#photos\""
    exit 1
fi

log_info "Provider: $PROVIDER"
log_info "Generating image..."
log_info "Prompt: $PROMPT"
log_info "Aspect ratio: $ASPECT_RATIO"

# ============================================================================
# Provider: fal.ai (Grok Imagine)
# ============================================================================
generate_fal() {
    if [ -z "${FAL_KEY:-}" ]; then
        log_error "FAL_KEY environment variable not set"
        echo "Get your API key from: https://fal.ai/dashboard/keys"
        exit 1
    fi

    RESPONSE=$(curl -s -X POST "https://fal.run/xai/grok-imagine-image" \
        -H "Authorization: Key $FAL_KEY" \
        -H "Content-Type: application/json" \
        -d "{
            \"prompt\": $(echo "$PROMPT" | jq -Rs .),
            \"num_images\": 1,
            \"aspect_ratio\": \"$ASPECT_RATIO\",
            \"output_format\": \"$OUTPUT_FORMAT\"
        }")

    # Check for error (ensure it's not null/empty)
    ERROR_VAL=$(echo "$RESPONSE" | jq -r '.error // .detail // empty')
    if [ -n "$ERROR_VAL" ]; then
        log_error "fal.ai image generation failed: $ERROR_VAL"
        exit 1
    fi

    # Try multiple response paths: images[0].url, data[0].url
    IMAGE_URL=$(echo "$RESPONSE" | jq -r '.images[0].url // .data[0].url // empty')
    REVISED_PROMPT=$(echo "$RESPONSE" | jq -r '.revised_prompt // empty')

    if [ -z "$IMAGE_URL" ]; then
        log_warn "Could not extract image URL from fal.ai response"
        log_warn "Response: $(echo "$RESPONSE" | head -c 500)"
    fi
}

# ============================================================================
# Provider: OpenAI (gpt-image-1)
# ============================================================================
generate_openai() {
    if [ -z "${OPENAI_API_KEY:-}" ]; then
        log_error "OPENAI_API_KEY environment variable not set"
        echo "Get your API key from: https://platform.openai.com/api-keys"
        exit 1
    fi

    # Map aspect ratio to OpenAI size
    case "$ASPECT_RATIO" in
        16:9|2:1|20:9|19.5:9|3:2) SIZE="1536x1024" ;;
        9:16|1:2|9:19.5|9:20|2:3|3:4) SIZE="1024x1536" ;;
        *) SIZE="1024x1024" ;;
    esac

    RESPONSE=$(curl -s -X POST "https://api.openai.com/v1/images/generations" \
        -H "Authorization: Bearer $OPENAI_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{
            \"model\": \"gpt-image-1\",
            \"prompt\": $(echo "$PROMPT" | jq -Rs .),
            \"n\": 1,
            \"size\": \"$SIZE\"
        }")

    if echo "$RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
        ERROR_MSG=$(echo "$RESPONSE" | jq -r '.error.message // .error // "Unknown error"')
        log_error "OpenAI image generation failed: $ERROR_MSG"
        exit 1
    fi

    # OpenAI gpt-image-1 returns base64 – save to temp file
    B64_DATA=$(echo "$RESPONSE" | jq -r '.data[0].b64_json // empty')
    URL_DATA=$(echo "$RESPONSE" | jq -r '.data[0].url // empty')

    if [ -n "$URL_DATA" ]; then
        IMAGE_URL="$URL_DATA"
    elif [ -n "$B64_DATA" ]; then
        TMPFILE=$(mktemp /tmp/clawra-openai-XXXXXX."$OUTPUT_FORMAT")
        echo "$B64_DATA" | base64 -d > "$TMPFILE"
        IMAGE_URL="$TMPFILE"
        log_info "Saved to temp file: $TMPFILE"
    else
        log_error "OpenAI response contained neither url nor b64_json"
        echo "Response: $RESPONSE"
        exit 1
    fi

    REVISED_PROMPT=$(echo "$RESPONSE" | jq -r '.data[0].revised_prompt // empty')
}

# ============================================================================
# Provider: Google Gemini (gemini-2.5-flash-image)
# ============================================================================
generate_google() {
    if [ -z "${GEMINI_API_KEY:-}" ]; then
        log_error "GEMINI_API_KEY environment variable not set"
        echo "Get your API key from: https://aistudio.google.com/apikey"
        exit 1
    fi

    local MODEL="gemini-2.5-flash-image"

    RESPONSE=$(curl -s -X POST \
        "https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}" \
        -H "Content-Type: application/json" \
        -d "{
            \"contents\": [{
                \"parts\": [{\"text\": $(echo "$PROMPT" | jq -Rs .)}]
            }],
            \"generationConfig\": {
                \"responseModalities\": [\"IMAGE\"]
            }
        }")

    if echo "$RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
        ERROR_MSG=$(echo "$RESPONSE" | jq -r '.error.message // .error // "Unknown error"')
        log_error "Google Gemini image generation failed: $ERROR_MSG"
        exit 1
    fi

    # Extract base64 image data from Gemini response
    B64_DATA=$(echo "$RESPONSE" | jq -r '.candidates[0].content.parts[] | select(.inlineData) | .inlineData.data // empty' | head -1)

    if [ -z "$B64_DATA" ]; then
        log_error "Google Gemini returned no image data"
        echo "Response: $RESPONSE"
        exit 1
    fi

    TMPFILE=$(mktemp /tmp/clawra-gemini-XXXXXX."$OUTPUT_FORMAT")
    echo "$B64_DATA" | base64 -d > "$TMPFILE"
    IMAGE_URL="$TMPFILE"
    log_info "Saved to temp file: $TMPFILE"

    REVISED_PROMPT=""
}

# ============================================================================
# Provider: x.ai direct (grok-imagine-image)
# ============================================================================
generate_xai() {
    if [ -z "${XAI_API_KEY:-}" ]; then
        log_error "XAI_API_KEY environment variable not set"
        echo "Get your API key from: https://console.x.ai"
        exit 1
    fi

    RESPONSE=$(curl -s -X POST "https://api.x.ai/v1/images/generations" \
        -H "Authorization: Bearer $XAI_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{
            \"model\": \"grok-imagine-image\",
            \"prompt\": $(echo "$PROMPT" | jq -Rs .),
            \"n\": 1
        }")

    if echo "$RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
        ERROR_MSG=$(echo "$RESPONSE" | jq -r '.error.message // .error // "Unknown error"')
        log_error "x.ai image generation failed: $ERROR_MSG"
        exit 1
    fi

    IMAGE_URL=$(echo "$RESPONSE" | jq -r '.data[0].url // empty')
    REVISED_PROMPT=""
}

# ============================================================================
# Route to the correct provider
# ============================================================================
IMAGE_URL=""
REVISED_PROMPT=""

case "$PROVIDER" in
    fal)    generate_fal ;;
    openai) generate_openai ;;
    google) generate_google ;;
    xai)    generate_xai ;;
    *)
        log_error "Unknown provider: $PROVIDER"
        echo "Supported providers: fal, openai, google, xai"
        exit 1
        ;;
esac

# Validate result
if [ -z "$IMAGE_URL" ]; then
    log_error "Failed to extract image URL from response"
    exit 1
fi

log_info "Image generated successfully!"
log_info "URL: $IMAGE_URL"

if [ -n "$REVISED_PROMPT" ]; then
    log_info "Revised prompt: $REVISED_PROMPT"
fi

# Send via OpenClaw
log_info "Sending to channel: $CHANNEL"

if [ "$USE_CLI" = true ]; then
    openclaw message send \
        --action send \
        --channel "$CHANNEL" \
        --message "$CAPTION" \
        --media "$IMAGE_URL"
else
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
    --arg prompt "$PROMPT" \
    --arg provider "$PROVIDER" \
    '{
        success: true,
        image_url: $url,
        channel: $channel,
        prompt: $prompt,
        provider: $provider
    }'
