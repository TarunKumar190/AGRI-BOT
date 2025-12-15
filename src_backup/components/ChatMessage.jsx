import React from "react";
import UpdatesFeed from "./UpdatesFeed";
import WeatherWidget from "./WeatherWidget";
import { useLanguage } from "../context/LanguageContext";

export default function ChatMessages() {
  const { language } = useLanguage();

  return (
    <>
      <div className="msg bot">
        {language === "hi"
          ? "नमस्ते! मैं कृषि योजनाओं, मौसम और फसलों में मदद कर सकता हूँ।"
          : "Hello! I can help with schemes, weather and crops."}
      </div>

      <div className="msg system">
        <WeatherWidget />
      </div>

      <div className="msg system">
        <UpdatesFeed />
      </div>
    </>
  );
}
