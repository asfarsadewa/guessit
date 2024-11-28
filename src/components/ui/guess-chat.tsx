"use client";

import { useState, useRef, useEffect } from "react";
import { Anthropic } from "@anthropic-ai/sdk";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronUp, ChevronDown, MessageCircle } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface GuessChatProps {
  hiddenMeaning: string | null;
  language: "EN" | "CN" | "ID";
  prompt: string | null;
}

// Add a new event for revealing letters
interface RevealLetterEvent {
  onRevealLetter: (isCorrect: boolean) => void;
}

const anthropic = new Anthropic({
  apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true
});

export function GuessChat({ hiddenMeaning, onRevealLetter, language, prompt }: GuessChatProps & RevealLetterEvent) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isGameComplete, setIsGameComplete] = useState(false);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Auto-focus input after submission
  useEffect(() => {
    if (!isSubmitting && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSubmitting]);

  // Add validation for single word input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (language === "EN") {
      // Only allow letters for English
      const sanitizedValue = value.replace(/[^a-zA-Z]/g, '').toLowerCase();
      setInput(sanitizedValue);
    } else if (language === "ID") {
      // Allow letters and basic Indonesian characters
      const sanitizedValue = value.replace(/[^a-zA-Z\u00C0-\u00FF]/g, '').toLowerCase();
      setInput(sanitizedValue);
    } else {
      // Allow Chinese characters and remove spaces
      const sanitizedValue = value.replace(/\s/g, '');
      setInput(sanitizedValue);
    }
  };

  const getExplanation = async (meaning: string, imagePrompt: string | null) => {
    if (!imagePrompt) return "Couldn't generate explanation.";

    const explanationPrompts = {
      EN: `The image prompt was: "${imagePrompt}". The hidden meaning was: "${meaning}". 
          Explain in 2-3 sentences how the image cleverly represents this meaning. 
          Make your explanation poetic and insightful.`,
      CN: `图片提示是："${imagePrompt}"。隐藏含义是："${meaning}"。
          用2-3句话解释这张图片是如何巧妙地表达这个含义的。
          请用优美又富有洞察力的语言来解释。`,
      ID: `Prompt gambar adalah: "${imagePrompt}". Makna tersembunyinya adalah: "${meaning}".
          Jelaskan dalam 2-3 kalimat bagaimana gambar ini dengan cerdik menggambarkan makna ini.
          Buat penjelasan Anda puitis dan mendalam.`
    };

    try {
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: explanationPrompts[language]
        }]
      });

      return response.content[0].type === 'text' 
        ? response.content[0].text 
        : 'Error getting explanation';
    } catch (error) {
      console.error("Error getting explanation:", error);
      return "Couldn't generate explanation.";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !hiddenMeaning || isSubmitting || isGameComplete) return;

    const guess = input.trim().toLowerCase();
    
    if ((language === "EN" || language === "ID") && guess.includes(' ')) {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: language === "EN" ? "Please enter only one word." : "Mohon masukkan satu kata saja."
      }]);
      return;
    }

    setIsSubmitting(true);
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: guess }]);

    try {
      if (guess.toLowerCase() === hiddenMeaning.toLowerCase()) {
        onRevealLetter(true);
        setIsGameComplete(true); // Disable further input

        // Add success message
        const correctMessages = {
          EN: "🎉 Correct! You found the hidden meaning!",
          CN: "🎉 正确！你找到了隐藏的含义！",
          ID: "🎉 Benar! Anda menemukan makna tersembunyinya!"
        };
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: correctMessages[language]
        }]);

        // Get and add explanation
        const explanation = await getExplanation(hiddenMeaning, prompt);
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: explanation 
        }]);

        setIsSubmitting(false);
        return;
      }

      onRevealLetter(false);

      const promptTemplates = {
        EN: `The hidden meaning is "${hiddenMeaning}". The user guessed "${guess}".

Rules for your response:
1. Never mention anything about letters being revealed
2. If wrong, provide a helpful hint by comparing their guess to the actual meaning:
   - If their guess is semantically related, acknowledge that and guide them closer
   - If completely off, give a subtle hint about the theme or category
   - Never reveal the answer directly
   - Keep hints subtle and poetic
   - Maximum 2 sentences
3. Make each hint different from previous ones to help user progress
4. If they're very close (e.g., synonym or similar meaning), encourage them that they're on the right track`,
        CN: `隐藏的含义是"${hiddenMeaning}"。用户猜测的是"${guess}"。

回答规则：
1. 不要提及任何关于字的显示
2. 如果猜错了，提供有帮助的提示：
   - 如果猜测在语义上相关，肯定这一点并引导他们更接近答案
   - 如果完全不相关，给出关于主题或类别的微妙提示
   - 永远不要直接透露答案
   - 保持提示的含蓄和诗意
   - 最多2句话
3. 每次提示都要不同，帮助用户逐步接近答案
4. 如果非常接近（例如同义词），鼓励他们说他们很接近了`,
        ID: `Makna tersembunyi adalah "${hiddenMeaning}". Pengguna menebak "${guess}".

Aturan untuk respons:
1. Jangan pernah menyebutkan tentang huruf yang terungkap
2. Jika salah, berikan petunjuk yang membantu:
   - Jika tebakan secara semantik terkait, akui dan bimbing mereka lebih dekat
   - Jika sama sekali tidak terkait, berikan petunjuk halus tentang tema
   - Jangan pernah ungkapkan jawaban secara langsung
   - Jaga petunjuk tetap halus dan puitis
   - Maksimal 2 kalimat
3. Buat setiap petunjuk berbeda untuk membantu pengguna maju
4. Jika sangat dekat (misal sinonim), beri semangat bahwa mereka sudah dekat`
      };

      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: promptTemplates[language]
        }]
      });

      const assistantMessage = response.content[0].type === 'text' 
        ? response.content[0].text 
        : 'Error processing response';

      setMessages(prev => [...prev, { role: "assistant", content: assistantMessage }]);
    } catch (error) {
      console.error("Error processing guess:", error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Sorry, I couldn't process your guess. Please try again." 
      }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating button when collapsed */}
      {isCollapsed && (
        <button
          onClick={() => setIsCollapsed(false)}
          className="absolute bottom-4 right-4 p-3 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Chat interface */}
      <div 
        className={`absolute bottom-4 right-4 w-80 bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-800 transition-all duration-300 ${
          isCollapsed ? 'opacity-0 translate-y-full pointer-events-none' : 'opacity-100 translate-y-0'
        }`}
      >
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
          <h3 className="font-semibold text-sm">
            {language === "EN" 
              ? "Guess the Hidden Meaning" 
              : language === "CN" 
                ? "猜测隐藏含义" 
                : "Tebak Makna Tersembunyi"}
          </h3>
          <button
            onClick={() => setIsCollapsed(true)}
            className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            <ChevronDown size={20} />
          </button>
        </div>
        
        <ScrollArea className="h-64 p-4" ref={scrollAreaRef}>
          <div className="flex flex-col gap-3">
            {messages.map((message, i) => (
              <div
                key={i}
                className={`text-sm p-2 rounded-lg max-w-[90%] ${
                  message.role === "user"
                    ? "bg-blue-500 text-white ml-auto"
                    : "bg-zinc-100 dark:bg-zinc-800"
                }`}
              >
                {message.content}
              </div>
            ))}
            {/* Invisible element to scroll to */}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <form onSubmit={handleSubmit} className="p-3 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              placeholder={
                isGameComplete 
                  ? (language === "EN" 
                      ? "Game complete! Generate a new image to play again" 
                      : language === "CN" 
                        ? "游戏结束！生成新图片继续玩" 
                        : "Permainan selesai! Buat gambar baru untuk main lagi")
                  : (language === "EN" 
                      ? "Enter one word" 
                      : language === "CN" 
                        ? "输入你的猜测" 
                        : "Masukkan satu kata")
              }
              disabled={isSubmitting || !hiddenMeaning || isGameComplete}
              maxLength={language === "CN" ? 50 : 20}
              className="text-sm"
              pattern={language === "EN" || language === "ID" ? "[a-zA-Z]+" : undefined}
              title={
                language === "EN" 
                  ? "Please enter a single word (letters only)"
                  : language === "CN"
                    ? "请输入你的猜测"
                    : "Mohon masukkan satu kata saja"
              }
            />
            <Button 
              type="submit" 
              disabled={isSubmitting || !hiddenMeaning || !input.trim() || isGameComplete}
              size="sm"
            >
              {language === "EN" 
                ? "Send" 
                : language === "CN" 
                  ? "发送" 
                  : "Kirim"}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
} 