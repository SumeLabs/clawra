/**
 * Clawra Selfie image generation and OpenClaw delivery.
 *
 * Supports three backend families:
 * - qwen-image-plus (Alibaba DashScope)
 * - fal (xAI Grok Imagine)
 * - google-nano-banana / google-nano-banana-pro
 */

import { exec } from "child_process";
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

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
type Backend =
  | "qwen-image-plus"
  | "qwen"
  | "volc-seedream"
  | "seedream"
  | "volc-seededit"
  | "seededit"
  | "hunyuan-image"
  | "hunyuan"
  | "fal"
  | "google-nano-banana"
  | "google-nano-banana-pro"
  | "google";
type MediaSource = "url" | "file";

interface GenerateAndSendOptions {
  prompt: string;
  channel: string;
  caption?: string;
  aspectRatio?: AspectRatio;
  outputFormat?: OutputFormat;
  backend?: Backend;
  googleModel?: string;
  useOpenClawCLI?: boolean;
  useClaudeCodeCLI?: boolean;
}

interface Result {
  success: boolean;
  imageUrl: string;
  imageSource: MediaSource;
  channel: string;
  prompt: string;
  backend: Backend;
  model: string;
  generationTimeMs: number;
  revisedPrompt?: string;
}

interface GeneratedImage {
  media: string;
  source: MediaSource;
  backend: Backend;
  model: string;
  revisedPrompt?: string;
}

// Check for fal.ai client
let falClient: any;
try {
  const { fal } = require("@fal-ai/client");
  falClient = fal;
} catch {
  // Will use fetch fallback
  falClient = null;
}

function resolveGoogleApiKey(): string | undefined {
  return (
    process.env.GOOGLE_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.NANO_BANANA_PRO_API_KEY
  );
}

function resolveDashScopeApiKey(): string | undefined {
  return (
    process.env.DASHSCOPE_API_KEY ||
    process.env.ALIBABA_CLOUD_MODEL_STUDIO_API_KEY
  );
}

function resolveDashScopeBaseUrl(): string {
  if (process.env.DASHSCOPE_BASE_URL) return process.env.DASHSCOPE_BASE_URL;
  const region = process.env.DASHSCOPE_REGION || "beijing";
  return region === "singapore"
    ? "https://dashscope-intl.aliyuncs.com"
    : "https://dashscope.aliyuncs.com";
}

function resolveQwenModel(override?: string): string {
  return override || "qwen-image-plus-2026-01-09";
}

function resolveGoogleModel(backend: Backend, override?: string): string {
  if (override) return override;

  if (backend === "google-nano-banana") {
    return "gemini-2.5-flash-image";
  }

  return "gemini-3-pro-image-preview";
}

function assertBackend(backend: string): asserts backend is Backend {
  const supported: Backend[] = [
    "qwen-image-plus",
    "qwen",
    "volc-seedream",
    "seedream",
    "volc-seededit",
    "seededit",
    "hunyuan-image",
    "hunyuan",
    "fal",
    "google-nano-banana",
    "google-nano-banana-pro",
    "google",
  ];

  if (!supported.includes(backend as Backend)) {
    throw new Error(
      `Unsupported backend: ${backend}. Supported: ${supported.join(", ")}`
    );
  }
}

/**
 * Generate image using Grok Imagine via fal.ai
 */
async function generateImageWithFal(
  input: GrokImagineInput
): Promise<GeneratedImage> {
  const falKey = process.env.FAL_KEY;

  if (!falKey) {
    throw new Error(
      "FAL_KEY environment variable not set. Get your key from https://fal.ai/dashboard/keys"
    );
  }

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

    const data = result.data as GrokImagineResponse;
    const media = data.images?.[0]?.url;

    if (!media) {
      throw new Error("fal response missing images[0].url");
    }

    return {
      media,
      source: "url",
      backend: "fal",
      model: "xai/grok-imagine-image",
      revisedPrompt: data.revised_prompt,
    };
  }

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
    throw new Error(`fal image generation failed: ${error}`);
  }

  const data = (await response.json()) as GrokImagineResponse;
  const media = data.images?.[0]?.url;

  if (!media) {
    throw new Error("fal response missing images[0].url");
  }

  return {
    media,
    source: "url",
    backend: "fal",
    model: "xai/grok-imagine-image",
    revisedPrompt: data.revised_prompt,
  };
}

