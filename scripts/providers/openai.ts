/**
 * OpenAI provider – uses the Images API (gpt-image-1).
 *
 * Env: OPENAI_API_KEY
 *
 * Reference: https://developers.openai.com/api/reference/resources/images/methods/generate
 *
 * Note: gpt-image-1 returns base64-encoded images. We convert them to data URIs
 * so they can be passed downstream (e.g. to OpenClaw) the same way as URLs.
 * If the caller needs a file, they can decode the base64 from the data URI.
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import type {
    ImageProvider,
    GenerateImageInput,
    GenerateImageResult,
    AspectRatio,
} from "./types";

const OPENAI_API_URL = "https://api.openai.com/v1/images/generations";

/** Map our aspect ratios to the closest OpenAI size preset */
function aspectRatioToSize(ar?: AspectRatio): string {
    switch (ar) {
        case "16:9":
        case "2:1":
        case "20:9":
        case "19.5:9":
        case "3:2":
            return "1536x1024"; // landscape
        case "9:16":
        case "1:2":
        case "9:19.5":
        case "9:20":
        case "2:3":
        case "3:4":
            return "1024x1536"; // portrait
        case "4:3":
        case "1:1":
        default:
            return "1024x1024"; // square
    }
}

export class OpenAIProvider implements ImageProvider {
    readonly name = "OpenAI (gpt-image-1)";
    readonly id = "openai" as const;

    private getKey(): string {
        const key = process.env.OPENAI_API_KEY;
        if (!key) {
            throw new Error(
                "OPENAI_API_KEY environment variable not set. Get your key from https://platform.openai.com/api-keys"
            );
        }
        return key;
    }

    async generateImage(input: GenerateImageInput): Promise<GenerateImageResult> {
        const key = this.getKey();
        const size = aspectRatioToSize(input.aspectRatio);

        const body: Record<string, unknown> = {
            model: "gpt-image-1",
            prompt: input.prompt,
            n: input.numImages ?? 1,
            size,
        };

        if (input.outputFormat) {
            body.output_format = input.outputFormat;
        }

        const response = await fetch(OPENAI_API_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${key}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`OpenAI image generation failed: ${error}`);
        }

        const data = (await response.json()) as {
            data: Array<{ b64_json?: string; url?: string; revised_prompt?: string }>;
        };

        // Convert base64 images to temporary files so we get usable URLs
        const images = await Promise.all(
            data.data.map(async (item) => {
                if (item.url) {
                    return { url: item.url };
                }
                if (item.b64_json) {
                    const ext = input.outputFormat ?? "png";
                    const tmpFile = path.join(
                        os.tmpdir(),
                        `clawra-openai-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
                    );
                    fs.writeFileSync(tmpFile, Buffer.from(item.b64_json, "base64"));
                    return { url: tmpFile };
                }
                throw new Error("OpenAI response contained neither url nor b64_json");
            })
        );

        const revisedPrompt = data.data[0]?.revised_prompt;

        return {
            images,
            revisedPrompt: revisedPrompt ?? undefined,
        };
    }

    // OpenAI Images API does support image editing via /v1/images/edits,
    // but it uses multipart/form-data which is more complex.
    // For now we only expose text-to-image generation.
}
