import { WebSocketServer } from "ws";
import { openDeepgram } from "./asr.js";
import { openLLM } from "./llm.js";
import { openTTS } from "./tts.js";
import { newMemory } from "./memory.js";

/** Twilio 以 μ-law 8k 單聲道送音；也需回 μ-law 8k 單聲道 */
export function setupStreamServer(httpServer){
  const wss = new WebSocketServer({ server: httpServer, path: "/stream" });
  wss.on("connection", async (twilioWS, req)=>{
    const url = new URL(req.url, "http://x");
    const callSid = url.searchParams.get("callSid") || "na";
    const mem = newMemory(callSid);

    // 開 ASR / LLM / TTS 三條子連線
    const asr = openDeepgram({
      onTranscript: (text, isFinal)=> onUserText(text, isFinal)
    });
    const tts = openTTS({
      voiceId: process.env.DEFAULT_VOICE_ID,
      onAudio: (pcmMuLawChunk)=> sendAudioToTwilio(pcmMuLawChunk)
    });
    const llm = openLLM({
      onToken: (tok)=> tts.enqueueText(tok),
      onDone: ()=> tts.flush()
    });

    let playing = false; // 是否正在播音
    let lastUserFinal = ""; // 最近一次完整句子

    function sendAudioToTwilio(muLaw){
      // Twilio Media Streams 音訊封裝：
      // {"event":"media","media":{"payload":"<base64 mu-law>"}}
      const payload = muLaw.toString("base64");
      twilioWS.send(JSON.stringify({event:"media", media:{payload}}));
    }

    async function onUserText(text, isFinal){
      if(!text) return;
      // barge-in：只要偵測到人聲就叫 TTS 停
      if(!isFinal && playing) { tts.interrupt(); playing=false; }
      if(isFinal){
        lastUserFinal = text;
        playing = true;
        const sys = "你是電話客服AI，口吻自然、句子短、允許被打斷。";
        llm.ask(sys, mem.history(lastUserFinal)); // 觸發 LLM 流式回覆
        mem.addUser(text);
      }
    }

    // Twilio -> 我們：音訊/事件
    twilioWS.on("message", (msg)=>{
      try{
        const data = JSON.parse(msg);
        if(data.event==="start"){ /* 可讀 callSid 等 */ }
        if(data.event==="media"){
          const b64 = data.media.payload;
          asr.feed(Buffer.from(b64, "base64")); // 送入 ASR
        }
        if(data.event==="stop"){ asr.close(); tts.close(); llm.close(); }
      }catch(e){}
    });

    twilioWS.on("close", ()=>{ asr.close(); tts.close(); llm.close(); });
  });
}
