import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import { supabaseClient } from "./config/supabase";
import { ConversationalRetrievalQAChain } from "langchain/chains";
import { OpenAI } from "langchain";

interface AskOptions {
  content: string;
  organizationId: string;
  history: string[];
}
export class SupportAgent {
  constructor(
    public model = new OpenAI({
      modelName: "gpt-3.5-turbo",
    })
  ) {}

  async getChain({ organizationId }: Record<"organizationId", string>) {
    const vectorStore = await SupabaseVectorStore.fromExistingIndex(
      new OpenAIEmbeddings(),
      {
        client: supabaseClient,
        queryName: "match_documents",
        tableName: "documents",
      }
    );
    /* Create the chain */
    const chain = ConversationalRetrievalQAChain.fromLLM(
      this.model,
      vectorStore.asRetriever(10, {
        organizationId,
      }),
      {
        inputKey: "question",
        outputKey: "answer",
      }
    );
    return chain;
  }

  async respond({ content, organizationId, history = [] }: AskOptions) {
    const chain = await this.getChain({
      organizationId,
    });
    const response = await chain.call({
      question: content,
      chat_history: history.join("\n"),
    });
    return response;
  }
}
