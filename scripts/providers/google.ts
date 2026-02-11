/**
 * Google Gemini provider – uses Gemini's native image generation.
 *
 * Env: GEMINI_API_KEY
 *
 * Reference: https://ai.google.dev/gemini-api/docs/image-generation
 *
 * Uses the generateContent endpoint with responseModalities: ["IMAGE"]
 * Response returns base64-encoded image data in inlineData parts.
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import type {
    ImageProvider,
    GenerateImageInput,
    EditImageInput,
    GenerateImageResult,
} from "./types";

const GEMINI_API_BASE =
    "https://generativelanguage.googleapis.com/v1beta/models";

export class GoogleProvider implements ImageProvider {
    readonly name = "Google Gemini (gemini-2.5-flash-image)";
    readonly id = "google" as const;

    private model = "gemini-2.5-flash-image";

    private getKey(): string {
        const key = process.env.GEMINI_API_KEY;
        if (!key) {
            throw new Error(
                "GEMINI_API_KEY environment variable not set. Get your key from https://aistudio.google.com/apikey"
            );
        }
        return key;
    }

    private buildUrl(): string {
        return `${GEMINI_API_BASE}/${this.model}:generateContent`;
    }

    /**
     * Extract the first image from Gemini's generateContent response.
     * The response may contain both text and image parts.
     */
    private extractImages(
        responseData: GeminiResponse,
        outputFormat: string
    ): { url: string }[] {
        const images: { url: string }[] = [];

        for (const candidate of responseData.candidates ?? []) {
            for (const part of candidate.content?.parts ?? []) {
                if (part.inlineData?.data) {
                    const ext =
                        outputFormat === "png"
                            ? "png"
                            : outputFormat === "webp"
                                ? "webp"
                                : "jpeg";
                    const tmpFile = path.join(
                        os.tmpdir(),
                        `clawra-gemini-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
                    );
                    fs.writeFileSync(
                        tmpFile,
                        Buffer.from(part.inlineData.data, "base64")
                    );
                    images.push({ url: tmpFile });
                }
            }
        }

        return images;
    }

    async generateImage(
        input: GenerateImageInput
    ): Promise<GenerateImageResult> {
        const key = this.getKey();

        const body = {
            contents: [
                {
                    parts: [{ text: input.prompt }],
                },
            ],
            generationConfig: {
                responseModalities: ["IMAGE"],
            },
        };

        const response = await fetch(`${this.buildUrl()}?key=${key}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Google Gemini image generation failed: ${error}`);
        }

        const data = (await response.json()) as GeminiResponse;
        const images = this.extractImages(data, input.outputFormat ?? "jpeg");

        if (images.length === 0) {
            throw new Error(
                "Google Gemini returned no image data in the response"
            );
        }

        return { images };
    }

    async editImage(input: EditImageInput): Promise<GenerateImageResult> {
        const key = this.getKey();

        // Fetch the reference image and encode as base64
        const imageResponse = await fetch(input.imageUrl);
        if (!imageResponse.ok) {
            throw new Error(`Failed to fetch reference image: ${input.imageUrl}`);
        }
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        const imageBase64 = imageBuffer.toString("base64");

        // Determine mime type from URL or default to jpeg
        const mimeType = input.imageUrl.endsWith(".png")
            ? "image/png"
            : "image/jpeg";

        const body = {
            contents: [
                {
                    parts: [
                        { text: input.prompt },
                        {
                            inlineData: {
                                mimeType,
                                data: imageBase64,
                            },
                        },
                    ],
                },
            ],
            generationConfig: {
                responseModalities: ["IMAGE"],
            },
        };

        const response = await fetch(`${this.buildUrl()}?key=${key}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Google Gemini image editing failed: ${error}`);
        }

        const data = (await response.json()) as GeminiResponse;
        const images = this.extractImages(data, input.outputFormat ?? "jpeg");

        if (images.length === 0) {
            throw new Error(
                "Google Gemini returned no image data in the editing response"
            );
        }

        return { images };
    }
}

// ---------------------------------------------------------------------------
// Gemini response types (subset)
// ---------------------------------------------------------------------------

interface GeminiResponse {
    candidates?: Array<{
        content?: {
            parts?: Array<{
                text?: string;
                inlineData?: {
                    mimeType?: string;
                    data?: string;
                };
            }>;
        };
    }>;
}
