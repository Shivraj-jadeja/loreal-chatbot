# L’Oréal AI Beauty Assistant

An AI-powered web application that helps users explore L’Oréal group products and generate personalized beauty routines.  
The project combines a modern frontend, structured product data, and an OpenAI-powered chatbot secured through a Cloudflare Worker.

---

## Overview

This application allows users to:
- Browse and filter products across L’Oréal group brands (skincare, makeup, haircare, fragrance)
- Select products to build a personalized routine
- Interact with an AI assistant that provides product explanations and step-by-step recommendations
- Receive responses constrained to L’Oréal brands and beauty-related topics only

The focus of this project is **real-world AI integration**, **API security**, and **user-centered design**.

---

## Key Features

- **AI-Powered Chatbot**
  - Uses OpenAI’s Chat Completions API
  - Maintains multi-turn conversation context
  - Enforced system prompt to restrict responses to L’Oréal products and beauty topics

- **Personalized Routine Generation**
  - Users select products from a curated catalog
  - Selected products are summarized and sent to the AI as structured context
  - AI generates a clear, step-by-step routine using only selected items

- **Secure API Architecture**
  - OpenAI API calls are routed through a **Cloudflare Worker**
  - API keys are never exposed to the client
  - CORS handled at the worker level for safe frontend access

- **Interactive Product Browsing**
  - Live search and category filtering
  - Product details toggle without disrupting selection
  - Persistent selections using localStorage

- **Accessibility & Global Readiness**
  - Right-to-left (RTL) layout toggle
  - Responsive design for desktop and mobile
  - Clear visual hierarchy and readable UI components

---

## Technical Stack

- **Frontend:** HTML, CSS, JavaScript (ES6)
- **AI Integration:** OpenAI Chat Completions API
- **Backend / Proxy:** Cloudflare Workers
- **Data:** JSON-based product catalog
- **Storage:** Browser localStorage for session persistence

---

## Architecture Notes

- The frontend sends user messages and context as a `messages` array.
- Requests are forwarded to a Cloudflare Worker, which:
  - Injects the OpenAI API key securely
  - Calls the OpenAI API
  - Returns only the necessary response data to the client
- The system prompt ensures:
  - Brand-safe responses
  - Topic restriction
  - Friendly, concise output formatting

---

## Disclaimer

This project is a **demonstration application built for learning purposes**.  
It is **not an official L’Oréal product or service**.

---

## Author

**Shivraj Jadeja**  
Software Engineering Apprentice – Global Career Accelerator  
