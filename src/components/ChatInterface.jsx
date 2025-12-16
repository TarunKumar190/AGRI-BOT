import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import useLocation from '../hooks/useLocation';
import './ChatInterface.css';

const API_BASE = 'http://localhost:4000';
// Disease detection - Using server-side proxy (server keeps API warm)
// No more direct Render API calls from frontend - server handles keep-alive
const DISEASE_API_TIMEOUT = 120000; // 2 minute timeout (server manages warming)

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
  // Dynamic loading message for disease detection
  const [loadingMessageId, setLoadingMessageId] = useState(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  // Pending query to send after new chat is created (for quick chat buttons)
  const [pendingQueryAfterNewChat, setPendingQueryAfterNewChat] = useState(null);
  // Talkback (text-to-speech) toggle - persisted in localStorage
  // TTS is manual only - user clicks speaker button to hear messages
  const [talkbackEnabled, setTalkbackEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('talkbackEnabled');
      return saved !== null ? saved === 'true' : false; // Default: disabled (manual speaker button)
    }
    return false;
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
  const [diseaseApiStatus, setDiseaseApiStatus] = useState('unknown'); // 'unknown', 'warming', 'ready', 'slow'
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Check disease API status from server (server manages keep-alive)
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        setDiseaseApiStatus('warming');
        console.log('[Disease API] Checking server status...');
        
        const response = await fetch(`${API_BASE}/v1/disease/status`);
        if (response.ok) {
          const data = await response.json();
          console.log('[Disease API] Status:', data);
          
          if (data.status === 'ready') {
            setDiseaseApiStatus('ready');
            console.log('[Disease API] Server is warm and ready!');
          } else {
            setDiseaseApiStatus('warming');
            console.log('[Disease API] Server is warming up...');
          }
        } else {
          setDiseaseApiStatus('slow');
        }
      } catch (e) {
        console.log('[Disease API] Could not check status:', e.message);
        setDiseaseApiStatus('unknown');
      }
    };
    
    checkApiStatus();
    
    // Re-check status every 30 seconds
    const statusInterval = setInterval(checkApiStatus, 30000);
    
    return () => clearInterval(statusInterval);
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
    // Initialize speech recognition with enhanced Hindi support
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.maxAlternatives = 3; // Get multiple alternatives for better accuracy
      
      const langMap = {
        'hi': 'hi-IN', 'en': 'en-IN', 'te': 'te-IN', 'mr': 'mr-IN',
        'ta': 'ta-IN', 'kn': 'kn-IN', 'pa': 'pa-IN', 'bn': 'bn-IN'
      };
      recognitionRef.current.lang = langMap[language] || 'en-IN';

      // Track if we got a final result
      let hasFinalResult = false;
      let finalTranscript = '';

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
            hasFinalResult = true;
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Show transcript in input (final or interim)
        setInput(finalTranscript || interimTranscript);
        
        console.log('[Voice] Transcript:', finalTranscript || interimTranscript, '| Final:', hasFinalResult);
      };

      recognitionRef.current.onend = () => {
        console.log('[Voice] Recognition ended. Final transcript:', finalTranscript);
        setIsListening(false);
        
        // Auto-submit if we have a final result (farmer doesn't need to click send)
        if (hasFinalResult && finalTranscript.trim()) {
          console.log('[Voice] Auto-submitting voice query:', finalTranscript);
          // Small delay to ensure state is updated
          setTimeout(() => {
            sendMessage(finalTranscript.trim());
          }, 300);
        }
        
        // Reset for next recognition
        hasFinalResult = false;
        finalTranscript = '';
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('[Voice] Recognition error:', event.error);
        setIsListening(false);
        
        // Show error message for common errors
        if (event.error === 'no-speech') {
          // Don't show error, just silently stop
        } else if (event.error === 'not-allowed') {
          alert(language === 'hi' 
            ? 'माइक्रोफोन की अनुमति दें' 
            : 'Please allow microphone access');
        }
      };
    }
  }, [language]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert(language === 'hi' 
        ? 'आपका ब्राउज़र वॉइस इनपुट सपोर्ट नहीं करता' 
        : 'Your browser does not support voice input');
      return;
    }
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      // Start listening
      recognitionRef.current.start();
      setIsListening(true);
      // No auto voice prompt - just visual indication that mic is active
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
      // Remove progress bar characters
      .replace(/[▓░]/g, '')
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
        // Convert percentages
        .replace(/(\d+)%/g, '$1 प्रतिशत')
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
    // Use global stop function
    if (window.stopAllTTS) {
      window.stopAllTTS();
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
    
    // Clean the text before speaking (pass language for proper conversion)
    const isIndic = ['hi', 'te', 'mr'].includes(language); // Hindi, Telugu, Marathi
    const cleanText = cleanTextForSpeech(text, isIndic);
    
    console.log('[Speech] ========== TTS DEBUG ==========');
    console.log('[Speech] Language:', language, '| Is Indic:', isIndic);
    console.log('[Speech] Text length:', cleanText.length);
    
    if (!cleanText || cleanText.trim().length === 0) {
      console.log('[Speech] Empty text, skipping');
      return;
    }
    
    // For Indic languages (Hindi, Telugu, Marathi): Use server proxy for Google TTS
    if (isIndic) {
      console.log('[Speech] 🎯 Using Server TTS Proxy for', language);
      speakWithServerTTS(cleanText, language);
      return;
    }
    
    // For English: Use browser TTS
    speakWithBrowserTTS(cleanText, language);
  };
  
  // Server-proxied TTS - works for Hindi via our backend
  const speakWithServerTTS = (text, lang) => {
    // Initialize audio tracking array if not exists
    if (!window.ttsAudioInstances) {
      window.ttsAudioInstances = [];
    }
    
    // Stop ALL previous audio instances
    window.ttsAudioInstances.forEach(audio => {
      try {
        audio.pause();
        audio.src = '';
      } catch(e) {}
    });
    window.ttsAudioInstances = [];
    
    // Stop any previous audio
    if (window.currentTTSAudio) {
      window.currentTTSAudio.pause();
      window.currentTTSAudio.src = '';
      window.currentTTSAudio = null;
    }
    
    // Google TTS has a character limit (~200), so split long text
    const maxLength = 150;
    const chunks = [];
    
    // Split into sentences first
    const sentences = text.split(/(?<=[।.!?])\s*/).filter(s => s.trim());
    
    let currentChunk = '';
    for (const sentence of sentences) {
      if ((currentChunk + ' ' + sentence).length > maxLength) {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk = currentChunk ? currentChunk + ' ' + sentence : sentence;
      }
    }
    if (currentChunk) chunks.push(currentChunk.trim());
    
    console.log('[Speech] Split into', chunks.length, 'chunks');
    
    // Clear any existing timeouts
    if (window.ttsTimeoutId) {
      clearTimeout(window.ttsTimeoutId);
      window.ttsTimeoutId = null;
    }
    
    // Reset stop flag for new playback
    window.ttsShouldStop = false;
    
    // Create a unique session ID for this TTS session
    const sessionId = Date.now();
    window.currentTTSSession = sessionId;
    
    // Play chunks sequentially
    let currentIndex = 0;
    
    const playNextChunk = () => {
      // Check if we should stop OR if session changed
      if (window.ttsShouldStop || window.currentTTSSession !== sessionId) {
        console.log('[Speech] 🛑 Stopping playback');
        if (window.currentTTSAudio) {
          window.currentTTSAudio.pause();
          window.currentTTSAudio.src = '';
          window.currentTTSAudio = null;
        }
        return;
      }
      
      if (currentIndex >= chunks.length) {
        console.log('[Speech] ✅ All chunks finished');
        window.currentTTSAudio = null;
        return;
      }
      
      const chunk = chunks[currentIndex];
      console.log('[Speech] ▶️ Chunk', currentIndex + 1, '/', chunks.length);
      
      // Use our server proxy
      const audioUrl = `${API_BASE}/v1/tts?text=${encodeURIComponent(chunk)}&lang=${lang}`;
      
      const audio = new Audio(audioUrl);
      window.currentTTSAudio = audio;
      // Track this audio instance for cleanup
      window.ttsAudioInstances.push(audio);
      
      audio.onended = () => {
        if (window.ttsShouldStop || window.currentTTSSession !== sessionId) return;
        currentIndex++;
        window.ttsTimeoutId = setTimeout(playNextChunk, 150);
      };
      
      audio.onerror = (e) => {
        console.error('[Speech] ❌ Audio error, trying next chunk');
        if (window.ttsShouldStop || window.currentTTSSession !== sessionId) return;
        currentIndex++;
        window.ttsTimeoutId = setTimeout(playNextChunk, 150);
      };
      
      audio.play().then(() => {
        console.log('[Speech] 🔊 Playing...');
      }).catch(err => {
        console.error('[Speech] Play failed:', err.message);
        if (window.ttsShouldStop) return;
        currentIndex++;
        window.ttsTimeoutId = setTimeout(playNextChunk, 150);
      });
    };
    
    playNextChunk();
  };
  
  // Browser's native TTS - robust implementation
  const speakWithBrowserTTS = (cleanText, langCode) => {
    console.log('[Speech] Starting browser TTS, language:', langCode);
    
    // Reset stop flag for new speech
    window.ttsShouldStop = false;
    
    // Map language codes to TTS locale codes
    const langMap = {
      'en': 'en-IN',
      'hi': 'hi-IN',
      'te': 'te-IN',
      'mr': 'mr-IN'
    };
    const ttsLang = langMap[langCode] || 'en-IN';
    const isIndic = ['hi', 'te', 'mr'].includes(langCode);
    
    if (!('speechSynthesis' in window)) {
      console.error('[Speech] ❌ Speech synthesis not supported in this browser');
      return;
    }
    
    // Cancel any ongoing speech first
    window.speechSynthesis.cancel();
    
    // Chrome has a bug where getVoices() returns empty array initially
    // We need to wait for voices to load
    const attemptSpeak = () => {
      // CHECK STOP FLAG
      if (window.ttsShouldStop) {
        console.log('[Speech] 🛑 STOPPED before speaking');
        return;
      }
      
      const voices = window.speechSynthesis.getVoices();
      console.log('[Speech] Available voices:', voices.length);
      
      if (voices.length === 0) {
        console.log('[Speech] No voices loaded yet, retrying in 100ms...');
        setTimeout(attemptSpeak, 100);
        return;
      }
      
      // Find the best voice for the language
      let selectedVoice = null;
      
      if (isIndic) {
        // Find voice for Indic languages
        const langPrefix = langCode;
        const indicVoices = voices.filter(v => 
          v.lang.includes(langPrefix) || 
          v.lang.startsWith(langPrefix)
        );
        console.log('[Speech]', langCode, 'voices found:', indicVoices.length);
        indicVoices.forEach(v => console.log('[Speech]   -', v.name, v.lang));
        
        selectedVoice = 
          voices.find(v => v.lang === ttsLang) ||
          voices.find(v => v.lang === langCode) ||
          voices.find(v => v.lang.toLowerCase().startsWith(langCode));
        
        if (selectedVoice) {
          console.log('[Speech] ✅ Selected', langCode, 'voice:', selectedVoice.name, selectedVoice.lang);
        } else {
          console.log('[Speech] ⚠️ No', langCode, 'voice found, using default with', ttsLang, 'lang tag');
        }
      } else {
        // For English - prefer Indian English
        selectedVoice = 
          voices.find(v => v.lang === 'en-IN') ||
          voices.find(v => v.lang === 'en-US') ||
          voices.find(v => v.lang.startsWith('en'));
        
        if (selectedVoice) {
          console.log('[Speech] Selected English voice:', selectedVoice.name, selectedVoice.lang);
        }
      }
      
      // For better handling, split into chunks but not too small
      // Use a single utterance for short text, sentences for longer
      const maxChunkLength = 200;
      
      // CHECK STOP FLAG AGAIN before speaking
      if (window.ttsShouldStop) {
        console.log('[Speech] 🛑 STOPPED before starting utterance');
        return;
      }
      
      if (cleanText.length <= maxChunkLength) {
        // Short text - speak directly
        speakSingleUtterance(cleanText, selectedVoice, ttsLang);
      } else {
        // Long text - split into sentences (handle both Devanagari and English punctuation)
        const sentences = cleanText
          .split(/(?<=[।.!?])\s*/)
          .filter(s => s.trim().length > 0);
        
        console.log('[Speech] Long text, split into', sentences.length, 'chunks');
        speakSentencesSequentially(sentences, selectedVoice, ttsLang, 0);
      }
    };
    
    // Start the speaking attempt
    attemptSpeak();
  };
  
  // Helper: Speak a single utterance
  const speakSingleUtterance = (text, voice, ttsLang) => {
    const utterance = new SpeechSynthesisUtterance(text);
    const isIndic = ttsLang !== 'en-IN';
    
    // ALWAYS set language
    utterance.lang = ttsLang;
    
    // Set voice if available
    if (voice) {
      utterance.voice = voice;
    }
    
    // Speech settings - slower for Indic languages
    utterance.rate = isIndic ? 0.85 : 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    utterance.onstart = () => console.log('[Speech] ▶️ Started speaking');
    utterance.onend = () => console.log('[Speech] ✅ Finished speaking');
    utterance.onerror = (e) => console.error('[Speech] ❌ Error:', e.error);
    
    console.log('[Speech] Speaking:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));
    window.speechSynthesis.speak(utterance);
  };
  
  // Helper: Speak multiple sentences sequentially
  const speakSentencesSequentially = (sentences, voice, ttsLang, index) => {
    const isIndic = ttsLang !== 'en-IN';
    
    // CHECK STOP FLAG FIRST
    if (window.ttsShouldStop) {
      console.log('[Speech] 🛑 STOPPED - ttsShouldStop flag is set at index', index);
      window.speechSynthesis.cancel();
      return;
    }
    
    if (index >= sentences.length) {
      console.log('[Speech] ✅ All sentences completed');
      return;
    }
    
    const text = sentences[index];
    console.log('[Speech] Sentence', index + 1, '/', sentences.length, ':', text.substring(0, 50));
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = ttsLang;
    
    if (voice) {
      utterance.voice = voice;
    }
    
    utterance.rate = isIndic ? 0.85 : 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Store current utterance for potential cancellation
    window.currentUtterance = utterance;
    
    utterance.onend = () => {
      console.log('[Speech] ✅ Sentence', index + 1, 'ended');
      // CHECK STOP FLAG BEFORE CONTINUING
      if (window.ttsShouldStop) {
        console.log('[Speech] 🛑 STOPPED after sentence', index + 1, 'end - NOT continuing');
        window.currentUtterance = null;
        return;
      }
      // Continue with next sentence after a small pause
      window.ttsTimeoutId = setTimeout(() => {
        // Double-check stop flag in timeout
        if (window.ttsShouldStop) {
          console.log('[Speech] 🛑 STOPPED in timeout before sentence', index + 2);
          return;
        }
        speakSentencesSequentially(sentences, voice, ttsLang, index + 1);
      }, 150);
    };
    
    utterance.onerror = (e) => {
      console.error('[Speech] Sentence error:', e.error, '- continuing...');
      // CHECK STOP FLAG BEFORE CONTINUING
      if (window.ttsShouldStop) {
        console.log('[Speech] 🛑 STOPPED after error');
        window.currentUtterance = null;
        return;
      }
      window.ttsTimeoutId = setTimeout(() => {
        if (window.ttsShouldStop) {
          console.log('[Speech] 🛑 STOPPED in error timeout');
          return;
        }
        speakSentencesSequentially(sentences, voice, ttsLang, index + 1);
      }, 150);
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
      
      // TTS disabled for auto-speak - user can click speaker button to hear response

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

  // Step 2: User selects crop -> Analyze image using SERVER PROXY (no local fallback)
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

    // Dynamic loading messages for better UX
    const loadingMessages = language === 'hi' ? [
      { icon: '🚀', text: 'AI इंजन शुरू हो रहा है...', subtext: 'कृपया प्रतीक्षा करें' },
      { icon: '🔌', text: 'सर्वर से कनेक्ट हो रहा है...', subtext: 'न्यूरल नेटवर्क सक्रिय हो रहा है' },
      { icon: '📤', text: 'छवि अपलोड हो रही है...', subtext: 'आपकी फसल की तस्वीर भेजी जा रही है' },
      { icon: '🔬', text: 'AI विश्लेषण जारी है...', subtext: 'मशीन लर्निंग मॉडल काम कर रहा है' },
      { icon: '🧠', text: 'रोग पहचान जारी है...', subtext: 'डीप लर्निंग से जांच हो रही है' },
      { icon: '📊', text: 'परिणाम तैयार हो रहे हैं...', subtext: 'बस कुछ ही सेकंड और...' },
    ] : [
      { icon: '🚀', text: 'Starting AI Engine...', subtext: 'Please wait' },
      { icon: '🔌', text: 'Connecting to server...', subtext: 'Activating neural network' },
      { icon: '📤', text: 'Uploading image...', subtext: 'Sending your crop photo' },
      { icon: '🔬', text: 'AI Analysis in progress...', subtext: 'Machine learning model working' },
      { icon: '🧠', text: 'Detecting disease patterns...', subtext: 'Deep learning scan active' },
      { icon: '📊', text: 'Preparing results...', subtext: 'Almost there...' },
    ];

    const loadingMsgId = Date.now() + 1;
    setLoadingMessageId(loadingMsgId);
    setLoadingStep(0);

    // Initial loading message
    const initialLoadingContent = `${loadingMessages[0].icon} **${loadingMessages[0].text}**\n\n_${loadingMessages[0].subtext}_`;
    const analyzingMessage = {
      id: loadingMsgId,
      role: 'assistant',
      content: initialLoadingContent,
      timestamp: new Date().toISOString(),
      isLoading: true
    };
    onUpdateConversation(conversation.id, [...newMessages, analyzingMessage]);

    // Animate through loading steps
    let stepIndex = 0;
    const loadingInterval = setInterval(() => {
      stepIndex = (stepIndex + 1) % loadingMessages.length;
      setLoadingStep(stepIndex);
      const step = loadingMessages[stepIndex];
      const updatedContent = `${step.icon} **${step.text}**\n\n_${step.subtext}_\n\n${'▓'.repeat(stepIndex + 1)}${'░'.repeat(loadingMessages.length - stepIndex - 1)} ${Math.round(((stepIndex + 1) / loadingMessages.length) * 100)}%`;
      
      const updatedLoadingMsg = {
        id: loadingMsgId,
        role: 'assistant',
        content: updatedContent,
        timestamp: new Date().toISOString(),
        isLoading: true
      };
      onUpdateConversation(conversation.id, [...newMessages, updatedLoadingMsg]);
    }, 3000); // Update every 3 seconds

    let apiSuccess = false;
    let apiData = null;
    let errorMessage = null;

    // Use server proxy (server keeps API warm with keep-alive system)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DISEASE_API_TIMEOUT);

      const formData = new FormData();
      formData.append('file', file); // Must be 'file' to match server multer config
      formData.append('crop', cropType);

      console.log('[Disease] Sending to server proxy (2 min timeout)...');
      
      // Use server proxy endpoint instead of direct Render call
      const response = await fetch(`${API_BASE}/v1/disease/detect`, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        apiData = await response.json();
        if (apiData && apiData.class && !apiData.error) {
          apiSuccess = true;
          console.log('[Disease] Server proxy success:', apiData.class);
        } else if (apiData.error) {
          errorMessage = apiData.error;
        }
      } else if (response.status === 503) {
        // Service temporarily unavailable
        const errData = await response.json().catch(() => ({}));
        errorMessage = errData.error || 'AI server is temporarily busy';
      } else {
        errorMessage = `Server error: ${response.status}`;
      }
    } catch (error) {
      console.log('[Disease] Request failed:', error.message);
      if (error.name === 'AbortError') {
        errorMessage = language === 'hi' 
          ? 'अनुरोध का समय समाप्त हो गया। कृपया पुनः प्रयास करें।'
          : 'Request timed out. Please try again.';
      } else {
        errorMessage = error.message;
      }
    }

    // Generate response
    let responseContent;
    
    if (apiSuccess && apiData) {
      // External API succeeded - use its results
      const diseaseClass = apiData.class;
      const isHealthy = diseaseClass.toLowerCase().includes('healthy');
      const treatmentInfo = TREATMENT_DATA[diseaseClass] || TREATMENT_DATA['default'];
      const confidence = (apiData.confidence * 100).toFixed(1);
      const diseaseName = diseaseClass.replace(/_+/g, ' ').replace(/\s+/g, ' ').trim();

      if (isHealthy) {
        responseContent = language === 'hi'
          ? `✅ **अच्छी खबर!**\n\nआपका ${cropType} पौधा स्वस्थ है!\n\n**विश्वास स्तर:** ${confidence}%\n\n**सुझाव:**\n• नियमित निगरानी जारी रखें\n• उचित पोषण बनाए रखें\n• अच्छी स्वच्छता का अभ्यास करें`
          : `✅ **Good News!**\n\nYour ${cropType} plant is healthy!\n\n**Confidence:** ${confidence}%\n\n**Tips:**\n• Continue regular monitoring\n• Maintain proper nutrition\n• Practice good hygiene`;
      } else {
        const treatment = language === 'hi' ? treatmentInfo.treatmentHi : treatmentInfo.treatment;
        const prevention = language === 'hi' ? treatmentInfo.preventionHi : treatmentInfo.prevention;
        
        responseContent = language === 'hi'
          ? `🔬 **रोग पहचान परिणाम**\n\n**रोग:** ${diseaseName}\n**फसल:** ${cropType}\n**गंभीरता:** ${treatmentInfo.severity === 'severe' ? '⚠️ गंभीर' : '⚡ मध्यम'}\n**विश्वास:** ${confidence}%\n\n**🩺 उपचार:**\n${treatment.map(t => `• ${t}`).join('\n')}\n\n**🛡️ रोकथाम:**\n${prevention.map(p => `• ${p}`).join('\n')}`
          : `🔬 **Disease Detection Result**\n\n**Disease:** ${diseaseName}\n**Crop:** ${cropType}\n**Severity:** ${treatmentInfo.severity === 'severe' ? '⚠️ Severe' : '⚡ Moderate'}\n**Confidence:** ${confidence}%\n\n**🩺 Treatment:**\n${treatment.map(t => `• ${t}`).join('\n')}\n\n**🛡️ Prevention:**\n${prevention.map(p => `• ${p}`).join('\n')}`;
      }
    } else {
      // API failed - show error with retry option (NO LOCAL FALLBACK)
      console.log('[Disease] API failed, showing error to user');
      
      if (language === 'hi') {
        responseContent = `❌ **विश्लेषण विफल**\n\n${errorMessage || 'AI सर्वर अस्थायी रूप से अनुपलब्ध है।'}\n\n**🔄 कृपया पुनः प्रयास करें:**\n• कुछ सेकंड बाद फिर से तस्वीर भेजें\n• सुनिश्चित करें कि इंटरनेट कनेक्शन अच्छा हो\n\n**📞 तत्काल सहायता:**\n• किसान कॉल सेंटर: **1800-180-1551** (टोल फ्री)\n• नजदीकी कृषि विज्ञान केंद्र (KVK) से संपर्क करें`;
      } else {
        responseContent = `❌ **Analysis Failed**\n\n${errorMessage || 'AI server is temporarily unavailable.'}\n\n**🔄 Please try again:**\n• Send the image again after a few seconds\n• Make sure you have good internet connection\n\n**📞 Need immediate help?**\n• Kisan Call Center: **1800-180-1551** (Toll Free)\n• Contact nearest Krishi Vigyan Kendra (KVK)`;
      }
    }

    // Stop the loading animation
    clearInterval(loadingInterval);
    setLoadingMessageId(null);
    setLoadingStep(0);

    const assistantMessage = {
      id: loadingMsgId, // Use same ID to replace loading message
      role: 'assistant',
      content: responseContent,
      timestamp: new Date().toISOString(),
      diseaseData: apiSuccess ? {
        disease: apiData.class,
        crop: cropType,
        confidence: (apiData.confidence * 100).toFixed(1),
        isHealthy: apiData.class.toLowerCase().includes('healthy')
      } : {
        error: true,
        crop: cropType
      }
    };

    // Replace loading message with actual result
    onUpdateConversation(conversation.id, [...newMessages, assistantMessage]);
    // TTS disabled for auto-speak - user can click speaker button to hear response
    
    setIsLoading(false);
    setPendingImageFile(null);
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
    // Convert markdown-style formatting and make URLs clickable
    let formatted = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Make URLs clickable - supports http, https
      .replace(
        /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi,
        '<a href="$1" target="_blank" rel="noopener noreferrer" class="chat-link">$1</a>'
      )
      .replace(/\n/g, '<br/>');
    return formatted;
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
