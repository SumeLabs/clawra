require("ts-node/register/transpile-only");

const { afterEach, beforeEach, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");

const { fal } = require("@fal-ai/client");
const tencentcloud = require("tencentcloud-sdk-nodejs");

const {
  generateImageWithFal,
  generateImageWithFalEdit,
  generateImageWithGoogle,
  generateImageWithHunyuan,
  generateImageWithQwen,
  generateImageWithQwenEdit,
  generateImageWithSeededit,
  generateImageWithSeedream,
  generateAndSend,
} = require("../scripts/clawra-selfie.ts");

const BASE_ENV = { ...process.env };
let originalFetch;

function resetEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in BASE_ENV)) {
      delete process.env[key];
    }
  }
  for (const [key, value] of Object.entries(BASE_ENV)) {
    process.env[key] = value;
  }
}

function makeResponse(payload, status = 200, options = {}) {
  const rawHeaders = options.headers || {};
  const normalizedHeaders = Object.fromEntries(
    Object.entries(rawHeaders).map(([key, value]) => [String(key).toLowerCase(), String(value)])
  );
  const raw = typeof payload === "string" ? payload : JSON.stringify(payload);
  const binary = options.binary || Buffer.from(raw);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (key) => normalizedHeaders[String(key).toLowerCase()] || null,
    },
    text: async () => raw,
    arrayBuffer: async () =>
      binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength),
    json: async () => {
      if (typeof payload === "string") {
        return JSON.parse(payload);
      }
      return payload;
    },
  };
}

function installFetchQueue(queue, calls) {
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (queue.length === 0) {
      throw new Error(`Unexpected fetch call: ${String(url)}`);
    }
    const next = queue.shift();
    return typeof next === "function" ? next(url, options) : next;
  };
}

beforeEach(() => {
  resetEnv();
  originalFetch = global.fetch;
});

afterEach(() => {
  resetEnv();
  if (originalFetch === undefined) {
    delete global.fetch;
  } else {
    global.fetch = originalFetch;
  }
});

test("supported platform/operation combinations are wired", async () => {
  const supported = [
    { platform: "qwen", operation: "generate", error: /DashScope API key missing/ },
    { platform: "qwen", operation: "edit", error: /DashScope API key missing/ },
    { platform: "volc", operation: "generate", error: /ARK API key missing/ },
    { platform: "volc", operation: "edit", error: /ARK API key missing/ },
    { platform: "fal", operation: "generate", error: /FAL_KEY environment variable not set/ },
    { platform: "fal", operation: "edit", error: /FAL_KEY environment variable not set/ },
    { platform: "google", operation: "generate", error: /Google API key missing/ },
    { platform: "hunyuan", operation: "generate", error: /Tencent credentials missing/ },
    { platform: "hunyuan", operation: "edit", error: /Tencent credentials missing/ },
  ];

  for (const item of supported) {
    await assert.rejects(
      generateAndSend({
        prompt: "test prompt",
        channel: "#general",
        platform: item.platform,
        operation: item.operation,
        useOpenClawCLI: false,
      }),
      item.error
    );
  }
});

test("unsupported platform/operation combinations fail fast", async () => {
  await assert.rejects(
    generateAndSend({
      prompt: "test prompt",
      channel: "#general",
      platform: "google",
      operation: "edit",
      useOpenClawCLI: false,
    }),
    /does not support operation 'edit'/
  );

  await assert.rejects(
    generateAndSend({
      prompt: "test prompt",
      channel: "#general",
      platform: "hunyuan",
      operation: "both",
      useOpenClawCLI: false,
    }),
    /does not support operation 'both'/
  );
});

test("Qwen generate sends correct request payload", async () => {
  process.env.DASHSCOPE_API_KEY = "dash-key";
  const calls = [];
  installFetchQueue(
    [
      makeResponse({
        output: {
          choices: [
            {
              message: {
                content: [{ image: "https://img.example/qwen-generate.png" }, { text: "revised" }],
              },
            },
          ],
        },
      }),
    ],
    calls
  );

  const result = await generateImageWithQwen({ prompt: "a stylish mirror selfie" });

  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].url,
    "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"
  );
  assert.equal(calls[0].options.headers.Authorization, "Bearer dash-key");
  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.model, "qwen-image-plus-2026-01-09");
  assert.equal(body.input.messages[0].content[0].text, "a stylish mirror selfie");
  assert.equal(result.media, "https://img.example/qwen-generate.png");
  assert.equal(result.source, "url");
});

