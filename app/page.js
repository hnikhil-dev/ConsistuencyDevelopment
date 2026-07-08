// app/page.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Send, 
  Mic, 
  MicOff, 
  Image, 
  MapPin, 
  CheckCircle, 
  Search, 
  FileText,
  Shield,
  Activity,
  User
} from 'lucide-react';

// Multilingual Translation Matrix
const LANG_DICTS = {
  en: {
    header_title: "पब्लिक प्रायोरिटीज - निर्वाचन क्षेत्र विकास योजना",
    header_subtitle: "Pune South-East Constituency Planning Portal",
    header_org: "Government of Maharashtra Initiative",
    btn_mp_workspace: "MP Workspace Dashboard →",
    form_title: "Submission Form",
    form_desc: "Submit suggestions in Marathi, Hindi, or English. All inputs are mapped to constituency planning databases.",
    label_name: "Citizen Full Name",
    placeholder_name: "Enter your full name",
    label_suggestion: "Development Suggestion Details",
    placeholder_suggestion: "Describe the issue or proposed upgrade (e.g. school capacity issues, road potholes, water shortages)...",
    demo_scenario: "Load Demo Scenario (Marathi)",
    btn_voice_start: "Record Audio",
    btn_voice_active: "Listening Speech...",
    btn_voice_attached: "Audio Attached",
    btn_photo_scan: "Upload Photo",
    btn_photo_scanning: "Scanning Image...",
    btn_photo_attached: "Photo Attached",
    label_gps: "GPS Verification Tagging",
    label_gps_desc: "Pinpoint location for strategic data audit",
    btn_gps: "Verify Location",
    btn_gps_active: "GPS Tagged",
    btn_gps_loading: "Locating...",
    security_declaration: "Security Declaration: I certify that the information provided is correct. I consent to the collection of coordinates and media files for audit and planning purposes. All data is protected under NIC security guidelines.",
    btn_submit: "Submit Suggestion",
    btn_submitting: "NLP translation & verification active...",
    success_title: "Grievance Ingested Successfully!",
    success_receipt: "Your Official Receipt Tracking ID:",
    success_category: "Category",
    success_location: "Location",
    success_trust: "Evidence Trust",
    success_coordination: "Coordination",
    success_campaign_yes: "Campaign Dampened",
    success_campaign_no: "Unique",
    success_footer: "Your suggestion has been translated, verified, and mapped to the active ward cluster. You can copy the tracking ID to monitor implementation.",
    tracker_title: "Track Proposal Status",
    tracker_desc: "Check progress, planning status, and implementation updates for your submission ID.",
    placeholder_tracker: "Enter Receipt ID (e.g. sub-init-1)",
    btn_track: "Search",
    timeline_step1: "1. Grievance Ingested",
    timeline_step1_sub: "Receipt generated, translation completed.",
    timeline_step2: "2. Verified & Consolidated",
    timeline_step2_sub: "Parsed category validation and semantic demand clustering.",
    timeline_step3: "3. MP Approval & Budget Allocated",
    timeline_step3_sub: "Evaluated against infrastructure indicators and approved.",
    timeline_step4: "4. Implementation Stage",
    timeline_step4_sub: "Current project state:",
    nic_compliance_title: "NIC Security Standards Compliance",
    nic_compliance_desc: "All user data is encrypted in transit and hashed inside our Supabase database cluster. Anti-spam campaign detection limits political group-coordination inflation. Decisions are logged for public accountability.",
    footer_text: "© 2026 Constituency Development Portal. National Informatics Centre (NIC) Mock Standard."
  },
  mr: {
    header_title: "पब्लिक प्रायोरिटीज - मतदारसंघ विकास नियोजन",
    header_subtitle: "पुणे दक्षिण-पूर्व मतदारसंघ विकास नियोजन पोर्टल",
    header_org: "महाराष्ट्र शासन उपक्रम",
    btn_mp_workspace: "प्रशासकीय डॅशबोर्ड →",
    form_title: "विकास प्रस्ताव फॉर्म",
    form_desc: "मराठी, हिंदी किंवा इंग्रजीमध्ये तुमचे प्रस्ताव सबमिट करा. सर्व माहिती मतदारसंघ नियोजन डेटाबेसमध्ये जोडली जाईल.",
    label_name: "नागरिकाचे पूर्ण नाव",
    placeholder_name: "तुमचे पूर्ण नाव प्रविष्ट करा",
    label_suggestion: "विकास प्रस्तावाचा सविस्तर तपशील",
    placeholder_suggestion: "समस्या किंवा सुचवलेली सुधारणा वर्णन करा (उदा. शाळेच्या खोल्या, रस्त्यावरील खड्डे, पाण्याची कमतरता)...",
    demo_scenario: "डेमो सिनेरिओ लोड करा (मराठी)",
    btn_voice_start: "आवाज रेकॉर्ड करा",
    btn_voice_active: "बोलणे ऐकत आहे...",
    btn_voice_attached: "ऑडिओ जोडला गेला",
    btn_photo_scan: "फोटो अपलोड करा",
    btn_photo_scanning: "फोटो स्कॅन होत आहे...",
    btn_photo_attached: "फोटो जोडला गेला",
    label_gps: "जीपीएस स्थान टॅगिंग",
    label_gps_desc: "ऑडिटसाठी अचूक भौगोलिक स्थान निश्चित करा",
    btn_gps: "स्थान सत्यापित करा",
    btn_gps_active: "स्थान टॅग केले",
    btn_gps_loading: "शोधत आहे...",
    security_declaration: "सुरक्षा घोषणा: मी प्रमाणित करतो/करते की दिलेली माहिती अचूक आहे. मी ऑडिट आणि नियोजनासाठी स्थान आणि मीडिया संकलनास संमती देतो/देते. सर्व डेटा एनआयसी सुरक्षा नियमांनुसार सुरक्षित आहे.",
    btn_submit: "प्रस्ताव सादर करा",
    btn_submitting: "भाषांतर आणि पडताळणी सुरू आहे...",
    success_title: "तक्रार यशस्वीरित्या नोंदवली गेली!",
    success_receipt: "तुमचा अधिकृत पावती ट्रॅकिंग आयडी:",
    success_category: "वर्ग / श्रेणी",
    success_location: "स्थान",
    success_trust: "विश्वासार्हता गुणांक",
    success_coordination: "मोहीम पडताळणी",
    success_campaign_yes: "मोहीम नियंत्रणात",
    success_campaign_no: "युनिक / अद्वितीय",
    success_footer: "तुमच्या प्रस्तावाचे भाषांतर, पडताळणी आणि वॉर्ड क्लस्टर मॅपिंग यशस्वीरित्या पूर्ण झाले आहे. अंमलबजावणी तपासण्यासाठी ट्रॅकिंग आयडी कॉपी करा.",
    tracker_title: "प्रस्तावाची स्थिती ट्रॅक करा",
    tracker_desc: "तुमच्या प्रस्तावाची प्रगती, नियोजन स्थिती आणि अंमलबजावणीचे अपडेट तपासा.",
    placeholder_tracker: "पावती आयडी प्रविष्ट करा (उदा. sub-init-1)",
    btn_track: "शोधा",
    timeline_step1: "१. तक्रार नोंदवली गेली",
    timeline_step1_sub: "पावती तयार केली, भाषांतर पूर्ण झाले.",
    timeline_step2: "२. सत्यापित आणि एकत्रित",
    timeline_step2_sub: "श्रेणी पडताळणी आणि क्लस्टर मॅपिंग यशस्वी.",
    timeline_step3: "३. खासदार मंजुरी आणि बजेट वाटप",
    timeline_step3_sub: "पायाभूत सुविधा निर्देशांकांवर आधारित मंजुरी.",
    timeline_step4: "४. अंमलबजावणी टप्पा",
    timeline_step4_sub: "सध्याची प्रकल्पाची स्थिती:",
    nic_compliance_title: "NIC सुरक्षा मानके अनुपालन",
    nic_compliance_desc: "सर्व वापरकर्ता डेटा ट्रान्सिटमध्ये एनक्रिप्टेड आणि डेटाबेसमध्ये सुरक्षित ठेवला जातो. स्पॅम मोहिमेद्वारे चुकीची मागणी वाढवणे रोखण्यासाठी फिल्टर सक्रिय आहेत. सर्व निर्णय सार्वजनिक ऑडिटसाठी रेकॉर्ड केले जातात.",
    footer_text: "© २०२६ मतदारसंघ विकास पोर्टल. राष्ट्रीय सूचना विज्ञान केंद्र (NIC) मानके."
  },
  hi: {
    header_title: "पब्लिक प्रायोरिटीज - निर्वाचन क्षेत्र विकास योजना",
    header_subtitle: "पुणे दक्षिण-पूर्व निर्वाचन क्षेत्र नियोजन पोर्टल",
    header_org: "महाराष्ट्र सरकार की पहल",
    btn_mp_workspace: "सांसद डैशबोर्ड →",
    form_title: "विकास प्रस्ताव फॉर्म",
    form_desc: "मराठी, हिंदी या अंग्रेजी में प्रस्ताव सबमिट करें। सभी प्रविष्टियां निर्वाचन क्षेत्र डेटाबेस में दर्ज की जाएंगी।",
    label_name: "नागरिक का पूरा नाम",
    placeholder_name: "अपना पूरा नाम दर्ज करें",
    label_suggestion: "विकास प्रस्ताव का विवरण",
    placeholder_suggestion: "समस्या या प्रस्तावित सुधार का वर्णन करें (जैसे स्कूल के कमरे, सड़क के गड्ढे, पानी की कमी)...",
    demo_scenario: "डेमो परिदृश्य लोड करें (मराठी)",
    btn_voice_start: "आवाज रिकॉर्ड करें",
    btn_voice_active: "भाषण सुन रहे हैं...",
    btn_voice_attached: "ऑडियो संलग्न किया गया",
    btn_photo_scan: "फोटो अपलोड करें",
    btn_photo_scanning: "फोटो स्कैन हो रहा है...",
    btn_photo_attached: "फोटो संलग्न किया गया",
    label_gps: "जीपीएस स्थान टैगिंग",
    label_gps_desc: "सत्यापन और ऑडिट के लिए सटीक स्थान दर्ज करें",
    btn_gps: "स्थान सत्यापित करें",
    btn_gps_active: "स्थान टैग किया गया",
    btn_gps_loading: "खोज रहे हैं...",
    security_declaration: "सुरक्षा घोषणा: मैं प्रमाणित करता/करती हूं कि प्रदान की गई जानकारी सही है। मैं ऑडिट और योजना के लिए स्थान और मीडिया संग्रह के लिए सहमति देता/देती हूं। सभी डेटा एनआईसी सुरक्षा दिशानिर्देशों के तहत सुरक्षित हैं।",
    btn_submit: "प्रस्ताव सबमिट करें",
    btn_submitting: "अनुवाद और सत्यापन सक्रिय है...",
    success_title: "प्रस्ताव सफलतापूर्वक दर्ज किया गया!",
    success_receipt: "आपका आधिकारिक रसीद ट्रैकिंग आईडी:",
    success_category: "श्रेणी / सेक्टर",
    success_location: "स्थान",
    success_trust: "विश्वसनीयता सूचकांक",
    success_coordination: "अभियान सत्यापन",
    success_campaign_yes: "अभियान नियंत्रित",
    success_campaign_no: "यूनीक / अद्वितीय",
    success_footer: "आपके प्रस्ताव का अनुवाद, सत्यापन और वार्ड क्लस्टर मैपिंग पूरा हो चुका है। प्रगति की निगरानी के लिए ट्रैकिंग आईडी कॉपी करें।",
    tracker_title: "प्रस्ताव की स्थिति ट्रैक करें",
    tracker_desc: "प्रगति, नियोजन स्थिति और कार्यान्वयन अपडेट की जांच के लिए अपना आईडी दर्ज करें।",
    placeholder_tracker: "रसीद आईडी दर्ज करें (जैसे sub-init-1)",
    btn_track: "खोजें",
    timeline_step1: "१. शिकायत दर्ज की गई",
    timeline_step1_sub: "रसीद जनरेट की गई, अनुवाद पूरा हुआ।",
    timeline_step2: "२. सत्यापित और एकीकृत",
    timeline_step2_sub: "श्रेणी सत्यापन और क्लस्टर मैपिंग पूरी हुई।",
    timeline_step3: "३. सांसद मंजूरी और बजट आवंटन",
    timeline_step3_sub: "बुनियादी ढांचा सूचकांकों के आधार पर स्वीकृत किया गया।",
    timeline_step4: "४. कार्यान्वयन चरण",
    timeline_step4_sub: "वर्तमान परियोजना की स्थिति:",
    nic_compliance_title: "NIC सुरक्षा मानक अनुपालन",
    nic_compliance_desc: "सभी उपयोगकर्ता डेटा ट्रांजिट में एन्क्रिप्टेड और सुरक्षित डेटाबेस क्लस्टर में रखे जाते हैं। स्पैम अभियान का पता लगाने और उसे रोकने के लिए फिल्टर सक्रिय हैं। पारदर्शिता के लिए सभी निर्णय लॉग किए जाते हैं।",
    footer_text: "© २०२६ निर्वाचन क्षेत्र विकास पोर्टल। राष्ट्रीय सूचना विज्ञान केंद्र (NIC) मानक।"
  }
};

