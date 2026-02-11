/**
 * x.ai direct provider – calls x.ai API directly (no fal.ai proxy).
 *
 * Env: XAI_API_KEY
 *
 * Reference: https://docs.x.ai/developers/model-capabilities/images/generation
 *
 * Uses the OpenAI-compatible endpoint at api.x.ai with model grok-imagine-image.
 * For image editing, sends image_url in the request body (application/json).
 */

import type {
    ImageProvider,
    GenerateImageInput,
    EditImageInput,
    GenerateImageResult,
} from "./types";

const XAI_API_URL = "https://api.x.ai/v1/images/generations";

export class XAIProvider implements ImageProvider {
    readonly name = "x.ai (Grok Imagine Direct)";
    readonly id = "xai" as const;

    private getKey(): string {
        const key = process.env.XAI_API_KEY;
        if (!key) {
            throw new Error(
                "XAI_API_KEY environment variable not set. Get your key from https://console.x.ai"
            );
        }
        return key;
    }

    async generateImage(input: GenerateImageInput): Promise<GenerateImageResult> {
        const key = this.getKey();

        const body: Record<string, unknown> = {
            model: "grok-imagine-image",
            prompt: input.prompt,
            n: input.numImages ?? 1,
        };

        if (input.aspectRatio) {
            body.aspect_ratio = input.aspectRatio;
        }

        const response = await fetch(XAI_API_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${key}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`x.ai image generation failed: ${error}`);
        }

        const data = (await response.json()) as XAIImageResponse;

        return {
            images: data.data.map((item) => ({ url: item.url })),
        };
    }

    async editImage(input: EditImageInput): Promise<GenerateImageResult> {
        const key = this.getKey();

        const body: Record<string, unknown> = {
            model: "grok-imagine-image",
            prompt: input.prompt,
            n: input.numImages ?? 1,
            image_url: input.imageUrl,
        };

        if (input.aspectRatio) {
            body.aspect_ratio = input.aspectRatio;
        }

        const response = await fetch(XAI_API_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${key}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`x.ai image editing failed: ${error}`);
        }

        const data = (await response.json()) as XAIImageResponse;

        return {
            images: data.data.map((item) => ({ url: item.url })),
        };
    }
}

// ---------------------------------------------------------------------------
// x.ai response types
// ---------------------------------------------------------------------------

interface XAIImageResponse {
    data: Array<{
        url: string;
    }>;
}
