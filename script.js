// —— Cloudflare Worker endpoint ——
// Was added to org in OpenAI but not to Projects so couldn't create API key,
// will update this once I get invited and can access project!
const WORKER_URL = "https://loreal-chatbot-api.sjadeja1.workers.dev";

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
- Write in clean, easy-to-read text instead of heavy Markdown. Avoid using headings like "###" or bold markers like "**text**". Use short paragraphs, numbered steps, and simple bullet points with the bullet character (•).
- You may include 1–3 relevant emojis (for example 💧, ✨, 🌙, ☀️, 💄, 💇‍♀️, 🌸) to keep the tone friendly and modern, but do not overuse them.

LevelUp: When web search tools are available, you may use them to confirm details
about L'Oréal products and routines. When you rely on web information, include a
short "Sources" list at the end with 1–3 relevant product or brand URLs.
`.trim();

// —— DOM elements: products + filters —— //
const categoryFilter = document.getElementById("categoryFilter");
const productSearch = document.getElementById("productSearch");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineBtn = document.getElementById("generateRoutine");
const clearSelectedBtn = document.getElementById("clearSelected");
const rtlToggle = document.getElementById("rtlToggle");

// —— DOM elements: chat —— //
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const currentQuestion = document.getElementById("currentQuestion");

// intro overlay + wrapper
const introOverlay = document.getElementById("introOverlay");
const pageWrapper = document.querySelector(".page-wrapper");

// —— state: products + selected items —— //
let allProducts = [];
const selectedProductIds = new Set();
const STORAGE_KEY = "lorealSelectedProducts_v2";

// —— conversation history for multi-turn context (LevelUp) —— //
const messages = [
  {
    role: "system",
    content: SYSTEM_PROMPT,
  },
];

// —— helper: lightly clean AI markdown into plain text —— //
// This keeps things readable without fully parsing markdown.
function formatAiText(rawText) {
  if (!rawText) return "";

  let text = rawText;

  // Remove markdown headings like "### Title"
  text = text.replace(/^###\s*/gm, "");
  text = text.replace(/^##\s*/gm, "");

  // Remove **bold** markers but keep the words
  text = text.replace(/\*\*(.*?)\*\*/g, "$1");

  // Turn "- " lists into bullet "• "
  text = text.replace(/^\s*-\s+/gm, "• ");

  return text.trim();
}

// —— helpers: products loading + rendering —— //

// Load product data from products.json
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

// Render products based on category + search filters
function renderProductGrid() {
  // If products failed to load, show a simple message
  if (!allProducts.length) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        Products are still loading. Please try again in a moment.
      </div>
    `;
    return;
  }

  const category = categoryFilter.value;
  const query = productSearch.value.trim().toLowerCase();

  // If no filters, show a gentle prompt
  if (!category && !query) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        Choose a category or type a keyword to explore L'Oréal group products.
      </div>
    `;
    return;
  }

  const filtered = allProducts.filter((product) => {
    const matchesCategory = !category || product.category === category;

    const matchesSearch =
      !query ||
      product.name.toLowerCase().includes(query) ||
      product.brand.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query);

    return matchesCategory && matchesSearch;
  });

  if (!filtered.length) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        No products match your filters yet. Try another category or search term.
      </div>
    `;
    return;
  }

  productsContainer.innerHTML = filtered
    .map((product) => {
      const isSelected = selectedProductIds.has(product.id);

      return `
        <article
          class="product-card ${isSelected ? "selected" : ""}"
          data-id="${product.id}"
        >
          <img src="${product.image}" alt="${product.name}" />
          <div class="product-info">
            <h3>${product.name}</h3>
            <p class="product-brand">${product.brand}</p>
            <button type="button" class="details-btn">
              Details
            </button>
          </div>
          <p class="product-description">
            ${product.description}
          </p>
        </article>
      `;
    })
    .join("");
}

