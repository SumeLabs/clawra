/**
 * Clawra Selfie - Image Generation to OpenClaw Integration
 *
 * Generates images using a configurable image generation provider and
 * sends them to messaging channels via OpenClaw.
 *
 * Supported providers:
 *   - grok:   xAI Grok Imagine via fal.ai (default)
 *   - minimax: MiniMax image-01 / image-01-live via the regional
 *             image_generation endpoints
 *
 * Usage:
 *   npx ts-node clawra-selfie.ts "<prompt>" "<channel>" ["<caption>"]
 *
 * Environment variables:
 *   PROVIDER          - "grok" (default) or "minimax"
 *   FAL_KEY           - Your fal.ai API key (required for the grok provider)
 *   MINIMAX_API_KEY   - Your MiniMax API key (required for the minimax provider)
 *   MINIMAX_REGION    - "global_en" (default) or "cn_zh"
 *   MINIMAX_MODEL     - "image-01" (default) or "image-01-live"
 *   MINIMAX_RESPONSE_FORMAT - "url" (default) or "base64"
 *   MINIMAX_SUBJECT_REFERENCE - Reference image URL or data URL (defaults to Clawra)
 *   MINIMAX_WIDTH / MINIMAX_HEIGHT - Optional image dimensions, set together
 *   MINIMAX_SEED      - Optional integer seed
 *   MINIMAX_N         - Optional image count from 1 to 9
 *   MINIMAX_PROMPT_OPTIMIZER - Optional "true" or "false"
 *   OPENCLAW_GATEWAY_URL - OpenClaw gateway URL (default: http://localhost:18789)
 *   OPENCLAW_GATEWAY_TOKEN - Gateway auth token (optional)
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const REFERENCE_IMAGE =
  "https://cdn.jsdelivr.net/gh/SumeLabs/clawra@main/assets/clawra.png";

// Types
interface GrokImagineInput {
  prompt: string;
  num_images?: number;
  aspect_ratio?: AspectRatio;
  output_format?: OutputFormat;
}

interface GrokImagineImage {
  url: string;
  content_type: string;
  file_name?: string;
  width: number;
  height: number;
}

interface GrokImagineResponse {
  images: GrokImagineImage[];
  revised_prompt?: string;
}

interface OpenClawMessage {
  action: "send";
  channel: string;
  message: string;
  media?: string;
}

type AspectRatio =
  | "2:1"
  | "20:9"
  | "19.5:9"
  | "16:9"
  | "4:3"
  | "3:2"
  | "1:1"
  | "2:3"
  | "3:4"
  | "9:16"
  | "9:19.5"
  | "9:20"
  | "1:2";

type OutputFormat = "jpeg" | "png" | "webp";

type Provider = "grok" | "minimax";
type MiniMaxResponseFormat = "url" | "base64";
type MiniMaxRegion = "global_en" | "cn_zh";
type MiniMaxModel = "image-01" | "image-01-live";
type MiniMaxAspectRatio =
  | "1:1"
  | "16:9"
  | "4:3"
  | "3:2"
  | "2:3"
  | "3:4"
  | "9:16"
  | "21:9";

// MiniMax configuration (derived from the MiniMax image_generation reference).
// Regional endpoints for the image_generation operation.
const MINIMAX_ENDPOINTS: Record<MiniMaxRegion, string> = {
  global_en: "https://api.minimax.io/v1/image_generation",
  cn_zh: "https://api.minimaxi.com/v1/image_generation",
};

// Supported MiniMax image models. The first entry is the default.
const MINIMAX_MODELS: MiniMaxModel[] = ["image-01", "image-01-live"];
const MINIMAX_DEFAULT_MODEL: MiniMaxModel = MINIMAX_MODELS[0];
const MINIMAX_DEFAULT_REGION: MiniMaxRegion = "global_en";

interface MiniMaxSubjectReference {
  type: "character";
  image_file: string;
}

// MiniMax image_generation request fields (per the image reference).
interface MiniMaxImageRequest {
  model: MiniMaxModel;
  prompt: string;
  subject_reference?: MiniMaxSubjectReference[];
  aspect_ratio?: MiniMaxAspectRatio;
  width?: number;
  height?: number;
  response_format?: "url" | "base64";
  seed?: number;
  n?: number;
  prompt_optimizer?: boolean;
}

interface MiniMaxResponse {
  data?: {
    image_urls?: string[];
  };
  metadata?: {
    success_count?: number;
    failed_count?: number;
  };
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
}

interface GenerateAndSendOptions {
  prompt: string;
  channel: string;
  caption?: string;
  aspectRatio?: AspectRatio;
  outputFormat?: OutputFormat;
  useClaudeCodeCLI?: boolean;
  provider?: Provider;
  // MiniMax-only options
  minimaxRegion?: MiniMaxRegion;
  minimaxModel?: MiniMaxModel;
  minimaxResponseFormat?: MiniMaxResponseFormat;
  subjectReference?: MiniMaxSubjectReference[];
  width?: number;
  height?: number;
  seed?: number;
  n?: number;
  promptOptimizer?: boolean;
}

interface Result {
  success: boolean;
  imageUrl: string;
  channel: string;
  prompt: string;
  revisedPrompt?: string;
  provider: Provider;
}

// Check for fal.ai client
let falClient: any;
try {
  const { fal } = require("@fal-ai/client");
  falClient = fal;
} catch {
  // Will use fetch instead
  falClient = null;
}

/**
 * Generate image using Grok Imagine via fal.ai
 */
