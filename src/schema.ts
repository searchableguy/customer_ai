import { z } from "zod";

export const settings = z.object({
  discord_channels: z.array(z.string()),
});
