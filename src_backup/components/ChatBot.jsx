import React from "react";
import { useState, useRef, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import "./ChatBot.css";

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export default function ChatBot() {
  const { language, setLanguage } = useLanguage();
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text:
        language === "hi"
          ? "नमस्ते! मैं योजनाओं, मौसम और फसलों में आपकी मदद कर सकता हूँ। 🌾"
          : "Hello! I can help with schemes, weather and crops. 🌾",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const send = async () => {
    if (!input.trim()) return;
    
    const userMessage = input;
    setInput("");
    
    // Add user message
    setMessages((m) => [...m, { from: "user", text: userMessage }]);
    setLoading(true);

    try {
      // Query backend chatbot endpoint
      const response = await fetch(`${API_BASE}/v1/chatbot?q=${encodeURIComponent(userMessage)}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
          // Format response with scheme information
          let botResponse = language === 'hi' 
            ? `मुझे ${data.results.length} प्रासंगिक योजना(एं) मिली:\n\n`
            : `I found ${data.results.length} relevant scheme(s):\n\n`;
          
          data.results.slice(0, 3).forEach((result, idx) => {
            if (result.scheme) {
              botResponse += `${idx + 1}. **${result.scheme.scheme_name}**\n`;
              if (result.scheme.description) {
                botResponse += `   ${result.scheme.description.substring(0, 150)}...\n`;
              }
              if (result.updates && result.updates.length > 0) {
                botResponse += `   📢 Latest: ${result.updates[0].summary}\n`;
              }
              botResponse += '\n';
            } else if (result.update) {
              botResponse += `📢 ${result.update.summary}\n`;
              if (result.update.details) {
                botResponse += `   ${result.update.details.substring(0, 100)}...\n`;
              }
            }
          });
          
          setMessages((m) => [...m, { from: "bot", text: botResponse }]);
        } else {
          setMessages((m) => [
            ...m,
            {
              from: "bot",
              text: language === "hi"
                ? "क्षमा करें, मुझे इस बारे में कोई जानकारी नहीं मिली। कृपया अन्य कीवर्ड आजमाएं।"
                : "Sorry, I couldn't find information about that. Please try different keywords.",
            },
          ]);
        }
      } else {
        throw new Error('API request failed');
      }
    } catch (error) {
      console.error('Chatbot query failed:', error);
      setMessages((m) => [
        ...m,
        {
          from: "bot",
          text: language === "hi"
            ? "क्षमा करें, मुझे आपका उत्तर देने में समस्या हो रही है। कृपया बाद में पुनः प्रयास करें।"
            : "Sorry, I'm having trouble responding. Please try again later.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

return (
    <div className="chatbot">
      <div className="chat-header">
        <h2>🤖 AgriBotAI</h2>
        <div className="language-toggle">
          <button 
            className={language === 'en' ? 'active' : ''}
            onClick={() => setLanguage('en')}
          >
            EN
          </button>
          <button 
            className={language === 'hi' ? 'active' : ''}
            onClick={() => setLanguage('hi')}
          >
            हिं
          </button>
        </div>
      </div>

      <div className="chat-window">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.from}`}>
            <div className="message-bubble">
              {msg.text.split('\n').map((line, i) => (
                <span key={i}>
                  {line.includes('**') ? (
                    <strong>{line.replace(/\*\*/g, '')}</strong>
                  ) : (
                    line
                  )}
                  {i < msg.text.split('\n').length - 1 && <br />}
                </span>
              ))}
            </div>
          </div>
        ))}
        {loading && (
          <div className="message bot">
            <div className="message-bubble typing">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <input 
          placeholder={language === 'hi' ? 'योजनाओं के बारे में पूछें...' : 'Ask about schemes, eligibility...'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
        />
        <button onClick={send} disabled={loading || !input.trim()}>
          ➤
        </button>
      </div>
    </div>
  );
}
