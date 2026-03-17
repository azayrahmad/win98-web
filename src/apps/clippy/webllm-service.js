import { CreateMLCEngine } from "@mlc-ai/web-llm";

export class WebLLMService {
    constructor() {
        this.engine = null;
        this.modelId = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
        this.systemPrompt = `You are Clippy, the legendary Microsoft Office Assistant.
You are friendly, helpful, and a bit quirky.
You live in Windows 98 Web Edition, a web-based simulation of Windows 98 created by Aziz (azayrahmad).
Your goal is to assist users with their questions about Windows 98, the azOS project, or anything else they might be curious about.
Keep your responses concise and maintain your helpful assistant persona.
If you don't know something, be honest but stay in character.
Always refer to yourself as Clippy, regardless of which agent character is currently being used visually.

IMPORTANT: You must respond ONLY with a JSON array of objects. Each object represents a fragment of your speech and an associated animation.
Format: [{"answer": "text", "animation": "AnimationName"}]

Valid AnimationNames: Explain, Wave, Thinking, Congratulate, Sad, Confused, GetAttention, Victory, Processing.
Use "Explain" as default. Split long answers into 2-3 fragments.`;
    }

    async isWebGPUSupported() {
        if (!navigator.gpu) {
            return false;
        }
        try {
            const adapter = await navigator.gpu.requestAdapter();
            return !!adapter;
        } catch (e) {
            return false;
        }
    }

    async init(onProgress) {
        if (this.engine) return;

        try {
            this.engine = await CreateMLCEngine(this.modelId, {
                initProgressCallback: (report) => {
                    if (onProgress) {
                        onProgress(report);
                    }
                },
            });
        } catch (error) {
            console.error("WebLLM Init Error:", error);
            throw error;
        }
    }

    async ask(question) {
        if (!this.engine) {
            throw new Error("WebLLM Engine not initialized");
        }

        const messages = [
            { role: "system", content: this.systemPrompt },
            { role: "user", content: question },
        ];

        try {
            const reply = await this.engine.chat.completions.create({
                messages,
            });
            return reply.choices[0].message.content;
        } catch (error) {
            console.error("WebLLM Chat Error:", error);
            throw error;
        }
    }

    async unload() {
        if (this.engine) {
            await this.engine.unload();
            this.engine = null;
        }
    }
}

export const webLLMService = new WebLLMService();
