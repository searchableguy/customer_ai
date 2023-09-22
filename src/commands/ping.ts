import { SlashCommandBuilder } from "discord.js";
import { Command } from "../client";

export const ping: Command = {
  command: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Pings the bot."),

  async execute(option) {
    return option.reply({
      content: "Pong!",
    });
  },
};