test("Qwen edit sends correct image+text payload", async () => {
  process.env.DASHSCOPE_API_KEY = "dash-key";
  process.env.QWEN_IMAGE_EDIT_IMAGE_URL = "https://img.example/input.png";

  const calls = [];
  installFetchQueue(
    [
      makeResponse({
        output: {
          choices: [
            {
              message: {
                content: [{ image: "https://img.example/qwen-edit.png" }],
              },
            },
          ],
        },
      }),
    ],
    calls
  );

  const result = await generateImageWithQwenEdit({
    prompt: "换成电影海报风格",
    aspectRatio: "3:4",
    model: "qwen-image-edit-plus",
  });

  assert.equal(calls.length, 1);
  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.model, "qwen-image-edit-plus");
  assert.equal(body.parameters.size, "960*1280");
  assert.equal(body.input.messages[0].content[0].image, "https://img.example/input.png");
  assert.equal(body.input.messages[0].content[1].text, "换成电影海报风格");
  assert.equal(result.media, "https://img.example/qwen-edit.png");
  assert.equal(result.source, "url");
});

test("Volc Seedream generate sends correct request payload", async () => {
  process.env.ARK_API_KEY = "ark-key";

  const calls = [];
  installFetchQueue(
    [makeResponse({ data: [{ url: "https://img.example/seedream-generate.png" }] })],
    calls
  );

  const result = await generateImageWithSeedream({
    prompt: "cyberpunk city selfie",
    model: "doubao-seedream-5-0-260128",
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://ark.cn-beijing.volces.com/api/v3/images/generations");
  assert.equal(calls[0].options.headers.Authorization, "Bearer ark-key");
  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.model, "doubao-seedream-5-0-260128");
  assert.equal(body.prompt, "cyberpunk city selfie");
  assert.equal(body.response_format, "url");
  assert.equal(body.size, "1024x1024");
  assert.equal(result.media, "https://img.example/seedream-generate.png");
  assert.equal(result.source, "url");
});

test("Volc Seedream edit sends image-edit payload", async () => {
  process.env.ARK_API_KEY = "ark-key";
  process.env.SEEDREAM_EDIT_IMAGE_URL = "https://img.example/seedream-input.png";
  process.env.SEEDREAM_EDIT_SIZE = "640x960";

  const calls = [];
  installFetchQueue(
    [makeResponse({ data: [{ url: "https://img.example/seedream-edit.png" }] })],
    calls
  );

  const result = await generateImageWithSeededit({
    prompt: "change to beach vacation style",
    model: "doubao-seedream-4-5-251128",
  });

  assert.equal(calls.length, 1);
  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.model, "doubao-seedream-4-5-251128");
  assert.equal(body.prompt, "change to beach vacation style");
  assert.equal(body.image, "https://img.example/seedream-input.png");
  assert.equal(body.response_format, "url");
  assert.equal(body.size, "1568x2352");
  assert.equal(result.media, "https://img.example/seedream-edit.png");
  assert.equal(result.source, "url");
});

test("Volc Seedream edit uses compliant fallback size when unset", async () => {
  process.env.ARK_API_KEY = "ark-key";
  process.env.SEEDREAM_EDIT_IMAGE_URL = "https://img.example/seedream-input.png";

  const calls = [];
  installFetchQueue(
    [makeResponse({ data: [{ url: "https://img.example/seedream-edit-default-size.png" }] })],
    calls
  );

  const result = await generateImageWithSeededit({
    prompt: "change to beach vacation style",
    model: "doubao-seedream-4-5-251128",
  });

  assert.equal(calls.length, 1);
  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.size, "2048x2048");
  assert.equal(result.media, "https://img.example/seedream-edit-default-size.png");
});

