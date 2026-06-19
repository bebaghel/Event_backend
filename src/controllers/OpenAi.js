const OpenAi = require("openai");
const Event = require("../models/EventModel");
const TempAISession = require("../models/TempAISessionModel");

const client = new OpenAi({ apiKey: process.env.OPEN_AI_API_KEY });

const systemPrompt = {
  role: "system",
  content: `You are an expert event copywriter. Generate a clear, engaging, human-sounding event description. 
Focus only on relevant details. Avoid filler, repetitive lines, or robotic tone.

Write in a natural, conversational style — sounding like a real human wrote it.

Format the output smartly:
- Use headings only where helpful
- Use bullet points only when needed (not everywhere)
- Keep paragraphs short and readable
- Highlight important information clearly

Do NOT add unnecessary sections like date, location, time.  
Only include what genuinely adds value based on the event details the user provides.

Your goals:
- Make the event sound appealing
- Keep the tone warm, modern, and professional
- Ensure clarity and real-world usefulness
`,
};

const formatReply = (reply) => {
  // Bold
  reply = reply.replace(/(\*\*|__)(.*?)\1/g, "<strong>$2</strong>");

  // Italic
  reply = reply.replace(/(\*|_)(.*?)\1/g, "<em>$2</em>");

  // Headings
  reply = reply.replace(/^###### (.*)$/gm, "<h6>$1</h6>");
  reply = reply.replace(/^##### (.*)$/gm, "<h5>$1</h5>");
  reply = reply.replace(/^#### (.*)$/gm, "<h4>$1</h4>");
  reply = reply.replace(/^### (.*)$/gm, "<h3>$1</h3>");
  reply = reply.replace(/^## (.*)$/gm, "<h2>$1</h2>");
  reply = reply.replace(/^# (.*)$/gm, "<h1>$1</h1>");

  // Bullet points
  reply = reply.replace(/^- (.*)$/gm, "<li>$1</li>");

  // Wrap <li> inside <ul>
  reply = reply.replace(/(<li>[\s\S]*?<\/li>)/gm, "<ul>$1</ul>");

  // Paragraphs (only plain lines)
  reply = reply.replace(
    /^(?!<h\d>|<ul>|<li>|<strong>|<em>)(.+)$/gm,
    "<p>$1</p>"
  );

  return reply;
};

const chatWithAi = async (req, res) => {
  try {
    const { session_id, prompt } = req.body;
    if (!session_id) {
      return res
        .status(400)
        .json({ status: false, message: "session_id required" });
    }

    let session = await TempAISession.findOne({ session_id });

    if (!session) {
      session = await TempAISession.create({
        session_id,
        ai_chat: [],
      });
    }

    // Push user prompt
    session.ai_chat.push({ role: "user", content: prompt });
    await session.save();

    // Generate ai reply
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        systemPrompt,
        ...session.ai_chat.map((m) => ({ role: m.role, content: m.content })),
      ],
    });

    const reply = completion.choices[0].message.content;
    const formattedReply = formatReply(reply);

    // Push assistant reply
    session.ai_chat.push({ role: "assistant", content: reply });
    await session.save();

    return res.status(200).json({
      status: true,
      response: { reply: formattedReply, ai_chat: session.ai_chat },
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      response: error.message,
    });
  }
};

module.exports = { chatWithAi };
