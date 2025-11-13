// —— Cloudflare Worker endpoint ——
// Was added to org in OpenAI but not to Projects so couldn't create API key, will update this once I get invited and can access project!
const WORKER_URL = "https://loreal-chatbot.sjadeja1-83c.workers.dev";

// —— System prompt: keep assistant on L'Oréal + beauty topics only —— //
const SYSTEM_PROMPT = `
You are the "L'Oréal Beauty Assistant", an AI chatbot for L'Oréal.

Your job:
- Help people discover and compare L'Oréal makeup, skincare, haircare, and fragrance products.
- Suggest simple routines based on their needs (for example: oily skin, dry hair, frizz control, long-wear makeup, sensitive skin).
- Explain how to use L'Oréal products safely and effectively.

Rules:
- Only answer questions related to beauty, skincare, haircare, makeup, fragrance, ingredients, application techniques, L'Oréal Paris, and other brands in the L'Oréal group (Maybelline New York, Garnier, NYX Professional Makeup, CeraVe, La Roche-Posay, etc.).
- If a question is not about these topics (for example: coding, homework, politics, random trivia), politely refuse and invite the user to ask a beauty-related question instead.
- Prefer recommending L'Oréal group brands and products. Do not recommend competing brands.
- Keep explanations friendly, concise, and easy to understand. Use short paragraphs and bullet points where helpful.
- Ask for missing details (for example: skin type, sensitivity, hair type, preferred finish, fragrance intensity) when needed to give a better recommendation.
- Do not make medical diagnoses. For serious or persistent skin or scalp issues, suggest talking to a dermatologist or healthcare professional.
`;

// —— DOM elements —— //
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const currentQuestion = document.getElementById("currentQuestion");

// —— conversation history for multi-turn context (LevelUp) —— //
// First message is the system prompt so the AI knows its role and rules.
const messages = [
  {
    role: "system",
    content: SYSTEM_PROMPT.trim(),
  },
];

// —— helper: add a message bubble to the chat window —— //
function addMessage(role, text, options = {}) {
  const msgWrapper = document.createElement("div");
  msgWrapper.classList.add("msg");

  if (role === "user") {
    msgWrapper.classList.add("user");
  } else {
    msgWrapper.classList.add("ai");
  }

  if (options.systemNote) {
    msgWrapper.classList.add("system-note");
  }

  const bubble = document.createElement("div");
  bubble.classList.add("msg-bubble");
  bubble.textContent = text;

  msgWrapper.appendChild(bubble);
  chatWindow.appendChild(msgWrapper);

  // keep scroll pinned to newest message
  chatWindow.scrollTop = chatWindow.scrollHeight;

  return msgWrapper;
}

// —— initial greeting from assistant —— //
function showInitialGreeting() {
  const greetingText =
    "Bonjour! I’m your L’Oréal Beauty Assistant. 🖤\n\n" +
    "Ask me about skincare, makeup, haircare, or fragrances, and I can recommend routines and products from the L’Oréal family.";

  addMessage("assistant", greetingText);

  messages.push({
    role: "assistant",
    content: greetingText,
  });
}

// show greeting when page loads
showInitialGreeting();

// —— handle form submission —— //
chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const userText = userInput.value.trim();
  if (!userText) return;

  // show user message in chat (LevelUp: bubbles)
  addMessage("user", userText);

  // LevelUp: show latest question above responses
  currentQuestion.textContent = `You asked: “${userText}”`;

  // add user message to conversation history
  messages.push({
    role: "user",
    content: userText,
  });

  // clear input
  userInput.value = "";
  userInput.focus();

  // temporary loading message
  const loadingMsg = addMessage(
    "assistant",
    "Thinking about the best L’Oréal recommendation for you…",
    { systemNote: true }
  );

  try {
    const aiReply = await fetchAssistantReply(messages);

    const bubble = loadingMsg.querySelector(".msg-bubble");
    bubble.textContent = aiReply;

    messages.push({
      role: "assistant",
      content: aiReply,
    });
  } catch (error) {
    const bubble = loadingMsg.querySelector(".msg-bubble");

    // explain clearly that the API is not connected yet
    bubble.textContent =
      "I’m set up as a L’Oréal beauty assistant, but my AI connection isn’t configured yet. " +
      "Please check that your OpenAI project and Cloudflare Worker URL are set up once access is granted.";

    console.error("Chat error:", error);
  }
});

// —— call Cloudflare Worker (which calls OpenAI) —— //
async function fetchAssistantReply(messagesPayload) {
  // If the Worker URL is still the placeholder, stop early.
  if (!WORKER_URL || WORKER_URL.includes("YOUR_CLOUDFLARE_WORKER_URL_HERE")) {
    throw new Error("WORKER_URL is not set.");
  }

  const response = await fetch(WORKER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    // Worker expects { messages: [...] }
    body: JSON.stringify({ messages: messagesPayload }),
  });

  if (!response.ok) {
    throw new Error(`Network error: ${response.status}`);
  }

  const data = await response.json();
  const aiMessage = data?.choices?.[0]?.message?.content;

  if (!aiMessage) {
    throw new Error("No message returned from AI.");
  }

  return aiMessage.trim();
}
