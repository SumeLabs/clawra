/**
 * fal.ai provider – proxies xAI Grok Imagine via fal.ai.
 *
 * Env: FAL_KEY
 */

import type {
    ImageProvider,
    GenerateImageInput,
    EditImageInput,
    GenerateImageResult,
} from "./types";

const FAL_BASE = "https://fal.run/xai/grok-imagine-image";

export class FalProvider implements ImageProvider {
    readonly name = "fal.ai (Grok Imagine)";
    readonly id = "fal" as const;

    private getKey(): string {
        const key = process.env.FAL_KEY;
        if (!key) {
            throw new Error(
                "FAL_KEY environment variable not set. Get your key from https://fal.ai/dashboard/keys"
            );
        }
        return key;
    }

    async generateImage(input: GenerateImageInput): Promise<GenerateImageResult> {
        const key = this.getKey();

        const response = await fetch(FAL_BASE, {
            method: "POST",
            headers: {
                Authorization: `Key ${key}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                prompt: input.prompt,
                num_images: input.numImages ?? 1,
                aspect_ratio: input.aspectRatio ?? "1:1",
                output_format: input.outputFormat ?? "jpeg",
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`fal.ai image generation failed: ${error}`);
        }

        const data = (await response.json()) as {
            images: Array<{ url: string; width: number; height: number }>;
            revised_prompt?: string;
        };

        return {
            images: data.images.map((img) => ({
                url: img.url,
                width: img.width,
                height: img.height,
            })),
            revisedPrompt: data.revised_prompt,
        };
    }

    async editImage(input: EditImageInput): Promise<GenerateImageResult> {
        const key = this.getKey();

        const response = await fetch(`${FAL_BASE}/edit`, {
            method: "POST",
            headers: {
                Authorization: `Key ${key}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                image_url: input.imageUrl,
                prompt: input.prompt,
                num_images: input.numImages ?? 1,
                output_format: input.outputFormat ?? "jpeg",
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`fal.ai image editing failed: ${error}`);
        }

        const data = (await response.json()) as {
            images: Array<{ url: string; width: number; height: number }>;
            revised_prompt?: string;
        };

        return {
            images: data.images.map((img) => ({
                url: img.url,
                width: img.width,
                height: img.height,
            })),
            revisedPrompt: data.revised_prompt,
        };
    }
}
