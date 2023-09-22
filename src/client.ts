import {
  ChannelType,
  ChatInputCommandInteraction,
  Client,
  ClientOptions,
  Collection,
  Events,
  SlashCommandBuilder,
} from "discord.js";
import { supabaseClient } from "./config/supabase";
import { SupportAgent } from "./agents";

export interface Command {
  command: SlashCommandBuilder;
  execute(interaction: ChatInputCommandInteraction): Promise<unknown> | unknown;
}

export interface CustomClientOptions {
  commands?: Command[];
}

export class CustomClient extends Client {
  commands: Collection<string, Command>;
  support = new SupportAgent();
  constructor(options: ClientOptions, { commands }: CustomClientOptions) {
    super(options);
    this.commands = new Collection(
      commands?.map((item) => [item.command.name.toLowerCase(), item])
    );
  }

  start(token?: string) {
    this.login(token);
    console.log("Starting client");
    this.once(Events.ClientReady, async (c) => {
      console.log(`${c.user.username} is ready!`);
    });
    this.on(Events.InteractionCreate, async (interaction) => {
      if (interaction.isChatInputCommand()) {
        const command = this.commands.get(interaction.commandName);
        await command?.execute(interaction);
        return;
      }
    });

    this.on(Events.MessageCreate, async (interaction) => {
      // If the message is not in a guild, ignore it.
      if (interaction.channel.isDMBased()) return;

      // If the message is in a thread, ignore it.
      if (interaction.channel.isThread()) {
        return;
      }
      // If the message is from a bot, ignore it.
      if (interaction.author.bot) {
        return;
      }

      const { data: organization, error: organizationError } =
        await supabaseClient
          .from("organizations")
          .select("*")
          .filter("discord_channel_id", "eq", interaction.channelId)
          .single();

      if (organizationError || !organization) {
        return;
      }
      await interaction.channel.sendTyping();

      const thread = await interaction.startThread({
        name: `Support Thread`,
      });

      const response = await this.support.respond({
        content: interaction.content,
        organizationId: organization.id,
        history: [],
      });

      await thread.send(response.text);
    });

    this.on(Events.MessageCreate, async (interaction) => {
      // If the message is not in a guild, ignore it.
      if (interaction.channel.isDMBased()) return;

      // If the message is not in a thread, ignore it.
      if (!interaction.channel.isThread()) {
        return;
      }
      // If the message is from a bot, ignore it.
      if (interaction.author.bot) {
        return;
      }

      const { data: organization, error: organizationError } =
        await supabaseClient
          .from("organizations")
          .select("*")
          .filter("discord_channel_id", "eq", interaction.channel.parentId)
          .single();

      // if the channel is not a support channel, ignore it.
      if (organizationError || !organization) {
        return;
      }

      const history = await interaction.channel.messages.fetch({
        limit: 25,
      });

      const response = await this.support.respond({
        organizationId: organization.id,
        content: interaction.content,
        history: history
          .map((item) => {
            if (item.author.id === this.user?.id) {
              return `answer: ${item.content}`;
            } else {
              return `question: ${item.content}`;
            }
          })
          .reverse(),
      });
      await interaction.channel.send(response.text);
    });
  }
}
