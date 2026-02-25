# Clawra Plus
<img width="300" alt="Clawra" src="https://github.com/user-attachments/assets/41512c51-e61d-4550-b461-eed06a1b0ec8" />

Language: [中文（默认）](README.md) | English

Repository: `https://github.com/kevin1sMe/clawra-plus`

This repository is an upgraded fork of the original Clawra project. The main goal is to evolve "AI selfie capability" from a single backend into a stable, switchable, multi-provider solution.

## What's New in This Fork

- Multi-backend generation/editing: Qwen, Volcengine Seedream/SeedEdit, Tencent Hunyuan, fal, and Google nano-banana
- Improved Hunyuan async polling: 1 request per second, up to 120 seconds
- Observable generation runtime: each run logs both model info and generation duration
- TS-only implementation: core logic lives in `scripts/clawra-selfie.ts` (`*.sh` kept as compatibility wrapper)
- Bilingual skill docs: `SKILL.md` and `SKILL_CN.md`
- OpenClaw delivery flow preserved: generated images can be sent to Discord/Telegram/WhatsApp/Slack, etc.

## Platform and Model Matrix

The script now uses a unified structure: `platform -> operation(generate/edit) -> model(full API name)`.

| Platform | Operation | Default model (full API name) | Required Config |
|---|---|---|---|
| `qwen` | `generate` / `edit` | `qwen-image-plus-2026-01-09` / `qwen-image-edit-plus` | `DASHSCOPE_API_KEY` |
| `volc` | `generate` / `edit` | `doubao-seedream-4-0-250828` / `doubao-seedream-4-0-250828` | `ARK_API_KEY` |
| `fal` | `generate` | `xai/grok-imagine-image` | `FAL_KEY` |
| `google` | `generate` | `gemini-3-pro-image-preview` | `GOOGLE_API_KEY` |
| `hunyuan` | `edit` | `aiart/v20221229 SubmitTextToImageJob` | `TENCENT_SECRET_ID` + `TENCENT_SECRET_KEY` |

List all supported models:

```bash
npx ts-node scripts/clawra-selfie.ts --list-models
```

## Quick Start

### Option A: Installer (fastest to try)

```bash
npx clawra@latest
```

The installer will:

1. Check your OpenClaw environment
2. Install the skill to `~/.openclaw/skills/clawra-selfie/`
3. Update `~/.openclaw/openclaw.json`
4. Inject the required persona template

Note: current installer flow guides `fal` key setup by default. For other platforms, use Option B and configure env vars manually.

### Option B: Manual install (recommended for multi-platform users)

```bash
git clone https://github.com/kevin1sMe/clawra-plus ~/.openclaw/skills/clawra-selfie
```

Then enable it in `~/.openclaw/openclaw.json`:

```json
{
  "skills": {
    "entries": {
      "clawra-selfie": {
        "enabled": true,
        "env": {
          "OPENCLAW_GATEWAY_TOKEN": "your_gateway_token",
          "DASHSCOPE_API_KEY": "optional_for_qwen",
          "ARK_API_KEY": "optional_for_seedream",
          "FAL_KEY": "optional_for_fal",
          "GOOGLE_API_KEY": "optional_for_google",
          "TENCENT_SECRET_ID": "optional_for_hunyuan",
          "TENCENT_SECRET_KEY": "optional_for_hunyuan"
        }
      }
    }
  }
}
```

## Run Scripts Directly

```bash
npx ts-node scripts/clawra-selfie.ts "A stylish mirror selfie in a cafe" "#general" "Qwen" "1:1" "png" "qwen" "generate"
```

```bash
npx ts-node scripts/clawra-selfie.ts --list-models
```

Argument format:

```text
<prompt> <channel> [caption] [aspect_ratio] [output_format] [platform] [operation] [model]
```

## Runtime Output (Upgraded)

Each generation now reports:

- `Model`
- `Generation time`
- `Media`

For Hunyuan platform, timeout is 120 seconds with 1-second polling intervals.

## Common Environment Variables

```bash
# Qwen
DASHSCOPE_API_KEY=your_key
QWEN_IMAGE_EDIT_IMAGE_URL=https://example.com/input.png  # optional, qwen-image-edit-plus reference image
QWEN_IMAGE_EDIT_IMAGE_PATH=/path/to/input.png            # optional, takes precedence over URL

# Volcengine
ARK_API_KEY=your_key

# fal
FAL_KEY=your_key

# Google
GOOGLE_API_KEY=your_key

# Tencent Hunyuan
TENCENT_SECRET_ID=your_secret_id
TENCENT_SECRET_KEY=your_secret_key
TENCENT_REGION=ap-guangzhou
TENCENT_AIART_ENDPOINT=aiart.tencentcloudapi.com

# OpenClaw
OPENCLAW_GATEWAY_TOKEN=your_token

# Optional: set default model per platform/operation
DEFAULT_MODEL_QWEN_GENERATE=qwen-image-plus-2026-01-09
DEFAULT_MODEL_QWEN_EDIT=qwen-image-edit-plus
DEFAULT_MODEL_VOLC_GENERATE=doubao-seedream-4-0-250828
DEFAULT_MODEL_VOLC_EDIT=doubao-seedream-4-0-250828
DEFAULT_MODEL_FAL_GENERATE=xai/grok-imagine-image
DEFAULT_MODEL_GOOGLE_GENERATE=gemini-3-pro-image-preview
DEFAULT_MODEL_HUNYUAN_EDIT="aiart/v20221229 SubmitTextToImageJob"
```

## Project Structure

```text
clawra-plus/
├── bin/                    # npx installer
├── scripts/                # Shell / TypeScript runtime scripts
├── skill/                  # OpenClaw skill definitions and mirrored scripts
├── SKILL.md                # English skill docs
├── SKILL_CN.md             # Chinese skill docs
├── templates/              # SOUL injection templates
└── assets/                 # Reference image
```

## License

MIT
