#!/bin/bash
# clawra-selfie.sh
# Generate an image with a configurable provider and send it via OpenClaw.
#
# Supported providers:
#   grok    - xAI Grok Imagine via fal.ai (default)
#   minimax - MiniMax image-01 / image-01-live via regional image_generation endpoints
#
# Usage: ./clawra-selfie.sh "<prompt>" "<channel>" ["<caption>"] [aspect_ratio] [output_format]
#
# Environment variables:
#   PROVIDER          - "grok" (default) or "minimax"
#   FAL_KEY           - Your fal.ai API key (required for the grok provider)
#   MINIMAX_API_KEY   - Your MiniMax API key (required for the minimax provider)
#   MINIMAX_REGION    - "global_en" (default) or "cn_zh"
#   MINIMAX_MODEL     - "image-01" (default) or "image-01-live"
#   MINIMAX_RESPONSE_FORMAT - "url" (default) or "base64"
#   MINIMAX_SUBJECT_REFERENCE - Reference image URL or data URL (defaults to Clawra)
#   MINIMAX_WIDTH / MINIMAX_HEIGHT - Optional image dimensions, set together
#   MINIMAX_SEED      - Optional integer seed
#   MINIMAX_N         - Optional image count from 1 to 9
#   MINIMAX_PROMPT_OPTIMIZER - Optional "true" or "false"
#
# Example:
#   FAL_KEY=your_key ./clawra-selfie.sh "A sunset over mountains" "#art" "Check this out!"
#   PROVIDER=minimax MINIMAX_API_KEY=your_key ./clawra-selfie.sh "A sunset over mountains" "#art" "Check this out!"

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

# Provider selection
PROVIDER="${PROVIDER:-grok}"
case "$PROVIDER" in
    grok|minimax) ;;
    *)
        log_error "Unknown PROVIDER '$PROVIDER'. Supported: grok, minimax"
        exit 1
        ;;
esac

log_info "Provider: $PROVIDER"

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
CAPTION="${3:-Generated with Clawra Selfie}"
ASPECT_RATIO="${4:-}"
OUTPUT_FORMAT="${5:-jpeg}"

if [ -z "$PROMPT" ] || [ -z "$CHANNEL" ]; then
    echo "Usage: $0 <prompt> <channel> [caption] [aspect_ratio] [output_format]"
    echo ""
    echo "Arguments:"
    echo "  prompt        - Image description (required)"
    echo "  channel       - Target channel (required) e.g., #general, @user"
    echo "  caption       - Message caption (default: 'Generated with Clawra Selfie')"
    echo "  aspect_ratio  - Image ratio (default: 1:1); MiniMax also supports 3:2, 2:3, 21:9"
    echo "  output_format - Image format (default: jpeg) Options: jpeg, png, webp (grok provider)"
    echo ""
    echo "Environment:"
    echo "  PROVIDER          - 'grok' (default) or 'minimax'"
    echo "  FAL_KEY           - Your fal.ai API key (required for the grok provider)"
    echo "  MINIMAX_API_KEY   - Your MiniMax API key (required for the minimax provider)"
    echo "  MINIMAX_REGION    - 'global_en' (default) or 'cn_zh'"
    echo "  MINIMAX_MODEL     - 'image-01' (default) or 'image-01-live'"
    echo "  MINIMAX_RESPONSE_FORMAT - 'url' (default) or 'base64'"
    echo "  MINIMAX_SUBJECT_REFERENCE - Reference image URL or data URL (defaults to Clawra)"
    echo "  MINIMAX_WIDTH / MINIMAX_HEIGHT - Optional image dimensions, set together"
    echo "  MINIMAX_SEED      - Optional integer seed"
    echo "  MINIMAX_N         - Optional image count from 1 to 9"
    echo "  MINIMAX_PROMPT_OPTIMIZER - Optional 'true' or 'false'"
    echo ""
    echo "Example (Grok):"
    echo "  FAL_KEY=your_key $0 \"A cyberpunk city at night\" \"#art-gallery\" \"AI Art!\""
    echo "Example (MiniMax):"
    echo "  PROVIDER=minimax MINIMAX_API_KEY=your_key $0 \"A cyberpunk city at night\" \"#art-gallery\" \"AI Art!\""
    exit 1
fi

log_info "Prompt: $PROMPT"
log_info "Aspect ratio: ${ASPECT_RATIO:-provider default}"

IMAGE_URL=""