// Render selected products list above the Generate button
function renderSelectedProducts() {
  if (!selectedProductIds.size) {
    selectedProductsList.innerHTML = `
      <p class="empty-selected">
        No products selected yet. Tap a product card to add it to your routine.
      </p>
    `;
    generateRoutineBtn.disabled = true;
    return;
  }

  generateRoutineBtn.disabled = false;

  const selected = allProducts.filter((p) => selectedProductIds.has(p.id));

  selectedProductsList.innerHTML = selected
    .map(
      (product) => `
      <div class="selected-pill" data-id="${product.id}">
        <span class="selected-name">${product.name}</span>
        <button
          type="button"
          class="remove-selected"
          aria-label="Remove ${product.name}"
        >
          ×
        </button>
      </div>
    `
    )
    .join("");
}

// Save selected product IDs into localStorage
function saveSelectedToStorage() {
  const idsArray = Array.from(selectedProductIds);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(idsArray));
}

// Restore selected product IDs from localStorage
function restoreSelectionFromStorage() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return;

  try {
    const ids = JSON.parse(stored);
    ids.forEach((id) => selectedProductIds.add(id));
  } catch (error) {
    console.error("Error reading stored selections:", error);
  }
}

// Toggle selection state for a given product id
function toggleProductSelection(productId) {
  if (selectedProductIds.has(productId)) {
    selectedProductIds.delete(productId);
  } else {
    selectedProductIds.add(productId);
  }

  saveSelectedToStorage();
  renderProductGrid();
  renderSelectedProducts();
}

// Clear all selections
function clearAllSelections() {
  if (!selectedProductIds.size) return;
  selectedProductIds.clear();
  saveSelectedToStorage();
  renderProductGrid();
  renderSelectedProducts();
}

// —— event wiring: products area —— //

// Category dropdown
categoryFilter.addEventListener("change", () => {
  renderProductGrid();
});

// Live product search (LevelUp: Product Search)
productSearch.addEventListener("input", () => {
  renderProductGrid();
});

// Click handling for product cards + Details buttons
productsContainer.addEventListener("click", (event) => {
  const detailsBtn = event.target.closest(".details-btn");
  if (detailsBtn) {
    // Show/hide description without toggling selection
    event.stopPropagation();
    const card = event.target.closest(".product-card");
    card.classList.toggle("show-description");
    return;
  }

  const card = event.target.closest(".product-card");
  if (!card) return;

  const id = Number(card.dataset.id);
  toggleProductSelection(id);
});

// Remove from selected list
selectedProductsList.addEventListener("click", (event) => {
  const removeBtn = event.target.closest(".remove-selected");
  if (!removeBtn) return;

  const pill = removeBtn.closest(".selected-pill");
  const id = Number(pill.dataset.id);
  toggleProductSelection(id);
});

// Clear all button
clearSelectedBtn.addEventListener("click", () => {
  clearAllSelections();
});

// Handle Generate Routine button
generateRoutineBtn.addEventListener("click", async () => {
  if (!selectedProductIds.size) {
    addMessage(
      "assistant",
      "To create a routine, please select at least one product from the list above."
    );
    return;
  }

  const selected = allProducts.filter((p) => selectedProductIds.has(p.id));

  // Short, visible "user" message so it looks like a real chat turn
  const userText =
    "Can you build a personalized routine using my selected products?";
  addMessage("user", userText);
  messages.push({ role: "user", content: userText });

  // Summary of selected products to send as JSON
  const productSummary = selected.map((p) => ({
    name: p.name,
    brand: p.brand,
    category: p.category,
    description: p.description,
  }));

  const contextMessage =
    const contextMessage =
    "Here is the list of L'Oréal group products the user selected, as JSON:\n\n" +
    JSON.stringify(productSummary, null, 2) +
    "\n\nTask: Create a simple routine using ONLY the selected products. " +
    "Output format must be:\n" +
    "AM Routine:\n• Step 1 ...\n• Step 2 ...\n\n" +
    "PM Routine:\n• Step 1 ...\n• Step 2 ...\n\n" +
    "Then add a short section: Tips (2–4 bullets).\n" +
    "If a routine is missing something essential (like moisturizer or sunscreen), mention it as 'Optional Additions (L’Oréal group)' but do NOT recommend specific products unless the user asks.";

  // For the actual API call, use a trimmed message set to avoid huge history
  const routineMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: contextMessage },
  ];

  // Loading bubble while AI "thinks"
  const loadingMsg = addMessage(
    "assistant",
    "Putting together your personalized routine…",
    { systemNote: true }
  );

  try {
    const aiReply = await fetchAssistantReply(routineMessages);
    const bubble = loadingMsg.querySelector(".msg-bubble");
    bubble.textContent = formatAiText(aiReply);

    // Still add the detailed context + reply into the main conversation
    messages.push({ role: "user", content: contextMessage });
    messages.push({ role: "assistant", content: aiReply });
  } catch (error) {
    const bubble = loadingMsg.querySelector(".msg-bubble");
    bubble.textContent =
      "I tried to generate your routine but ran into an error. Please try again in a moment, or try with fewer products if you selected a very large set.";
    console.error("Routine generation error:", error);
  }
});

