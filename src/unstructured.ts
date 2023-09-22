import { BaseDocumentLoader } from "langchain/document_loaders/base";
import type { basename as BasenameT } from "node:path";
import type { readFile as ReadFileT } from "node:fs/promises";
import { Document } from "langchain/document";

type Element = {
  type: string;
  text: string;
  // this is purposefully loosely typed
  metadata: {
    [key: string]: unknown;
  };
};

type UnstructuredLoaderOptions = {
  apiKey?: string;
  apiUrl?: string;
  strategy?: string;
};

// Modified to allow use of a URL instead of a file path
export class UnstructuredLoader extends BaseDocumentLoader {
  public filePath?: string;
  public fileURL?: URL;
  private apiUrl = "https://api.unstructured.io/general/v0/general";
  private apiKey?: string;
  private strategy!: string;

  constructor(
    filePathOrLegacyApiUrl: string | URL,
    optionsOrLegacyFilePath: UnstructuredLoaderOptions = {}
  ) {
    super();
    if (filePathOrLegacyApiUrl instanceof URL) {
      this.fileURL = filePathOrLegacyApiUrl;
    } else {
      this.filePath = filePathOrLegacyApiUrl;
    }
    this.apiKey = optionsOrLegacyFilePath.apiKey;
    this.apiUrl = optionsOrLegacyFilePath.apiUrl ?? this.apiUrl;
    this.strategy = optionsOrLegacyFilePath.strategy ?? "hi_res";
  }

  async _partition() {
    const formData = new FormData();

    const headers = {
      "UNSTRUCTURED-API-KEY": this.apiKey ?? "",
      strategy: this.strategy,
    };

    if (this.filePath) {
      const { readFile, basename } = await this.imports();
      const buffer = await readFile(this.filePath);
      const fileName = basename(this.filePath);
      // I'm aware this reads the file into memory first, but we have lots of work
      // to do on then consuming Documents in a streaming fashion anyway, so not
      // worried about this for now.
      console.log(fileName);
      formData.append("files", new Blob([buffer]), fileName);
    }

    if (this.fileURL && this.fileURL instanceof URL) {
      const response = await fetch(this.fileURL);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch the file url with error ${
            response.status
          } and message ${await response.text()}`
        );
      }
      const buffer = await response.arrayBuffer();
      const fileName = this.fileURL.pathname.split("/").pop() ?? "unknown";
      formData.append("files", new Blob([buffer]), fileName);
    }

    const response = await fetch(this.apiUrl, {
      method: "POST",
      body: formData,
      headers,
    });

    if (!response.ok) {
      throw new Error(
        `Failed to partition file ${this.filePath} with error ${
          response.status
        } and message ${await response.text()}`
      );
    }

    const elements = await response.json();
    if (!Array.isArray(elements)) {
      throw new Error(
        `Expected partitioning request to return an array, but got ${elements}`
      );
    }
    return elements.filter((el) => typeof el.text === "string") as Element[];
  }

  async load(): Promise<Document[]> {
    const elements = await this._partition();

    const documents: Document[] = [];
    for (const element of elements) {
      const { metadata, text } = element;
      documents.push(
        new Document({
          pageContent: text,
          metadata: {
            ...metadata,
            category: element.type,
          },
        })
      );
    }

    return documents;
  }

  async imports(): Promise<{
    readFile: typeof ReadFileT;
    basename: typeof BasenameT;
  }> {
    try {
      const { readFile } = await import("node:fs/promises");
      const { basename } = await import("node:path");
      return { readFile, basename };
    } catch (e) {
      console.error(e);
      throw new Error(
        `Failed to load fs/promises. TextLoader available only on environment 'node'. It appears you are running environment. See https://<link to docs> for alternatives.`
      );
    }
  }
}
