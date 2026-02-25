#!/usr/bin/env node
"use strict";

require("ts-node/register/transpile-only");

const fs = require("node:fs");
const path = require("node:path");

const ONLINE_REFERENCE_IMAGE = "http://tb0178hpn.hn-bkt.clouddn.com/clawra.png";
const LOCAL_REFERENCE_IMAGE = path.resolve(__dirname, "../skill/assets/clawra.png");

const {
  generateImageWithFal,
  generateImageWithFalEdit,
  generateImageWithGoogle,
  generateImageWithHunyuan,
  generateImageWithQwen,
  generateImageWithQwenEdit,
  generateImageWithSeededit,
  generateImageWithSeedream,
} = require("./clawra-selfie.ts");

const PLATFORM_CAPS = {
  fal: ["generate", "edit"],
  volc: ["generate", "edit"],
  qwen: ["generate", "edit"],
  google: ["generate"],
  hunyuan: ["generate", "edit"],
};

const DEFAULT_MODELS = {
  fal: {
    generate: "xai/grok-imagine-image",
    edit: "xai/grok-imagine-image/edit",
  },
  volc: {
    generate: "doubao-seedream-5-0-260128",
    edit: "doubao-seedream-5-0-260128",
  },
  qwen: {
    generate: "qwen-image-plus-2026-01-09",
    edit: "qwen-image-edit-plus",
  },
  google: {
    generate: "gemini-3-pro-image-preview",
  },
  hunyuan: {
    generate: "aiart/v20221229 SubmitTextToImageJob",
    edit: "aiart/v20221229 SubmitTextToImageJob",
  },
};

const DEFAULT_PROMPT = {
  generate:
    "A realistic selfie portrait of Clawra in a cozy cafe, cinematic lighting, high detail.",
  edit:
    "Keep identity consistent. Transform the image style into a cinematic movie poster.",
};

function printUsage() {
  console.log(`
Live provider test runner (real API calls)

Usage:
  node scripts/live-platform-test.js [options]

Options:
  --platform <fal|volc|qwen|google|hunyuan>
  --model <full-model-name>
  --operation <generate|edit|both>       Default: inferred or both (if platform supports both)
  --image-source <url|local>             Default: url (used for edit)
  --prompt "<text>"                      Optional prompt override
  --aspect-ratio <ratio>                 Default: 1:1
  --output-format <jpeg|png|webp>        Default: jpeg
  --env-file <path>                      Default: .env
  --help

Reference image behavior:
  url   => ${ONLINE_REFERENCE_IMAGE}
  local => ${LOCAL_REFERENCE_IMAGE}

Examples:
  node scripts/live-platform-test.js --platform fal --operation both --image-source url
  node scripts/live-platform-test.js --platform volc --operation edit --image-source local
  node scripts/live-platform-test.js --model xai/grok-imagine-image/edit --image-source local
`);
}

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }
    const eqIndex = token.indexOf("=");
    if (eqIndex >= 0) {
      parsed[token.slice(2, eqIndex)] = token.slice(eqIndex + 1);
      continue;
    }

    const key = token.slice(2);
    const maybeValue = argv[i + 1];
    if (!maybeValue || maybeValue.startsWith("--")) {
      parsed[key] = "true";
    } else {
      parsed[key] = maybeValue;
      i += 1;
    }
  }
  return parsed;
}

function loadEnvFile(envFilePath) {
  const fullPath = path.resolve(process.cwd(), envFilePath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`[WARN] env file not found: ${fullPath}. Continue with current process.env.`);
    return;
  }

  const content = fs.readFileSync(fullPath, "utf8");
  const lines = content.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const withoutExport = line.startsWith("export ") ? line.slice(7).trim() : line;
    const index = withoutExport.indexOf("=");
    if (index <= 0) continue;

    const key = withoutExport.slice(0, index).trim();
    let value = withoutExport.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function inferPlatformFromModel(model) {
  if (!model) return undefined;
  const text = model.toLowerCase();
  if (text.includes("grok-imagine-image")) return "fal";
  if (text.includes("doubao-seedream")) return "volc";
  if (text.includes("qwen-image")) return "qwen";
  if (text.includes("gemini")) return "google";
  if (text.includes("submittexttoimagejob") || text.includes("aiart/")) return "hunyuan";
  return undefined;
}

