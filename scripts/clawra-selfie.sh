#!/bin/bash
# clawra-selfie.sh
# Generate an image with fal.ai Grok Imagine, Google nano-banana models,
# or Alibaba Qwen image model and send it via OpenClaw.
#
# Usage:
#   ./clawra-selfie.sh "<prompt>" "<channel>" ["<caption>"] ["<aspect_ratio>"] ["<output_format>"] ["<backend>"] ["<model_override>"]
#
# Backends:
#   qwen-image-plus           -> Alibaba Qwen Image (DashScope)
#   qwen                      -> Alias of qwen-image-plus
#   qwen-image-edit-plus      -> Alibaba Qwen Image Edit (DashScope)
#   volc-seedream / seedream  -> Volcengine Ark Seedream (text-to-image)
#   volc-seededit / seededit  -> Volcengine Ark image edit using Seedream model family
#   hunyuan-image / hunyuan   -> Tencent Hunyuan Image edit via Tencent Cloud API
#   fal                       -> xAI Grok Imagine via fal.ai
#   google-nano-banana        -> Google gemini-2.5-flash-image
#   google-nano-banana-pro    -> Google gemini-3-pro-image-preview
#   google                    -> Google model from 7th arg or default pro

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

decode_base64() {
    if base64 --decode < /dev/null > /dev/null 2>&1; then
        base64 --decode
    else
        base64 -D
    fi
}

resolve_google_api_key() {
    if [ -n "${GOOGLE_API_KEY:-}" ]; then
        echo "$GOOGLE_API_KEY"
    elif [ -n "${GEMINI_API_KEY:-}" ]; then
        echo "$GEMINI_API_KEY"
    elif [ -n "${NANO_BANANA_PRO_API_KEY:-}" ]; then
        echo "$NANO_BANANA_PRO_API_KEY"
    else
        echo ""
    fi
}

resolve_google_model() {
    local backend="$1"
    local override="${2:-}"

    if [ -n "$override" ]; then
        echo "$override"
        return
    fi

    case "$backend" in
        google-nano-banana)
            echo "gemini-2.5-flash-image"
            ;;
        google-nano-banana-pro|google)
            echo "gemini-3-pro-image-preview"
            ;;
        *)
            echo "gemini-3-pro-image-preview"
            ;;
    esac
}

resolve_dashscope_api_key() {
    if [ -n "${DASHSCOPE_API_KEY:-}" ]; then
        echo "$DASHSCOPE_API_KEY"
    elif [ -n "${ALIBABA_CLOUD_MODEL_STUDIO_API_KEY:-}" ]; then
        echo "$ALIBABA_CLOUD_MODEL_STUDIO_API_KEY"
    else
        echo ""
    fi
}

resolve_dashscope_base_url() {
    local region="${DASHSCOPE_REGION:-beijing}"

    if [ -n "${DASHSCOPE_BASE_URL:-}" ]; then
        echo "$DASHSCOPE_BASE_URL"
        return
    fi

    if [ "$region" = "singapore" ]; then
        echo "https://dashscope-intl.aliyuncs.com"
    else
        echo "https://dashscope.aliyuncs.com"
    fi
}

resolve_qwen_model() {
    local override="${1:-}"
    if [ -n "$override" ]; then
        echo "$override"
    else
        echo "qwen-image-plus-2026-01-09"
    fi
}

resolve_qwen_edit_model() {
    local override="${1:-}"
    if [ -n "$override" ]; then
        echo "$override"
    else
        echo "qwen-image-edit-plus"
    fi
}

map_aspect_ratio_to_qwen_edit_size() {
    local ratio="${1:-1:1}"
    case "$ratio" in
        "16:9") echo "1280*720" ;;
        "9:16") echo "720*1280" ;;
        "4:3") echo "1280*960" ;;
        "3:4") echo "960*1280" ;;
        "3:2") echo "1152*768" ;;
        "2:3") echo "768*1152" ;;
        "2:1") echo "1536*768" ;;
        "1:2") echo "768*1536" ;;
        "20:9") echo "1600*720" ;;
        "9:20") echo "720*1600" ;;
        "19.5:9") echo "1560*720" ;;
        "9:19.5") echo "720*1560" ;;
        *) echo "1024*1024" ;;
    esac
}

