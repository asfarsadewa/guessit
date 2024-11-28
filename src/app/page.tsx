import { ImageGenerator } from "@/components/ui/image-generator";
import { SignIn, SignedIn, SignedOut } from "@clerk/nextjs";

export default function Home() {
  return (
    <main className="flex-1 flex items-center justify-center p-4">
      <SignedIn>
        <div className="w-full max-w-[90%] lg:max-w-[80%] bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-6 border border-zinc-200 dark:border-zinc-800">
          <ImageGenerator />
        </div>
      </SignedIn>
      
      <SignedOut>
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Welcome to Guess It</h2>
          <p className="mb-8 text-zinc-600 dark:text-zinc-400">Sign in to start playing!</p>
          <SignIn />
        </div>
      </SignedOut>
    </main>
  );
}