if [ "$PROVIDER" = "minimax" ]; then
    # MiniMax image_generation provider
    if [ -z "${MINIMAX_API_KEY:-}" ]; then
        log_error "MINIMAX_API_KEY environment variable not set"
        echo "Get your API key from: https://platform.minimax.io"
        exit 1
    fi

    MINIMAX_REGION="${MINIMAX_REGION:-global_en}"
    MINIMAX_MODEL="${MINIMAX_MODEL:-image-01}"
    MINIMAX_RESPONSE_FORMAT="${MINIMAX_RESPONSE_FORMAT:-url}"
    MINIMAX_SUBJECT_REFERENCE="${MINIMAX_SUBJECT_REFERENCE:-https://cdn.jsdelivr.net/gh/SumeLabs/clawra@main/assets/clawra.png}"
    MINIMAX_WIDTH="${MINIMAX_WIDTH:-}"
    MINIMAX_HEIGHT="${MINIMAX_HEIGHT:-}"
    MINIMAX_SEED="${MINIMAX_SEED:-}"
    MINIMAX_N="${MINIMAX_N:-}"
    MINIMAX_PROMPT_OPTIMIZER="${MINIMAX_PROMPT_OPTIMIZER:-}"

    case "$MINIMAX_REGION" in
        global_en) ENDPOINT="https://api.minimax.io/v1/image_generation" ;;
        cn_zh)     ENDPOINT="https://api.minimaxi.com/v1/image_generation" ;;
        *)
            log_error "Unknown MINIMAX_REGION '$MINIMAX_REGION'. Supported: global_en, cn_zh"
            exit 1
            ;;
    esac

    case "$MINIMAX_MODEL" in
        image-01|image-01-live) ;;
        *)
            log_error "Unknown MINIMAX_MODEL '$MINIMAX_MODEL'. Supported: image-01, image-01-live"
            exit 1
            ;;
    esac

    case "$MINIMAX_RESPONSE_FORMAT" in
        url|base64) ;;
        *)
            log_error "Unknown MINIMAX_RESPONSE_FORMAT '$MINIMAX_RESPONSE_FORMAT'. Supported: url, base64"
            exit 1
            ;;
    esac

    case "$ASPECT_RATIO" in
        ""|1:1|16:9|4:3|3:2|2:3|3:4|9:16|21:9) ;;
        *)
            log_error "Unsupported MiniMax aspect ratio '$ASPECT_RATIO'"
            exit 1
            ;;
    esac

    if { [ -n "$MINIMAX_WIDTH" ] && [ -z "$MINIMAX_HEIGHT" ]; } || \
       { [ -z "$MINIMAX_WIDTH" ] && [ -n "$MINIMAX_HEIGHT" ]; }; then
        log_error "MINIMAX_WIDTH and MINIMAX_HEIGHT must be set together"
        exit 1
    fi

    for VALUE in "$MINIMAX_WIDTH" "$MINIMAX_HEIGHT" "$MINIMAX_SEED" "$MINIMAX_N"; do
        if [ -n "$VALUE" ] && ! [[ "$VALUE" =~ ^-?[0-9]+$ ]]; then
            log_error "MiniMax numeric options must be integers"
            exit 1
        fi
    done

    if [ -n "$MINIMAX_N" ] && { [ "$MINIMAX_N" -lt 1 ] || [ "$MINIMAX_N" -gt 9 ]; }; then
        log_error "MINIMAX_N must be between 1 and 9"
        exit 1
    fi

    case "$MINIMAX_PROMPT_OPTIMIZER" in
        ""|true|false) ;;
        *)
            log_error "MINIMAX_PROMPT_OPTIMIZER must be 'true' or 'false'"
            exit 1
            ;;
    esac

    log_info "MiniMax region: $MINIMAX_REGION"
    log_info "MiniMax model: $MINIMAX_MODEL"
    log_info "Endpoint: $ENDPOINT"

    # Build the request body with the documented image_generation request fields.
    JSON_PAYLOAD=$(jq -n \
        --arg model "$MINIMAX_MODEL" \
        --arg prompt "$PROMPT" \
        --arg subject_reference "$MINIMAX_SUBJECT_REFERENCE" \
        --arg aspect_ratio "$ASPECT_RATIO" \
        --arg response_format "$MINIMAX_RESPONSE_FORMAT" \
        --arg width "$MINIMAX_WIDTH" \
        --arg height "$MINIMAX_HEIGHT" \
        --arg seed "$MINIMAX_SEED" \
        --arg n "$MINIMAX_N" \
        --arg prompt_optimizer "$MINIMAX_PROMPT_OPTIMIZER" \
        '{
            model: $model,
            prompt: $prompt,
            subject_reference: [{type: "character", image_file: $subject_reference}],
            response_format: $response_format
        }
        + (if $aspect_ratio != "" then {aspect_ratio: $aspect_ratio} else {} end)
        + (if $width != "" then {width: ($width | tonumber)} else {} end)
        + (if $height != "" then {height: ($height | tonumber)} else {} end)
        + (if $seed != "" then {seed: ($seed | tonumber)} else {} end)
        + (if $n != "" then {n: ($n | tonumber)} else {} end)
        + (if $prompt_optimizer != "" then {prompt_optimizer: ($prompt_optimizer == "true")} else {} end)')

    RESPONSE=$(curl -s -X POST "$ENDPOINT" \
        -H "Authorization: Bearer $MINIMAX_API_KEY" \
        -H "Content-Type: application/json" \
        -d "$JSON_PAYLOAD")

    # Parse the documented response fields: base_resp.status_code, metadata, data.image_urls.
    STATUS_CODE=$(echo "$RESPONSE" | jq -r '.base_resp.status_code // empty')
    if [ -n "$STATUS_CODE" ] && [ "$STATUS_CODE" != "0" ]; then
        STATUS_MSG=$(echo "$RESPONSE" | jq -r '.base_resp.status_msg // "unknown error"')
        log_error "MiniMax image generation failed (status_code=$STATUS_CODE): $STATUS_MSG"
        exit 1
    fi

    SUCCESS_COUNT=$(echo "$RESPONSE" | jq -r '.metadata.success_count // empty')
    FAILED_COUNT=$(echo "$RESPONSE" | jq -r '.metadata.failed_count // empty')
    if [ -n "$SUCCESS_COUNT" ] || [ -n "$FAILED_COUNT" ]; then
        log_info "MiniMax metadata: success_count=${SUCCESS_COUNT:-n/a} failed_count=${FAILED_COUNT:-n/a}"
    fi

    IMAGE_URL=$(echo "$RESPONSE" | jq -r '.data.image_urls[0] // empty')

    if [ -z "$IMAGE_URL" ]; then
        log_error "Failed to extract image URL from MiniMax response (data.image_urls)"
        echo "Response: $RESPONSE"
        exit 1
    fi
