import { route } from "@fal-ai/server-proxy/nextjs";

interface FalError {
  status?: number;
  message: string;
}

export const { GET, POST } = route; 