# Guess It - A Visual Riddle Game

A multilingual image-based guessing game powered by AI. Players try to guess the hidden meaning behind AI-generated images, with progressive hints and letter reveals.

## Features

- **AI-Generated Images**: Uses Flux AI to generate artistic images with hidden meanings
- **Multilingual Support**: 
  - English (EN)
  - Chinese (CN)
  - Indonesian (ID)
- **Interactive Guessing**: Chat interface with AI-powered hints from Claude
- **Progressive Hints**: Letters are revealed gradually with each guess
- **Responsive Design**: Works on both desktop and mobile devices

## Technologies Used

- Next.js 15
- TypeScript
- Tailwind CSS
- shadcn/ui
- Flux AI for image generation
- Anthropic's Claude for hint generation
- Geist Font

## Getting Started

1. Clone the repository
2. Install dependencies:
```bash
bun install
```

3. Set up your environment variables in `.env.local`:
```env
NEXT_PUBLIC_FAL_KEY=your_fal_ai_key
NEXT_PUBLIC_ANTHROPIC_API_KEY=your_anthropic_key
```

4. Run the development server:
```bash
bun dev
```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to play the game

## How to Play

1. Select your preferred language (EN/CN/ID)
2. Click "Generate Image" to create a new puzzle
3. Study the generated image
4. Use the chat interface to make guesses
5. Receive hints from Claude after each wrong guess
6. A new letter is revealed with each attempt
7. Keep guessing until you find the hidden meaning!

## Game Rules

- **English Mode**: Guesses must be single words
- **Chinese Mode**: Allows phrases and idioms
- **Indonesian Mode**: Guesses must be single words
- Each wrong guess reveals one more letter
- All letters are revealed upon correct guess

## Contributing

Feel free to open issues and pull requests for:
- New language support
- UI/UX improvements
- Additional features
- Bug fixes

## License

MIT

## Credits

- Image Generation: [Flux AI](https://fal.ai)
- AI Assistance: [Anthropic Claude](https://anthropic.com)
- UI Components: [shadcn/ui](https://ui.shadcn.com)
