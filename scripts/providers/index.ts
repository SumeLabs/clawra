/**
 * Provider factory – returns the appropriate ImageProvider based on
 * the IMAGE_PROVIDER environment variable or an explicit name.
 *
 * Supported values: fal | openai | google | xai
 * Default: fal (backward-compatible)
 */

export type { ProviderName, ImageProvider, GenerateImageInput, EditImageInput, GenerateImageResult, GeneratedImage, AspectRatio, OutputFormat } from "./types";
import type { ImageProvider, ProviderName } from "./types";

import { FalProvider } from "./fal";
import { OpenAIProvider } from "./openai";
import { GoogleProvider } from "./google";
import { XAIProvider } from "./xai";

/**
 * Create an ImageProvider instance.
 *
 * @param name  Provider identifier. If omitted, falls back to
 *              `process.env.IMAGE_PROVIDER`, then defaults to `"fal"`.
 */
export function getProvider(name?: string): ImageProvider {
    const providerName = (name || process.env.IMAGE_PROVIDER || "fal") as ProviderName;

    switch (providerName) {
        case "fal":
            return new FalProvider();
        case "openai":
            return new OpenAIProvider();
        case "google":
            return new GoogleProvider();
        case "xai":
            return new XAIProvider();
        default:
            throw new Error(
                `Unknown image provider: "${providerName}". ` +
                `Supported providers: fal, openai, google, xai`
            );
    }
}

/** List all available provider identifiers */
export const AVAILABLE_PROVIDERS: ProviderName[] = [
    "fal",
    "openai",
    "google",
    "xai",
];

/** Map of provider → required environment variable */
export const PROVIDER_ENV_KEYS: Record<ProviderName, string> = {
    fal: "FAL_KEY",
    openai: "OPENAI_API_KEY",
    google: "GEMINI_API_KEY",
    xai: "XAI_API_KEY",
};

// Re-export provider classes for direct use
export { FalProvider } from "./fal";
export { OpenAIProvider } from "./openai";
export { GoogleProvider } from "./google";
export { XAIProvider } from "./xai";