else
    # Grok Imagine provider via fal.ai
    if [ -z "${FAL_KEY:-}" ]; then
        log_error "FAL_KEY environment variable not set"
        echo "Get your API key from: https://fal.ai/dashboard/keys"
        exit 1
    fi

    log_info "Generating image with Grok Imagine..."
    GROK_ASPECT_RATIO="${ASPECT_RATIO:-1:1}"

    RESPONSE=$(curl -s -X POST "https://fal.run/xai/grok-imagine-image" \
        -H "Authorization: Key $FAL_KEY" \
        -H "Content-Type: application/json" \
        -d "{
            \"prompt\": $(echo "$PROMPT" | jq -Rs .),
            \"num_images\": 1,
            \"aspect_ratio\": \"$GROK_ASPECT_RATIO\",
            \"output_format\": \"$OUTPUT_FORMAT\"
        }")

    if echo "$RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
        ERROR_MSG=$(echo "$RESPONSE" | jq -r '.error // .detail // "Unknown error"')
        log_error "Image generation failed: $ERROR_MSG"
        exit 1
    fi

    IMAGE_URL=$(echo "$RESPONSE" | jq -r '.images[0].url // empty')

    if [ -z "$IMAGE_URL" ]; then
        log_error "Failed to extract image URL from response"
        echo "Response: $RESPONSE"
        exit 1
    fi

    REVISED_PROMPT=$(echo "$RESPONSE" | jq -r '.revised_prompt // empty')
    if [ -n "$REVISED_PROMPT" ]; then
        log_info "Revised prompt: $REVISED_PROMPT"
    fi
fi

log_info "Image generated successfully!"
log_info "URL: $IMAGE_URL"

# Send via OpenClaw
log_info "Sending to channel: $CHANNEL"

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
    --arg prompt "$PROMPT" \
    --arg provider "$PROVIDER" \
    '{
        success: true,
        image_url: $url,
        channel: $channel,
        prompt: $prompt,
        provider: $provider
    }'
