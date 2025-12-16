import React, { useState, useEffect } from 'react';
import { useLanguage } from './context/LanguageContext';
import ChatInterface from './components/ChatInterface';
import ChatSidebar from './components/ChatSidebar';
import Onboarding from './components/Onboarding';
import SplashScreen from './components/SplashScreen';
import './styles/chat-app.css';

// Global TTS stop function - can be called from anywhere
window.stopAllTTS = function() {
  console.log('[GLOBAL] 🛑 Stopping ALL TTS');
  
  // Set stop flag
  window.ttsShouldStop = true;
  
  // Invalidate current session to stop chunk loop
  window.currentTTSSession = null;
  
  // Clear all timeouts related to TTS
  if (window.ttsTimeoutId) {
    clearTimeout(window.ttsTimeoutId);
    window.ttsTimeoutId = null;
  }
  
  // Stop ALL tracked audio instances
  if (window.ttsAudioInstances && Array.isArray(window.ttsAudioInstances)) {
    window.ttsAudioInstances.forEach(audio => {
      try {
        audio.pause();
        audio.src = '';
        audio.load();
      } catch(e) {}
    });
    window.ttsAudioInstances = [];
  }
  
  // Stop current TTS audio
  if (window.currentTTSAudio) {
    try {
      window.currentTTSAudio.pause();
      window.currentTTSAudio.src = '';
      window.currentTTSAudio.load();
      window.currentTTSAudio = null;
    } catch(e) {}
  }
  
  // Stop browser speech synthesis
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  
  // Stop ALL audio elements on page
  document.querySelectorAll('audio').forEach(audio => {
    try {
      audio.pause();
      audio.src = '';
      audio.load();
    } catch(e) {}
  });
};

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  
  // Safe access to language context
  const languageContext = useLanguage();
  const language = languageContext?.language || 'en';

  useEffect(() => {
    const profile = localStorage.getItem('krishimitra_profile');
    const hasOnboarded = localStorage.getItem('krishimitra_onboarded');
    const savedConversations = localStorage.getItem('krishimitra_conversations');
    
    setTimeout(() => {
      setIsLoading(false);
      if (!hasOnboarded) {
        setShowOnboarding(true);
      } else {
        if (profile) setUserProfile(JSON.parse(profile));
        if (savedConversations) {
          const convs = JSON.parse(savedConversations);
          setConversations(convs);
        }
      }
    }, 1800);
  }, []);

  const handleOnboardingComplete = (profile) => {
    localStorage.setItem('krishimitra_onboarded', 'true');
    localStorage.setItem('krishimitra_profile', JSON.stringify(profile));
    setUserProfile(profile);
    setShowOnboarding(false);
    handleNewChat();
  };

  const handleSkipOnboarding = () => {
    localStorage.setItem('krishimitra_onboarded', 'true');
    setShowOnboarding(false);
    handleNewChat();
  };

  const handleNewChat = () => {
    const newConv = {
      id: Date.now(),
      title: language === 'hi' ? 'नई बातचीत' : 'New Chat',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setConversations(prev => [newConv, ...prev]);
    setActiveConversation(newConv.id);
    saveConversations([newConv, ...conversations]);
  };

  const handleSelectConversation = (convId) => {
    // Cancel any ongoing speech when switching conversations
    window.stopAllTTS();
    setActiveConversation(convId);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleDeleteConversation = (convId) => {
    // Cancel any ongoing speech when deleting a conversation
    window.stopAllTTS();
    const updated = conversations.filter(c => c.id !== convId);
    setConversations(updated);
    saveConversations(updated);
    if (activeConversation === convId) {
      setActiveConversation(updated[0]?.id || null);
    }
  };

  const handleUpdateConversation = (convId, messages, title) => {
    const updated = conversations.map(c => 
      c.id === convId ? { ...c, messages, title: title || c.title, updatedAt: new Date().toISOString() } : c
    );
    setConversations(updated);
    saveConversations(updated);
  };

  const saveConversations = (convs) => {
    localStorage.setItem('krishimitra_conversations', JSON.stringify(convs));
  };

  const getCurrentConversation = () => conversations.find(c => c.id === activeConversation);

  // State to hold pending quick action message
  const [pendingMessage, setPendingMessage] = useState(null);

  const handleQuickAction = (actionId, command) => {
    // Use existing conversation if available
    if (activeConversation && conversations.find(c => c.id === activeConversation)) {
      // Just send the command to existing conversation
      setPendingMessage({ actionId, command });
      return;
    }
    
    // Create new conversation for quick action
    const actionTitles = {
      disease: language === 'hi' ? 'रोग पहचान' : 'Disease Detection',
      weather: language === 'hi' ? 'मौसम जानकारी' : 'Weather Info',
      prices: language === 'hi' ? 'मंडी भाव' : 'Market Prices',
      schemes: language === 'hi' ? 'सरकारी योजनाएं' : 'Government Schemes'
    };
    const newConv = {
      id: Date.now(),
      title: actionTitles[actionId] || (language === 'hi' ? 'नई बातचीत' : 'New Chat'),
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const updatedConvs = [newConv, ...conversations];
    setConversations(updatedConvs);
    setActiveConversation(newConv.id);
    saveConversations(updatedConvs);
    setPendingMessage({ actionId, command });
  };

  // Clear pending message after it's processed
  const clearPendingMessage = () => setPendingMessage(null);

  if (isLoading) return <SplashScreen />;

  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} onSkip={handleSkipOnboarding} />;
  }

  return (
    <div className="chat-app">
      <ChatSidebar 
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        conversations={conversations}
        activeConversation={activeConversation}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onQuickAction={handleQuickAction}
        userProfile={userProfile}
      />
      <ChatInterface 
        conversation={getCurrentConversation()}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
        onUpdateConversation={handleUpdateConversation}
        onNewChat={handleNewChat}
        userProfile={userProfile}
        pendingMessage={pendingMessage}
        onClearPendingMessage={clearPendingMessage}
      />
    </div>
  );
}

export default App;
