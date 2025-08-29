import express from "express";
import bodyParser from "body-parser";
import { createServer } from "http";
import { setupStreamServer } from "./stream.js";
import twilio from "twilio";

const app = express();
app.use(bodyParser.urlencoded({extended:false}));
app.get("/", (_,res)=>res.send("Server is running."));

/** 來電 → 串 Media Streams 到 /stream */
app.post("/twilio/voice", (req,res)=>{
  const callSid = req.body.CallSid || "na";
  const wsUrl = `wss://${process.env.RENDER_EXTERNAL_HOSTNAME || req.headers.host}/stream?callSid=${callSid}`;
  res.type("text/xml").send(`
    <Response>
      <Connect>
        <Stream url="${wsUrl}"/>
      </Connect>
    </Response>
  `);
});

/** 一鍵撥出（可晚點用）*/
app.get("/makecall", async (req,res)=>{
  try{
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const to = process.env.OUTBOUND_TO_E164;
    if(!to) return res.status(400).send("Set OUTBOUND_TO_E164 first.");
    const r = await client.calls.create({
      to, from: process.env.FROM_NUMBER,
      url:`https://${process.env.RENDER_EXTERNAL_HOSTNAME}/twilio/voice`
    });
    res.send("Call SID: "+r.sid);
  }catch(e){res.status(500).send(e.message);}
});

/** 換音色（簡易） */
app.post("/api/voice/set-default", express.json(), (req,res)=>{
  const { voiceId } = req.body;
  process.env.DEFAULT_VOICE_ID = voiceId;
  res.json({ok:true});
});

const server = createServer(app);
setupStreamServer(server); // 啟動 WS 管線
server.listen(process.env.PORT || 10000, ()=>console.log("Listening"));
