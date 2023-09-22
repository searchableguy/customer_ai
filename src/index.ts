import { GatewayIntentBits } from "discord.js";
import { CustomClient } from "./client";
import { commands } from "./commands";
import { AppConfig } from "./config";

const client = new CustomClient(
  {
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMessages,
    ],
  },
  {
    commands: commands,
  }
);

client.start(AppConfig.discordToken);
