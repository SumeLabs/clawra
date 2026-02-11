/**
 * Multi-provider image generation types and interfaces.
 *
 * Supported providers:
 *   - fal   (fal.ai / Grok Imagine)
 *   - openai (OpenAI gpt-image-1)
 *   - google (Google Gemini gemini-2.5-flash-image)
 *   - xai   (x.ai direct / grok-imagine-image)
 */

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export type AspectRatio =
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

export type OutputFormat = "jpeg" | "png" | "webp";

export interface GenerateImageInput {
    /** Text prompt describing the image to generate */
    prompt: string;
    /** Number of images to generate (default: 1) */
    numImages?: number;
    /** Aspect ratio of the output image */
    aspectRatio?: AspectRatio;
    /** Output image format */
    outputFormat?: OutputFormat;
}

export interface EditImageInput extends GenerateImageInput {
    /** URL of the reference / source image to edit */
    imageUrl: string;
}

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export interface GeneratedImage {
    /** URL of the generated image (may be a temporary URL or data URI) */
    url: string;
    /** Image width in pixels (if known) */
    width?: number;
    /** Image height in pixels (if known) */
    height?: number;
}

export interface GenerateImageResult {
    /** Array of generated images */
    images: GeneratedImage[];
    /** Revised / enhanced prompt returned by the model (if any) */
    revisedPrompt?: string;
}

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

export type ProviderName = "fal" | "openai" | "google" | "xai";

export interface ImageProvider {
    /** Human-readable provider name */
    readonly name: string;
    /** Provider identifier */
    readonly id: ProviderName;

    /** Generate an image from a text prompt */
    generateImage(input: GenerateImageInput): Promise<GenerateImageResult>;

    /**
     * Edit / transform an existing image with a text prompt.
     * Not all providers support this; callers should check before calling.
     */
    editImage?(input: EditImageInput): Promise<GenerateImageResult>;
}
