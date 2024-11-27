"use client";

import { useState } from "react";
import { fal } from "@fal-ai/client";
import { Anthropic } from "@anthropic-ai/sdk";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { GuessChat } from "@/components/ui/guess-chat";

// Configure APIs
fal.config({
  credentials: process.env.NEXT_PUBLIC_FAL_KEY
});

const anthropic = new Anthropic({
  apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true
});

interface GeneratedPrompt {
  imagePrompt: string;
  hiddenMeaning: string;
}

interface FluxResult {
  data: {
    images: Array<{
      url: string;
    }>;
    timings: Record<string, any>;
    seed: number;
    has_nsfw_concepts: boolean[];
    prompt: string;
  };
  requestId: string;
}

export function ImageGenerator() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hiddenMeaning, setHiddenMeaning] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string | null>(null);

  const generatePromptWithClaude = async (): Promise<GeneratedPrompt> => {
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 8192,
      messages: [{
        role: "user",
        content: "Generate a creative prompt for an AI image generator that has a hidden meaning or message behind it. Tell the image generator to make an art style of renaissance painting. Return ONLY a JSON object with 'imagePrompt' and 'hiddenMeaning' fields, nothing else. The hiddenMeaning must be one word only. Make the prompt thought-provoking but not too obvious. Example format: {\"imagePrompt\": \"your prompt here\", \"hiddenMeaning\": \"meaning here\"}"
      }]
    });

    try {
      const textContent = message.content[0].type === 'text' 
        ? message.content[0].text.trim()
        : '';
      
      console.log("Raw Claude response:", textContent);
      
      // Clean up the response if needed
      const cleanedResponse = textContent
        .replace(/```json\s*|\s*```/g, '') // Remove markdown code blocks if present
        .trim();
      
      console.log("Cleaned response:", cleanedResponse);
      
      const response = JSON.parse(cleanedResponse) as GeneratedPrompt;
      
      // Validate the response structure
      if (!response.imagePrompt || !response.hiddenMeaning) {
        throw new Error("Invalid response format from Claude");
      }
      
      return response;
    } catch (err) {
      console.error("Error parsing Claude response:", err);
      throw new Error("Failed to generate a valid prompt");
    }
  };

  const generateImage = async () => {
    setLoading(true);
    setError(null);
    setImageUrl(null);
    setHiddenMeaning(null);
    setPrompt(null);
    
    try {
      // First, get the prompt from Claude
      const generatedPrompt = await generatePromptWithClaude();
      setPrompt(generatedPrompt.imagePrompt);
      setHiddenMeaning(generatedPrompt.hiddenMeaning);

      console.log("Generated prompt:", generatedPrompt.imagePrompt);
      console.log("Hidden meaning:", generatedPrompt.hiddenMeaning);

      // Then, use the prompt with Flux
      const result = await fal.subscribe("fal-ai/flux-pro/v1.1-ultra", {
        input: {
          prompt: generatedPrompt.imagePrompt,
          num_images: 1,
          enable_safety_checker: false,
          safety_tolerance: "6",
          output_format: "jpeg",
          aspect_ratio: "3:4"
        },
        pollInterval: 1000,
        onQueueUpdate: (update: any) => {
          console.log("Queue status:", update.status);
          if (update.status === "IN_PROGRESS") {
            console.log("Generation in progress...");
          }
        },
      }) as FluxResult;

      console.log("Full Flux response:", result);

      if (result?.data?.images?.[0]?.url) {
        const imageUrl = result.data.images[0].url;
        console.log("Setting image URL:", imageUrl);
        setImageUrl(imageUrl);
      } else {
        throw new Error("No image URL in response");
      }
    } catch (err: any) {
      console.error("Full error object:", err);
      setError(
        err.message || 
        err.error?.message || 
        "Failed to generate image. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const formatHiddenMeaning = (meaning: string | null) => {
    if (!meaning) return '';
    const letters = meaning.split('');
    return letters.map((letter, index) => 
      index === 0 ? letter.toUpperCase() : '_'
    ).join(' ');
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full relative h-[calc(100vh-4rem)]">
      <Button
        onClick={generateImage}
        disabled={loading}
        className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 px-8"
      >
        {loading ? "Generating..." : "Generate Image"}
      </Button>
      
      {error && (
        <div className="text-red-500 text-sm p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
          Error: {error}
        </div>
      )}
      
      {imageUrl && (
        <div className="flex flex-col gap-2 w-full h-full">
          <div className="relative w-full h-[calc(100%-2rem)] rounded-xl overflow-hidden">
            <Image
              src={imageUrl}
              alt={prompt || "Generated image"}
              fill
              className="object-contain"
              priority
            />
          </div>
          
          <div className="text-base sm:text-lg text-center font-mono text-zinc-500 dark:text-zinc-400 tracking-wider">
            {formatHiddenMeaning(hiddenMeaning)}
          </div>
        </div>
      )}
      
      {imageUrl && hiddenMeaning && <GuessChat hiddenMeaning={hiddenMeaning} />}
    </div>
  );
} 