/**
 * Generate image using Google Gemini image models (nano-banana / pro)
 */
async function generateImageWithGoogle(options: {
  prompt: string;
  aspectRatio: AspectRatio;
  backend: Backend;
  googleModel?: string;
}): Promise<GeneratedImage> {
  const googleApiKey = resolveGoogleApiKey();
  if (!googleApiKey) {
    throw new Error(
      "Google API key missing. Set GOOGLE_API_KEY, GEMINI_API_KEY, or NANO_BANANA_PRO_API_KEY"
    );
  }

  const model = resolveGoogleModel(options.backend, options.googleModel);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${googleApiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: options.prompt }] }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: {
            aspectRatio: options.aspectRatio,
          },
        },
      }),
    }
  );

  const raw = await response.text();
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`Google returned non-JSON response: ${raw}`);
  }

  if (!response.ok) {
    const errMsg = data?.error?.message || raw;
    throw new Error(`Google image generation failed: ${errMsg}`);
  }

  if (data?.error) {
    throw new Error(`Google image generation failed: ${data.error.message || data.error}`);
  }

  const parts: any[] = (data?.candidates || []).flatMap(
    (candidate: any) => candidate?.content?.parts || []
  );

  const imagePart = parts.find(
    (part) => typeof part?.inlineData?.data === "string"
  );

  if (!imagePart) {
    throw new Error("Google response does not contain inline image data");
  }

  const mimeType: string = imagePart.inlineData.mimeType || "image/png";
  const imageBase64: string = imagePart.inlineData.data;

  let ext = "png";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) ext = "jpg";
  if (mimeType.includes("webp")) ext = "webp";

  const outputPath = path.join(
    os.tmpdir(),
    `clawra-selfie-google-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  );

  await fs.writeFile(outputPath, Buffer.from(imageBase64, "base64"));

  const revisedPrompt = parts.find(
    (part) => typeof part?.text === "string" && part.text.trim().length > 0
  )?.text;

  return {
    media: outputPath,
    source: "file",
    backend: options.backend,
    model,
    revisedPrompt,
  };
}

/**
 * Generate image using Alibaba Qwen Image (DashScope)
 */
async function generateImageWithQwen(options: {
  prompt: string;
  modelOverride?: string;
}): Promise<GeneratedImage> {
  const apiKey = resolveDashScopeApiKey();
  if (!apiKey) {
    throw new Error(
      "DashScope API key missing. Set DASHSCOPE_API_KEY or ALIBABA_CLOUD_MODEL_STUDIO_API_KEY"
    );
  }

  const model = resolveQwenModel(options.modelOverride);
  const baseUrl = resolveDashScopeBaseUrl();

  const response = await fetch(
    `${baseUrl}/api/v1/services/aigc/multimodal-generation/generation`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: {
          messages: [
            {
              role: "user",
              content: [{ text: options.prompt }],
            },
          ],
        },
        parameters: {
          n: 1,
          size: "1328*1328",
          watermark: false,
          prompt_extend: true,
        },
      }),
    }
  );

  const raw = await response.text();
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`Qwen returned non-JSON response: ${raw}`);
  }

  if (!response.ok || data?.code || data?.error) {
    const errMsg = data?.message || data?.error?.message || raw;
    throw new Error(`Qwen image generation failed: ${errMsg}`);
  }

  const media =
    data?.output?.choices?.[0]?.message?.content?.find(
      (part: any) => typeof part?.image === "string"
    )?.image;

  if (!media) {
    throw new Error("Qwen response missing image url");
  }

  const revisedPrompt = data?.output?.choices?.[0]?.message?.content?.find(
    (part: any) => typeof part?.text === "string"
  )?.text;

  return {
    media,
    source: "url",
    backend: "qwen-image-plus",
    model,
    revisedPrompt,
  };
}

function resolveArkApiKey(): string | undefined {
  return process.env.ARK_API_KEY || process.env.VOLCENGINE_API_KEY;
}

function resolveArkBaseUrl(): string {
  return process.env.ARK_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3";
}

function resolveSeedreamModel(override?: string): string {
  return override || "doubao-seedream-4-0-250828";
}

function resolveSeededitModel(override?: string): string {
  // SeedEdit endpoint is deprecated in some regions.
  // Use Seedream model family for /images/edits as fallback/default.
  return override || process.env.SEEDREAM_EDIT_MODEL || "doubao-seedream-4-0-250828";
}

function assertNoDeprecatedModel(modelOverride?: string): void {
  if (!modelOverride) return;
  if (/seededit3|seededit-3|seed-edit-3/i.test(modelOverride)) {
    throw new Error(
      `Deprecated model override detected: ${modelOverride}. seededit3 has been removed. Use Seedream family models (e.g. doubao-seedream-4-0-250828 / doubao-seedream-4-5-250915).`
    );
  }
}

/**
 * Generate image using Volcengine Ark Seedream
 */
async function generateImageWithSeedream(options: {
  prompt: string;
  modelOverride?: string;
}): Promise<GeneratedImage> {
  const apiKey = resolveArkApiKey();
  if (!apiKey) {
    throw new Error("ARK API key missing. Set ARK_API_KEY or VOLCENGINE_API_KEY");
  }

  const model = resolveSeedreamModel(options.modelOverride);
  const baseUrl = resolveArkBaseUrl();

  const response = await fetch(`${baseUrl}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt: options.prompt,
      response_format: "url",
      size: "1024x1024",
    }),
  });

  const data: any = await response.json();
  if (!response.ok || data?.error) {
    throw new Error(`Seedream generation failed: ${data?.error?.message || JSON.stringify(data)}`);
  }

  const media = data?.data?.[0]?.url || data?.output?.[0]?.url;
  if (!media) throw new Error("Seedream response missing image url");

  return {
    media,
    source: "url",
    backend: "volc-seedream",
    model,
    revisedPrompt: data?.data?.[0]?.revised_prompt,
  };
}

