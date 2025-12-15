import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import './ChatBot.css';

const ChatBot = () => {
  const languageContext = useLanguage();
  const t = languageContext?.t || ((key) => key);
  const language = languageContext?.language || 'en';
  
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: 'नमस्ते! मैं कृषिमित्र हूं, आपका AI खेती सहायक। आप मुझसे फसलों, मौसम, बाजार भाव, या सरकारी योजनाओं के बारे में कुछ भी पूछ सकते हैं।\n\nHello! I am KrishiMitra, your AI farming assistant. Ask me anything about crops, weather, market prices, or government schemes.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      
      // Set language based on current UI language
      const langMap = {
        en: 'en-IN',
        hi: 'hi-IN',
        te: 'te-IN',
        mr: 'mr-IN',
        ta: 'ta-IN',
        kn: 'kn-IN',
        pa: 'pa-IN',
        bn: 'bn-IN',
      };
      recognitionRef.current.lang = langMap[language] || 'en-IN';

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setInput(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
    }
  }, [language]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const speakResponse = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      const langMap = {
        en: 'en-IN',
        hi: 'hi-IN',
        te: 'te-IN',
        mr: 'mr-IN',
      };
      utterance.lang = langMap[language] || 'en-IN';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const query = input;
    setInput('');
    setIsLoading(true);

    try {
      // Call the chatbot API
      const response = await fetch('http://localhost:4000/v1/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, language }),
      });

      const data = await response.json();
      
      // Create bot message with schemes data if available
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: data.response || data.answer || 'I apologize, but I could not process your request. Please try again.',
        timestamp: new Date(),
        schemes: data.schemes || [],
        updates: data.updates || [],
        isSchemeQuery: data.isSchemeQuery || false,
      };

      setMessages(prev => [...prev, botMessage]);
      
      // Speak the response if it's short enough
      if (botMessage.text.length < 300) {
        speakResponse(botMessage.text);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: t('chat.error'),
        timestamp: new Date(),
        isError: true,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestions = t('chat.suggestions') || [];

  return (
    <div className="chatbot">
      <div className="chat-messages">
        {messages.map(message => (
          <div key={message.id} className={`message ${message.type} ${message.isError ? 'error' : ''}`}>
            {message.type === 'bot' && (
              <div className="message-avatar">
                <span>🌾</span>
              </div>
            )}
            <div className="message-content">
              <div className="message-text" style={{ whiteSpace: 'pre-wrap' }}>{message.text}</div>
              
              {/* Render scheme cards for scheme queries */}
              {message.isSchemeQuery && message.schemes?.length > 0 && (
                <div className="scheme-cards">
                  {message.schemes.map((scheme, idx) => (
                    <div key={idx} className="scheme-card">
                      <div className="scheme-header">
                        <span className="scheme-icon">🏛️</span>
                        <h4>{scheme.scheme_name}</h4>
                      </div>
                      <p className="scheme-desc">{scheme.description}</p>
                      {scheme.benefits && (
                        <div className="scheme-benefit">
                          <span>✅</span> {scheme.benefits}
                        </div>
                      )}
                      {scheme.official_portal && (
                        <a 
                          href={scheme.official_portal} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="scheme-link"
                        >
                          🔗 {language === 'hi' ? 'पोर्टल पर जाएं' : 'Visit Portal'}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              <div className="message-time">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            {message.type === 'bot' && !message.isError && (
              <button 
                className="speak-btn"
                onClick={() => speakResponse(message.text)}
                title="Listen"
              >
                🔊
              </button>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="message bot">
            <div className="message-avatar">
              <span>🌾</span>
            </div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && Array.isArray(suggestions) && (
        <div className="chat-suggestions">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              className="suggestion-chip"
              onClick={() => setInput(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="chat-input-area">
        <div className="input-container">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t('chat.placeholder')}
            rows={1}
            className="chat-input"
          />
          <button 
            className={`voice-btn ${isListening ? 'listening' : ''}`}
            onClick={toggleListening}
            title={t('chat.voiceHint')}
          >
            {isListening ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            )}
          </button>
        </div>
        <button 
          className="send-btn"
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ChatBot;
