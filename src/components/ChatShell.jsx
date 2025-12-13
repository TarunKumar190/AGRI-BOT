import { useLanguage } from "../context/LanguageContext";
import React from "react";
export default function ChatShell() {
  const { language } = useLanguage();

  return (
    <div className="chat-shell">
      <div className="chat-header">
        🌱 AgriBotAI
        <span className="status">online</span>
      </div>

      <div className="chat-messages">
        <div className="bot-bubble">
          {language === "hi"
            ? "नमस्ते! मैं योजनाओं, मौसम और फसलों में मदद कर सकता हूँ।"
            : "Hello! I can help with schemes, weather and crops."}
        </div>
      </div>

      <div className="chat-input">
        <input
          placeholder={
            language === "hi"
              ? "अपना प्रश्न लिखें..."
              : "Type your question..."
          }
        />
        <button>➤</button>
      </div>
    </div>
  );
}