test("fal generate/edit call subscribe with expected inputs", async () => {
  process.env.FAL_KEY = "fal-key";
  process.env.FAL_EDIT_IMAGE_URL = "https://img.example/fal-input.png";

  const originalConfig = fal.config;
  const originalSubscribe = fal.subscribe;
  const configCalls = [];
  const subscribeCalls = [];

  fal.config = (cfg) => {
    configCalls.push(cfg);
  };
  fal.subscribe = async (model, payload) => {
    subscribeCalls.push({ model, payload });
    return {
      data: {
        images: [{ url: `https://img.example/${subscribeCalls.length}.png` }],
        revised_prompt: "revised",
      },
    };
  };

  try {
    const generated = await generateImageWithFal({
      prompt: "a neon selfie",
      model: "xai/grok-imagine-image",
      aspect_ratio: "2:1",
      output_format: "png",
    });

    const edited = await generateImageWithFalEdit({
      prompt: "switch to comic style",
      model: "xai/grok-imagine-image/edit",
      output_format: "jpeg",
    });

    assert.equal(configCalls.length, 2);
    assert.equal(configCalls[0].credentials, "fal-key");
    assert.equal(subscribeCalls.length, 2);

    assert.equal(subscribeCalls[0].model, "xai/grok-imagine-image");
    assert.equal(subscribeCalls[0].payload.input.prompt, "a neon selfie");
    assert.equal(subscribeCalls[0].payload.input.aspect_ratio, "2:1");
    assert.equal(subscribeCalls[0].payload.input.output_format, "png");

    assert.equal(subscribeCalls[1].model, "xai/grok-imagine-image/edit");
    assert.equal(subscribeCalls[1].payload.input.prompt, "switch to comic style");
    assert.equal(subscribeCalls[1].payload.input.image_url, "https://img.example/fal-input.png");
    assert.equal(subscribeCalls[1].payload.input.output_format, "jpeg");

    assert.equal(generated.media, "https://img.example/1.png");
    assert.equal(edited.media, "https://img.example/2.png");
  } finally {
    fal.config = originalConfig;
    fal.subscribe = originalSubscribe;
  }
});

test("Google generate calls API and writes inline image to file", async () => {
  process.env.GOOGLE_API_KEY = "google-key";
  const calls = [];
  const base64 = Buffer.from("google-image-bytes").toString("base64");

  installFetchQueue(
    [
      makeResponse({
        candidates: [
          {
            content: {
              parts: [
                { text: "revised prompt" },
                { inlineData: { mimeType: "image/png", data: base64 } },
              ],
            },
          },
        ],
      }),
    ],
    calls
  );

  const result = await generateImageWithGoogle({
    prompt: "cat astronaut",
    aspectRatio: "16:9",
    model: "gemini-3-pro-image-preview",
  });

  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].url,
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=google-key"
  );
  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.contents[0].parts[0].text, "cat astronaut");
  assert.equal(body.generationConfig.imageConfig.aspectRatio, "16:9");
  assert.equal(result.source, "file");
  assert.equal(result.model, "gemini-3-pro-image-preview");

  const bytes = await fs.readFile(result.media);
  assert.deepEqual(bytes, Buffer.from("google-image-bytes"));
  await fs.unlink(result.media);
});

test("Hunyuan edit builds submit/query calls correctly", async () => {
  process.env.TENCENT_SECRET_ID = "secret-id";
  process.env.TENCENT_SECRET_KEY = "secret-key";
  process.env.TENCENT_REFERENCE_IMAGE_URL = "https://img.example/hunyuan-ref.png";

  const aiart = tencentcloud.aiart.v20221229;
  const originalClient = aiart.Client;
  const originalSetTimeout = global.setTimeout;

  let clientConfig;
  let submitPayload;
  let queryPayload;

  aiart.Client = class FakeAiartClient {
    constructor(config) {
      clientConfig = config;
    }

    async SubmitTextToImageJob(payload) {
      submitPayload = payload;
      return { JobId: "job-1" };
    }

    async QueryTextToImageJob(payload) {
      queryPayload = payload;
      return { JobStatusCode: "5", ResultImage: ["https://img.example/hunyuan-edit.png"] };
    }
  };

  global.setTimeout = (fn, _ms, ...args) => originalSetTimeout(fn, 0, ...args);

  try {
    const result = await generateImageWithHunyuan({
      prompt: "城市夜景自拍",
      aspectRatio: "2:3",
    });

    assert.equal(clientConfig.region, "ap-guangzhou");
    assert.equal(clientConfig.profile.httpProfile.endpoint, "aiart.tencentcloudapi.com");
    assert.equal(submitPayload.Prompt, "城市夜景自拍");
    assert.equal(submitPayload.Resolution, "640:960");
    assert.deepEqual(submitPayload.Images, ["https://img.example/hunyuan-ref.png"]);
    assert.equal(submitPayload.LogoAdd, 0);
    assert.equal(submitPayload.Revise, 1);
    assert.deepEqual(queryPayload, { JobId: "job-1" });

    assert.equal(result.media, "https://img.example/hunyuan-edit.png");
    assert.equal(result.source, "url");
    assert.equal(result.model, "aiart/v20221229 SubmitTextToImageJob");
  } finally {
    aiart.Client = originalClient;
    global.setTimeout = originalSetTimeout;
  }
});

