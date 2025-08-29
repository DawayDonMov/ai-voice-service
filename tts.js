import WebSocket from "ws";

export function openTTS({ voiceId, onAudio }){
  const url = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=eleven_multilingual_v2`;
  const ws = new WebSocket(url, { headers:{ "xi-api-key": process.env.ELEVENLABS_API_KEY } });

  // 文字佇列，做 barge-in 可中斷
  let queue = []; let open = false; let interrupted=false;

  ws.on("open", ()=>{
    // 設為 μ-law/8k，低延遲
    ws.send(JSON.stringify({
      text: "", voice_settings:{stability:0.55, similarity_boost:0.75},
      generation_config:{ chunk_length_schedule:[120,80,40], enable_ssml:false },
      audio:{ format:"pcm_mulaw", sample_rate:8000 }
    }));
    open = true;
    pump();
  });

  ws.on("message",(data)=>{
    // 回來已是 μ-law PCM
    onAudio(Buffer.from(data));
  });

  function pump(){
    if(!open) return;
    while(queue.length>0 && ws.readyState===1){
      ws.send(JSON.stringify({ text: queue.shift() }));
    }
  }

  return {
    enqueueText: (tok)=> { if(!interrupted) { queue.push(tok); pump(); } },
    flush: ()=> pump(),
    interrupt: ()=> { interrupted=true; queue.length=0; }, // barge-in
    close: ()=> { try{ws.close();}catch{} }
  };
}