resolve_ark_api_key() {
    if [ -n "${ARK_API_KEY:-}" ]; then
        echo "$ARK_API_KEY"
    elif [ -n "${VOLCENGINE_API_KEY:-}" ]; then
        echo "$VOLCENGINE_API_KEY"
    else
        echo ""
    fi
}

resolve_ark_base_url() {
    if [ -n "${ARK_BASE_URL:-}" ]; then
        echo "$ARK_BASE_URL"
    else
        echo "https://ark.cn-beijing.volces.com/api/v3"
    fi
}

resolve_seedream_model() {
    local override="${1:-}"
    if [ -n "$override" ]; then
        echo "$override"
    else
        echo "doubao-seedream-4-0-250828"
    fi
}

resolve_seededit_model() {
    local override="${1:-}"
    if [ -n "$override" ]; then
        echo "$override"
    elif [ -n "${SEEDREAM_EDIT_MODEL:-}" ]; then
        echo "$SEEDREAM_EDIT_MODEL"
    else
        # SeedEdit endpoint/model may be unavailable in some regions.
        # Default to Seedream family model for image-edit.
        echo "doubao-seedream-4-0-250828"
    fi
}

map_aspect_ratio_to_size() {
    local ratio="${1:-1:1}"
    case "$ratio" in
        "16:9") echo "1344x768" ;;
        "9:16") echo "768x1344" ;;
        "4:3") echo "1152x864" ;;
        "3:4") echo "864x1152" ;;
        "3:2") echo "1216x832" ;;
        "2:3") echo "832x1216" ;;
        *) echo "1024x1024" ;;
    esac
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
CAPTION="${3:-Generated image}"
ASPECT_RATIO="${4:-1:1}"
OUTPUT_FORMAT="${5:-jpeg}"
BACKEND="${6:-qwen-image-plus}"
MODEL_OVERRIDE_ARG="${7:-}"

if echo "${MODEL_OVERRIDE_ARG:-}" | grep -Eqi 'seededit3|seededit-3|seed-edit-3'; then
    log_error "Deprecated model override detected: ${MODEL_OVERRIDE_ARG}"
    echo "seededit3 has been removed. Please use Seedream family models (e.g. doubao-seedream-4-0-250828 / doubao-seedream-4-5-250915)."
    exit 1
fi

if [ -z "$PROMPT" ] || [ -z "$CHANNEL" ]; then
    echo "Usage: $0 <prompt> <channel> [caption] [aspect_ratio] [output_format] [backend] [model_override]"
    echo ""
    echo "Arguments:"
    echo "  prompt        - Image description (required)"
    echo "  channel       - Target channel (required) e.g., #general, @user"
    echo "  caption       - Message caption (default: 'Generated image')"
    echo "  aspect_ratio  - Image ratio (default: 1:1) Options: 2:1, 16:9, 4:3, 1:1, 3:4, 9:16"
    echo "  output_format - Image format (default: jpeg) Options: jpeg, png, webp"
    echo "  backend       - qwen-image-plus | qwen | qwen-image-edit-plus | volc-seedream | seedream | volc-seededit | seededit | hunyuan-image | hunyuan | fal | google-nano-banana | google-nano-banana-pro | google (default: qwen-image-plus)"
    echo "  model_override- Optional model override (qwen/google/volc backends), e.g. qwen-image-plus-2026-01-09"
    echo ""
    echo "Example:"
    echo "  $0 \"A cyberpunk city at night\" \"#art-gallery\" \"AI Art!\" \"1:1\" \"jpeg\" \"fal\""
    echo "  $0 \"A playful cat astronaut\" \"#art-gallery\" \"Nano Banana\" \"1:1\" \"png\" \"google-nano-banana-pro\""
    exit 1
fi

case "$BACKEND" in
    qwen-image-plus|qwen|qwen-image-edit-plus|volc-seedream|seedream|volc-seededit|seededit|hunyuan-image|hunyuan|fal|google-nano-banana|google-nano-banana-pro|google)
        ;;
    *)
        log_error "Unsupported backend: $BACKEND"
        echo "Supported backends: qwen-image-plus, qwen, qwen-image-edit-plus, volc-seedream, seedream, volc-seededit, seededit, hunyuan-image, hunyuan, fal, google-nano-banana, google-nano-banana-pro, google"
        exit 1
        ;;
esac

