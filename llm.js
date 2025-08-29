import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export function openLLM({ onToken, onDone }){
  return {
    async ask(systemPrompt, messages){
      const stream = await client.chat.completions.create({
        model: "gpt-4o-mini",
        stream: true,
        messages: [{role:"system", content: systemPrompt}, ...messages]
      });
      for await (const chunk of stream){
        const tok = chunk.choices?.[0]?.delta?.content;
        if(tok){ onToken(tok); }
      }
      onDone && onDone();
    },
    close(){ /* 無需保持連線 */ }
  };
}
