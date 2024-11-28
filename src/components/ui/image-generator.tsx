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

type Language = "EN" | "CN" | "ID";

export function ImageGenerator() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hiddenMeaning, setHiddenMeaning] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [revealedLetters, setRevealedLetters] = useState(1);
  const [language, setLanguage] = useState<Language>("EN");
  const [gameKey, setGameKey] = useState(0);

  const generatePromptWithClaude = async (): Promise<GeneratedPrompt> => {
    const prompts = {
      EN: "Generate a creative prompt for an AI image generator that has a hidden meaning or message behind it. Tell the image generator to make an art style of renaissance painting. Return ONLY a JSON object with 'imagePrompt' and 'hiddenMeaning' fields, nothing else. The hiddenMeaning must be one word only. Make the prompt thought-provoking but not too obvious.",
      CN: "用中文生成一个有隐藏含义的AI图像生成器提示。图像风格要求是中国古典画风。由于图像生成器不明白中文，所以用英文。只返回一个带有'imagePrompt'和'hiddenMeaning'字段的JSON对象，不要其他内容。hiddenMeaning可以是一个词组或成语。提示要有深意但不要太明显。",
      ID: "Buatkan prompt untuk AI image generator yang memiliki makna tersembunyi. Gaya seninya seperti lukisan Raden Saleh. Karena Image Generatornya tidak mengerti Bahasa Indonesia, maka buat promptnya dalam bahasa Inggris. Kembalikan HANYA objek JSON dengan field 'imagePrompt' dan 'hiddenMeaning', tidak ada yang lain. HiddenMeaning harus satu kata saja dalam Bahasa Indonesia. Buat promptnya menarik tapi tidak terlalu jelas."
    };

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 8192,
      messages: [{
        role: "user",
        content: prompts[language] + ' Example format: {"imagePrompt": "your prompt here", "hiddenMeaning": "meaning here"}'
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
    setRevealedLetters(1);
    setGameKey(prev => prev + 1);
    
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

  const formatHiddenMeaning = (meaning: string | null, showAll: boolean = false) => {
    if (!meaning) return '';
    const letters = meaning.split('');
    return letters.map((letter, index) => 
      showAll || index < revealedLetters ? letter.toUpperCase() : '_'
    ).join(' ');
  };

  const handleRevealLetter = (isCorrect: boolean = false) => {
    if (hiddenMeaning) {
      if (isCorrect) {
        setRevealedLetters(hiddenMeaning.length); // Reveal all letters
      } else if (revealedLetters < hiddenMeaning.length) {
        setRevealedLetters(prev => prev + 1);
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full relative h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-4">
        <div className="flex rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setLanguage("EN")}
            className={`px-4 py-2 text-sm transition-colors ${
              language === "EN"
                ? "bg-foreground text-background"
                : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLanguage("CN")}
            className={`px-4 py-2 text-sm transition-colors ${
              language === "CN"
                ? "bg-foreground text-background"
                : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            中文
          </button>
          <button
            onClick={() => setLanguage("ID")}
            className={`px-4 py-2 text-sm transition-colors ${
              language === "ID"
                ? "bg-foreground text-background"
                : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            Indonesia
          </button>
        </div>
        <button
          onClick={generateImage}
          disabled={loading}
          className="px-4 py-2 text-sm transition-colors border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading 
            ? (language === "EN" ? "Generating..." : language === "CN" ? "生成中..." : "Membuat...")
            : (language === "EN" ? "Generate Image" : language === "CN" ? "生成图片" : "Buat Gambar")}
        </button>
      </div>
      
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
      
      {imageUrl && hiddenMeaning && (
        <GuessChat 
          key={gameKey}
          hiddenMeaning={hiddenMeaning} 
          onRevealLetter={handleRevealLetter}
          language={language}
          prompt={prompt}
        />
      )}
    </div>
  );
} 