function inferOperationFromModel(model) {
  if (!model) return undefined;
  const text = model.toLowerCase();
  if (text.endsWith("/edit")) return "edit";
  if (text.includes("qwen-image-edit")) return "edit";
  return undefined;
}

function requireCredential(platform) {
  const checkAny = (keys) => keys.some((key) => Boolean(process.env[key]));
  if (platform === "fal" && !checkAny(["FAL_KEY"])) {
    throw new Error("Missing key: set FAL_KEY in .env");
  }
  if (platform === "volc" && !checkAny(["ARK_API_KEY", "VOLCENGINE_API_KEY"])) {
    throw new Error("Missing key: set ARK_API_KEY or VOLCENGINE_API_KEY in .env");
  }
  if (
    platform === "qwen" &&
    !checkAny(["DASHSCOPE_API_KEY", "ALIBABA_CLOUD_MODEL_STUDIO_API_KEY"])
  ) {
    throw new Error(
      "Missing key: set DASHSCOPE_API_KEY or ALIBABA_CLOUD_MODEL_STUDIO_API_KEY in .env"
    );
  }
  if (
    platform === "google" &&
    !checkAny(["GOOGLE_API_KEY", "GEMINI_API_KEY", "NANO_BANANA_PRO_API_KEY"])
  ) {
    throw new Error(
      "Missing key: set GOOGLE_API_KEY or GEMINI_API_KEY or NANO_BANANA_PRO_API_KEY in .env"
    );
  }
  if (
    platform === "hunyuan" &&
    !(process.env.TENCENT_SECRET_ID && process.env.TENCENT_SECRET_KEY)
  ) {
    throw new Error("Missing keys: set TENCENT_SECRET_ID and TENCENT_SECRET_KEY in .env");
  }
}

function setEditReferenceImage(platform, imageSource) {
  const useLocal = imageSource === "local";
  if (useLocal && !fs.existsSync(LOCAL_REFERENCE_IMAGE)) {
    throw new Error(`Local image not found: ${LOCAL_REFERENCE_IMAGE}`);
  }

  if (platform === "fal") {
    delete process.env.FAL_EDIT_IMAGE_URL;
    delete process.env.FAL_EDIT_IMAGE_PATH;
    if (useLocal) process.env.FAL_EDIT_IMAGE_PATH = LOCAL_REFERENCE_IMAGE;
    else process.env.FAL_EDIT_IMAGE_URL = ONLINE_REFERENCE_IMAGE;
  }

  if (platform === "volc") {
    delete process.env.SEEDREAM_EDIT_IMAGE_URL;
    delete process.env.SEEDREAM_EDIT_IMAGE_PATH;
    if (useLocal) process.env.SEEDREAM_EDIT_IMAGE_PATH = LOCAL_REFERENCE_IMAGE;
    else process.env.SEEDREAM_EDIT_IMAGE_URL = ONLINE_REFERENCE_IMAGE;
  }

  if (platform === "qwen") {
    delete process.env.QWEN_IMAGE_EDIT_IMAGE_URL;
    delete process.env.QWEN_IMAGE_EDIT_IMAGE_PATH;
    if (useLocal) process.env.QWEN_IMAGE_EDIT_IMAGE_PATH = LOCAL_REFERENCE_IMAGE;
    else process.env.QWEN_IMAGE_EDIT_IMAGE_URL = ONLINE_REFERENCE_IMAGE;
  }

  if (platform === "hunyuan") {
    if (useLocal) {
      console.warn(
        "[WARN] hunyuan edit only supports reference URL in current implementation; fallback to online URL."
      );
    }
    process.env.TENCENT_REFERENCE_IMAGE_URL = ONLINE_REFERENCE_IMAGE;
  }
}

async function runSingleOperation({
  platform,
  operation,
  model,
  prompt,
  aspectRatio,
  outputFormat,
}) {
  if (platform === "fal" && operation === "generate") {
    return generateImageWithFal({
      prompt,
      model,
      num_images: 1,
      aspect_ratio: aspectRatio,
      output_format: outputFormat,
    });
  }
  if (platform === "fal" && operation === "edit") {
    return generateImageWithFalEdit({
      prompt,
      model,
      num_images: 1,
      output_format: outputFormat,
    });
  }
  if (platform === "volc" && operation === "generate") {
    return generateImageWithSeedream({ prompt, model });
  }
  if (platform === "volc" && operation === "edit") {
    return generateImageWithSeededit({ prompt, model });
  }
  if (platform === "qwen" && operation === "generate") {
    return generateImageWithQwen({ prompt, model });
  }
  if (platform === "qwen" && operation === "edit") {
    return generateImageWithQwenEdit({ prompt, model, aspectRatio });
  }
  if (platform === "google" && operation === "generate") {
    return generateImageWithGoogle({ prompt, model, aspectRatio });
  }
  if (platform === "hunyuan" && operation === "generate") {
    return generateImageWithHunyuan({
      prompt,
      model,
      aspectRatio,
      outputFormat,
      referenceImage: null,
    });
  }
  if (platform === "hunyuan" && operation === "edit") {
    return generateImageWithHunyuan({ prompt, model, aspectRatio, outputFormat });
  }

  throw new Error(`Unsupported combination: ${platform}/${operation}`);
}