log_info "Generating image..."
log_info "Backend: $BACKEND"
log_info "Prompt: $PROMPT"
log_info "Aspect ratio: $ASPECT_RATIO"

SECONDS=0

RESPONSE=""
MEDIA_TARGET=""
REVISED_PROMPT=""
MODEL_USED=""

if [ "$BACKEND" = "qwen-image-plus" ] || [ "$BACKEND" = "qwen" ]; then
    DASHSCOPE_API_KEY_RESOLVED=$(resolve_dashscope_api_key)
    if [ -z "$DASHSCOPE_API_KEY_RESOLVED" ]; then
        log_error "DashScope API key missing for qwen backend"
        echo "Set one of: DASHSCOPE_API_KEY, ALIBABA_CLOUD_MODEL_STUDIO_API_KEY"
        exit 1
    fi

    MODEL_USED=$(resolve_qwen_model "$MODEL_OVERRIDE_ARG")
    DASHSCOPE_BASE_URL=$(resolve_dashscope_base_url)

    JSON_PAYLOAD=$(jq -n \
        --arg model "$MODEL_USED" \
        --arg prompt "$PROMPT" \
        --arg size "1328*1328" \
        '{
          model: $model,
          input: {
            messages: [
              {
                role: "user",
                content: [{text: $prompt}]
              }
            ]
          },
          parameters: {
            size: $size,
            n: 1,
            watermark: false,
            prompt_extend: true
          }
        }')

    RESPONSE=$(curl -s -X POST "${DASHSCOPE_BASE_URL}/api/v1/services/aigc/multimodal-generation/generation" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${DASHSCOPE_API_KEY_RESOLVED}" \
        -d "$JSON_PAYLOAD")

    if echo "$RESPONSE" | jq -e '.code or .error' > /dev/null 2>&1; then
        ERROR_MSG=$(echo "$RESPONSE" | jq -r '.message // .error.message // .error // "Unknown error"')
        log_error "Qwen image generation failed: $ERROR_MSG"
        exit 1
    fi

    MEDIA_TARGET=$(echo "$RESPONSE" | jq -r '.output.choices[0].message.content[0].image // empty')
    REVISED_PROMPT=$(echo "$RESPONSE" | jq -r '.output.choices[0].message.content[]? | select(.text != null) | .text' | head -n 1)

    if [ -z "$MEDIA_TARGET" ]; then
        log_error "Failed to extract image URL from qwen response"
        echo "Response: $RESPONSE"
        exit 1
    fi
elif [ "$BACKEND" = "volc-seedream" ] || [ "$BACKEND" = "seedream" ]; then
    ARK_API_KEY_RESOLVED=$(resolve_ark_api_key)
    if [ -z "$ARK_API_KEY_RESOLVED" ]; then
        log_error "ARK API key missing for Seedream backend"
        echo "Set one of: ARK_API_KEY, VOLCENGINE_API_KEY"
        exit 1
    fi

    MODEL_USED=$(resolve_seedream_model "$MODEL_OVERRIDE_ARG")
    ARK_BASE_URL=$(resolve_ark_base_url)
    ARK_SIZE=$(map_aspect_ratio_to_size "$ASPECT_RATIO")

    JSON_PAYLOAD=$(jq -n \
        --arg model "$MODEL_USED" \
        --arg prompt "$PROMPT" \
        --arg size "$ARK_SIZE" \
        '{
          model: $model,
          prompt: $prompt,
          response_format: "url",
          size: $size
        }')

    RESPONSE=$(curl -s -X POST "${ARK_BASE_URL}/images/generations" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${ARK_API_KEY_RESOLVED}" \
        -d "$JSON_PAYLOAD")

    if echo "$RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
        ERROR_MSG=$(echo "$RESPONSE" | jq -r '.error.message // .error // "Unknown error"')
        log_error "Seedream generation failed: $ERROR_MSG"
        exit 1
    fi

    MEDIA_TARGET=$(echo "$RESPONSE" | jq -r '.data[0].url // .output[0].url // empty')
    REVISED_PROMPT=$(echo "$RESPONSE" | jq -r '.data[0].revised_prompt // empty')

    if [ -z "$MEDIA_TARGET" ]; then
        log_error "Failed to extract image URL from Seedream response"
        echo "Response: $RESPONSE"
        exit 1
    fi
elif [ "$BACKEND" = "qwen-image-edit-plus" ]; then
    DASHSCOPE_API_KEY_RESOLVED=$(resolve_dashscope_api_key)
    if [ -z "$DASHSCOPE_API_KEY_RESOLVED" ]; then
        log_error "DashScope API key missing for qwen-image-edit-plus backend"
        echo "Set one of: DASHSCOPE_API_KEY, ALIBABA_CLOUD_MODEL_STUDIO_API_KEY"
        exit 1
    fi

    MODEL_USED=$(resolve_qwen_edit_model "$MODEL_OVERRIDE_ARG")
    DASHSCOPE_BASE_URL=$(resolve_dashscope_base_url)

    EDIT_IMAGE="${QWEN_IMAGE_EDIT_IMAGE_URL:-https://blog-images-1255793008.cos.ap-shanghai.myqcloud.com/images/clawra.png}"

    if [ -n "${QWEN_IMAGE_EDIT_IMAGE_PATH:-}" ]; then
        IMG_B64=$(base64 < "$QWEN_IMAGE_EDIT_IMAGE_PATH" | tr -d '\n')
        EDIT_IMAGE="data:image/png;base64,${IMG_B64}"
    fi

    EDIT_SIZE=$(map_aspect_ratio_to_qwen_edit_size "$ASPECT_RATIO")

    JSON_PAYLOAD=$(jq -n \
        --arg model "$MODEL_USED" \
        --arg prompt "$PROMPT" \
        --arg image "$EDIT_IMAGE" \
        --arg size "$EDIT_SIZE" \
        '{
          model: $model,
          input: {
            messages: [
              {
                role: "user",
                content: [
                  {image: $image},
                  {text: $prompt}
                ]
              }
            ]
          },
          parameters: {
            size: $size,
            n: 1,
            watermark: false,
            prompt_extend: true
          }
        }')

    RESPONSE=$(curl -s -X POST "${DASHSCOPE_BASE_URL}/api/v1/services/aigc/multimodal-generation/generation" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${DASHSCOPE_API_KEY_RESOLVED}" \
        -d "$JSON_PAYLOAD")

    if echo "$RESPONSE" | jq -e '.code or .error' > /dev/null 2>&1; then
        ERROR_MSG=$(echo "$RESPONSE" | jq -r '.message // .error.message // .error // "Unknown error"')
        log_error "Qwen image edit failed: $ERROR_MSG"
        exit 1
    fi

    MEDIA_TARGET=$(echo "$RESPONSE" | jq -r '.output.choices[0].message.content[]? | select(.image != null) | .image' | head -n 1)
    REVISED_PROMPT=$(echo "$RESPONSE" | jq -r '.output.choices[0].message.content[]? | select(.text != null) | .text' | head -n 1)

    if [ -z "$MEDIA_TARGET" ]; then
        log_error "Failed to extract image URL from qwen image edit response"
        echo "Response: $RESPONSE"
        exit 1
    fi
elif [ "$BACKEND" = "volc-seededit" ] || [ "$BACKEND" = "seededit" ]; then
    ARK_API_KEY_RESOLVED=$(resolve_ark_api_key)
    if [ -z "$ARK_API_KEY_RESOLVED" ]; then
        log_error "ARK API key missing for Seedream-edit backend"
        echo "Set one of: ARK_API_KEY, VOLCENGINE_API_KEY"
        exit 1
    fi

    MODEL_USED=$(resolve_seededit_model "$MODEL_OVERRIDE_ARG")
    ARK_BASE_URL=$(resolve_ark_base_url)

    EDIT_IMAGE="${SEEDREAM_EDIT_IMAGE_URL:-https://blog-images-1255793008.cos.ap-shanghai.myqcloud.com/images/clawra.png}"

    if [ -n "${SEEDREAM_EDIT_IMAGE_PATH:-}" ]; then
        IMG_B64=$(base64 < "$SEEDREAM_EDIT_IMAGE_PATH" | tr -d '\n')
        EDIT_IMAGE="data:image/png;base64,${IMG_B64}"
    fi

    EDIT_SIZE="${SEEDREAM_EDIT_SIZE:-1024x1024}"

    JSON_PAYLOAD=$(jq -n \
        --arg model "$MODEL_USED" \
        --arg prompt "$PROMPT" \
        --arg image "$EDIT_IMAGE" \
        --arg size "$EDIT_SIZE" \
        '{
          model: $model,
          prompt: $prompt,
          image: $image,
          response_format: "url",
          size: $size
        }')

    # Seedream uses /images/generations for both text-to-image and image-edit
    RESPONSE=$(curl -s -X POST "${ARK_BASE_URL}/images/generations" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${ARK_API_KEY_RESOLVED}" \
        -d "$JSON_PAYLOAD")

    if echo "$RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
        ERROR_MSG=$(echo "$RESPONSE" | jq -r '.error.message // .error // "Unknown error"')
        log_error "Seedream edit failed: $ERROR_MSG"
        exit 1
    fi

    MEDIA_TARGET=$(echo "$RESPONSE" | jq -r '.data[0].url // .output[0].url // empty')
    REVISED_PROMPT=$(echo "$RESPONSE" | jq -r '.data[0].revised_prompt // empty')

    if [ -z "$MEDIA_TARGET" ]; then
        log_error "Failed to extract image URL from Seedream edit response"
        echo "Response: $RESPONSE"
        exit 1
    fi
elif [ "$BACKEND" = "hunyuan-image" ] || [ "$BACKEND" = "hunyuan" ]; then
    if ! command -v node >/dev/null 2>&1; then
        log_error "Node.js is required for Hunyuan backend"
        exit 1
    fi

    if [ -z "${TENCENT_SECRET_ID:-}" ] || [ -z "${TENCENT_SECRET_KEY:-}" ]; then
        log_error "Tencent credentials missing for Hunyuan backend"
        echo "Set: TENCENT_SECRET_ID and TENCENT_SECRET_KEY"
        exit 1
    fi

    MODEL_USED="aiart/v20221229 SubmitTextToImageJob"

    HUNYUAN_JSON=$(PROMPT="$PROMPT" ASPECT_RATIO="$ASPECT_RATIO" node <<'NODE'
(async () => {
  try {
    const tencentcloud = require('tencentcloud-sdk-nodejs');
    const AiartClient = tencentcloud.aiart.v20221229.Client;

    const client = new AiartClient({
      credential: {
        secretId: process.env.TENCENT_SECRET_ID,
        secretKey: process.env.TENCENT_SECRET_KEY,
      },
      region: process.env.TENCENT_REGION || 'ap-guangzhou',
      profile: {
        httpProfile: {
          endpoint: process.env.TENCENT_AIART_ENDPOINT || 'aiart.tencentcloudapi.com',
        },
      },
    });

    const refUrl =
      process.env.TENCENT_REFERENCE_IMAGE_URL ||
      'https://blog-images-1255793008.cos.ap-shanghai.myqcloud.com/images/clawra.png';

    function aspectRatioToResolution(ratio) {
      const lookup = {
        '1:1': '1024:1024', '4:3': '1024:768', '3:4': '768:1024',
        '16:9': '1024:576', '9:16': '576:1024', '3:2': '960:640',
        '2:3': '640:960', '2:1': '1024:512', '1:2': '512:1024',
        '20:9': '1024:461', '9:20': '461:1024',
        '19.5:9': '1024:473', '9:19.5': '473:1024',
      };
      if (lookup[ratio]) return lookup[ratio];
      const parts = ratio.split(':');
      if (parts.length === 2) {
        const rw = parseFloat(parts[0]), rh = parseFloat(parts[1]);
        if (rw > 0 && rh > 0) {
          const maxArea = 1024 * 1024;
          let w = Math.round(Math.sqrt(maxArea * rw / rh));
          let h = Math.round(w * rh / rw);
          w = Math.max(512, Math.min(2048, w));
          h = Math.max(512, Math.min(2048, h));
          if (w * h > maxArea) { const s = Math.sqrt(maxArea / (w * h)); w = Math.floor(w*s); h = Math.floor(h*s); }
          return `${w}:${h}`;
        }
      }
      return '640:960';
    }

    const resolution =
      process.env.TENCENT_RESOLUTION ||
      (process.env.ASPECT_RATIO ? aspectRatioToResolution(process.env.ASPECT_RATIO) : '640:960');

    const submitParams = {
      Prompt: process.env.PROMPT,
      Images: [refUrl],
      Resolution: resolution,
      LogoAdd: Number(process.env.TENCENT_LOGO_ADD ?? '0'),
      Revise: process.env.TENCENT_REVISE === '0' ? 0 : 1,
      ...(process.env.TENCENT_SEED ? { Seed: Number(process.env.TENCENT_SEED) } : {}),
    };

    const submitResp = await client.SubmitTextToImageJob(submitParams);
    const jobId = submitResp?.JobId;
    if (!jobId) throw new Error(`SubmitTextToImageJob returned no JobId: ${JSON.stringify(submitResp)}`);

    const maxAttempts = 120;
    const pollIntervalMs = 1000;

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, pollIntervalMs));
      const queryResp = await client.QueryTextToImageJob({ JobId: jobId });
      const statusCode = queryResp?.JobStatusCode;
      if (statusCode === '4') throw new Error(`Hunyuan job failed: ${queryResp.JobErrorCode} - ${queryResp.JobErrorMsg}`);
      if (statusCode === '5' && queryResp?.ResultImage?.[0]) {
        process.stdout.write(JSON.stringify({ media: queryResp.ResultImage[0], revisedPrompt: '' }));
        return;
      }
    }

    throw new Error(`Hunyuan job timed out after ${(maxAttempts * pollIntervalMs) / 1000}s`);
  } catch (err) {
    process.stderr.write(String(err && err.message ? err.message : err));
    process.exit(1);
  }
})();
NODE
)

    MEDIA_TARGET=$(echo "$HUNYUAN_JSON" | jq -r '.media // empty')
    REVISED_PROMPT=$(echo "$HUNYUAN_JSON" | jq -r '.revisedPrompt // empty')

    if [ -z "$MEDIA_TARGET" ]; then
        log_error "Failed to extract image URL/path from Hunyuan response"
        echo "Response: $HUNYUAN_JSON"
        exit 1
    fi
elif [ "$BACKEND" = "fal" ]; then
    if [ -z "${FAL_KEY:-}" ]; then
        log_error "FAL_KEY environment variable not set for fal backend"
        echo "Get your key from: https://fal.ai/dashboard/keys"
        exit 1
    fi

    JSON_PAYLOAD=$(jq -n \
        --arg prompt "$PROMPT" \
        --arg aspect_ratio "$ASPECT_RATIO" \
        --arg output_format "$OUTPUT_FORMAT" \
        '{
          prompt: $prompt,
          num_images: 1,
          aspect_ratio: $aspect_ratio,
          output_format: $output_format
        }')

    RESPONSE=$(curl -s -X POST "https://fal.run/xai/grok-imagine-image" \
        -H "Authorization: Key $FAL_KEY" \
        -H "Content-Type: application/json" \
        -d "$JSON_PAYLOAD")

    if echo "$RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
        ERROR_MSG=$(echo "$RESPONSE" | jq -r '.error // .detail // "Unknown error"')
        log_error "fal image generation failed: $ERROR_MSG"
        exit 1
    fi

    MEDIA_TARGET=$(echo "$RESPONSE" | jq -r '.images[0].url // empty')
    REVISED_PROMPT=$(echo "$RESPONSE" | jq -r '.revised_prompt // empty')
    MODEL_USED="xai/grok-imagine-image"

    if [ -z "$MEDIA_TARGET" ]; then
        log_error "Failed to extract image URL from fal response"
        echo "Response: $RESPONSE"
        exit 1
    fi
else
    GOOGLE_API_KEY_RESOLVED=$(resolve_google_api_key)
    if [ -z "$GOOGLE_API_KEY_RESOLVED" ]; then
        log_error "Google API key missing for Google backend"
        echo "Set one of: GOOGLE_API_KEY, GEMINI_API_KEY, NANO_BANANA_PRO_API_KEY"
        exit 1
    fi

    MODEL_USED=$(resolve_google_model "$BACKEND" "$MODEL_OVERRIDE_ARG")

    if [ "$OUTPUT_FORMAT" != "png" ]; then
        log_warn "Google backend ignores output_format='$OUTPUT_FORMAT'. Output format is model-defined."
    fi

    JSON_PAYLOAD=$(jq -n \
        --arg prompt "$PROMPT" \
        --arg aspect_ratio "$ASPECT_RATIO" \
        '{
          contents: [{parts: [{text: $prompt}]}],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
            imageConfig: { aspectRatio: $aspect_ratio }
          }
        }')

    RESPONSE=$(curl -s -X POST "https://generativelanguage.googleapis.com/v1beta/models/${MODEL_USED}:generateContent?key=${GOOGLE_API_KEY_RESOLVED}" \
        -H "Content-Type: application/json" \
        -d "$JSON_PAYLOAD")

    if echo "$RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
        ERROR_MSG=$(echo "$RESPONSE" | jq -r '.error.message // .error // "Unknown error"')
        log_error "Google image generation failed: $ERROR_MSG"
        exit 1
    fi

    IMAGE_B64=$(echo "$RESPONSE" | jq -r '.candidates[]?.content?.parts[]? | select(.inlineData and (.inlineData.data != null)) | .inlineData.data' | head -n 1)
    IMAGE_MIME=$(echo "$RESPONSE" | jq -r '.candidates[]?.content?.parts[]? | select(.inlineData and (.inlineData.data != null)) | .inlineData.mimeType // "image/png"' | head -n 1)
    REVISED_PROMPT=$(echo "$RESPONSE" | jq -r '.candidates[]?.content?.parts[]? | select(.text != null) | .text' | head -n 1)

    if [ -z "$IMAGE_B64" ] || [ "$IMAGE_B64" = "null" ]; then
        log_error "Failed to extract inline image data from Google response"
        echo "Response: $RESPONSE"
        exit 1
    fi

    TMP_IMAGE=$(mktemp /tmp/clawra-selfie-google-XXXXXX)
    printf '%s' "$IMAGE_B64" | decode_base64 > "$TMP_IMAGE"

    EXT="png"
    if [[ "$IMAGE_MIME" == *"jpeg"* ]] || [[ "$IMAGE_MIME" == *"jpg"* ]]; then
        EXT="jpg"
    elif [[ "$IMAGE_MIME" == *"webp"* ]]; then
        EXT="webp"
    fi

    MEDIA_TARGET="${TMP_IMAGE}.${EXT}"
    mv "$TMP_IMAGE" "$MEDIA_TARGET"
