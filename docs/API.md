# API Reference

Programmatic API documentation for Clawra.

## Table of Contents

- [JavaScript/TypeScript API](#javascripttypescript-api)
- [CLI API](#cli-api)
- [HTTP API](#http-api)
- [Environment Variables](#environment-variables)

---

## JavaScript/TypeScript API

### Basic Usage

```typescript
import { Clawra } from 'clawra';

const clawra = new Clawra({
  provider: 'fal',
  apiKey: process.env.FAL_KEY
});

// Generate and send selfie
await clawra.generate({
  prompt: 'wearing a santa hat',
  mode: 'mirror',
  channel: '#general'
});
```

### Configuration Options

```typescript
interface ClawraConfig {
  // Required
  provider: 'fal' | 'openai' | 'stability' | 'custom';
  apiKey: string;
  
  // Optional
  baseUrl?: string;           // For custom provider
  model?: string;             // Model name
  defaultMode?: 'auto' | 'mirror' | 'direct';
  defaultSize?: 512 | 1024 | 2048;
  referenceImage?: string;    // URL to custom reference
  cacheEnabled?: boolean;
  cacheTtl?: number;          // Seconds
  timeout?: number;           // Milliseconds
}
```

### Generate Options

```typescript
interface GenerateOptions {
  // Required
  prompt: string;
  
  // Optional
  mode?: 'mirror' | 'direct' | 'auto';
  channel?: string;           // OpenClaw channel
  caption?: string;           // Message caption
  size?: 512 | 1024 | 2048;
  numImages?: number;         // 1-4
  outputFormat?: 'jpeg' | 'png' | 'webp';
}
```

### Complete Example

```typescript
import { Clawra } from 'clawra';

async function main() {
  // Initialize with fal.ai
  const clawra = new Clawra({
    provider: 'fal',
    apiKey: process.env.FAL_KEY,
    defaultMode: 'auto',
    cacheEnabled: true,
    cacheTtl: 3600
  });

  // Generate mirror selfie
  const result1 = await clawra.generate({
    prompt: 'wearing a leather jacket',
    mode: 'mirror',
    channel: '#fashion',
    caption: 'New jacket! 🔥'
  });
  console.log('Image URL:', result1.url);

  // Generate direct selfie
  const result2 = await clawra.generate({
    prompt: 'at a cozy cafe',
    mode: 'direct',
    channel: '#lifestyle',
    size: 1024
  });

  // Generate without sending
  const result3 = await clawra.generate({
    prompt: 'reading a book',
    mode: 'direct'
  });
  // Result: { url: string, width: number, height: number }
}

main().catch(console.error);
```

### Mode Detection

```typescript
import { detectMode } from 'clawra';

// Auto-detect mode from prompt
const mode = detectMode('wearing a red dress');
// Returns: 'mirror'

const mode2 = detectMode('at a sunny beach');
// Returns: 'direct'
```

### Prompt Building

```typescript
import { buildPrompt } from 'clawra';

// Build mirror mode prompt
const mirrorPrompt = buildPrompt({
  context: 'wearing a winter coat',
  mode: 'mirror'
});
// Result: "make a pic of this person, but wearing a winter coat. the person is taking a mirror selfie"

// Build direct mode prompt
const directPrompt = buildPrompt({
  context: 'a busy city street',
  mode: 'direct'
});
// Result: "a close-up selfie taken by herself at a busy city street, direct eye contact..."
```

### Error Handling

```typescript
import { Clawra, ClawraError } from 'clawra';

try {
  await clawra.generate({ prompt: '...' });
} catch (error) {
  if (error instanceof ClawraError) {
    switch (error.code) {
      case 'API_ERROR':
        console.error('Provider API error:', error.message);
        break;
      case 'RATE_LIMIT':
        console.error('Rate limited. Retry after:', error.retryAfter);
        break;
      case 'INVALID_PROMPT':
        console.error('Invalid prompt:', error.message);
        break;
      default:
        console.error('Unknown error:', error);
    }
  }
}
```

---

## CLI API

### Installation

```bash
npm install -g clawra
```

### Commands

#### `clawra generate`

Generate a selfie image.

```bash
clawra generate <prompt> [options]
```

**Arguments:**
- `prompt` - Description of the selfie (required)

**Options:**
- `-m, --mode <mode>` - Selfie mode: `auto`, `mirror`, `direct`
- `-c, --channel <channel>` - Target channel (e.g., `#general`)
- `--caption <text>` - Message caption
- `-s, --size <size>` - Image size: `512`, `1024`, `2048`
- `-o, --output <path>` - Save to file instead of sending
- `-n, --num-images <n>` - Number of images (1-4)
- `--format <format>` - Output format: `jpeg`, `png`, `webp`

**Examples:**

```bash
# Basic usage
clawra generate "wearing a santa hat"

# Specify mode
clawra generate "at the beach" --mode direct

# Send to channel
clawra generate "wearing a suit" --channel "#general" --caption "Ready for work!"

# Save to file
clawra generate "reading a book" --output ./selfie.png

# Multiple images
clawra generate "different outfits" --num-images 4
```

#### `clawra test`

Test configuration and generate sample image.

```bash
clawra test [prompt]
```

**Examples:**

```bash
# Test with default prompt
clawra test

# Test with custom prompt
clawra test "wearing sunglasses"
```

#### `clawra config`

Manage configuration.

```bash
clawra config <action> [options]
```

**Actions:**
- `get <key>` - Get configuration value
- `set <key> <value>` - Set configuration value
- `list` - List all configuration

**Examples:**

```bash
# Get provider
clawra config get provider

# Set default mode
clawra config set defaultMode mirror

# List all config
clawra config list
```

#### `clawra cache`

Manage cache.

```bash
clawra cache <action>
```

**Actions:**
- `clear` - Clear all cached images
- `stats` - Show cache statistics

**Examples:**

```bash
# Show cache stats
clawra cache stats

# Clear cache
clawra cache clear
```

---

## HTTP API

If running as a service, Clawra exposes HTTP endpoints.

### POST /generate

Generate a selfie image.

**Request:**

```http
POST /generate HTTP/1.1
Content-Type: application/json
Authorization: Bearer <api-key>

{
  "prompt": "wearing a winter coat",
  "mode": "mirror",
  "size": 1024,
  "format": "jpeg"
}
```

**Response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "url": "https://cdn.example.com/image.jpg",
    "width": 1024,
    "height": 1024,
    "format": "jpeg",
    "prompt": "make a pic of this person, but wearing a winter coat...",
    "mode": "mirror"
  }
}
```

**Error Response:**

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "success": false,
  "error": {
    "code": "INVALID_PROMPT",
    "message": "Prompt is required"
  }
}
```

### GET /health

Health check endpoint.

**Response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "healthy",
  "version": "1.2.0",
  "provider": "fal",
  "cacheEnabled": true
}
```

---

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `FAL_KEY` | fal.ai API key | `fc-xxx...` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-xxx...` |
| `STABILITY_KEY` | Stability AI key | `sk-xxx...` |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `CLAWRA_PROVIDER` | `fal` | Image provider |
| `CLAWRA_MODE` | `auto` | Default selfie mode |
| `CLAWRA_DEFAULT_SIZE` | `1024` | Default image size |
| `CLAWRA_REFERENCE_IMAGE` | (built-in) | Custom reference image URL |
| `CLAWRA_CACHE_ENABLED` | `false` | Enable caching |
| `CLAWRA_CACHE_TTL` | `3600` | Cache TTL in seconds |
| `CLAWRA_CACHE_DIR` | `~/.clawra/cache` | Cache directory |
| `CLAWRA_TIMEOUT` | `30000` | API timeout (ms) |
| `CLAWRA_DEBUG` | `false` | Enable debug logging |
| `CLAWRA_LOG_LEVEL` | `info` | Log level: `debug`, `info`, `warn`, `error` |

### Provider-Specific

**fal.ai:**
- `FAL_MODEL` - Model name (default: `xai/grok-imagine-image/edit`)

**OpenAI:**
- `OPENAI_MODEL` - Model name (default: `dall-e-3`)
- `OPENAI_SIZE` - Image size (default: `1024x1024`)

**Stability AI:**
- `STABILITY_MODEL` - Model name (default: `sdxl-v1-0`)

**Custom Provider:**
- `CUSTOM_API_URL` - API base URL
- `CUSTOM_API_KEY` - API key (if different)
- `CUSTOM_MODEL` - Model name

---

## Types Reference

### SelfieMode

```typescript
type SelfieMode = 'auto' | 'mirror' | 'direct';
```

### Provider

```typescript
type Provider = 'fal' | 'openai' | 'stability' | 'custom';
```

### ImageFormat

```typescript
type ImageFormat = 'jpeg' | 'png' | 'webp';
```

### ImageSize

```typescript
type ImageSize = 512 | 1024 | 2048;
```

### GenerateResult

```typescript
interface GenerateResult {
  url: string;
  width: number;
  height: number;
  format: ImageFormat;
  prompt: string;
  mode: SelfieMode;
  revisedPrompt?: string;
  cached?: boolean;
}
```

---

## Rate Limits

| Provider | Free Tier | Paid Tier |
|----------|-----------|-----------|
| fal.ai | 10 req/min | Higher limits |
| OpenAI | Rate limited by account | $2-8 per image |
| Stability AI | 150 req/day | Higher limits |

Use `CLAWRA_CACHE_ENABLED=true` to reduce API calls.
