import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import useLocation from '../hooks/useLocation';
import './ChatInterface.css';

const API_BASE = 'http://localhost:4000';
// Disease detection - Direct call to Render API (works better than proxy)
const DISEASE_API_URL = 'https://plant-disease-api-yt7l.onrender.com';

// Treatment recommendations for common diseases (for chat response)
const TREATMENT_DATA = {
  'Potato___Early_blight': {
    treatment: ['Remove infected plant parts', 'Apply Mancozeb 75% WP @ 2g/L', 'Use Chlorothalonil fungicide'],
    treatmentHi: ['संक्रमित भागों को हटाएं', 'मैंकोज़ेब 75% WP @ 2g/L छिड़काव करें', 'क्लोरोथालोनिल कवकनाशी लगाएं'],
    prevention: ['Use resistant varieties', 'Practice crop rotation', 'Improve air circulation'],
    preventionHi: ['प्रतिरोधी किस्में उगाएं', 'फसल चक्र अपनाएं', 'हवा का संचार बेहतर करें'],
    severity: 'moderate'
  },
  'Potato___Late_blight': {
    treatment: ['Remove infected plants immediately', 'Apply copper-based fungicides', 'Spray Metalaxyl + Mancozeb'],
    treatmentHi: ['संक्रमित पौधों को तुरंत हटाएं', 'कॉपर आधारित कवकनाशी लगाएं', 'मेटालैक्सिल + मैंकोज़ेब छिड़काव करें'],
    prevention: ['Ensure proper spacing', 'Avoid overhead irrigation', 'Use certified disease-free seed'],
    preventionHi: ['उचित दूरी रखें', 'ऊपरी सिंचाई से बचें', 'प्रमाणित रोग-मुक्त बीज का उपयोग करें'],
    severity: 'severe'
  },
  'Tomato_Early_blight': {
    treatment: ['Remove infected leaves', 'Apply Mancozeb or Chlorothalonil', 'Use copper-based sprays'],
    treatmentHi: ['संक्रमित पत्तियां हटाएं', 'मैंकोज़ेब या क्लोरोथालोनिल लगाएं', 'कॉपर आधारित स्प्रे का उपयोग करें'],
    prevention: ['Stake plants for air circulation', 'Water at base of plants', 'Use resistant varieties'],
    preventionHi: ['हवा के संचार के लिए पौधों को सहारा दें', 'पौधों के आधार पर पानी दें', 'प्रतिरोधी किस्में उगाएं'],
    severity: 'moderate'
  },
  'Tomato_Late_blight': {
    treatment: ['Remove infected plants', 'Apply Metalaxyl + Mancozeb', 'Use copper fungicides'],
    treatmentHi: ['संक्रमित पौधे हटाएं', 'मेटालैक्सिल + मैंकोज़ेब लगाएं', 'कॉपर कवकनाशी का उपयोग करें'],
    prevention: ['Avoid wetting foliage', 'Space plants properly', 'Use drip irrigation'],
    preventionHi: ['पत्तियों को गीला न करें', 'पौधों को ठीक से स्थान दें', 'ड्रिप सिंचाई का उपयोग करें'],
    severity: 'severe'
  },
  'default': {
    treatment: ['Consult agricultural extension officer', 'Remove infected parts', 'Apply appropriate fungicide'],
    treatmentHi: ['कृषि विस्तार अधिकारी से परामर्श करें', 'संक्रमित भागों को हटाएं', 'उचित कवकनाशी लगाएं'],
    prevention: ['Use resistant varieties', 'Practice crop rotation', 'Maintain field hygiene'],
    preventionHi: ['प्रतिरोधी किस्में उगाएं', 'फसल चक्र अपनाएं', 'खेत की स्वच्छता बनाए रखें'],
    severity: 'moderate'
  }
};

// Indian states with coordinates
const INDIAN_STATES = {
  'Uttarakhand': { lat: 30.0668, lng: 79.0193 },
  'Uttar Pradesh': { lat: 26.8467, lng: 80.9462 },
  'Delhi': { lat: 28.7041, lng: 77.1025 },
  'Punjab': { lat: 31.1471, lng: 75.3412 },
  'Haryana': { lat: 29.0588, lng: 76.0856 },
  'Rajasthan': { lat: 27.0238, lng: 74.2179 },
  'Madhya Pradesh': { lat: 22.9734, lng: 78.6569 },
  'Maharashtra': { lat: 19.7515, lng: 75.7139 },
  'Gujarat': { lat: 22.2587, lng: 71.1924 },
  'Bihar': { lat: 25.0961, lng: 85.3131 },
  'West Bengal': { lat: 22.9868, lng: 87.8550 },
  'Karnataka': { lat: 15.3173, lng: 75.7139 },
  'Tamil Nadu': { lat: 11.1271, lng: 78.6569 },
  'Andhra Pradesh': { lat: 15.9129, lng: 79.7400 },
  'Telangana': { lat: 18.1124, lng: 79.0193 },
  'Kerala': { lat: 10.8505, lng: 76.2711 },
  'Odisha': { lat: 20.9517, lng: 85.0985 },
  'Jharkhand': { lat: 23.6102, lng: 85.2799 },
  'Chhattisgarh': { lat: 21.2787, lng: 81.8661 },
  'Assam': { lat: 26.2006, lng: 92.9376 },
  'Himachal Pradesh': { lat: 31.1048, lng: 77.1734 },
};