// —— RTL toggle (LevelUp: RTL support) —— //
let isRtl = false;

rtlToggle.addEventListener("click", () => {
  isRtl = !isRtl;
  document.documentElement.setAttribute("dir", isRtl ? "rtl" : "ltr");
  rtlToggle.classList.toggle("active", isRtl);
  rtlToggle.textContent = isRtl ? "Switch to LTR" : "RTL";
});

// —— helpers: chat bubbles + conversation —— //

// Add a message bubble to the chat window
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

  // Keep scroll pinned to newest message
  chatWindow.scrollTop = chatWindow.scrollHeight;

  return msgWrapper;
}

// Initial greeting from assistant
function showInitialGreeting() {
  const greetingText =
    "Bonjour! I’m your L’Oréal Beauty Assistant. 🖤\n\n" +
    "Start by selecting products above to build a routine, or ask me anything about skincare, makeup, haircare, or fragrance from the L’Oréal family.";

  addMessage("assistant", greetingText);

  messages.push({
    role: "assistant",
    content: greetingText,
  });
}

// —— intro animation: show splash, then reveal page —— //
window.addEventListener("load", () => {
  // let the multi-ring + logo animation play once
  const INTRO_DURATION_MS = 3400; // rings + logo + small buffer

  setTimeout(() => {
    if (introOverlay) {
      introOverlay.classList.add("intro-overlay--hide");
    }
    if (pageWrapper) {
      pageWrapper.classList.add("show");
    }
  }, INTRO_DURATION_MS);
});

// —— handle chat form submission —— //
chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const userText = userInput.value.trim();
  if (!userText) return;

  // Show user message in chat (LevelUp: chat bubbles)
  addMessage("user", userText);

  // Show latest question above responses
  currentQuestion.textContent = `You asked: “${userText}”`;

  // Add user message to conversation history
  messages.push({
    role: "user",
    content: userText,
  });

  // Clear input
  userInput.value = "";
  userInput.focus();

  // Temporary loading message
  const loadingMsg = addMessage(
    "assistant",
    "Thinking about the best L’Oréal recommendation for you…",
    { systemNote: true }
  );

  try {
    const aiReply = await fetchAssistantReply(messages);

    const bubble = loadingMsg.querySelector(".msg-bubble");
    bubble.textContent = formatAiText(aiReply);

    messages.push({
      role: "assistant",
      content: aiReply,
    });
  } catch (error) {
    const bubble = loadingMsg.querySelector(".msg-bubble");

    bubble.textContent =
      "I’m having trouble reaching the AI service right now. Please try again in a moment.";

    console.error("Chat error:", error);
  }
});

// —— call Cloudflare Worker (which calls OpenAI) —— //
async function fetchAssistantReply(messagesPayload) {
  // If the Worker URL is still a placeholder, stop early
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

// —— init on page load —— //
(async function init() {
  try {
    allProducts = await loadProducts();
    restoreSelectionFromStorage();
    renderProductGrid();
    renderSelectedProducts();
  } catch (error) {
    console.error("Error loading products:", error);
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        Something went wrong loading products. Please refresh and try again.
      </div>
    `;
  }

  showInitialGreeting();
})();
