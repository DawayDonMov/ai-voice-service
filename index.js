const express = require("express");
const bodyParser = require("body-parser");
const app = express();

app.use(bodyParser.urlencoded({ extended: false }));

// Twilio 測試用 webhook
app.post("/twilio/voice", (req,res)=>{
  res.type("text/xml");
  res.send(`
    <Response>
      <Say voice="alice">Hello, your server is working!</Say>
    </Response>
  `);
});

app.get("/", (req,res)=> res.send("Server is running."));

const port = process.env.PORT || 3000;
app.listen(port, ()=> console.log("Server listening on", port));
