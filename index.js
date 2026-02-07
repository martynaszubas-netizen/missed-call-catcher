const express = require("express");
const twilio = require("twilio");

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_SMS_FROM,
  OWNER_PHONE,
  SHEETS_WEBAPP_URL,
  BASE_URL
} = process.env;

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

app.post("/voice", (req, res) => {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();

  twiml.say(
    { language: "lt-LT" },
    "Sveiki. Šiuo metu negalime atsiliepti. Palikite trumpą žinutę po signalo."
  );

  twiml.record({
    action: `${BASE_URL}/recording-complete`,
    method: "POST",
    maxLength: 120,
    playBeep: true,
    trim: "trim-silence"
  });

  twiml.say({ language: "lt-LT" }, "Ačiū.");

  res.type("text/xml");
  res.send(twiml.toString());
});

app.post("/recording-complete", async (req, res) => {
  try {
    const from = req.body.From || "";
    const callSid = req.body.CallSid || "";
    const recordingUrl = req.body.RecordingUrl || "";
    const recordingMp3 = recordingUrl ? `${recordingUrl}.mp3` : "";

    const smsText =
      `📞 Praleistas skambutis\n` +
      `Skambino: ${from}\n` +
      (recordingMp3 ? `🎧 Įrašas: ${recordingMp3}\n` : "") +
      `ID: ${callSid}`;

    if (TWILIO_SMS_FROM && OWNER_PHONE) {
      await client.messages.create({
        from: TWILIO_SMS_FROM,
        to: OWNER_PHONE,
        body: smsText
      });
    }

    if (SHEETS_WEBAPP_URL) {
      await fetch(SHEETS_WEBAPP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          recording: recordingMp3,
          note: "missed-call"
        })
      });
    }

    res.status(200).send("OK");
  } catch (err) {
    console.error(err);
    res.status(500).send("ERROR");
  }
});

app.get("/", (req, res) => res.send("OK"));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Server running on port", port));
