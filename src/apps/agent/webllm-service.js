import * as webllm from "@mlc-ai/web-llm";

export class WebLLMService {
  constructor() {
    this.engine = null;
    // User requested "qwen3.5 0.8b".
    // Available MLC models for Qwen2.5 include 0.5B and 1.5B.
    // Qwen2.5-0.5B-Instruct-q4f16_1-MLC is the most efficient and reliable choice for this context.
    this.selectedModel = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";
  }

  async init(onProgress) {
    if (this.engine) return;

    this.engine = await webllm.CreateMLCEngine(this.selectedModel, {
      initProgressCallback: onProgress,
    });
  }

  async chat(messages, options = {}) {
    if (!this.engine) {
      await this.init();
    }

    const completion = await this.engine.chat.completions.create({
      messages,
      ...options,
    });

    return completion.choices[0].message.content;
  }

  async chatStream(messages, onChunk, options = {}) {
    if (!this.engine) {
      await this.init();
    }

    const chunks = await this.engine.chat.completions.create({
      messages,
      stream: true,
      ...options,
    });

    let fullAnswer = "";
    for await (const chunk of chunks) {
      const content = chunk.choices[0]?.delta?.content || "";
      fullAnswer += content;
      if (onChunk) onChunk(content, fullAnswer);
    }
    return fullAnswer;
  }
}

export const webLLMService = new WebLLMService();
