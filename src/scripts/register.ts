import { REST, Routes } from "discord.js";
import { commands } from "../commands";
import { AppConfig } from "../config";

const rest = new REST({
  version: "10",
}).setToken(AppConfig.discordToken);

rest
  .put(Routes.applicationCommands(AppConfig.discordApplicationId), {
    body: commands.map((item) => item.command),
  })
  .then((data: any) =>
    console.info(`Successfully registered ${data.length} commands.`)
  )
  .catch(console.error);
