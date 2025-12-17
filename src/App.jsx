import React, { useState, useEffect } from 'react';
import { useLanguage } from './context/LanguageContext';
import { useAuth } from './context/AuthContext';
import ChatInterface from './components/ChatInterface';
import ChatSidebar from './components/ChatSidebar';
import Onboarding from './components/Onboarding';
import SplashScreen from './components/SplashScreen';
import Login from './components/Login';
import Signup from './components/Signup';
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
  const [authView, setAuthView] = useState('login'); // 'login' or 'signup'
  const [pendingMessage, setPendingMessage] = useState(null);
  
  // Auth context
  const { user, isGuest, loading: authLoading, logout } = useAuth();
  
  // Safe access to language context
  const languageContext = useLanguage();
  const language = languageContext?.language || 'en';

  // Helper function to get user-specific storage key
  const getUserStorageKey = (key) => {
    if (user?.id) {
      return `krishimitra_${user.id}_${key}`;
    }
    return `krishimitra_guest_${key}`;
  };

  // Load user-specific data when user changes
  useEffect(() => {
    if (authLoading) return;
    
    // If not authenticated, just stop loading
    if (!user && !isGuest) {
      setIsLoading(false);
      return;
    }
    
    // Load user-specific data
    const profileKey = getUserStorageKey('profile');
    const onboardedKey = getUserStorageKey('onboarded');
    const conversationsKey = getUserStorageKey('conversations');
    
    const profile = localStorage.getItem(profileKey);
    const hasOnboarded = localStorage.getItem(onboardedKey);
    const savedConversations = localStorage.getItem(conversationsKey);
    
    setTimeout(() => {
      setIsLoading(false);
      
      if (!hasOnboarded) {
        setShowOnboarding(true);
      } else {
        if (profile) {
          setUserProfile(JSON.parse(profile));
        }
        if (savedConversations) {
          const convs = JSON.parse(savedConversations);
          setConversations(convs);
          // Set active conversation to the most recent one
          if (convs.length > 0 && !activeConversation) {
            setActiveConversation(convs[0].id);
          }
        }
      }
    }, 1500);
  }, [user, isGuest, authLoading]);

  // Save conversations to user-specific storage
  const saveConversations = (convs) => {
    const conversationsKey = getUserStorageKey('conversations');
    localStorage.setItem(conversationsKey, JSON.stringify(convs));
  };

  const handleOnboardingComplete = (profile) => {
    const profileKey = getUserStorageKey('profile');
    const onboardedKey = getUserStorageKey('onboarded');
    
    localStorage.setItem(onboardedKey, 'true');
    localStorage.setItem(profileKey, JSON.stringify(profile));
    setUserProfile(profile);
    setShowOnboarding(false);
    handleNewChat();
  };

  const handleSkipOnboarding = () => {
    const onboardedKey = getUserStorageKey('onboarded');
    localStorage.setItem(onboardedKey, 'true');
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
    const updatedConvs = [newConv, ...conversations];
    setConversations(updatedConvs);
    setActiveConversation(newConv.id);
    saveConversations(updatedConvs);
  };

  const handleSelectConversation = (convId) => {
    window.stopAllTTS();
    setActiveConversation(convId);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleDeleteConversation = (convId) => {
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

  const getCurrentConversation = () => conversations.find(c => c.id === activeConversation);

  const handleQuickAction = (actionId, command) => {
    if (activeConversation && conversations.find(c => c.id === activeConversation)) {
      setPendingMessage({ actionId, command });
      return;
    }
    
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

  const clearPendingMessage = () => setPendingMessage(null);

  // Handle logout - clear user-specific data from state but keep in localStorage
  const handleLogout = () => {
    window.stopAllTTS();
    logout();
    setUserProfile(null);
    setConversations([]);
    setActiveConversation(null);
    setShowOnboarding(false);
    setPendingMessage(null);
  };

  // Handle auth success
  const handleAuthSuccess = () => {
    // Data will be loaded by the useEffect when user changes
    setIsLoading(true);
  };

  // Show splash screen while loading
  if (isLoading || authLoading) {
    return <SplashScreen />;
  }

  // Show auth screens if not logged in
  if (!user && !isGuest) {
    if (authView === 'signup') {
      return (
        <Signup 
          onSwitchToLogin={() => setAuthView('login')} 
          onSuccess={handleAuthSuccess}
        />
      );
    }
    return (
      <Login 
        onSwitchToSignup={() => setAuthView('signup')} 
        onSuccess={handleAuthSuccess}
      />
    );
  }

  // Show onboarding for new users
  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} onSkip={handleSkipOnboarding} />;
  }

  // Main app
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
        user={user}
        isGuest={isGuest}
        onLogout={handleLogout}
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