async function generateImageGrok(
  input: GrokImagineInput
): Promise<GrokImagineResponse> {
  const falKey = process.env.FAL_KEY;

  if (!falKey) {
    throw new Error(
      "FAL_KEY environment variable not set. Get your key from https://fal.ai/dashboard/keys"
    );
  }

  // Use fal client if available
  if (falClient) {
    falClient.config({ credentials: falKey });

    const result = await falClient.subscribe("xai/grok-imagine-image", {
      input: {
        prompt: input.prompt,
        num_images: input.num_images || 1,
        aspect_ratio: input.aspect_ratio || "1:1",
        output_format: input.output_format || "jpeg",
      },
    });

    return result.data as GrokImagineResponse;
  }

  // Fallback to fetch
  const response = await fetch("https://fal.run/xai/grok-imagine-image", {
    method: "POST",
    headers: {
      Authorization: `Key ${falKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: input.prompt,
      num_images: input.num_images || 1,
      aspect_ratio: input.aspect_ratio || "1:1",
      output_format: input.output_format || "jpeg",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Image generation failed: ${error}`);
  }

  return response.json();
}

/**
 * Generate image using MiniMax image_generation.
 *
 * Calls the regional image_generation endpoint with Bearer authorization,
 * sends the documented request fields, and parses `data.image_urls`.
 */
async function generateImageMiniMax(
  options: GenerateAndSendOptions
): Promise<string> {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    throw new Error(
      "MINIMAX_API_KEY environment variable not set. Get your key from https://platform.minimax.io"
    );
  }

  const regionValue =
    options.minimaxRegion ||
    process.env.MINIMAX_REGION ||
    MINIMAX_DEFAULT_REGION;
  if (!(regionValue in MINIMAX_ENDPOINTS)) {
    throw new Error(
      `Unknown MINIMAX_REGION "${regionValue}". Supported regions: ${Object.keys(
        MINIMAX_ENDPOINTS
      ).join(", ")}`
    );
  }
  const region = regionValue as MiniMaxRegion;
  const endpoint = MINIMAX_ENDPOINTS[region];

  const modelValue =
    options.minimaxModel || process.env.MINIMAX_MODEL || MINIMAX_DEFAULT_MODEL;
  if (!MINIMAX_MODELS.includes(modelValue as MiniMaxModel)) {
    throw new Error(
      `Unknown MiniMax model "${modelValue}". Supported models: ${MINIMAX_MODELS.join(
        ", "
      )}`
    );
  }
  const model = modelValue as MiniMaxModel;

  // Build the request body from the documented request fields, only including
  // optional fields when they are provided.
  const body: MiniMaxImageRequest = {
    model,
    prompt: options.prompt,
  };

  const responseFormat =
    options.minimaxResponseFormat ||
    process.env.MINIMAX_RESPONSE_FORMAT ||
    "url";
  if (responseFormat !== "url" && responseFormat !== "base64") {
    throw new Error(
      `Unknown MINIMAX_RESPONSE_FORMAT "${responseFormat}". Supported formats: url, base64`
    );
  }
  body.response_format = responseFormat;

  body.subject_reference = options.subjectReference || [
    {
      type: "character",
      image_file: process.env.MINIMAX_SUBJECT_REFERENCE || REFERENCE_IMAGE,
    },
  ];

  if (options.aspectRatio) {
    const supportedRatios: MiniMaxAspectRatio[] = [
      "1:1",
      "16:9",
      "4:3",
      "3:2",
      "2:3",
      "3:4",
      "9:16",
      "21:9",
    ];
    if (!supportedRatios.includes(options.aspectRatio as MiniMaxAspectRatio)) {
      throw new Error(
        `Unsupported MiniMax aspect ratio "${options.aspectRatio}". Supported ratios: ${supportedRatios.join(
          ", "
        )}`
      );
    }
    body.aspect_ratio = options.aspectRatio as MiniMaxAspectRatio;
  }

  const width =
    options.width ?? parseOptionalIntegerEnv("MINIMAX_WIDTH");
  const height =
    options.height ?? parseOptionalIntegerEnv("MINIMAX_HEIGHT");
  if ((width === undefined) !== (height === undefined)) {
    throw new Error("MINIMAX_WIDTH and MINIMAX_HEIGHT must be set together");
  }
  if (width !== undefined && height !== undefined) {
    body.width = width;
    body.height = height;
  }

  const seed = options.seed ?? parseOptionalIntegerEnv("MINIMAX_SEED");
  if (seed !== undefined) {
    body.seed = seed;
  }

  const imageCount = options.n ?? parseOptionalIntegerEnv("MINIMAX_N");
  if (imageCount !== undefined) {
    if (imageCount < 1 || imageCount > 9) {
      throw new Error("MINIMAX_N must be between 1 and 9");
    }
    body.n = imageCount;
  }

  const promptOptimizer =
    options.promptOptimizer ??
    parseOptionalBooleanEnv("MINIMAX_PROMPT_OPTIMIZER");
  if (promptOptimizer !== undefined) {
    body.prompt_optimizer = promptOptimizer;
  }

  console.log(`[INFO] MiniMax region: ${region}`);
  console.log(`[INFO] MiniMax model: ${model}`);
  console.log(`[INFO] Endpoint: ${endpoint}`);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`MiniMax image generation failed: ${error}`);
  }

  const result = (await response.json()) as MiniMaxResponse;

  // Parse the documented response fields.
  const statusCode = result.base_resp?.status_code;
  if (statusCode !== undefined && statusCode !== 0) {
    const statusMsg = result.base_resp?.status_msg || "unknown error";
    throw new Error(
      `MiniMax image generation failed (status_code=${statusCode}): ${statusMsg}`
    );
  }

  const imageUrls = result.data?.image_urls;
  if (!imageUrls || imageUrls.length === 0) {
    throw new Error(
      "MiniMax image generation returned no image URLs in data.image_urls"
    );
  }

  const successCount = result.metadata?.success_count;
  const failedCount = result.metadata?.failed_count;
  if (successCount !== undefined || failedCount !== undefined) {
    console.log(
      `[INFO] MiniMax metadata: success_count=${successCount ?? "n/a"} failed_count=${failedCount ?? "n/a"}`
    );
  }

  return imageUrls[0];
}

