/**
 * Clawra Selfie – Multi-Provider Image Generation & Editing
 *
 * Generates or edits images using multiple AI providers and sends them
 * to messaging channels via OpenClaw.
 *
 * Supported providers (set via IMAGE_PROVIDER env var):
 *   - fal    (fal.ai / Grok Imagine)    – requires FAL_KEY
 *   - openai (OpenAI gpt-image-1)       – requires OPENAI_API_KEY
 *   - google (Google Gemini)             – requires GEMINI_API_KEY
 *   - xai    (x.ai direct)              – requires XAI_API_KEY
 *
 * Usage:
 *   npx ts-node clawra-selfie.ts <prompt> <channel> [caption] [aspect_ratio] [output_format] [provider]
 *
 * Environment variables:
 *   IMAGE_PROVIDER             - Provider to use (default: fal)
 *   FAL_KEY / OPENAI_API_KEY / GEMINI_API_KEY / XAI_API_KEY
 *   OPENCLAW_GATEWAY_URL       - OpenClaw gateway URL (default: http://localhost:18789)
 *   OPENCLAW_GATEWAY_TOKEN     - Gateway auth token (optional)
 */

import { exec } from "child_process";
import { promisify } from "util";

import {
  getProvider,
  PROVIDER_ENV_KEYS,
  AVAILABLE_PROVIDERS,
} from "./providers";
import type {
  AspectRatio,
  OutputFormat,
  ProviderName,
  GenerateImageResult,
} from "./providers";

const execAsync = promisify(exec);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OpenClawMessage {
  action: "send";
  channel: string;
  message: string;
  media?: string;
}

interface GenerateAndSendOptions {
  prompt: string;
  channel: string;
  caption?: string;
  aspectRatio?: AspectRatio;
  outputFormat?: OutputFormat;
  provider?: ProviderName;
  useClaudeCodeCLI?: boolean;
}

interface Result {
  success: boolean;
  imageUrl: string;
  channel: string;
  prompt: string;
  provider: string;
  revisedPrompt?: string;
}

// ---------------------------------------------------------------------------
// OpenClaw integration
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Main logic
// ---------------------------------------------------------------------------

async function generateAndSend(
  options: GenerateAndSendOptions
): Promise<Result> {
  const {
    prompt,
    channel,
    caption = "Generated with Clawra",
    aspectRatio = "1:1",
    outputFormat = "jpeg",
    provider: providerName,
    useClaudeCodeCLI = true,
  } = options;

  // Resolve provider
  const provider = getProvider(providerName);
  console.log(`[INFO] Provider: ${provider.name}`);
  console.log(`[INFO] Generating image...`);
  console.log(`[INFO] Prompt: ${prompt}`);
  console.log(`[INFO] Aspect ratio: ${aspectRatio}`);

  // Generate image
  const imageResult: GenerateImageResult = await provider.generateImage({
    prompt,
    numImages: 1,
    aspectRatio,
    outputFormat,
  });

  const imageUrl = imageResult.images[0].url;
  console.log(`[INFO] Image generated: ${imageUrl}`);

  if (imageResult.revisedPrompt) {
    console.log(`[INFO] Revised prompt: ${imageResult.revisedPrompt}`);
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
    provider: provider.name,
    revisedPrompt: imageResult.revisedPrompt,
  };
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(`
Usage: npx ts-node clawra-selfie.ts <prompt> <channel> [caption] [aspect_ratio] [output_format] [provider]

Arguments:
  prompt        - Image description (required)
  channel       - Target channel (required) e.g., #general, @user
  caption       - Message caption (default: 'Generated with Clawra')
  aspect_ratio  - Image ratio (default: 1:1) Options: 2:1, 16:9, 4:3, 1:1, 3:4, 9:16
  output_format - Image format (default: jpeg) Options: jpeg, png, webp
  provider      - Image provider (default: fal) Options: ${AVAILABLE_PROVIDERS.join(", ")}

Environment:
  IMAGE_PROVIDER   - Default provider (overridden by provider argument)
${AVAILABLE_PROVIDERS.map((p) => `  ${PROVIDER_ENV_KEYS[p].padEnd(17)}- Required for provider: ${p}`).join("\n")}

Example:
  FAL_KEY=xxx npx ts-node clawra-selfie.ts "A cyberpunk city" "#art" "Check this!"
  IMAGE_PROVIDER=openai OPENAI_API_KEY=xxx npx ts-node clawra-selfie.ts "A sunset" "#photos"
`);
    process.exit(1);
  }

  const [prompt, channel, caption, aspectRatio, outputFormat, provider] = args;

  try {
    const result = await generateAndSend({
      prompt,
      channel,
      caption,
      aspectRatio: aspectRatio as AspectRatio,
      outputFormat: outputFormat as OutputFormat,
      provider: provider as ProviderName,
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
  sendViaOpenClaw,
  generateAndSend,
  OpenClawMessage,
  GenerateAndSendOptions,
  Result,
};

// Run if executed directly
if (require.main === module) {
  main();
}