const ChatInterface = ({
  conversation,
  onToggleSidebar,
  sidebarOpen,
  onUpdateConversation,
  onNewChat,
  userProfile,
  pendingMessage,
  onClearPendingMessage
}) => {
  const { t, language } = useLanguage();
  const { location, state, district, getCurrentLocation } = useLocation();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  // Pending query to send after new chat is created (for quick chat buttons)
  const [pendingQueryAfterNewChat, setPendingQueryAfterNewChat] = useState(null);
  // Talkback (text-to-speech) toggle - persisted in localStorage
  const [talkbackEnabled, setTalkbackEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('talkbackEnabled');
      return saved !== null ? saved === 'true' : true; // Default: enabled
    }
    return true;
  });
  // Initialize selectedState from localStorage if available
  const [selectedState, setSelectedState] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('userSelectedState') || null;
    }
    return null;
  });
  // Crop selection for disease detection
  const [showCropSelector, setShowCropSelector] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState(null);
  const [selectedCropForAnalysis, setSelectedCropForAnalysis] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Warm up the disease detection API on component mount
  // This helps reduce cold start time when user actually needs it
  useEffect(() => {
    const warmupDiseaseAPI = async () => {
      try {
        // Simple GET request to wake up the server
        console.log('[Disease API] Warming up server...');
        await fetch(`${API_BASE}/v1/health`, { method: 'GET' });
        // Also try to ping the external API through our proxy health check
        fetch('https://plant-disease-api-yt7l.onrender.com/', { method: 'GET' }).catch(() => {});
      } catch (e) {
        // Ignore errors - this is just a warmup
      }
    };
    warmupDiseaseAPI();
  }, []);

  // Supported crops for disease detection - organized by category
  const SUPPORTED_CROPS = {
    vegetables: [
      { value: 'potato', label: '🥔 Potato', labelHi: '🥔 आलू' },
      { value: 'tomato', label: '🍅 Tomato', labelHi: '🍅 टमाटर' },
      { value: 'pepper', label: '🫑 Bell Pepper', labelHi: '🫑 शिमला मिर्च' },
    ],
    fruits: [
      { value: 'apple', label: '🍎 Apple', labelHi: '🍎 सेब' },
      { value: 'mango', label: '🥭 Mango', labelHi: '🥭 आम' },
      { value: 'sugarcane', label: '🌿 Sugarcane', labelHi: '🌿 गन्ना' },
    ],
    grains: [
      { value: 'rice', label: '🍚 Rice', labelHi: '🍚 धान' },
      { value: 'wheat', label: '🌾 Wheat', labelHi: '🌾 गेहूं' },
      { value: 'maize', label: '🌽 Maize', labelHi: '🌽 मक्का' },
      { value: 'finger_millet', label: '🌾 Finger Millet', labelHi: '🌾 रागी' },
    ]
  };

  // Fetch weather for given coordinates
  const fetchWeatherForLocation = async (lat, lng, locationName) => {
    setWeatherLoading(true);
    try {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lng: lng.toString(),
        state: locationName,
        lang: language,
      });
      
      const response = await fetch(`${API_BASE}/v1/weather?${params}`);
      if (response.ok) {
        const data = await response.json();
        setWeather({
          ...data,
          locationName: locationName
        });
      } else {
        throw new Error('Weather API failed');
      }
    } catch (error) {
      console.error('Weather fetch error:', error);
      setWeather({
        current: { temp: 28, condition: 'Clear', icon: '☀️', humidity: 60 },
        locationName: locationName
      });
    } finally {
      setWeatherLoading(false);
    }
  };

  // Handle manual state selection
  const handleStateSelect = (stateName) => {
    const coords = INDIAN_STATES[stateName];
    if (coords) {
      setSelectedState(stateName);
      setShowLocationPicker(false);
      fetchWeatherForLocation(coords.lat, coords.lng, stateName);
      // Save to localStorage for persistence
      localStorage.setItem('userSelectedState', stateName);
    }
  };

  // Auto-detect location and fetch weather on component mount
  useEffect(() => {
    const fetchWeatherData = async () => {
      // Check if user previously selected a state manually
      const savedState = localStorage.getItem('userSelectedState');
      if (savedState && INDIAN_STATES[savedState]) {
        const coords = INDIAN_STATES[savedState];
        setSelectedState(savedState);
        fetchWeatherForLocation(coords.lat, coords.lng, savedState);
        return;
      }

      setWeatherLoading(true);
      let lat = 28.7041; // Default to Delhi
      let lng = 77.1025;
      let locationName = 'Delhi (Tap to change)';
      let detectedState = 'Delhi';
      
      try {
        const locData = await getCurrentLocation();
        
        if (locData?.coordinates?.lat && locData?.coordinates?.lng) {
          // Check accuracy - if > 10km, prompt for manual selection
          const accuracy = locData.coordinates.accuracy || 50000;
          if (accuracy > 10000) {
            console.log('Location accuracy too low:', accuracy, 'meters. Prompting for manual selection.');
            locationName = `${locData?.district || ''}, ${locData?.state || 'India'} (Tap to change)`;
          }
          lat = locData.coordinates.lat;
          lng = locData.coordinates.lng;
          locationName = locData?.district && locData?.state 
            ? `${locData.district}, ${locData.state}` 
            : locData?.state || 'India';
          
          // IMPORTANT: Set the detected state for API calls
          if (locData?.state) {
            detectedState = locData.state;
            setSelectedState(locData.state);
            localStorage.setItem('userSelectedState', locData.state);
            console.log('[Location] Detected state:', locData.state);
          }
        }
      } catch (locError) {
        console.warn('Location access denied:', locError.message);
        // Use default state
        setSelectedState('Delhi');
      }
      
      fetchWeatherForLocation(lat, lng, locationName);
    };
    
    fetchWeatherData();
  }, [language]);

  const messages = conversation?.messages || [];

  const suggestions = [
    { icon: '🌾', text: language === 'hi' ? 'गेहूं में पीला रतुआ का इलाज' : 'Treatment for wheat yellow rust' },
    { icon: '💧', text: language === 'hi' ? 'धान की सिंचाई कब करें' : 'When to irrigate paddy' },
    { icon: '📋', text: language === 'hi' ? 'PM-KISAN योजना की जानकारी' : 'PM-KISAN scheme information' },
    { icon: '🐛', text: language === 'hi' ? 'कपास में सफेद मक्खी का नियंत्रण' : 'Whitefly control in cotton' },
  ];

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send pending query after new chat is created (for quick chat buttons on welcome screen)
  useEffect(() => {
    if (pendingQueryAfterNewChat && conversation && !isLoading) {
      const queryToSend = pendingQueryAfterNewChat;
      setPendingQueryAfterNewChat(null); // Clear it first to prevent loop
      
      // Small delay to ensure conversation is fully ready
      setTimeout(() => {
        sendMessageDirect(queryToSend);
      }, 100);
    }
  }, [conversation, pendingQueryAfterNewChat, isLoading]);

  // Cancel speech synthesis when component unmounts, conversation changes, or page refreshes
  useEffect(() => {
    // Cancel any ongoing speech when conversation changes
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    // Cleanup on unmount
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [conversation?.id]);

  // Cancel speech on page refresh/close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      
      const langMap = {
        'hi': 'hi-IN', 'en': 'en-IN', 'te': 'te-IN', 'mr': 'mr-IN',
        'ta': 'ta-IN', 'kn': 'kn-IN', 'pa': 'pa-IN', 'bn': 'bn-IN'
      };
      recognitionRef.current.lang = langMap[language] || 'en-IN';

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setInput(transcript);
      };

      recognitionRef.current.onend = () => setIsListening(false);
      recognitionRef.current.onerror = () => setIsListening(false);
    }
  }, [language]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Clean text for speech - remove markdown and special characters
  // IMPORTANT: Preserves Hindi (Devanagari) characters for proper speech synthesis
  const cleanTextForSpeech = (text, isHindi = false) => {
    let cleaned = text
      // Remove bold/italic markers
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/__/g, '')
      .replace(/_/g, ' ')
      // Remove markdown headers
      .replace(/#{1,6}\s/g, '')
      // Remove bullet points and list markers
      .replace(/^[\s]*[-•]\s/gm, '')
      .replace(/^[\s]*\d+\.\s/gm, '')
      // Remove links [text](url) -> text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove emojis for cleaner speech (comprehensive list)
      .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu, '')
      // Remove arrows and special characters (but keep Hindi/Devanagari)
      .replace(/[→↑↓←]/g, '')
      // Clean up multiple spaces and newlines
      .replace(/\n\n+/g, '. ')
      .replace(/\n/g, '. ')
      .replace(/\s+/g, ' ')
      // Remove URLs
      .replace(/https?:\/\/[^\s]+/g, '')
      // Remove parentheses content that's just English district names when in Hindi
      .trim();
    
    // Language-specific replacements
    if (isHindi) {
      cleaned = cleaned
        // Convert rupee symbol to Hindi word
        .replace(/₹/g, ' रुपये ')
        // Convert English abbreviations to Hindi pronunciation
        .replace(/MSP/gi, 'एम एस पी')
        .replace(/\bAPMC\b/gi, 'ए पी एम सी')
        // Convert remaining English words to Hindi equivalents
        .replace(/\bquintal\b/gi, 'क्विंटल')
        .replace(/\bMandi\b/gi, 'मंडी')
        .replace(/\bPrice\b/gi, 'भाव')
        .replace(/\bper\b/gi, 'प्रति')
        .replace(/\bkg\b/gi, 'किलो')
        // Clean up extra spaces
        .replace(/\s+/g, ' ')
        .trim();
    } else {
      cleaned = cleaned
        .replace(/₹/g, ' rupees ')
        .replace(/\bक्विंटल\b/g, 'quintal')
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    return cleaned;
  };

  // Stop any ongoing speech
  const stopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  // Load voices - they are loaded asynchronously
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  
  useEffect(() => {
    if ('speechSynthesis' in window) {
      // Voices may not be loaded immediately
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          setVoicesLoaded(true);
          console.log('[Speech] Voices loaded:', voices.length);
          // Log Hindi voices if available
          const hindiVoices = voices.filter(v => v.lang.includes('hi') || v.name.toLowerCase().includes('hindi'));
          console.log('[Speech] Hindi voices available:', hindiVoices.map(v => `${v.name} (${v.lang})`));
        }
      };
      
      loadVoices();
      // Chrome loads voices asynchronously
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Toggle talkback and save preference
  const toggleTalkback = () => {
    const newValue = !talkbackEnabled;
    setTalkbackEnabled(newValue);
    localStorage.setItem('talkbackEnabled', String(newValue));
    // Stop any ongoing speech when disabling
    if (!newValue) {
      stopSpeech();
    }
  };

  const speakText = (text, forceSpeak = false) => {
    // Don't speak if talkback is disabled (unless forced by manual click)
    if (!talkbackEnabled && !forceSpeak) {
      console.log('[Speech] Talkback is disabled, skipping auto-speech');
      return;
    }
    
    if (!('speechSynthesis' in window)) {
      console.log('[Speech] Speech synthesis not supported');
      return;
    }
    
    window.speechSynthesis.cancel();
    
    // Clean the text before speaking (pass language for proper conversion)
    const isHindi = language === 'hi';
    const cleanText = cleanTextForSpeech(text, isHindi);
    
    console.log('[Speech] Language:', language, 'Is Hindi:', isHindi);
    console.log('[Speech] Clean text to speak:', cleanText.substring(0, 300));
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const langMap = { 'hi': 'hi-IN', 'en': 'en-IN', 'te': 'te-IN', 'mr': 'mr-IN' };
    const targetLang = langMap[language] || 'en-IN';
    utterance.lang = targetLang;
    utterance.rate = 0.85;
    
    // Get available voices
    const voices = window.speechSynthesis.getVoices();
    console.log('[Speech] Total voices available:', voices.length);
    
    // Find a voice for the target language
    let selectedVoice = null;
    
    if (isHindi) {
      // Priority order for Hindi voices
      selectedVoice = voices.find(v => v.lang === 'hi-IN') ||
                      voices.find(v => v.lang.startsWith('hi')) ||
                      voices.find(v => v.name.toLowerCase().includes('hindi')) ||
                      voices.find(v => v.lang.includes('hi'));
      
      // If no Hindi voice found, try Google voices (available in Chrome)
      if (!selectedVoice) {
        selectedVoice = voices.find(v => 
          v.name.toLowerCase().includes('google') && v.lang.includes('hi')
        ) || voices.find(v => 
          v.name.toLowerCase().includes('microsoft') && v.name.toLowerCase().includes('hindi')
        );
      }
      
      // FALLBACK: If still no Hindi voice, use English voice for all text
      // This ensures the user at least hears something
      if (!selectedVoice) {
        console.log('[Speech] No Hindi voice found - falling back to English voice for Hindi text');
        selectedVoice = voices.find(v => v.lang === 'en-IN') ||
                        voices.find(v => v.lang.startsWith('en'));
        // Don't change utterance.lang - let it try with Hindi setting first
      }
    } else {
      // For English or other languages
      selectedVoice = voices.find(v => v.lang === targetLang) ||
                      voices.find(v => v.lang.startsWith(language));
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      console.log('[Speech] Using voice:', selectedVoice.name, selectedVoice.lang);
    } else {
      console.log('[Speech] No matching voice found for:', targetLang);
      console.log('[Speech] Available voices:', voices.map(v => `${v.name}(${v.lang})`).join(', '));
    }
    
    // Add error handling
    utterance.onerror = (event) => {
      console.error('[Speech] Error:', event.error);
    };
    
    utterance.onstart = () => {
      console.log('[Speech] Started speaking');
    };
    
    utterance.onend = () => {
      console.log('[Speech] Finished speaking');
    };
    
    window.speechSynthesis.speak(utterance);
  };

  const sendMessage = async (text) => {
    const query = text || input.trim();
    if (!query || isLoading) return;

    // If no conversation exists, create one first and queue the message
    if (!conversation) {
      // Store the query to send after conversation is created
      setPendingQueryAfterNewChat(query);
      onNewChat();
      return;
    }

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: query,
      timestamp: new Date().toISOString()
    };

    const newMessages = [...messages, userMessage];
    
    // Update title if first message
    const title = messages.length === 0 ? query.substring(0, 40) + (query.length > 40 ? '...' : '') : null;
    onUpdateConversation(conversation.id, newMessages, title);
    
    setInput('');
    setIsLoading(true);

    try {
      // Build request body with location support
      const requestBody = { query, language };
      
      // PRIORITY: Use selectedState (from header/localStorage) > state (from GPS) > location coords
      // This ensures the user's selected/displayed location is used for mandi prices
      const effectiveState = selectedState || state || localStorage.getItem('userSelectedState');
      
      if (effectiveState) {
        requestBody.state = effectiveState;
        console.log('[ChatBot] Using state:', effectiveState);
      }
      
      // Also send coordinates if available for more precision
      if (location?.lat && location?.lng) {
        requestBody.lat = location.lat;
        requestBody.lng = location.lng;
        console.log('[ChatBot] Also sending coordinates:', location.lat, location.lng);
      }
      
      console.log('[ChatBot] Full request:', requestBody);
      
      const response = await fetch(`${API_BASE}/v1/chatbot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      
      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.response || (language === 'hi' ? 'कोई जानकारी नहीं मिली' : 'No information found'),
        timestamp: new Date().toISOString(),
        schemes: data.schemes,
        updates: data.updates
      };

      onUpdateConversation(conversation.id, [...newMessages, assistantMessage], title);
      
      // Auto-speak response if talkback is enabled
      if (data.response && talkbackEnabled) speakText(data.response);

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: language === 'hi' 
          ? 'माफ़ करें, कुछ गड़बड़ हुई। कृपया दोबारा कोशिश करें।' 
          : 'Sorry, something went wrong. Please try again.',
        timestamp: new Date().toISOString(),
        isError: true
      };
      onUpdateConversation(conversation.id, [...newMessages, errorMessage], title);
    } finally {
      setIsLoading(false);
    }
  };

  // Direct message sender (used by useEffect after new chat creation)
  // This skips the conversation check since useEffect already ensures conversation exists
  const sendMessageDirect = async (query) => {
    if (!query || isLoading || !conversation) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: query,
      timestamp: new Date().toISOString()
    };

    const newMessages = [...messages, userMessage];
    const title = query.substring(0, 40) + (query.length > 40 ? '...' : '');
    onUpdateConversation(conversation.id, newMessages, title);
    
    setInput('');
    setIsLoading(true);

    try {
      const requestBody = { query, language };
      const effectiveState = selectedState || state || localStorage.getItem('userSelectedState');
      
      if (effectiveState) {
        requestBody.state = effectiveState;
      }
      
      if (location?.lat && location?.lng) {
        requestBody.lat = location.lat;
        requestBody.lng = location.lng;
      }
      
      console.log('[ChatBot] Quick chat request:', requestBody);
      
      const response = await fetch(`${API_BASE}/v1/chatbot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      
      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.response || (language === 'hi' ? 'कोई जानकारी नहीं मिली' : 'No information found'),
        timestamp: new Date().toISOString(),
        schemes: data.schemes,
        updates: data.updates
      };

      onUpdateConversation(conversation.id, [...newMessages, assistantMessage], title);
      
      // Auto-speak response if talkback is enabled
      if (data.response && talkbackEnabled) speakText(data.response);

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: language === 'hi' 
          ? 'माफ़ करें, कुछ गड़बड़ हुई। कृपया दोबारा कोशिश करें।' 
          : 'Sorry, something went wrong. Please try again.',
        timestamp: new Date().toISOString(),
        isError: true
      };
      onUpdateConversation(conversation.id, [...newMessages, errorMessage], title);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle pending quick action messages - must be after sendMessage is defined
  useEffect(() => {
    if (pendingMessage && conversation && !isLoading) {
      const { actionId, command } = pendingMessage;
      
      // Clear first to prevent double execution
      if (onClearPendingMessage) onClearPendingMessage();
      
      if (command === '/disease') {
        setShowImageUpload(true);
      } else if (command === '/prices') {
        sendMessage(language === 'hi' ? 'आज के सभी फसलों, सब्जियों और फलों के मंडी भाव बताएं।' : 'Tell me today\'s market prices for all crops, vegetables and fruits.');
      } else if (command === '/schemes') {
        sendMessage(language === 'hi' ? 'किसानों के लिए उपलब्ध सभी सरकारी योजनाओं की जानकारी दें।' : 'Tell me about all government schemes available for farmers.');
      }
    }
  }, [pendingMessage, conversation]);

  // Step 1: User selects image -> Show crop selector
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset the file input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Store the file and show crop selector
    setPendingImageFile(file);
    setShowCropSelector(true);
    setShowImageUpload(false);
  };

  // Step 2: User selects crop -> Analyze image
  const analyzeWithCrop = async (cropType) => {
    if (!pendingImageFile) return;

    setShowCropSelector(false);
    setSelectedCropForAnalysis(cropType);

    const file = pendingImageFile;
    
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: language === 'hi' ? `🖼️ ${cropType} की फोटो भेजी` : `🖼️ Sent ${cropType} image`,
      image: URL.createObjectURL(file),
      timestamp: new Date().toISOString()
    };

    const newMessages = [...messages, userMessage];
    onUpdateConversation(conversation.id, newMessages);
    setIsLoading(true);

    // Add analyzing message with better explanation about wait time
    const analyzingMessage = {
      id: Date.now() + 1,
      role: 'assistant',
      content: language === 'hi' 
        ? `🔬 **${cropType} की छवि का विश्लेषण हो रहा है...**\n\n⏳ कृपया प्रतीक्षा करें (30 सेकंड से 2 मिनट लग सकते हैं)\n\n_AI मॉडल लोड हो रहा है..._` 
        : `🔬 **Analyzing ${cropType} image...**\n\n⏳ Please wait (may take 30 seconds to 2 minutes)\n\n_AI model is loading..._`,
      timestamp: new Date().toISOString(),
      isLoading: true
    };
    onUpdateConversation(conversation.id, [...newMessages, analyzingMessage]);

    try {
      // Call Disease Detection API with selected crop
      // Direct call to Render API - /predict endpoint
      const formData = new FormData();
      // Try 'image' field name (common in ML APIs) - change to 'file' if needed
      formData.append('image', file);
      formData.append('crop', cropType);

      console.log('[Disease] Sending request to:', `${DISEASE_API_URL}/predict`);
      console.log('[Disease] File:', file.name, file.type, file.size, 'bytes');
      console.log('[Disease] Crop:', cropType);

      const response = await fetch(`${DISEASE_API_URL}/predict`, {
        method: 'POST',
        body: formData,
      });

      console.log('[Disease] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Disease] Error response:', errorText);
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }

      const apiData = await response.json();
      console.log('[Disease] API Response:', apiData);
      
      // Check if we got a fallback/error response
      if (apiData.fallback || apiData.error) {
        throw new Error(apiData.error || 'Disease detection service unavailable');
      }

      // Get treatment data
      const diseaseClass = apiData.class;
      const isHealthy = diseaseClass.toLowerCase().includes('healthy');
      const treatmentInfo = TREATMENT_DATA[diseaseClass] || TREATMENT_DATA['default'];
      const confidence = (apiData.confidence * 100).toFixed(1);
      const diseaseName = diseaseClass.replace(/_+/g, ' ').replace(/\s+/g, ' ').trim();

      let responseContent;
      if (isHealthy) {
        responseContent = language === 'hi'
          ? `✅ **अच्छी खबर!**\n\nआपका पौधा स्वस्थ है!\n\n**विश्वास स्तर:** ${confidence}%\n\n**सुझाव:**\n• नियमित निगरानी जारी रखें\n• उचित पोषण बनाए रखें\n• अच्छी स्वच्छता का अभ्यास करें`
          : `✅ **Good News!**\n\nYour plant is healthy!\n\n**Confidence:** ${confidence}%\n\n**Tips:**\n• Continue regular monitoring\n• Maintain proper nutrition\n• Practice good hygiene`;
      } else {
        const treatment = language === 'hi' ? treatmentInfo.treatmentHi : treatmentInfo.treatment;
        const prevention = language === 'hi' ? treatmentInfo.preventionHi : treatmentInfo.prevention;
        
        responseContent = language === 'hi'
          ? `🔬 **रोग पहचान परिणाम**\n\n**रोग:** ${diseaseName}\n**फसल:** ${apiData.crop || 'Unknown'}\n**गंभीरता:** ${treatmentInfo.severity}\n**विश्वास:** ${confidence}%\n\n**उपचार:**\n${treatment.map(t => `• ${t}`).join('\n')}\n\n**रोकथाम:**\n${prevention.map(p => `• ${p}`).join('\n')}`
          : `🔬 **Disease Detection Result**\n\n**Disease:** ${diseaseName}\n**Crop:** ${apiData.crop || 'Unknown'}\n**Severity:** ${treatmentInfo.severity}\n**Confidence:** ${confidence}%\n\n**Treatment:**\n${treatment.map(t => `• ${t}`).join('\n')}\n\n**Prevention:**\n${prevention.map(p => `• ${p}`).join('\n')}`;
      }

      const assistantMessage = {
        id: Date.now() + 2,
        role: 'assistant',
        content: responseContent,
        timestamp: new Date().toISOString(),
        diseaseData: {
          disease: diseaseName,
          crop: apiData.crop,
          severity: treatmentInfo.severity,
          confidence: confidence,
          isHealthy: isHealthy
        }
      };

      onUpdateConversation(conversation.id, [...newMessages, assistantMessage]);
      speakText(assistantMessage.content);
    } catch (error) {
      console.error('Disease detection error:', error);
      
      // Error message with retry suggestion
      const errorMessage = {
        id: Date.now() + 2,
        role: 'assistant',
        content: language === 'hi'
          ? `⚠️ **विश्लेषण विफल**\n\nAI सर्वर लोड हो रहा है (पहली बार 1-2 मिनट लग सकते हैं)।\n\n🔄 **कृपया 1 मिनट बाद फिर से कोशिश करें।**\n\n💡 **सुझाव:** तस्वीर फिर से अपलोड करें - दूसरी बार तेज़ होगा!`
          : `⚠️ **Analysis Failed**\n\nAI server is loading (first time may take 1-2 minutes).\n\n🔄 **Please try again after 1 minute.**\n\n💡 **Tip:** Upload the image again - it will be faster the second time!`,
        timestamp: new Date().toISOString()
      };

      onUpdateConversation(conversation.id, [...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
      setPendingImageFile(null);
    }
  };

  // Cancel crop selection
  const cancelCropSelection = () => {
    setShowCropSelector(false);
    setPendingImageFile(null);
    setSelectedCropForAnalysis('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessage = (content) => {
    // Convert markdown-style formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <main className={`chat-interface ${sidebarOpen ? '' : 'full-width'}`}>
      {/* Crop Selector Modal */}
      {showCropSelector && (
        <div className="location-picker-overlay" onClick={cancelCropSelection}>
          <div className="location-picker-modal crop-selector-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{language === 'hi' ? '🌱 फसल का प्रकार चुनें' : '🌱 Select Crop Type'}</h3>
            <p className="crop-selector-hint">
              {language === 'hi' 
                ? 'सही विश्लेषण के लिए अपनी फसल चुनें' 
                : 'Select your crop for accurate analysis'}
            </p>
            <div className="crop-categories">
              {/* Vegetables */}
              <div className="crop-category">
                <h4 className="category-title vegetables-title">
                  🥬 {language === 'hi' ? 'सब्जियां' : 'Vegetables'}
                </h4>
                <div className="category-crops">
                  {SUPPORTED_CROPS.vegetables.map((crop) => (
                    <button
                      key={crop.value}
                      className="crop-select-btn"
                      onClick={() => analyzeWithCrop(crop.value)}
                    >
                      {language === 'hi' ? crop.labelHi : crop.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fruits */}
              <div className="crop-category">
                <h4 className="category-title fruits-title">
                  🍎 {language === 'hi' ? 'फल' : 'Fruits'}
                </h4>
                <div className="category-crops">
                  {SUPPORTED_CROPS.fruits.map((crop) => (
                    <button
                      key={crop.value}
                      className="crop-select-btn"
                      onClick={() => analyzeWithCrop(crop.value)}
                    >
                      {language === 'hi' ? crop.labelHi : crop.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grains */}
              <div className="crop-category">
                <h4 className="category-title grains-title">
                  🌾 {language === 'hi' ? 'अनाज' : 'Grains'}
                </h4>
                <div className="category-crops">
                  {SUPPORTED_CROPS.grains.map((crop) => (
                    <button
                      key={crop.value}
                      className="crop-select-btn"
                      onClick={() => analyzeWithCrop(crop.value)}
                    >
                      {language === 'hi' ? crop.labelHi : crop.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button className="cancel-btn" onClick={cancelCropSelection}>
              {language === 'hi' ? '❌ रद्द करें' : '❌ Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* Weather Strip - Auto detected location */}
      {/* Weather Strip - Clickable to change location */}
      <div className="weather-strip" onClick={() => setShowLocationPicker(true)} style={{ cursor: 'pointer' }}>
        {weatherLoading ? (
          <div className="weather-strip-loading">
            <span className="loading-icon">🌤️</span>
            <span>{language === 'hi' ? 'मौसम लोड हो रहा है...' : 'Loading weather...'}</span>
          </div>
        ) : weather ? (
          <>
            <div className="weather-strip-location">
              <span className="location-icon">📍</span>
              <span>{weather.locationName || 'India'}</span>
              <span className="change-location-hint">✏️</span>
            </div>
            <div className="weather-strip-main">
              <span className="weather-icon">{weather.current?.icon || '☀️'}</span>
              <span className="weather-temp">{weather.current?.temp || '--'}°C</span>
              <span className="weather-condition">{weather.current?.condition || ''}</span>
            </div>
            <div className="weather-strip-details">
              <span className="humidity">💧 {weather.current?.humidity || '--'}%</span>
            </div>
          </>
        ) : (
          <div className="weather-strip-error">
            <span>🌤️</span>
            <span>{language === 'hi' ? 'स्थान चुनें' : 'Select Location'}</span>
          </div>
        )}
      </div>

      {/* Location Picker Modal */}
      {showLocationPicker && (
        <div className="location-picker-overlay" onClick={() => setShowLocationPicker(false)}>
          <div className="location-picker-modal" onClick={e => e.stopPropagation()}>
            <h3>{language === 'hi' ? '📍 अपना राज्य चुनें' : '📍 Select Your State'}</h3>
            <p className="picker-subtitle">
              {language === 'hi' ? 'सही मौसम जानकारी के लिए' : 'For accurate weather information'}
            </p>
            <div className="state-list">
              {Object.keys(INDIAN_STATES).map(stateName => (
                <button
                  key={stateName}
                  className={`state-btn ${selectedState === stateName ? 'active' : ''}`}
                  onClick={() => handleStateSelect(stateName)}
                >
                  {stateName}
                </button>
              ))}
            </div>
            <button className="close-picker-btn" onClick={() => setShowLocationPicker(false)}>
              {language === 'hi' ? 'बंद करें' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="chat-header">
        <button className="menu-btn" onClick={onToggleSidebar}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
        <div className="header-title">
          <h1>KrishiMitra</h1>
          <span className="subtitle">{language === 'hi' ? 'आपका कृषि सहायक' : 'Your Agriculture Assistant'}</span>
        </div>
        <div className="header-actions">
          {/* Talkback Toggle Button */}
          <button 
            className={`action-btn talkback-btn ${talkbackEnabled ? 'enabled' : 'disabled'}`}
            onClick={toggleTalkback}
            title={talkbackEnabled 
              ? (language === 'hi' ? 'आवाज़ बंद करें' : 'Mute Voice') 
              : (language === 'hi' ? 'आवाज़ चालू करें' : 'Enable Voice')}
          >
            {talkbackEnabled ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            )}
          </button>
          <button className="action-btn" onClick={onNewChat}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      </header>

      {/* Messages Area */}
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="welcome-screen">
            <div className="welcome-icon">🌾</div>
            <h2>{language === 'hi' ? 'नमस्ते! मैं कृषिमित्र हूं' : 'Hello! I am KrishiMitra'}</h2>
            <p>{language === 'hi' 
              ? 'आपकी फसलों, खेती और सरकारी योजनाओं के बारे में कोई भी सवाल पूछें' 
              : 'Ask me anything about your crops, farming, and government schemes'}
            </p>
            
            <div className="suggestions">
              {suggestions.map((s, i) => (
                <button key={i} className="suggestion-btn" onClick={() => sendMessage(s.text)}>
                  <span className="suggestion-icon">{s.icon}</span>
                  <span>{s.text}</span>
                </button>
              ))}
            </div>

            <div className="capabilities">
              <button className="capability" onClick={() => setShowImageUpload(true)}>
                <span className="cap-icon">🔬</span>
                <span>{language === 'hi' ? 'रोग पहचान' : 'Disease Detection'}</span>
              </button>
              <button className="capability" onClick={() => sendMessage(language === 'hi' ? 'आज का मौसम कैसा रहेगा?' : 'What will the weather be like today?')}>
                <span className="cap-icon">🌤️</span>
                <span>{language === 'hi' ? 'मौसम पूर्वानुमान' : 'Weather Forecast'}</span>
              </button>
              <button className="capability" onClick={() => sendMessage(language === 'hi' ? 'मंडी भाव' : 'Market prices')}>
                <span className="cap-icon">💰</span>
                <span>{language === 'hi' ? 'मंडी भाव' : 'Market Prices'}</span>
              </button>
              <button className="capability" onClick={() => sendMessage(language === 'hi' ? 'किसानों के लिए सरकारी योजनाएं' : 'Government schemes for farmers')}>
                <span className="cap-icon">📋</span>
                <span>{language === 'hi' ? 'सरकारी योजनाएं' : 'Govt Schemes'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.role}`}>
                <div className="message-avatar">
                  {msg.role === 'user' ? (
                    userProfile?.name?.charAt(0).toUpperCase() || '👤'
                  ) : (
                    '🌾'
                  )}
                </div>
                <div className="message-content">
                  <div className="message-header">
                    <span className="message-author">
                      {msg.role === 'user' 
                        ? (userProfile?.name || (language === 'hi' ? 'आप' : 'You'))
                        : 'KrishiMitra'}
                    </span>
                  </div>
                  {msg.image && (
                    <img src={msg.image} alt="Uploaded" className="message-image" />
                  )}
                  <div 
                    className="message-text"
                    dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                  />
                  {msg.role === 'assistant' && (
                    <div className="message-actions">
                      <button onClick={() => speakText(msg.content, true)} title={language === 'hi' ? 'सुनें' : 'Listen'}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                        </svg>
                      </button>
                      <button onClick={() => navigator.clipboard.writeText(msg.content)} title={language === 'hi' ? 'कॉपी करें' : 'Copy'}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="message assistant">
                <div className="message-avatar">🌾</div>
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
        )}
      </div>

      {/* Input Area */}
      <div className="input-container">
        <div className="input-wrapper">
          <button 
            className={`input-btn voice ${isListening ? 'active' : ''}`}
            onClick={toggleListening}
            title={language === 'hi' ? 'आवाज से बोलें' : 'Voice input'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>

          <button 
            className="input-btn image"
            onClick={() => fileInputRef.current?.click()}
            title={language === 'hi' ? 'फोटो भेजें' : 'Upload image'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </button>

          <input type="file" ref={fileInputRef} accept="image/*" hidden onChange={handleImageUpload} />

          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={language === 'hi' ? 'अपना सवाल लिखें...' : 'Type your question...'}
            rows="1"
            className="chat-input"
          />

          <button 
            className={`send-btn ${input.trim() ? 'active' : ''}`}
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        
        <p className="input-hint">
          {language === 'hi' 
            ? 'कृषिमित्र आपकी खेती में मदद के लिए यहां है। आप हिंदी या अंग्रेजी में पूछ सकते हैं।' 
            : 'KrishiMitra is here to help with your farming. You can ask in Hindi or English.'}
        </p>
      </div>

      {/* Image Upload Modal */}
      {showImageUpload && (
        <div className="modal-overlay" onClick={() => setShowImageUpload(false)}>
          <div className="upload-modal" onClick={e => e.stopPropagation()}>
            <h3>{language === 'hi' ? '🔬 फसल रोग पहचान' : '🔬 Crop Disease Detection'}</h3>
            <p>{language === 'hi' ? 'अपनी फसल की फोटो अपलोड करें' : 'Upload a photo of your crop'}</p>
            
            <div className="upload-options">
              <button onClick={() => fileInputRef.current?.click()}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span>{language === 'hi' ? 'गैलरी से चुनें' : 'Choose from Gallery'}</span>
              </button>
              <button onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.capture = 'environment';
                  fileInputRef.current.click();
                }
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span>{language === 'hi' ? 'कैमरा खोलें' : 'Open Camera'}</span>
              </button>
            </div>

            <button className="close-modal" onClick={() => setShowImageUpload(false)}>
              {language === 'hi' ? 'बंद करें' : 'Cancel'}
            </button>
          </div>
        </div>
      )}
    </main>
  );
};

export default ChatInterface;
