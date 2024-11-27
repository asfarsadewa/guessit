import { ImageGenerator } from "@/components/ui/image-generator";

export default function Home() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4 font-[family-name:var(--font-geist-sans)]">
      <div className="w-full max-w-[90%] lg:max-w-[80%] bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-6 border border-zinc-200 dark:border-zinc-800">
        <ImageGenerator />
      </div>
    </div>
  );
}