fi

GENERATION_DURATION_SECONDS=$SECONDS
MESSAGE_TEXT="$CAPTION (model: $MODEL_USED, time: ${GENERATION_DURATION_SECONDS}s)"

log_info "Image generated successfully!"
log_info "Model: $MODEL_USED"
log_info "Generation time: ${GENERATION_DURATION_SECONDS}s"
log_info "Media: $MEDIA_TARGET"

if [ -n "$REVISED_PROMPT" ] && [ "$REVISED_PROMPT" != "null" ]; then
    log_info "Revised prompt: $REVISED_PROMPT"
fi

# Send via OpenClaw
log_info "Sending to channel: $CHANNEL"

if [ "$USE_CLI" = true ]; then
    openclaw message send \
        --action send \
        --channel "$CHANNEL" \
        --message "$MESSAGE_TEXT" \
        --media "$MEDIA_TARGET"
else
    GATEWAY_URL="${OPENCLAW_GATEWAY_URL:-http://localhost:18789}"
    GATEWAY_TOKEN="${OPENCLAW_GATEWAY_TOKEN:-}"

    MESSAGE_PAYLOAD=$(jq -n \
        --arg channel "$CHANNEL" \
        --arg message "$MESSAGE_TEXT" \
        --arg media "$MEDIA_TARGET" \
        '{
          action: "send",
          channel: $channel,
          message: $message,
          media: $media
        }')

    curl -s -X POST "$GATEWAY_URL/message" \
        -H "Content-Type: application/json" \
        ${GATEWAY_TOKEN:+-H "Authorization: Bearer $GATEWAY_TOKEN"} \
        -d "$MESSAGE_PAYLOAD"
fi

log_info "Done! Image sent to $CHANNEL"

# Output JSON for programmatic use
echo ""
echo "--- Result ---"
jq -n \
    --arg media "$MEDIA_TARGET" \
    --arg channel "$CHANNEL" \
    --arg prompt "$PROMPT" \
    --arg backend "$BACKEND" \
    --arg model "$MODEL_USED" \
    --argjson generation_time_seconds "$GENERATION_DURATION_SECONDS" \
    '{
        success: true,
        image_url: $media,
        channel: $channel,
        prompt: $prompt,
        backend: $backend,
        model: $model,
        generation_time_seconds: $generation_time_seconds
    }'
