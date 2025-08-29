import WebSocket from "ws";

export function openDeepgram({ onTranscript }){
  const url = "wss://api.deepgram.com/v1/listen?model=premier&encoding=mulaw&sample_rate=8000&smart_format=true&punctuate=true&interim_results=true";
  const dg = new WebSocket(url, { headers:{ Authorization:"Token "+process.env.DEEPGRAM_API_KEY } });

  dg.on("message",(raw)=>{
    const m = JSON.parse(raw.toString());
    const alt = m.channel?.alternatives?.[0];
    if(!alt) return;
    const text = alt.transcript || "";
    const isFinal = !!m.is_final;
    onTranscript(text, isFinal);
  });

  return {
    feed: (muLawBuf)=> { if(dg.readyState===1) dg.send(muLawBuf); },
    close: ()=> { try{dg.close();}catch{} }
  };
}
