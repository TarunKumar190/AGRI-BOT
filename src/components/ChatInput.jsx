import React from "react";
import { useState } from "react";
import { useLanguage } from "../context/LanguageContext";

export default function ChatInput() {
  const [text, setText] = useState("");
  const { language } = useLanguage();

  return (
    <div className="chat-input">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={
          language === "hi"
            ? "अपना सवाल लिखें..."
            : "Type your question..."
        }
      />
      <button className="primary">➤</button>
    </div>
  );
}
