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

### Authentication & User Management
- **Clerk Authentication**:
  - Social login (Google)
  - Secure user sessions
  - Protected routes
  - User profile management

### Game Mechanics
- **Daily Limits**:
  - 9 image generations per user per day
  - Counter shows remaining plays
  - Resets at midnight UTC
- **Play Tracking**:
  - Records each game session
  - Stores image URLs and hidden meanings
  - Tracks language preferences

### Database (Supabase)
- **Game Plays Table**:
  ```sql
  game_plays (
    id uuid primary key,
    user_id text not null,
    image_url text not null,
    hidden_meaning text not null,
    language varchar(2) not null,
    created_at timestamptz default now()
  )
  ```
- Row Level Security (RLS) enabled
- Daily limit enforcement via database functions

## Technologies Used

- Next.js 15 with App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Flux AI for image generation
- Anthropic's Claude for hint generation
- Clerk for authentication
- Supabase for database
- Geist Font

## Getting Started

1. Clone the repository
2. Install dependencies:
```bash
bun install
```

3. Set up your environment variables in `.env.local`:
```env
# Flux AI
NEXT_PUBLIC_FAL_KEY=your_fal_key

# Anthropic Claude
NEXT_PUBLIC_ANTHROPIC_API_KEY=your_anthropic_key

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Set up Supabase:
   - Create a new project
   - Run the SQL schema provided in `schema.sql`
   - Set up RLS policies

5. Set up Clerk:
   - Create a new application
   - Configure OAuth providers
   - Set up redirect URLs

6. Run the development server:
```bash
bun dev
```

7. Open [http://localhost:3000](http://localhost:3000) with your browser to play the game

## Game Rules

- **English Mode**: Guesses must be single words
- **Chinese Mode**: Allows phrases and idioms
- **Indonesian Mode**: Guesses must be single words
- Each wrong guess reveals one more letter
- All letters are revealed upon correct guess
- Limited to 9 image generations per day per user

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
- Authentication: [Clerk](https://clerk.com)
- Database: [Supabase](https://supabase.com)