export default function CitizenPortal() {
  // Multilingual active state
  const [currentLang, setCurrentLang] = useState('en'); // en, mr, hi
  const t = LANG_DICTS[currentLang];

  // Submission Form State
  const [userName, setUserName] = useState('');
  const [suggestionText, setSuggestionText] = useState('');
  const [gpsCoords, setGpsCoords] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('inactive'); // inactive, acquiring, active, failed
  const [dataConsent, setDataConsent] = useState(false);
  
  // Media Attachments
  const [voiceUrl, setVoiceUrl] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [imageScanning, setImageScanning] = useState(false);

  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);

  // Ingestion Processing States
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  // Tracking Panel State
  const [searchId, setSearchId] = useState('');
  const [trackedStatus, setTrackedStatus] = useState(null);
  const [trackError, setTrackError] = useState(null);

  // Initialize Web Speech API for voice note transcription
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        
        // Dynamically bind recognition language based on active state selection
        rec.lang = currentLang === 'mr' ? 'mr-IN' : (currentLang === 'hi' ? 'hi-IN' : 'en-IN');

        rec.onresult = (event) => {
          let interimTranscript = '';
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
            setSuggestionText(prev => prev ? `${prev} ${finalTranscript}` : finalTranscript);
          }
        };

        rec.onerror = (event) => {
          console.warn("Speech recognition service notification:", event.error);
          setIsRecording(false);
          
          if (event.error === 'not-allowed') {
            alert("Microphone Permission Required:\nPlease click the microphone icon in your browser's address bar and select 'Allow' to enable voice input.");
          } else if (event.error === 'audio-capture') {
            alert("Microphone Capture Error:\nNo microphone hardware was detected. Please connect a mic and try again.");
          } else if (event.error === 'no-speech') {
            console.log("Speech recognition: No speech detected (user paused).");
          } else if (event.error === 'network') {
            console.warn("Speech recognition: Network error occurred.");
          }
        };

        rec.onend = () => {
          setIsRecording(false);
        };

        setRecognition(rec);
      }
    }
  }, [currentLang]);

  // Request browser GPS position
  const handleGPSAcquisition = () => {
    if (!navigator.geolocation) {
      setGpsStatus('failed');
      return;
    }
    setGpsStatus('acquiring');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        setGpsStatus('active');
      },
      (err) => {
        console.error(err);
        setGpsStatus('failed');
      }
    );
  };

  // Toggle voice recorder
  const toggleRecording = () => {
    if (!recognition) {
      alert("Voice speech recognition is not supported on this browser. Please type your query.");
      return;
    }
    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
      setVoiceUrl('/mock-voice.mp3'); // Mock audio file
    } else {
      setIsRecording(true);
      recognition.start();
    }
  };

  // Mock OCR scanning on photo upload
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageScanning(true);
      setTimeout(() => {
        setImageUrl('/mock-photo.jpg'); 
        setImageScanning(false);
        setSuggestionText(prev => {
          const append = " [Photo Scan OCR: Water pipe leakage and pooling water on street]";
          return prev ? prev + append : "Water leakage and pipeline damage on main street." + append;
        });
      }, 1200);
    }
  };

  // Post suggestion to API
  const handleSubmitSuggestion = async (e) => {
    e.preventDefault();
    if (!userName.trim() || !suggestionText.trim()) {
      alert("Please enter your name and suggestion details.");
      return;
    }
    if (!dataConsent) {
      alert("Please check the security declaration and consent checkbox to submit.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_name: userName,
          raw_text: suggestionText,
          audio_url: voiceUrl,
          image_url: imageUrl,
          channel: voiceUrl ? 'Voice Note' : (imageUrl ? 'OCR Image' : 'Web Form'),
          gps_lat: gpsCoords?.lat,
          gps_lng: gpsCoords?.lng
        })
      });
      const data = await res.json();
      if (data.success) {
        setSubmitResult(data);
        // Reset form
        setSuggestionText('');
        setVoiceUrl(null);
        setImageUrl(null);
        setGpsCoords(null);
        setGpsStatus('inactive');
        setDataConsent(false);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to submit. Check server connection.");
    } finally {
      setSubmitting(false);
    }
  };

  // Lookup submission state by ID
  const handleTrackSubmission = async (e) => {
    e.preventDefault();
    if (!searchId.trim()) return;

    setTrackError(null);
    setTrackedStatus(null);

    try {
      const { supabase } = await import('@/lib/supabase');
      // 1. Fetch submission details
      const { data: sub } = await supabase
        .from('submissions')
        .select('*')
        .eq('id', searchId.trim())
        .limit(1);

      if (!sub || sub.length === 0) {
        setTrackError("Suggestion ID not found. Please verify the ID format.");
        return;
      }

      // 2. Fetch parsed issue status
      const { data: issue } = await supabase
        .from('extracted_issues')
        .select('*')
        .eq('submission_id', searchId.trim())
        .limit(1);

      // 3. Fetch project status
      const { data: mapping } = await supabase
        .from('cluster_mappings')
        .select('cluster_id')
        .eq('submission_id', searchId.trim())
        .limit(1);

      let projectStatus = 'Proposed';
      let projectTitle = '';
      if (mapping && mapping[0]) {
        const { data: proj } = await supabase
          .from('projects')
          .select('status, title')
          .eq('cluster_id', mapping[0].cluster_id)
          .limit(1);
        if (proj && proj[0]) {
          projectStatus = proj[0].status;
          projectTitle = proj[0].title;
        }
      }

      setTrackedStatus({
        submission: sub[0],
        issue: issue ? issue[0] : null,
        projectStatus,
        projectTitle
      });

    } catch (e) {
      console.error("Tracking lookup error:", e);
      setTrackError("Database lookup failed.");
    }
  };

  const loadMarathiDemo = () => {
    setUserName("Priya Shinde");
    setSuggestionText("Ward 3 madhe shala khup choti ahe, mulanna basayla jaaga nahi. Navin kholya banva.");
    setGpsCoords({ lat: 18.488, lng: 73.896 });
    setGpsStatus('active');
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 text-slate-900 font-sans min-h-screen">
      
      {/* Top Ashoka Stripe */}
      <div className="h-2 w-full bg-gradient-to-r from-[#f97316] via-white to-[#16a34a]"></div>

      {/* Official Government Header */}
      <header className="border-b border-slate-200 bg-white px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg" 
            alt="National Emblem of India" 
            className="h-16 w-auto object-contain shrink-0 py-0.5"
          />
          <div>
            <h1 className="text-xl font-extrabold text-blue-900 tracking-tight">
              {t.header_title}
            </h1>
            <h2 className="text-md font-bold text-slate-700">
              {t.header_subtitle}
            </h2>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{t.header_org}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {/* Multilingual Selector Toggles */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-300">
            <button
              onClick={() => setCurrentLang('en')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition ${
                currentLang === 'en' ? 'bg-blue-900 text-white shadow-sm' : 'text-slate-650 hover:text-slate-900'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setCurrentLang('mr')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition ${
                currentLang === 'mr' ? 'bg-blue-900 text-white shadow-sm' : 'text-slate-650 hover:text-slate-900'
              }`}
            >
              मराठी
            </button>
            <button
              onClick={() => setCurrentLang('hi')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition ${
                currentLang === 'hi' ? 'bg-blue-900 text-white shadow-sm' : 'text-slate-650 hover:text-slate-900'
              }`}
            >
              हिन्दी
            </button>
          </div>

          <Link
            href="/mp"
            className="text-sm bg-blue-900 hover:bg-blue-800 text-white font-extrabold px-5 py-2.5 rounded-xl shadow-md transition"
          >
            {t.btn_mp_workspace}
          </Link>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-6 lg:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        
        {/* LEFT COLUMN: Input Form */}
        <section className="bg-white border border-slate-200 p-6 rounded-2xl shadow-md space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-lg font-black text-blue-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#f97316]" />
              {t.form_title}
            </h2>
            <p className="text-xs text-slate-500 mt-1">{t.form_desc}</p>
          </div>

          <form onSubmit={handleSubmitSuggestion} className="space-y-4">
            
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <User className="h-4 w-4 text-slate-500" />
                {t.label_name} <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder={t.placeholder_name}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-900 focus:bg-white transition"
                required
              />
            </div>

            {/* Suggestion Text */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-700">
                  {t.label_suggestion} <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={loadMarathiDemo}
                  className="text-xs text-blue-900 hover:text-blue-700 font-extrabold underline"
                >
                  {t.demo_scenario}
                </button>
              </div>
              <textarea 
                rows="4"
                value={suggestionText}
                onChange={(e) => setSuggestionText(e.target.value)}
                placeholder={t.placeholder_suggestion}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-900 focus:bg-white transition"
                required
              />
            </div>

            {/* Media Attachment buttons */}
            <div className="flex items-center gap-3">
              {/* Voice Note Recording Button */}
              <button
                type="button"
                onClick={toggleRecording}
                className={`flex-1 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                  isRecording 
                    ? 'bg-rose-50 border-rose-300 text-rose-600 animate-pulse' 
                    : voiceUrl 
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {isRecording ? t.btn_voice_active : voiceUrl ? t.btn_voice_attached : t.btn_voice_start}
              </button>

              {/* Photo Upload Trigger */}
              <label className={`flex-1 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition ${
                imageScanning 
                  ? 'bg-amber-50 border-amber-300 text-amber-600' 
                  : imageUrl 
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}>
                <Image className="h-4 w-4" />
                <span>{imageScanning ? t.btn_photo_scanning : imageUrl ? t.btn_photo_attached : t.btn_photo_scan}</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handlePhotoUpload} 
                  className="hidden" 
                  disabled={imageScanning}
                />
              </label>
            </div>

            {/* GPS verification block */}
            <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <MapPin className={`h-5 w-5 ${gpsStatus === 'active' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">{t.label_gps}</span>
                  <span className="text-[10px] text-slate-500 block">{t.label_gps_desc}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleGPSAcquisition}
                disabled={gpsStatus === 'acquiring' || gpsStatus === 'active'}
                className={`px-4 py-2 rounded-lg text-xs font-extrabold transition ${
                  gpsStatus === 'active' 
                    ? 'bg-emerald-100 border border-emerald-300 text-emerald-700' 
                    : gpsStatus === 'acquiring'
                      ? 'bg-slate-200 text-slate-500 animate-pulse'
                      : 'bg-blue-900 hover:bg-blue-800 text-white shadow-sm'
                }`}
              >
                {gpsStatus === 'active' ? t.btn_gps_active : gpsStatus === 'acquiring' ? t.btn_gps_loading : t.btn_gps}
              </button>
            </div>

            {/* Security Declaration Checklist & Consent */}
            <div className="bg-blue-50/50 border border-blue-200 p-4 rounded-xl space-y-2">
              <div className="flex items-start gap-2.5">
                <input 
                  type="checkbox" 
                  id="consentCheckbox"
                  checked={dataConsent}
                  onChange={(e) => setDataConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-900 focus:ring-blue-900"
                />
                <label htmlFor="consentCheckbox" className="text-xs text-slate-700 leading-relaxed font-semibold cursor-pointer">
                  {t.security_declaration}
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#f97316] hover:bg-[#e06317] text-white font-black text-base py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-md transition"
            >
              {submitting ? (
                <>
                  <Activity className="h-5 w-5 animate-spin" />
                  {t.btn_submitting}
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  {t.btn_submit}
                </>
              )}
            </button>
          </form>

          {/* Submission Success Alert */}
          {submitResult && (
            <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-xl space-y-3 animate-in fade-in duration-300">
              <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-sm">
                <CheckCircle className="h-5 w-5 shrink-0" />
                <span>{t.success_title}</span>
              </div>
              <div className="text-sm space-y-2 bg-white p-3.5 rounded-lg border border-slate-200">
                <div>
                  <span className="text-xs text-slate-500 font-bold">{t.success_receipt}</span>
                  <code className="text-slate-900 font-mono font-bold select-all block py-1.5 text-sm border-b border-slate-100">{submitResult.submission_id}</code>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 pt-1.5">
                  <p>{t.success_category}: <strong className="text-slate-950 uppercase">{submitResult.parsed.category}</strong></p>
                  <p>{t.success_location}: <strong className="text-slate-950">Ward {submitResult.parsed.ward_id || 'Pool'}</strong></p>
                  <p>{t.success_trust}: <strong className="text-emerald-700">{submitResult.parsed.trust_score.toFixed(1)}/10</strong></p>
                  <p>{t.success_coordination}: <strong className="text-slate-950">{submitResult.parsed.is_campaign ? t.success_campaign_yes : t.success_campaign_no}</strong></p>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {t.success_footer}
              </p>
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: Feedback & Tracker */}
        <div className="space-y-6">
          
          {/* Tracker Card */}
          <section className="bg-white border border-slate-200 p-6 rounded-2xl shadow-md space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-lg font-black text-blue-900 flex items-center gap-2">
                <Search className="h-5 w-5 text-[#f97316]" />
                {t.tracker_title}
              </h2>
              <p className="text-xs text-slate-500 mt-1">{t.tracker_desc}</p>
            </div>

            <form onSubmit={handleTrackSubmission} className="flex gap-2">
              <input 
                type="text" 
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder={t.placeholder_tracker}
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-base text-slate-950 placeholder-slate-400 focus:outline-none focus:border-blue-900 focus:bg-white transition"
              />
              <button
                type="submit"
                className="bg-blue-900 hover:bg-blue-800 text-white px-5 rounded-xl font-bold text-xs shadow-sm transition"
              >
                {t.btn_track}
              </button>
            </form>

            {trackError && (
              <p className="text-xs text-rose-600 text-center font-bold bg-rose-50 py-2 rounded-lg border border-rose-200">
                {trackError}
              </p>
            )}

            {/* Tracker Status Output Timeline */}
            {trackedStatus && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <p className="text-slate-650 font-bold">Proposal Sender: <strong className="text-slate-900">{trackedStatus.submission.user_name}</strong></p>
                  <p className="text-slate-650 italic">"{trackedStatus.submission.raw_text}"</p>
                  {trackedStatus.projectTitle && (
                    <p className="text-xs text-blue-900 pt-2 border-t border-slate-200 font-bold">
                      Cluster Node: {trackedStatus.projectTitle}
                    </p>
                  )}
                </div>

                {/* Timeline display */}
                <div className="space-y-4 pl-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
                  
                  {/* Status 1: Ingested */}
                  <div className="flex gap-3.5 relative">
                    <div className="h-3.5 w-3.5 rounded-full bg-emerald-600 border-4 border-white z-10 shrink-0 mt-0.5 shadow-sm"></div>
                    <div className="text-xs">
                      <h4 className="font-extrabold text-slate-900">{t.timeline_step1}</h4>
                      <p className="text-[10px] text-slate-500">{t.timeline_step1_sub}</p>
                    </div>
                  </div>

                  {/* Status 2: Grouped */}
                  <div className="flex gap-3.5 relative">
                    <div className={`h-3.5 w-3.5 rounded-full border-4 border-white z-10 shrink-0 mt-0.5 shadow-sm ${
                      trackedStatus.issue?.status === 'verified' ? 'bg-emerald-600' : 'bg-slate-350'
                    }`}></div>
                    <div className="text-xs">
                      <h4 className={`font-extrabold ${trackedStatus.issue?.status === 'verified' ? 'text-slate-900' : 'text-slate-400'}`}>
                        {t.timeline_step2}
                      </h4>
                      <p className="text-[10px] text-slate-500">{t.timeline_step2_sub}</p>
                    </div>
                  </div>

                  {/* Status 3: MP Review */}
                  <div className="flex gap-3.5 relative">
                    <div className={`h-3.5 w-3.5 rounded-full border-4 border-white z-10 shrink-0 mt-0.5 shadow-sm ${
                      (trackedStatus.projectStatus !== 'Proposed' && trackedStatus.projectStatus !== 'Rejected') ? 'bg-emerald-600' : 'bg-slate-350'
                    }`}></div>
                    <div className="text-xs">
                      <h4 className={`font-extrabold ${
                        (trackedStatus.projectStatus !== 'Proposed' && trackedStatus.projectStatus !== 'Rejected') ? 'text-slate-900' : 'text-slate-400'
                      }`}>
                        {t.timeline_step3}
                      </h4>
                      <p className="text-[10px] text-slate-500">{t.timeline_step3_sub}</p>
                    </div>
                  </div>

                  {/* Status 4: Tendering & Construction */}
                  <div className="flex gap-3.5 relative">
                    <div className={`h-3.5 w-3.5 rounded-full border-4 border-white z-10 shrink-0 mt-0.5 shadow-sm ${
                      ['Tendering', 'Construction', 'Completed'].includes(trackedStatus.projectStatus) ? 'bg-emerald-600' : 'bg-slate-350'
                    }`}></div>
                    <div className="text-xs">
                      <h4 className={`font-extrabold ${
                        ['Tendering', 'Construction', 'Completed'].includes(trackedStatus.projectStatus) ? 'text-slate-900' : 'text-slate-400'
                      }`}>
                        {t.timeline_step4}
                      </h4>
                      <p className="text-[10px] text-slate-500">{t.timeline_step4_sub} <strong>{trackedStatus.projectStatus}</strong></p>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </section>

          {/* Secure Audit Information Card */}
          <section className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-3">
            <h3 className="font-extrabold text-xs text-blue-900 uppercase tracking-wider flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#f97316]" />
              {t.nic_compliance_title}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
              {t.nic_compliance_desc}
            </p>
          </section>

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500 bg-white shadow-inner">
        <p>{t.footer_text}</p>
      </footer>

    </div>
  );
}
