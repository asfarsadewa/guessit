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
}

const anthropic = new Anthropic({
  apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true
});

export function GuessChat({ hiddenMeaning }: GuessChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Add validation for single word input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow letters and remove spaces
    const sanitizedValue = value.replace(/[^a-zA-Z]/g, '').toLowerCase();
    setInput(sanitizedValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !hiddenMeaning || isSubmitting) return;

    const guess = input.trim().toLowerCase();
    
    // Additional validation to ensure it's one word
    if (guess.includes(' ')) {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Please enter only one word." 
      }]);
      return;
    }

    setIsSubmitting(true);
    setInput("");

    // Add user message
    setMessages(prev => [...prev, { role: "user", content: guess }]);

    try {
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: `The hidden meaning is "${hiddenMeaning}". The user guessed "${guess}". If the guess matches the hidden meaning (case-insensitive), say "Correct! You found the hidden meaning!". If it doesn't match, provide a brief, encouraging response about why it's not correct. Keep your response under 20 words.`
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
          <h3 className="font-semibold text-sm">Guess the Hidden Meaning</h3>
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
              value={input}
              onChange={handleInputChange}
              placeholder="Enter one word"
              disabled={isSubmitting || !hiddenMeaning}
              maxLength={20}
              className="text-sm"
              pattern="[a-zA-Z]+"
              title="Please enter a single word (letters only)"
            />
            <Button 
              type="submit" 
              disabled={isSubmitting || !hiddenMeaning || !input.trim()}
              size="sm"
            >
              Send
            </Button>
          </div>
        </form>
      </div>
    </>
  );
} 