const twilio = require("twilio");
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

client.calls.create({
   to: "+886988915221",        // 你的手機號碼（要已驗證）
   from: "+16402055006",       // 你買的 Twilio 號碼
   url: "https://ai-voice-service-pudy.onrender.com/twilio/voice"
}).then(call => console.log("Call SID:", call.sid))
  .catch(err => console.error(err));