function parseOptionalIntegerEnv(name: string): number | undefined {
  const value = process.env[name];
  if (!value) {
    return undefined;
  }
  if (!/^-?\d+$/.test(value)) {
    throw new Error(`${name} must be an integer`);
  }
  return Number(value);
}

function parseOptionalBooleanEnv(name: string): boolean | undefined {
  const value = process.env[name];
  if (!value) {
    return undefined;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  throw new Error(`${name} must be "true" or "false"`);
}

/**
 * Send image via OpenClaw
 */
async function sendViaOpenClaw(
  message: OpenClawMessage,
  useCLI: boolean = true
): Promise<void> {
  if (useCLI) {
    // Use OpenClaw CLI
    const cmd = `openclaw message send --action send --channel "${message.channel}" --message "${message.message}" --media "${message.media}"`;
    await execAsync(cmd);
    return;
  }

  // Direct API call
  const gatewayUrl =
    process.env.OPENCLAW_GATEWAY_URL || "http://localhost:18789";
  const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (gatewayToken) {
    headers["Authorization"] = `Bearer ${gatewayToken}`;
  }

  const response = await fetch(`${gatewayUrl}/message`, {
    method: "POST",
    headers,
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenClaw send failed: ${error}`);
  }
}

/**
 * Resolve the image generation provider from the environment.
 */
function resolveProvider(optional?: Provider): Provider {
  const fromEnv = (process.env.PROVIDER || "").toLowerCase();
  if (optional) {
    return optional;
  }
  if (!fromEnv || fromEnv === "grok") {
    return "grok";
  }
  if (fromEnv === "minimax") {
    return "minimax";
  }
  throw new Error(
    `Unknown PROVIDER "${process.env.PROVIDER}". Supported providers: grok, minimax`
  );
}

/**
 * Main function: Generate image and send to channel
 */
async function generateAndSend(options: GenerateAndSendOptions): Promise<Result> {
  const {
    prompt,
    channel,
    caption = "Generated with Clawra Selfie",
    aspectRatio = "1:1",
    outputFormat = "jpeg",
    useClaudeCodeCLI = true,
  } = options;

  const provider = resolveProvider(options.provider);

  console.log(`[INFO] Provider: ${provider}`);
  console.log(`[INFO] Generating image...`);
  console.log(`[INFO] Prompt: ${prompt}`);
  console.log(`[INFO] Aspect ratio: ${aspectRatio}`);

  let imageUrl: string;
  let revisedPrompt: string | undefined;

  if (provider === "minimax") {
    imageUrl = await generateImageMiniMax(options);
  } else {
    const imageResult = await generateImageGrok({
      prompt,
      num_images: 1,
      aspect_ratio: aspectRatio,
      output_format: outputFormat,
    });
    imageUrl = imageResult.images[0].url;
    revisedPrompt = imageResult.revised_prompt;
  }

  console.log(`[INFO] Image generated: ${imageUrl}`);

  if (revisedPrompt) {
    console.log(`[INFO] Revised prompt: ${revisedPrompt}`);
  }

  // Send via OpenClaw
  console.log(`[INFO] Sending to channel: ${channel}`);

  await sendViaOpenClaw(
    {
      action: "send",
      channel,
      message: caption,
      media: imageUrl,
    },
    useClaudeCodeCLI
  );

  console.log(`[INFO] Done! Image sent to ${channel}`);

  return {
    success: true,
    imageUrl,
    channel,
    prompt,
    revisedPrompt,
    provider,
  };
}

// CLI entry point
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(`
Usage: npx ts-node clawra-selfie.ts <prompt> <channel> [caption] [aspect_ratio] [output_format]

Arguments:
  prompt        - Image description (required)
  channel       - Target channel (required) e.g., #general, @user
  caption       - Message caption (default: 'Generated with Clawra Selfie')
  aspect_ratio  - Image ratio (default: 1:1); MiniMax also supports 3:2, 2:3, 21:9
  output_format - Image format (default: jpeg) Options: jpeg, png, webp (grok provider)

Environment:
  PROVIDER          - "grok" (default) or "minimax"
  FAL_KEY           - Your fal.ai API key (required for the grok provider)
  MINIMAX_API_KEY   - Your MiniMax API key (required for the minimax provider)
  MINIMAX_REGION    - "global_en" (default) or "cn_zh"
  MINIMAX_MODEL     - "image-01" (default) or "image-01-live"
  MINIMAX_RESPONSE_FORMAT - "url" (default) or "base64"
  MINIMAX_SUBJECT_REFERENCE - Reference image URL or data URL (defaults to Clawra)
  MINIMAX_WIDTH / MINIMAX_HEIGHT - Optional image dimensions, set together
  MINIMAX_SEED       - Optional integer seed
  MINIMAX_N          - Optional image count from 1 to 9
  MINIMAX_PROMPT_OPTIMIZER - Optional "true" or "false"

Example (Grok):
  FAL_KEY=your_key npx ts-node clawra-selfie.ts "A cyberpunk city" "#art" "Check this out!"

Example (MiniMax):
  PROVIDER=minimax MINIMAX_API_KEY=your_key npx ts-node clawra-selfie.ts "A cyberpunk city" "#art" "Check this out!"
`);
    process.exit(1);
  }

  const [prompt, channel, caption, aspectRatio, outputFormat] = args;

  try {
    const result = await generateAndSend({
      prompt,
      channel,
      caption,
      aspectRatio: aspectRatio as AspectRatio,
      outputFormat: outputFormat as OutputFormat,
    });

    console.log("\n--- Result ---");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`[ERROR] ${(error as Error).message}`);
    process.exit(1);
  }
}

// Export for module use
export {
  generateImageGrok,
  generateImageMiniMax,
  sendViaOpenClaw,
  generateAndSend,
  GrokImagineInput,
  GrokImagineResponse,
  MiniMaxImageRequest,
  MiniMaxResponse,
  MiniMaxSubjectReference,
  OpenClawMessage,
  GenerateAndSendOptions,
  Result,
};

// Run if executed directly
if (require.main === module) {
  main();
}
