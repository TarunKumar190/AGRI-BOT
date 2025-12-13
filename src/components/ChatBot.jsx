import React from "react";
import { useState } from "react";
import { useLanguage } from "../context/LanguageContext";

export default function ChatBot() {
  const { language, setLanguage } = useLanguage();
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text:
        language === "hi"
          ? "नमस्ते! मैं योजनाओं, मौसम और फसलों में आपकी मदद कर सकता हूँ।"
          : "Hello! I can help with schemes, weather and crops.",
    },
  ]);
  const [input, setInput] = useState("");

  const send = () => {
    if (!input.trim()) return;
    setMessages((m) => [
      ...m,
      { from: "user", text: input },
      {
        from: "bot",
        text:
          language === "hi"
            ? "आपका प्रश्न प्राप्त हुआ।"
            : "Your query has been received.",
      },
    ]);
    setInput("");
  };

return (
    <div className="chatbot">
      <h2>AgriBotAI</h2>

      <div className="chat-window">
        Hello! I can help with schemes, weather and crops.
      </div>

      <div className="chat-input">
        <input placeholder="Ask about schemes, eligibility..." />
        <button>➤</button>
      </div>
    </div>
  );
}