test("Hunyuan generate omits reference image in submit payload", async () => {
  process.env.TENCENT_SECRET_ID = "secret-id";
  process.env.TENCENT_SECRET_KEY = "secret-key";
  process.env.TENCENT_REFERENCE_IMAGE_URL = "https://img.example/hunyuan-ref.png";

  const aiart = tencentcloud.aiart.v20221229;
  const originalClient = aiart.Client;
  const originalSetTimeout = global.setTimeout;

  let submitPayload;

  aiart.Client = class FakeAiartClient {
    async SubmitTextToImageJob(payload) {
      submitPayload = payload;
      return { JobId: "job-2" };
    }

    async QueryTextToImageJob() {
      return { JobStatusCode: "5", ResultImage: ["https://img.example/hunyuan-generate.png"] };
    }
  };

  global.setTimeout = (fn, _ms, ...args) => originalSetTimeout(fn, 0, ...args);

  try {
    const result = await generateImageWithHunyuan({
      prompt: "城市夜景",
      aspectRatio: "1:1",
      referenceImage: null,
    });

    assert.equal(submitPayload.Prompt, "城市夜景");
    assert.equal(submitPayload.Resolution, "1024:1024");
    assert.equal("Images" in submitPayload, false);
    assert.equal(result.media, "https://img.example/hunyuan-generate.png");
    assert.equal(result.source, "url");
  } finally {
    aiart.Client = originalClient;
    global.setTimeout = originalSetTimeout;
  }
});

test("generateAndSend uses edit flow and sends OpenClaw message payload", async () => {
  process.env.DASHSCOPE_API_KEY = "dash-key";
  process.env.QWEN_IMAGE_EDIT_IMAGE_URL = "https://img.example/input.png";

  const calls = [];
  installFetchQueue(
    [
      makeResponse({
        output: {
          choices: [
            {
              message: {
                content: [{ image: "https://img.example/final-edit.png" }],
              },
            },
          ],
        },
      }),
      makeResponse("png-bytes", 200, {
        headers: { "content-type": "image/png" },
        binary: Buffer.from("png-bytes"),
      }),
      makeResponse({ ok: true }),
    ],
    calls
  );

  const result = await generateAndSend({
    prompt: "换成电影海报风格",
    channel: "#art",
    platform: "qwen",
    operation: "edit",
    model: "qwen-image-edit-plus",
    aspectRatio: "3:4",
    useOpenClawCLI: false,
  });

  assert.equal(calls.length, 3);
  assert.equal(
    calls[0].url,
    "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"
  );
  assert.equal(calls[1].url, "https://img.example/final-edit.png");
  assert.equal(calls[2].url, "http://localhost:18789/message");

  const sendBody = JSON.parse(calls[2].options.body);
  assert.equal(sendBody.action, "send");
  assert.equal(sendBody.channel, "#art");
  assert.match(sendBody.media, /clawra-media-.*\.png$/);
  const bytes = await fs.readFile(sendBody.media);
  assert.deepEqual(bytes, Buffer.from("png-bytes"));
  await fs.unlink(sendBody.media);
  assert.match(sendBody.message, /Edited with Qwen Image/);
  assert.match(sendBody.message, /model: qwen-image-edit-plus/);

  assert.equal(result.success, true);
  assert.equal(result.platform, "qwen");
  assert.equal(result.operation, "edit");
  assert.equal(result.model, "qwen-image-edit-plus");
  assert.equal(result.imageUrl, "https://img.example/final-edit.png");
});
