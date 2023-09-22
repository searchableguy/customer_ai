import {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} from "discord.js";
import { Command } from "../client";
import { UnstructuredLoader } from "../unstructured";
import { AppConfig } from "../config";
import { supabaseClient } from "../config/supabase";
import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";

export const start: Command = {
  command: new SlashCommandBuilder()
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addAttachmentOption((option) => {
      return option
        .setName("document")
        .setDescription(
          "Upload document to use as a knowledge base. You can add more later."
        )
        .setRequired(true);
    })
    .addChannelOption((option) => {
      return option
        .setName("support_channel")
        .setDescription("Channel to use for support questions.")
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText);
    })
    .setName("start")
    .setDescription("Setup a support channel for your server."),

  async execute(option) {
    const document = option.options.getAttachment("document", true);
    const guildId = option.guildId!.toLowerCase().trim();
    const channel = option.options.get("support_channel")!.channel;

    if (!document) {
      return option.reply({
        content: "You must provide a document to use as a knowledge base.",
        ephemeral: true,
      });
    }

    const { data: organization, error: organizationError } =
      await supabaseClient
        .from("organizations")
        .upsert(
          {
            discord_guild_id: guildId,
            discord_channel_id: channel!.id,
          },
          {
            onConflict: "discord_guild_id",
          }
        )
        .select()
        .single();

    if (organizationError) {
      return option.reply({
        content: "An error occurred while creating the organization.",
        ephemeral: true,
      });
    }

    await option.reply({
      content: `Successfully setup a support channel at ${channel}.`,
      ephemeral: true,
    });

    const loader = new UnstructuredLoader(new URL(document.url), {
      apiUrl: AppConfig.unstructuredApiUrl,
      apiKey: AppConfig.unstructuredApiKey,
    });

    const content = await loader.loadAndSplit();
    const docs = content.map((item) => {
      item.metadata.organizationId = organization.id;
      return item;
    });

    await SupabaseVectorStore.fromDocuments(docs, new OpenAIEmbeddings(), {
      client: supabaseClient,
      tableName: "documents",
      queryName: "match_documents",
    });
    return option.followUp({
      content:
        "Successfully created the knowledge base. You can now ask questions in the support channel.",
      ephemeral: true,
    });
  },
};
