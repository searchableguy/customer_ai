export const AppConfig = {
  unstructuredApiUrl:
    process.env.UNSTRUCTURED_API_URL ??
    "https://api.unstructured.io/general/v0/general",
  unstructuredApiKey: process.env.UNSTRUCTURED_API_KEY,
  discordToken: process.env.DISCORD_TOKEN!,
  discordApplicationId: process.env.DISCORD_APPLICATION_ID!,
  discordPublicKey: process.env.DISCORD_PUBLIC_KEY!,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY!,
  supabaseUrl: process.env.SUPABASE_URL!,
};
