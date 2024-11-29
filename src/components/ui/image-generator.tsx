"use client";

import { useState, useEffect } from "react";
import { fal } from "@fal-ai/client";
import { Anthropic } from "@anthropic-ai/sdk";
import Image from "next/image";
import { GuessChat } from "@/components/ui/guess-chat";
import { supabase } from "@/lib/supabase";
import { useUser } from "@clerk/nextjs";

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

// Replace the any type with a proper type definition
interface ErrorResponse {
  error: {
    message: string;
    code?: string;
    status?: number;
  };
}

export function ImageGenerator() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hiddenMeaning, setHiddenMeaning] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [revealedLetters, setRevealedLetters] = useState(1);
  const [language, setLanguage] = useState<Language>("EN");
  const [gameKey, setGameKey] = useState(0);
  const { user } = useUser();
  const [playsRemaining, setPlaysRemaining] = useState<number | null>(9);

  // Check remaining plays on mount and after each generation
  useEffect(() => {
    if (user?.id) {
      checkRemainingPlays();
    }
  }, [user?.id]);

  const checkRemainingPlays = async () => {
    if (!user?.id) return;

    try {
      const { data, error, count } = await supabase
        .from('game_plays')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .gte('created_at', new Date().toISOString().split('T')[0]);

      if (error) {
        console.error('Error checking plays:', error);
        return;
      }

      const remaining = 9 - (count || 0);
      setPlaysRemaining(remaining);
      console.log(`Plays remaining: ${remaining}`);
    } catch (err) {
      console.error('Error checking plays:', err);
    }
  };

  const recordPlay = async (imageUrl: string, hiddenMeaning: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('game_plays')
        .insert({
          user_id: user.id,
          image_url: imageUrl,
          hidden_meaning: hiddenMeaning,
          language
        });

      if (error) {
        console.error('Error recording play:', error);
        throw error;
      }

      await checkRemainingPlays();
    } catch (err) {
      console.error('Error recording play:', err);
      throw err;
    }
  };

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
    if (playsRemaining !== null && playsRemaining <= 0) {
      setError("You've reached your daily limit of 9 images. Try again tomorrow!");
      return;
    }

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
        // Record the play in Supabase
        await recordPlay(imageUrl, generatedPrompt.hiddenMeaning);
      } else {
        throw new Error("No image URL in response");
      }
    } catch (error: unknown) {
      const errorResponse = error as ErrorResponse;
      setError(errorResponse.error?.message || 'An unexpected error occurred');
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
    <div className="flex flex-col items-center gap-4 w-full relative min-h-[calc(100vh-4rem)] sm:h-[calc(100vh-4rem)] overflow-hidden">
      <div className="flex items-center gap-4 pt-2">
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
          disabled={loading || (playsRemaining !== null && playsRemaining <= 0)}
          className="px-4 py-2 text-sm transition-colors border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading 
            ? (language === "EN" ? "Generating..." : language === "CN" ? "生成中..." : "Membuat...")
            : playsRemaining !== null && playsRemaining <= 0
            ? (language === "EN" ? "Daily Limit Reached" : language === "CN" ? "已达每日限制" : "Batas Harian Tercapai")
            : (language === "EN" ? `Generate Image (${playsRemaining} left)` : language === "CN" ? `生成图片 (剩余${playsRemaining}次)` : `Buat Gambar (${playsRemaining} tersisa)`)}
        </button>
      </div>
      
      {error && (
        <div className="text-red-500 text-sm p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
          Error: {error}
        </div>
      )}
      
      {!imageUrl && (
        <div className="w-full max-w-2xl p-6 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold mb-4">
            {language === "EN" 
              ? "How to Play" 
              : language === "CN" 
                ? "游戏说明" 
                : "Cara Bermain"}
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {language === "EN" 
              ? "Each generated image contains a hidden meaning. Study the image carefully and try to guess the hidden word. With each wrong guess, a new letter will be revealed and Claude will provide a helpful hint. You have 9 image generations per day - make them count!" 
              : language === "CN" 
                ? "每张生成的图片都包含一个隐藏含义。仔细观察图片，尝试猜出隐藏的词语。每次猜错时，将会揭示一个新字母，Claude也会提供有用的提示。每天可以生成9张图片 - 好好把握机会！" 
                : "Setiap gambar yang dihasilkan memiliki makna tersembunyi. Amati gambar dengan cermat dan coba tebak kata yang tersembunyi. Setiap tebakan yang salah akan mengungkap huruf baru dan Claude akan memberikan petunjuk. Anda memiliki 9 kesempatan per hari - gunakan dengan bijak!"}
          </p>
        </div>
      )}
      
      {imageUrl && (
        <div className="flex flex-col gap-2 w-full">
          <div className="relative w-full aspect-[3/4] sm:h-[calc(100vh-12rem)] rounded-xl overflow-hidden">
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