/**
 * Generate image edit using Volcengine Ark /images/edits with Seedream model family.
 * (Keeps legacy backend alias: seededit/volc-seededit)
 */
async function generateImageWithSeededit(options: {
  prompt: string;
  modelOverride?: string;
}): Promise<GeneratedImage> {
  const apiKey = resolveArkApiKey();
  if (!apiKey) {
    throw new Error("ARK API key missing. Set ARK_API_KEY or VOLCENGINE_API_KEY");
  }

  const model = resolveSeededitModel(options.modelOverride);
  const baseUrl = resolveArkBaseUrl();

  const imageInput = await (async () => {
    if (process.env.SEEDREAM_EDIT_IMAGE_URL) return process.env.SEEDREAM_EDIT_IMAGE_URL;

    if (process.env.SEEDREAM_EDIT_IMAGE_PATH) {
      const data = await fs.readFile(process.env.SEEDREAM_EDIT_IMAGE_PATH);
      return `data:image/png;base64,${data.toString("base64")}`;
    }

    return "https://blog-images-1255793008.cos.ap-shanghai.myqcloud.com/images/clawra.png";
  })();

  // Seedream supports text-to-image and image-edit on the same /images/generations endpoint.
  const response = await fetch(`${baseUrl}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt: options.prompt,
      image: imageInput,
      response_format: "url",
      size: process.env.SEEDREAM_EDIT_SIZE || "1024x1024",
    }),
  });

  const raw = await response.text();
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`Seedream edit returned non-JSON response: ${raw}`);
  }

  if (!response.ok || data?.error) {
    throw new Error(`Seedream edit failed: ${data?.error?.message || JSON.stringify(data)}`);
  }

  const media = data?.data?.[0]?.url || data?.output?.[0]?.url;
  if (!media) throw new Error("Seedream edit response missing image url");

  return {
    media,
    source: "url",
    backend: "volc-seededit",
    model,
    revisedPrompt: data?.data?.[0]?.revised_prompt,
  };
}

/**
 * Map an aspect ratio string to the nearest valid Hunyuan resolution.
 * Constraints: width and height each in [512, 2048], width×height ≤ 1024×1024.
 * Reference image (Clawra) is 784×1168 (~2:3 portrait), so default is 640:960.
 */
function aspectRatioToHunyuanResolution(ratio: string): string {
  const lookup: Record<string, string> = {
    "1:1":    "1024:1024",
    "4:3":    "1024:768",
    "3:4":    "768:1024",
    "16:9":   "1024:576",
    "9:16":   "576:1024",
    "3:2":    "960:640",
    "2:3":    "640:960",
    "2:1":    "1024:512",
    "1:2":    "512:1024",
    "20:9":   "1024:461",
    "9:20":   "461:1024",
    "19.5:9": "1024:473",
    "9:19.5": "473:1024",
  };
  if (lookup[ratio]) return lookup[ratio];

  // Fallback: compute from ratio string "w:h"
  const parts = ratio.split(":");
  if (parts.length === 2) {
    const rw = parseFloat(parts[0]);
    const rh = parseFloat(parts[1]);
    if (rw > 0 && rh > 0) {
      const maxArea = 1024 * 1024;
      let w = Math.round(Math.sqrt(maxArea * rw / rh));
      let h = Math.round(w * rh / rw);
      // Clamp to [512, 2048]
      w = Math.max(512, Math.min(2048, w));
      h = Math.max(512, Math.min(2048, h));
      // Ensure area constraint
      if (w * h > maxArea) {
        const scale = Math.sqrt(maxArea / (w * h));
        w = Math.floor(w * scale);
        h = Math.floor(h * scale);
      }
      return `${w}:${h}`;
    }
  }

  // Default: portrait matching Clawra reference image (~2:3)
  return "640:960";
}

/**
 * Generate image using Tencent Hunyuan Image 3.0 (SubmitTextToImageJob + QueryTextToImageJob).
 * Passes the Clawra reference image URL via Images[] as a reference/pad image.
 */
async function generateImageWithHunyuan(options: {
  prompt: string;
  aspectRatio?: AspectRatio | string;
  outputFormat?: OutputFormat;
}): Promise<GeneratedImage> {
  const secretId = process.env.TENCENT_SECRET_ID;
  const secretKey = process.env.TENCENT_SECRET_KEY;

  if (!secretId || !secretKey) {
    throw new Error("Tencent credentials missing. Set TENCENT_SECRET_ID and TENCENT_SECRET_KEY");
  }

  let tencentcloud: any;
  try {
    tencentcloud = require("tencentcloud-sdk-nodejs");
  } catch {
    throw new Error("Missing dependency: tencentcloud-sdk-nodejs. Install with: npm i tencentcloud-sdk-nodejs");
  }

  const region = process.env.TENCENT_REGION || "ap-guangzhou";
  const endpoint = process.env.TENCENT_AIART_ENDPOINT || "aiart.tencentcloudapi.com";
  const AiartClient = tencentcloud.aiart.v20221229.Client;

  const client = new AiartClient({
    credential: { secretId, secretKey },
    region,
    profile: { httpProfile: { endpoint } },
  });

  const refUrl =
    process.env.TENCENT_REFERENCE_IMAGE_URL ||
    "https://blog-images-1255793008.cos.ap-shanghai.myqcloud.com/images/clawra.png";

  const resolution =
    process.env.TENCENT_RESOLUTION ||
    (options.aspectRatio ? aspectRatioToHunyuanResolution(options.aspectRatio) : "640:960");

  const submitParams: Record<string, unknown> = {
    Prompt: options.prompt,
    Images: [refUrl],
    Resolution: resolution,
    LogoAdd: Number(process.env.TENCENT_LOGO_ADD ?? "0"),
    Revise: process.env.TENCENT_REVISE === "0" ? 0 : 1,
  };

  if (process.env.TENCENT_SEED) {
    submitParams.Seed = Number(process.env.TENCENT_SEED);
  }

  const submitResp = await client.SubmitTextToImageJob(submitParams);
  const jobId = submitResp?.JobId;
  if (!jobId) {
    throw new Error(`SubmitTextToImageJob returned no JobId: ${JSON.stringify(submitResp)}`);
  }

  const maxAttempts = 120;
  const pollIntervalMs = 1000;

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, pollIntervalMs));

    const queryResp = await client.QueryTextToImageJob({ JobId: jobId });
    const statusCode = queryResp?.JobStatusCode;

    if (statusCode === "4") {
      throw new Error(`Hunyuan job failed: ${queryResp.JobErrorCode} - ${queryResp.JobErrorMsg}`);
    }

    if (statusCode === "5" && queryResp?.ResultImage?.[0]) {
      return {
        media: queryResp.ResultImage[0],
        source: "url",
        backend: "hunyuan-image",
        model: "aiart/v20221229 SubmitTextToImageJob",
      };
    }
  }

  throw new Error(`Hunyuan job timed out after ${(maxAttempts * pollIntervalMs) / 1000}s`);
}

/**
 * Send image via OpenClaw
 */
async function sendViaOpenClaw(
  message: OpenClawMessage,
  useCLI: boolean = true
): Promise<void> {
  if (useCLI) {
    const cmd = `openclaw message send --action send --channel "${message.channel}" --message "${message.message}" --media "${message.media}"`;
    await execAsync(cmd);
    return;
  }

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
 * Main function: Generate image and send to channel
 */
async function generateAndSend(options: GenerateAndSendOptions): Promise<Result> {
  const {
    prompt,
    channel,
    aspectRatio = "1:1",
    outputFormat = "jpeg",
    backend = "qwen-image-plus",
    googleModel,
  } = options;

  const useOpenClawCLI =
    options.useOpenClawCLI ?? options.useClaudeCodeCLI ?? true;

  assertBackend(backend);

  const caption =
    options.caption ||
    (backend === "fal"
      ? "Generated with Grok Imagine"
      : backend === "qwen-image-plus" || backend === "qwen"
      ? "Generated with Qwen Image"
      : backend === "volc-seedream" || backend === "seedream"
      ? "Generated with Seedream"
      : backend === "volc-seededit" || backend === "seededit"
      ? "Generated with Seedream Edit"
      : backend === "hunyuan-image" || backend === "hunyuan"
      ? "Generated with Tencent Hunyuan Image"
      : "Generated with Google Nano Banana");

  console.log(`[INFO] Generating image...`);
  console.log(`[INFO] Backend: ${backend}`);
  console.log(`[INFO] Prompt: ${prompt}`);
  console.log(`[INFO] Aspect ratio: ${aspectRatio}`);

  if (
    (backend === "google-nano-banana" ||
      backend === "google-nano-banana-pro" ||
      backend === "google") &&
    outputFormat !== "png"
  ) {
    console.log(
      `[WARN] Google backend ignores outputFormat=${outputFormat}; output format is model-defined.`
    );
  }

  const generationStart = Date.now();

  const generated =
    backend === "fal"
      ? await generateImageWithFal({
          prompt,
          num_images: 1,
          aspect_ratio: aspectRatio,
          output_format: outputFormat,
        })
      : backend === "qwen-image-plus" || backend === "qwen"
      ? await generateImageWithQwen({
          prompt,
          modelOverride: googleModel,
        })
      : backend === "volc-seedream" || backend === "seedream"
      ? await generateImageWithSeedream({
          prompt,
          modelOverride: googleModel,
        })
      : backend === "volc-seededit" || backend === "seededit"
      ? await generateImageWithSeededit({
          prompt,
          modelOverride: googleModel,
        })
      : backend === "hunyuan-image" || backend === "hunyuan"
      ? await generateImageWithHunyuan({
          prompt,
          aspectRatio,
          outputFormat,
        })
      : await generateImageWithGoogle({
          prompt,
          aspectRatio,
          backend,
          googleModel,
        });

  const generationTimeMs = Date.now() - generationStart;
  const generationTimeSeconds = (generationTimeMs / 1000).toFixed(1);

  console.log(`[INFO] Model: ${generated.model}`);
  console.log(`[INFO] Generation time: ${generationTimeSeconds}s`);
  console.log(`[INFO] Media: ${generated.media}`);

  if (generated.revisedPrompt) {
    console.log(`[INFO] Revised prompt: ${generated.revisedPrompt}`);
  }

  console.log(`[INFO] Sending to channel: ${channel}`);

  await sendViaOpenClaw(
    {
      action: "send",
      channel,
      message: caption,
      media: generated.media,
    },
    useOpenClawCLI
  );

  console.log(`[INFO] Done! Image sent to ${channel}`);

  return {
    success: true,
    imageUrl: generated.media,
    imageSource: generated.source,
    channel,
    prompt,
    backend: generated.backend,
    model: generated.model,
    generationTimeMs,
    revisedPrompt: generated.revisedPrompt,
  };
}

// CLI entry point
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(`
Usage: npx ts-node clawra-selfie.ts <prompt> <channel> [caption] [aspect_ratio] [output_format] [backend] [model_override]

Arguments:
  prompt        - Image description (required)
  channel       - Target channel (required) e.g., #general, @user
  caption       - Message caption (default: auto by backend)
  aspect_ratio  - Image ratio (default: 1:1)
  output_format - Image format (fal only, default: jpeg)
  backend       - qwen-image-plus | qwen | volc-seedream | seedream | volc-seededit | seededit | hunyuan-image | hunyuan | fal | google-nano-banana | google-nano-banana-pro | google (default: qwen-image-plus)
  model_override- Optional model override (qwen/google/volc)

Environment:
  DASHSCOPE_API_KEY        - Qwen backend key (or ALIBABA_CLOUD_MODEL_STUDIO_API_KEY)
  DASHSCOPE_REGION         - beijing | singapore (default: beijing)
  DASHSCOPE_BASE_URL       - Optional base URL override
  FAL_KEY                  - fal backend key
  GOOGLE_API_KEY           - Google backend key (or GEMINI_API_KEY / NANO_BANANA_PRO_API_KEY)
  TENCENT_SECRET_ID        - Tencent Cloud SecretId (hunyuan backend)
  TENCENT_SECRET_KEY       - Tencent Cloud SecretKey (hunyuan backend)
  TENCENT_REGION           - Tencent region (default: ap-guangzhou)
  TENCENT_AIART_ENDPOINT   - Tencent aiart endpoint override (default: aiart.tencentcloudapi.com)
  TENCENT_REFERENCE_IMAGE_URL - Reference image URL passed as Images[0] (default: Clawra CDN URL)
  TENCENT_RESOLUTION       - Image resolution (default: 1024:1024)
  TENCENT_LOGO_ADD         - Add watermark 0|1 (default: 0)
  TENCENT_REVISE           - Prompt rewriting 0|1 (default: 1)
  TENCENT_SEED             - Optional random seed (integer)
  SEEDREAM_EDIT_MODEL      - Optional model for seededit backend (default: doubao-seedream-4.0)
  OPENCLAW_GATEWAY_URL     - Optional gateway URL
  OPENCLAW_GATEWAY_TOKEN   - Optional gateway auth token

Examples:
  DASHSCOPE_API_KEY=*** npx ts-node clawra-selfie.ts "A stylish mirror selfie in a cafe" "#art" "Qwen selfie" "1:1" "png" "qwen-image-plus"
  FAL_KEY=*** npx ts-node clawra-selfie.ts "A cyberpunk city" "#art" "Check this out!" "1:1" "jpeg" "fal"
  GOOGLE_API_KEY=*** npx ts-node clawra-selfie.ts "A cat astronaut" "#art" "Nano Banana" "1:1" "png" "google-nano-banana-pro"
  TENCENT_SECRET_ID=*** TENCENT_SECRET_KEY=*** npx ts-node clawra-selfie.ts "保持人物不变，换成城市夜景自拍" "#art" "Hunyuan edit" "1:1" "png" "hunyuan"
`);
    process.exit(1);
  }

  const [prompt, channel, caption, aspectRatio, outputFormat, backendArg, googleModel] = args;
  const backend = (backendArg || "qwen-image-plus") as Backend;

  try {
    assertBackend(backend);
    assertNoDeprecatedModel(googleModel);

    const result = await generateAndSend({
      prompt,
      channel,
      caption,
      aspectRatio: (aspectRatio as AspectRatio) || "1:1",
      outputFormat: (outputFormat as OutputFormat) || "jpeg",
      backend,
      googleModel,
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
  generateImageWithFal,
  generateImageWithQwen,
  generateImageWithSeedream,
  generateImageWithSeededit,
  generateImageWithHunyuan,
  generateImageWithGoogle,
  sendViaOpenClaw,
  generateAndSend,
  GrokImagineInput,
  GrokImagineResponse,
  OpenClawMessage,
  GenerateAndSendOptions,
  Result,
  Backend,
};

// Run if executed directly
if (require.main === module) {
  main();
}
