// Cloudflare Worker: secure proxy to OpenAI Chat Completions API

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Secret must be set as OPENAI_API_KEY in Worker settings
    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "Missing OPENAI_API_KEY in Cloudflare environment.",
        }),
        { headers: corsHeaders, status: 500 }
      );
    }

    let userInput;
    try {
      userInput = await request.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body." }),
        { headers: corsHeaders, status: 400 }
      );
    }

    const apiUrl = "https://api.openai.com/v1/chat/completions";

    const requestBody = {
      model: "gpt-4o",
      messages: userInput.messages,
      max_completion_tokens: 300,
    };

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      return new Response(JSON.stringify(data), {
        headers: corsHeaders,
        status: response.status,
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Error calling OpenAI API.",
          details: String(error),
        }),
        { headers: corsHeaders, status: 500 }
      );
    }
  },
};