function resolveDefaultOperation(platform, requestedOperation, model) {
  const capabilities = PLATFORM_CAPS[platform];
  if (!capabilities) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  if (requestedOperation) {
    if (requestedOperation === "both") return "both";
    if (!capabilities.includes(requestedOperation)) {
      throw new Error(`Platform '${platform}' does not support operation '${requestedOperation}'`);
    }
    return requestedOperation;
  }

  const inferred = inferOperationFromModel(model);
  if (inferred) return inferred;

  if (capabilities.includes("generate") && capabilities.includes("edit")) {
    return "both";
  }
  return capabilities[0];
}

function resolveModel(platform, operation, modelOverride) {
  if (modelOverride) return modelOverride;
  const defaultModel = DEFAULT_MODELS[platform]?.[operation];
  if (!defaultModel) {
    throw new Error(`No default model found for ${platform}/${operation}`);
  }
  return defaultModel;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help === "true") {
    printUsage();
    return;
  }

  const envFile = args["env-file"] || ".env";
  loadEnvFile(envFile);

  const modelArg = args.model;
  const platform = (args.platform || inferPlatformFromModel(modelArg) || "fal").toLowerCase();
  if (!PLATFORM_CAPS[platform]) {
    throw new Error(`Unsupported platform '${platform}'. Supported: ${Object.keys(PLATFORM_CAPS).join(", ")}`);
  }

  const requestedOperation = args.operation ? args.operation.toLowerCase() : undefined;
  const operation = resolveDefaultOperation(platform, requestedOperation, modelArg);

  const imageSource = (args["image-source"] || "url").toLowerCase();
  if (!["url", "local"].includes(imageSource)) {
    throw new Error("Invalid --image-source, use 'url' or 'local'");
  }

  requireCredential(platform);

  const operations = operation === "both" ? ["generate", "edit"] : [operation];
  const aspectRatio = args["aspect-ratio"] || "1:1";
  const outputFormat = (args["output-format"] || "jpeg").toLowerCase();
  const promptOverride = args.prompt;
  const results = [];

  console.log(`[INFO] env file: ${path.resolve(process.cwd(), envFile)}`);
  console.log(`[INFO] platform: ${platform}`);
  console.log(`[INFO] operations: ${operations.join(", ")}`);
  console.log(`[INFO] image source: ${imageSource}`);

  for (const currentOperation of operations) {
    if (!PLATFORM_CAPS[platform].includes(currentOperation)) {
      throw new Error(`Platform '${platform}' does not support operation '${currentOperation}'`);
    }

    if (currentOperation === "edit") {
      setEditReferenceImage(platform, imageSource);
    }

    const prompt = promptOverride || DEFAULT_PROMPT[currentOperation];
    const model = resolveModel(platform, currentOperation, modelArg);

    console.log(`\n[INFO] running ${platform}/${currentOperation} with model: ${model}`);
    const startedAt = Date.now();
    const generated = await runSingleOperation({
      platform,
      operation: currentOperation,
      model,
      prompt,
      aspectRatio,
      outputFormat,
    });
    const durationMs = Date.now() - startedAt;

    const output = {
      platform,
      operation: currentOperation,
      model: generated.model,
      prompt,
      durationMs,
      media: generated.media,
      source: generated.source,
      revisedPrompt: generated.revisedPrompt || null,
    };

    results.push(output);
    console.log(`[OK] ${platform}/${currentOperation} finished in ${durationMs}ms`);
    console.log(`[OK] media: ${generated.media}`);
  }

  console.log("\n=== Live Test Result ===");
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(`[ERROR] ${error.message}`);
  process.exit(1);
});
