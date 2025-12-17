import React, { useState, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import './DiseaseDetection.css';

// Disease Detection API - Your Render backend
const DISEASE_API_URL = 'https://plant-disease-api-yt7l.onrender.com';

// Crops supported by your model (matching backend)
const CROP_OPTIONS = [
  // Vegetables
  { value: 'potato', label: '🥔 Potato', labelHi: '🥔 आलू', category: 'vegetables' },
  { value: 'tomato', label: '🍅 Tomato', labelHi: '🍅 टमाटर', category: 'vegetables' },
  { value: 'pepper', label: '🫑 Bell Pepper', labelHi: '🫑 शिमला मिर्च', category: 'vegetables' },
  // Fruits
  { value: 'apple', label: '🍎 Apple', labelHi: '🍎 सेब', category: 'fruits' },
  { value: 'mango', label: '🥭 Mango', labelHi: '🥭 आम', category: 'fruits' },
  { value: 'sugarcane', label: '🌿 Sugarcane', labelHi: '🌿 गन्ना', category: 'fruits' },
  // Grains
  { value: 'rice', label: '🍚 Rice', labelHi: '🍚 धान', category: 'grains' },
  { value: 'wheat', label: '🌾 Wheat', labelHi: '🌾 गेहूं', category: 'grains' },
  { value: 'maize', label: '🌽 Maize', labelHi: '🌽 मक्का', category: 'grains' },
  { value: 'finger_millet', label: '🌾 Finger Millet', labelHi: '🌾 रागी', category: 'grains' },
];

// Treatment recommendations for common diseases
const TREATMENT_MAP = {
  // Potato
  'Potato___Early_blight': {
    treatment: ['Remove and destroy infected plant parts', 'Apply Mancozeb 75% WP @ 2g/L', 'Spray Chlorothalonil fungicide'],
    treatmentHi: ['संक्रमित पौधों के भागों को हटाएं', 'मैंकोज़ेब 75% WP @ 2g/L छिड़काव करें', 'क्लोरोथालोनिल कवकनाशी का छिड़काव करें'],
    prevention: ['Use resistant varieties', 'Practice crop rotation', 'Improve air circulation'],
    preventionHi: ['प्रतिरोधी किस्मों का उपयोग करें', 'फसल चक्र अपनाएं', 'हवा का संचार बेहतर करें'],
    severity: 'moderate'
  },
  'Potato___Late_blight': {
    treatment: ['Remove infected plants immediately', 'Apply copper-based fungicides', 'Spray Metalaxyl + Mancozeb'],
    treatmentHi: ['संक्रमित पौधों को तुरंत हटाएं', 'कॉपर आधारित कवकनाशी लगाएं', 'मेटालैक्सिल + मैंकोज़ेब छिड़काव करें'],
    prevention: ['Ensure proper spacing', 'Avoid overhead irrigation', 'Use certified disease-free seed'],
    preventionHi: ['उचित दूरी सुनिश्चित करें', 'ऊपरी सिंचाई से बचें', 'प्रमाणित रोग-मुक्त बीज का उपयोग करें'],
    severity: 'severe'
  },
  'Potato___healthy': {
    treatment: [],
    treatmentHi: [],
    prevention: ['Continue good practices', 'Regular monitoring', 'Maintain soil health'],
    preventionHi: ['अच्छी प्रथाओं को जारी रखें', 'नियमित निगरानी', 'मिट्टी का स्वास्थ्य बनाए रखें'],
    severity: 'healthy'
  },
  // Tomato
  'Tomato_Early_blight': {
    treatment: ['Remove infected leaves', 'Apply Mancozeb or Chlorothalonil', 'Use copper-based sprays'],
    treatmentHi: ['संक्रमित पत्तियों को हटाएं', 'मैंकोज़ेब या क्लोरोथालोनिल लगाएं', 'कॉपर आधारित स्प्रे का उपयोग करें'],
    prevention: ['Stake plants for air circulation', 'Water at base of plants', 'Use resistant varieties'],
    preventionHi: ['हवा के संचार के लिए पौधों को सहारा दें', 'पौधों के आधार पर पानी दें', 'प्रतिरोधी किस्मों का उपयोग करें'],
    severity: 'moderate'
  },
  'Tomato_Late_blight': {
    treatment: ['Remove infected plants', 'Apply Metalaxyl + Mancozeb', 'Use copper fungicides'],
    treatmentHi: ['संक्रमित पौधों को हटाएं', 'मेटालैक्सिल + मैंकोज़ेब लगाएं', 'कॉपर कवकनाशी का उपयोग करें'],
    prevention: ['Avoid wetting foliage', 'Space plants properly', 'Use drip irrigation'],
    preventionHi: ['पत्तियों को गीला करने से बचें', 'पौधों को ठीक से स्थान दें', 'ड्रिप सिंचाई का उपयोग करें'],
    severity: 'severe'
  },
  'Tomato_Bacterial_spot': {
    treatment: ['Apply copper-based bactericides', 'Remove infected leaves', 'Use streptomycin sulfate'],
    treatmentHi: ['कॉपर आधारित जीवाणुनाशक लगाएं', 'संक्रमित पत्तियों को हटाएं', 'स्ट्रेप्टोमाइसिन सल्फेट का उपयोग करें'],
    prevention: ['Use disease-free seeds', 'Avoid working with wet plants', 'Rotate crops'],
    preventionHi: ['रोग-मुक्त बीजों का उपयोग करें', 'गीले पौधों के साथ काम करने से बचें', 'फसलों को घुमाएं'],
    severity: 'moderate'
  },
  'Tomato_healthy': {
    treatment: [],
    treatmentHi: [],
    prevention: ['Continue regular monitoring', 'Maintain proper nutrition', 'Practice good hygiene'],
    preventionHi: ['नियमित निगरानी जारी रखें', 'उचित पोषण बनाए रखें', 'अच्छी स्वच्छता का अभ्यास करें'],
    severity: 'healthy'
  },
  // Rice
  'Rice__brown_spot': {
    treatment: ['Apply Mancozeb 75% WP @ 2g/L', 'Use Propiconazole 25% EC', 'Remove infected leaves'],
    treatmentHi: ['मैंकोज़ेब 75% WP @ 2g/L छिड़काव करें', 'प्रोपिकोनाज़ोल 25% EC का उपयोग करें', 'संक्रमित पत्तियां हटाएं'],
    prevention: ['Use balanced fertilization', 'Ensure proper drainage', 'Use resistant varieties'],
    preventionHi: ['संतुलित उर्वरीकरण का उपयोग करें', 'उचित जल निकासी सुनिश्चित करें', 'प्रतिरोधी किस्मों का उपयोग करें'],
    severity: 'moderate'
  },
  'Rice__leaf_blast': {
    treatment: ['Apply Tricyclazole 75% WP', 'Use Isoprothiolane 40% EC', 'Spray Carbendazim'],
    treatmentHi: ['ट्राइसाइक्लाज़ोल 75% WP छिड़काव करें', 'आइसोप्रोथियोलेन 40% EC का उपयोग करें', 'कार्बेंडाज़िम स्प्रे करें'],
    prevention: ['Avoid excess nitrogen', 'Use resistant varieties', 'Maintain proper water level'],
    preventionHi: ['अतिरिक्त नाइट्रोजन से बचें', 'प्रतिरोधी किस्मों का उपयोग करें', 'उचित जल स्तर बनाए रखें'],
    severity: 'severe'
  },
  'Rice__healthy': {
    treatment: [],
    treatmentHi: [],
    prevention: ['Continue good practices', 'Monitor regularly', 'Maintain proper irrigation'],
    preventionHi: ['अच्छी प्रथाओं को जारी रखें', 'नियमित निगरानी', 'उचित सिंचाई बनाए रखें'],
    severity: 'healthy'
  },
  // Wheat
  'Wheat__brown_rust': {
    treatment: ['Apply Propiconazole 25% EC @ 1ml/L', 'Use Tebuconazole fungicide', 'Spray Mancozeb'],
    treatmentHi: ['प्रोपिकोनाज़ोल 25% EC @ 1ml/L छिड़काव करें', 'टेबुकोनाज़ोल कवकनाशी का उपयोग करें', 'मैंकोज़ेब स्प्रे करें'],
    prevention: ['Use resistant varieties like HD-2967', 'Timely sowing', 'Avoid late sowing'],
    preventionHi: ['HD-2967 जैसी प्रतिरोधी किस्मों का उपयोग करें', 'समय पर बुवाई करें', 'देर से बुवाई से बचें'],
    severity: 'high'
  },
  'Wheat__yellow_rust': {
    treatment: ['Spray Propiconazole 25% EC', 'Apply Tebuconazole', 'Use systemic fungicides'],
    treatmentHi: ['प्रोपिकोनाज़ोल 25% EC छिड़काव करें', 'टेबुकोनाज़ोल लगाएं', 'प्रणालीगत कवकनाशियों का उपयोग करें'],
    prevention: ['Grow resistant varieties', 'Early sowing', 'Regular field monitoring'],
    preventionHi: ['प्रतिरोधी किस्में उगाएं', 'जल्दी बुवाई', 'नियमित खेत की निगरानी'],
    severity: 'high'
  },
  'Wheat__healthy': {
    treatment: [],
    treatmentHi: [],
    prevention: ['Continue monitoring', 'Maintain soil health', 'Proper irrigation'],
    preventionHi: ['निगरानी जारी रखें', 'मिट्टी का स्वास्थ्य बनाए रखें', 'उचित सिंचाई'],
    severity: 'healthy'
  },
  // Default for unknown diseases
  'default': {
    treatment: ['Consult local agricultural extension officer', 'Remove and destroy infected parts', 'Apply appropriate fungicide'],
    treatmentHi: ['स्थानीय कृषि विस्तार अधिकारी से परामर्श करें', 'संक्रमित भागों को हटाएं और नष्ट करें', 'उचित कवकनाशी लगाएं'],
    prevention: ['Use resistant varieties', 'Practice crop rotation', 'Maintain field hygiene'],
    preventionHi: ['प्रतिरोधी किस्मों का उपयोग करें', 'फसल चक्र अपनाएं', 'खेत की स्वच्छता बनाए रखें'],
    severity: 'moderate'
  }
};

// Format disease class name for display
const formatDiseaseName = (className) => {
  return className
    .replace(/_+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const DiseaseDetection = () => {
  const { t, language } = useLanguage();
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedCrop, setSelectedCrop] = useState('rice');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // Monitor online status
  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert(language === 'hi' ? 'कृपया केवल छवि फ़ाइलें अपलोड करें' : 'Please upload image files only');
      return;
    }
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert(language === 'hi' ? 'फ़ाइल का आकार 10MB से कम होना चाहिए' : 'File size must be less than 10MB');
      return;
    }
    setSelectedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
  };

  // Drag and Drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if leaving the dropzone entirely
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const analyzeImage = async () => {
    if (!selectedImage) return;
    
    setIsAnalyzing(true);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedImage); // API expects 'file' not 'image'
      formData.append('crop', selectedCrop);
      
      // Call your Render disease detection API
      const response = await fetch(`${DISEASE_API_URL}/predict`, {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('API Response:', data);
        
        // Map API response to UI format
        const diseaseClass = data.class;
        const isHealthy = diseaseClass.toLowerCase().includes('healthy');
        const treatmentInfo = TREATMENT_MAP[diseaseClass] || TREATMENT_MAP['default'];
        
        setResult({
          detected: !isHealthy,
          disease: formatDiseaseName(diseaseClass),
          confidence: (data.confidence * 100).toFixed(1),
          crop: data.crop || selectedCrop,
          treatment: language === 'hi' ? treatmentInfo.treatmentHi : treatmentInfo.treatment,
          prevention: language === 'hi' ? treatmentInfo.preventionHi : treatmentInfo.prevention,
          severity: treatmentInfo.severity,
          rawClass: diseaseClass,
        });
      } else {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error('API error: ' + errorText);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      // Show error with retry option
      setResult({
        error: true,
        message: language === 'hi' 
          ? 'विश्लेषण विफल। सर्वर लोड हो रहा है (30-60 सेकंड लग सकते हैं)। कृपया पुनः प्रयास करें।'
          : 'Analysis failed. Server may be waking up (30-60 seconds). Please try again.',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    setResult(null);
  };

  return (
    <div className="disease-detection">
      {/* Offline Banner */}
      {isOffline && (
        <div className="offline-banner">
          <span>📴</span>
          <span>{language === 'hi' ? 'ऑफ़लाइन - सीमित विश्लेषण उपलब्ध' : 'Offline - Limited analysis available'}</span>
        </div>
      )}

      <div className="detection-header">
        <h2>{t('disease.title')}</h2>
        <p>{t('disease.subtitle')}</p>
      </div>

      {!previewUrl ? (
        <div className="upload-section">
          {/* Crop Selection */}
          <div className="crop-selection">
            <label>{language === 'hi' ? 'फसल चुनें:' : 'Select Crop:'}</label>
            <div className="crop-options">
              {CROP_OPTIONS.map(crop => (
                <button
                  key={crop.value}
                  className={`crop-option ${selectedCrop === crop.value ? 'active' : ''}`}
                  onClick={() => setSelectedCrop(crop.value)}
                >
                  {language === 'hi' ? crop.labelHi : crop.label}
                </button>
              ))}
            </div>
          </div>

          <div 
            ref={dropZoneRef}
            className={`upload-box ${isDragging ? 'dragging' : ''}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={(e) => {
              // Only trigger file input if clicking on the box itself, not buttons
              if (e.target === e.currentTarget || e.target.closest('.drop-overlay')) {
                fileInputRef.current?.click();
              }
            }}
          >
            {isDragging ? (
              <div className="drop-overlay">
                <div className="drop-icon">📥</div>
                <p>{language === 'hi' ? 'छवि यहाँ छोड़ें' : 'Drop image here'}</p>
              </div>
            ) : (
              <>
                <div className="upload-icon">📷</div>
                <p>{language === 'hi' ? 'प्रभावित पौधे की स्पष्ट फोटो अपलोड करें' : 'Upload a clear photo of the affected plant part'}</p>
                <p className="drag-hint">{language === 'hi' ? '🖱️ खींचें और छोड़ें या नीचे बटन पर क्लिक करें' : '🖱️ Drag & drop or click buttons below'}</p>
                <p className="upload-hint">{language === 'hi' ? 'समर्थित: JPG, PNG (अधिकतम 10MB)' : 'Supported: JPG, PNG (max 10MB)'}</p>
              </>
            )}
            
            <div className="upload-buttons">
              <button 
                className="btn btn-primary"
                onClick={() => cameraInputRef.current?.click()}
              >
                <span>📸</span> {t('disease.uploadPhoto')}
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                <span>🖼️</span> {t('disease.selectGallery')}
              </button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            style={{ display: 'none' }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageSelect}
            style={{ display: 'none' }}
          />

          <div className="tips-section">
            <h3>📝 {language === 'hi' ? 'बेहतर पहचान के लिए सुझाव' : 'Tips for better detection'}</h3>
            <ul>
              <li>{language === 'hi' ? 'अच्छी रोशनी में फोटो लें' : 'Take photo in good lighting'}</li>
              <li>{language === 'hi' ? 'प्रभावित क्षेत्र पर फोकस करें' : 'Focus on the affected area'}</li>
              <li>{language === 'hi' ? 'तुलना के लिए स्वस्थ भाग भी शामिल करें' : 'Include some healthy parts for comparison'}</li>
              <li>{language === 'hi' ? 'धुंधली तस्वीरों से बचें' : 'Avoid blurry images'}</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="analysis-section">
          <div className="image-preview">
            <img src={previewUrl} alt="Selected crop" />
            {!result && (
              <button className="change-image-btn" onClick={resetAnalysis}>
                ✕ Change Image
              </button>
            )}
          </div>

          {!result && !isAnalyzing && (
            <button className="btn btn-primary btn-lg analyze-btn" onClick={analyzeImage}>
              🔬 Analyze Image
            </button>
          )}

          {isAnalyzing && (
            <div className="analyzing-state">
              <div className="analyzing-animation">
                <div className="scan-line"></div>
              </div>
              <p>{t('disease.analyzing')}</p>
            </div>
          )}

          {result && (
            <div className="result-section animate-slideUp">
              <div className="result-header">
                <h3>{t('disease.result')}</h3>
                <button className="btn btn-secondary btn-sm" onClick={resetAnalysis}>
                  New Analysis
                </button>
              </div>

              {result.error ? (
                <div className="error-card">
                  <span className="error-icon">⚠️</span>
                  <p>{result.message}</p>
                  <button className="btn btn-primary" onClick={analyzeImage}>
                    🔄 {language === 'hi' ? 'पुनः प्रयास करें' : 'Retry'}
                  </button>
                </div>
              ) : result.severity === 'healthy' ? (
                <div className="no-disease">
                  <span className="check-icon">✅</span>
                  <p>{language === 'hi' ? 'आपका पौधा स्वस्थ है!' : 'Your plant is healthy!'}</p>
                  <p className="confidence-small">{language === 'hi' ? 'विश्वास स्तर' : 'Confidence'}: {result.confidence}%</p>
                  <div className="prevention-section">
                    <h4>🛡️ {t('disease.prevention')}</h4>
                    <ul>
                      {result.prevention.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : result.detected ? (
                <>
                  <div className={`disease-card severity-${result.severity}`}>
                    <div className="disease-info">
                      <span className="disease-label">{t('disease.disease')}</span>
                      <h4 className="disease-name">{result.disease}</h4>
                      <span className="crop-type">{language === 'hi' ? 'फसल' : 'Crop'}: {result.crop}</span>
                    </div>
                    <div className="confidence-badge">
                      <span className="confidence-value">{result.confidence}%</span>
                      <span className="confidence-label">{t('disease.confidence')}</span>
                    </div>
                  </div>

                  {result.treatment && result.treatment.length > 0 && (
                    <div className="treatment-section">
                      <h4>💊 {t('disease.treatment')}</h4>
                      <ul>
                        {result.treatment.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.prevention && result.prevention.length > 0 && (
                    <div className="prevention-section">
                      <h4>🛡️ {t('disease.prevention')}</h4>
                      <ul>
                        {result.prevention.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <div className="no-disease">
                  <span className="check-icon">✅</span>
                  <p>{t('disease.noDisease')}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DiseaseDetection;
