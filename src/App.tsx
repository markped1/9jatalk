import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';import {
  MessageSquare, CircleDashed, Phone, Video, MoreVertical, Search, Plus,
  Send, Smile, Paperclip, Check, CheckCheck, ArrowLeft, X, Mic,
  Video as VideoIcon, PhoneOff, Square, Volume2, VolumeX, Settings,
  Bell, Lock, User as UserIcon, Shield, HelpCircle, Database, Users,
  Laptop, Smartphone, Trash2, Sparkles
} from 'lucide-react';
import Peer from 'simple-peer';
import {
  startCall as agoraStartCall,
  endCall as agoraEndCall,
  toggleMuteAudio as agoraToggleMuteAudio,
  toggleMuteVideo as agoraToggleMuteVideo,
  getCallChannel,
  playLocalVideo
} from './services/agora';
import {
  sendOTP, verifyOTP, onAuthChange, getUserProfile, updateUserProfile,
  searchUserByPhone, setOnline,
  getChatId, sendMessage as fbSendMessage, listenMessages, listenUserChats,
  markMessagesRead, markMessagesDelivered, reactToMessage, setTyping, listenTyping,
  postStatus, listenStatuses, createGroup, getGroupMembers,
  listenUserGroups, sendSignal, listenSignals, uploadFile,
  getAiSuggestions, translateText, auth
} from './services/firebase';
import type { ConfirmationResult } from 'firebase/auth';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type Message = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
  type?: 'text' | 'image' | 'audio' | 'video';
  reactions?: Record<string, string>;
  expiresAt?: number | null;
  isGroup?: boolean;
};

type Chat = {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  online?: boolean;
  typing?: boolean;
  isGroup?: boolean;
  disappearingTimer?: number;
};

// â”€â”€â”€ App â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function App() {
    // Country selector and phone input for signup
    const [country, setCountry] = useState({ name: 'Nigeria', code: '+234' });
    const [countrySearch, setCountrySearch] = useState('');
    const [showCountryDropdown, setShowCountryDropdown] = useState(false);
    const [rawPhone, setRawPhone] = useState('');
    // Full country list (ISO 3166, name, code)
    // Full country list (ISO 3166, name, code) - exhaustive and robust for search
    const countryOptions = [
      { name: 'Afghanistan', code: '+93' },
      { name: 'Albania', code: '+355' },
      { name: 'Algeria', code: '+213' },
      { name: 'Andorra', code: '+376' },
      { name: 'Angola', code: '+244' },
      { name: 'Antigua and Barbuda', code: '+1-268' },
      { name: 'Argentina', code: '+54' },
      { name: 'Armenia', code: '+374' },
      { name: 'Australia', code: '+61' },
      { name: 'Austria', code: '+43' },
      { name: 'Azerbaijan', code: '+994' },
      { name: 'Bahamas', code: '+1-242' },
      { name: 'Bahrain', code: '+973' },
      { name: 'Bangladesh', code: '+880' },
      { name: 'Barbados', code: '+1-246' },
      { name: 'Belarus', code: '+375' },
      { name: 'Belgium', code: '+32' },
      { name: 'Belize', code: '+501' },
      { name: 'Benin', code: '+229' },
      { name: 'Bhutan', code: '+975' },
      { name: 'Bolivia', code: '+591' },
      { name: 'Bosnia and Herzegovina', code: '+387' },
      { name: 'Botswana', code: '+267' },
      { name: 'Brazil', code: '+55' },
      { name: 'Brunei', code: '+673' },
      { name: 'Bulgaria', code: '+359' },
      { name: 'Burkina Faso', code: '+226' },
      { name: 'Burundi', code: '+257' },
      { name: 'Cabo Verde', code: '+238' },
      { name: 'Cambodia', code: '+855' },
      { name: 'Cameroon', code: '+237' },
      { name: 'Canada', code: '+1' },
      { name: 'Central African Republic', code: '+236' },
      { name: 'Chad', code: '+235' },
      { name: 'Chile', code: '+56' },
      { name: 'China', code: '+86' },
      { name: 'Colombia', code: '+57' },
      { name: 'Comoros', code: '+269' },
      { name: 'Congo', code: '+242' },
      { name: 'Congo (DRC)', code: '+243' },
      { name: 'Costa Rica', code: '+506' },
      { name: 'Croatia', code: '+385' },
      { name: 'Cuba', code: '+53' },
      { name: 'Cyprus', code: '+357' },
      { name: 'Czechia', code: '+420' },
      { name: 'Denmark', code: '+45' },
      { name: 'Djibouti', code: '+253' },
      { name: 'Dominica', code: '+1-767' },
      { name: 'Dominican Republic', code: '+1-809' },
      { name: 'Ecuador', code: '+593' },
      { name: 'Egypt', code: '+20' },
      { name: 'El Salvador', code: '+503' },
      { name: 'Equatorial Guinea', code: '+240' },
      { name: 'Eritrea', code: '+291' },
      { name: 'Estonia', code: '+372' },
      { name: 'Eswatini', code: '+268' },
      { name: 'Ethiopia', code: '+251' },
      { name: 'Fiji', code: '+679' },
      { name: 'Finland', code: '+358' },
      { name: 'France', code: '+33' },
      { name: 'Gabon', code: '+241' },
      { name: 'Gambia', code: '+220' },
      { name: 'Georgia', code: '+995' },
      { name: 'Germany', code: '+49' },
      { name: 'Ghana', code: '+233' },
      { name: 'Greece', code: '+30' },
      { name: 'Grenada', code: '+1-473' },
      { name: 'Guatemala', code: '+502' },
      { name: 'Guinea', code: '+224' },
      { name: 'Guinea-Bissau', code: '+245' },
      { name: 'Guyana', code: '+592' },
      { name: 'Haiti', code: '+509' },
      { name: 'Honduras', code: '+504' },
      { name: 'Hungary', code: '+36' },
      { name: 'Iceland', code: '+354' },
      { name: 'India', code: '+91' },
      { name: 'Indonesia', code: '+62' },
      { name: 'Iran', code: '+98' },
      { name: 'Iraq', code: '+964' },
      { name: 'Ireland', code: '+353' },
      { name: 'Israel', code: '+972' },
      { name: 'Italy', code: '+39' },
      { name: 'Jamaica', code: '+1-876' },
      { name: 'Japan', code: '+81' },
      { name: 'Jordan', code: '+962' },
      { name: 'Kazakhstan', code: '+7' },
      { name: 'Kenya', code: '+254' },
      { name: 'Kiribati', code: '+686' },
      { name: 'Kuwait', code: '+965' },
      { name: 'Kyrgyzstan', code: '+996' },
      { name: 'Laos', code: '+856' },
      { name: 'Latvia', code: '+371' },
      { name: 'Lebanon', code: '+961' },
      { name: 'Lesotho', code: '+266' },
      { name: 'Liberia', code: '+231' },
      { name: 'Libya', code: '+218' },
      { name: 'Liechtenstein', code: '+423' },
      { name: 'Lithuania', code: '+370' },
      { name: 'Luxembourg', code: '+352' },
      { name: 'Madagascar', code: '+261' },
      { name: 'Malawi', code: '+265' },
      { name: 'Malaysia', code: '+60' },
      { name: 'Maldives', code: '+960' },
      { name: 'Mali', code: '+223' },
      { name: 'Malta', code: '+356' },
      { name: 'Marshall Islands', code: '+692' },
      { name: 'Mauritania', code: '+222' },
      { name: 'Mauritius', code: '+230' },
      { name: 'Mexico', code: '+52' },
      { name: 'Micronesia', code: '+691' },
      { name: 'Moldova', code: '+373' },
      { name: 'Monaco', code: '+377' },
      { name: 'Mongolia', code: '+976' },
      { name: 'Montenegro', code: '+382' },
      { name: 'Morocco', code: '+212' },
      { name: 'Mozambique', code: '+258' },
      { name: 'Myanmar', code: '+95' },
      { name: 'Namibia', code: '+264' },
      { name: 'Nauru', code: '+674' },
      { name: 'Nepal', code: '+977' },
      { name: 'Netherlands', code: '+31' },
      { name: 'New Zealand', code: '+64' },
      { name: 'Nicaragua', code: '+505' },
      { name: 'Niger', code: '+227' },
      { name: 'Nigeria', code: '+234' },
      { name: 'North Korea', code: '+850' },
      { name: 'North Macedonia', code: '+389' },
      { name: 'Norway', code: '+47' },
      { name: 'Oman', code: '+968' },
      { name: 'Pakistan', code: '+92' },
      { name: 'Palau', code: '+680' },
      { name: 'Palestine', code: '+970' },
      { name: 'Panama', code: '+507' },
      { name: 'Papua New Guinea', code: '+675' },
      { name: 'Paraguay', code: '+595' },
      { name: 'Peru', code: '+51' },
      { name: 'Philippines', code: '+63' },
      { name: 'Poland', code: '+48' },
      { name: 'Portugal', code: '+351' },
      { name: 'Qatar', code: '+974' },
      { name: 'Romania', code: '+40' },
      { name: 'Russia', code: '+7' },
      { name: 'Rwanda', code: '+250' },
      { name: 'Saint Kitts and Nevis', code: '+1-869' },
      { name: 'Saint Lucia', code: '+1-758' },
      { name: 'Saint Vincent and the Grenadines', code: '+1-784' },
      { name: 'Samoa', code: '+685' },
      { name: 'San Marino', code: '+378' },
      { name: 'Sao Tome and Principe', code: '+239' },
      { name: 'Saudi Arabia', code: '+966' },
      { name: 'Senegal', code: '+221' },
      { name: 'Serbia', code: '+381' },
      { name: 'Seychelles', code: '+248' },
      { name: 'Sierra Leone', code: '+232' },
      { name: 'Singapore', code: '+65' },
      { name: 'Slovakia', code: '+421' },
      { name: 'Slovenia', code: '+386' },
      { name: 'Solomon Islands', code: '+677' },
      { name: 'Somalia', code: '+252' },
      { name: 'South Africa', code: '+27' },
      { name: 'South Korea', code: '+82' },
      { name: 'South Sudan', code: '+211' },
      { name: 'Spain', code: '+34' },
      { name: 'Sri Lanka', code: '+94' },
      { name: 'Sudan', code: '+249' },
      { name: 'Suriname', code: '+597' },
      { name: 'Sweden', code: '+46' },
      { name: 'Switzerland', code: '+41' },
      { name: 'Syria', code: '+963' },
      { name: 'Taiwan', code: '+886' },
      { name: 'Tajikistan', code: '+992' },
      { name: 'Tanzania', code: '+255' },
      { name: 'Thailand', code: '+66' },
      { name: 'Timor-Leste', code: '+670' },
      { name: 'Togo', code: '+228' },
      { name: 'Tonga', code: '+676' },
      { name: 'Trinidad and Tobago', code: '+1-868' },
      { name: 'Tunisia', code: '+216' },
      { name: 'Turkey', code: '+90' },
      { name: 'Turkmenistan', code: '+993' },
      { name: 'Tuvalu', code: '+688' },
      { name: 'Uganda', code: '+256' },
      { name: 'Ukraine', code: '+380' },
      { name: 'United Arab Emirates', code: '+971' },
      { name: 'United Kingdom', code: '+44' },
      { name: 'United States', code: '+1' },
      { name: 'Uruguay', code: '+598' },
      { name: 'Uzbekistan', code: '+998' },
      { name: 'Vanuatu', code: '+678' },
      { name: 'Vatican City', code: '+39' },
      { name: 'Venezuela', code: '+58' },
      { name: 'Vietnam', code: '+84' },
      { name: 'Yemen', code: '+967' },
      { name: 'Zambia', code: '+260' },
      { name: 'Zimbabwe', code: '+263' },
    ];
    // Robust search: match by name or code, ignore case, ignore spaces, ignore dashes
    const filteredCountries = countryOptions.filter(c => {
      const search = countrySearch.toLowerCase().replace(/[^\d\w+]/g, '');
      const name = c.name.toLowerCase().replace(/[^\d\w+]/g, '');
      const code = c.code.replace(/[^\d+]/g, '');
      return name.includes(search) || code.includes(search.replace(/[^\d+]/g, ''));
    });
    // Combine country code and phone for OTP
    useEffect(() => {
      setPhoneNumber(country.code + rawPhone);
    }, [country, rawPhone]);
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState('chats');

  // Dismiss splash after 2.5 seconds
  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(t);
  }, []);

  // ─── Android Runtime Permissions ──────────────────────────────────────────────

  // Improved permission check for camera/mic
  const requestMediaPermissions = async (needsVideo: boolean = false): Promise<boolean> => {
    try {
      // Check if we're on native platform (Android/iOS via Capacitor)
      const isNative = (window as any).Capacitor?.isNativePlatform?.() ||
        (window as any).Capacitor?.platform === 'android' ||
        (window as any).Capacitor?.platform === 'ios';

      if (isNative) {
        try {
          const { Camera, Microphone } = (window as any).Capacitor?.Plugins || {};
          // Request microphone permission
          if (Microphone) {
            const micStatus = await Microphone.requestPermissions();
            if (micStatus?.microphone === 'denied') return false;
          }
          // Request camera permission if needed
          if (needsVideo && Camera) {
            const camStatus = await Camera.requestPermissions();
            if (camStatus?.camera === 'denied') return false;
          }
          // On native, permissions are handled by the OS — return true after requesting
          return true;
        } catch (e) {
          // If Capacitor plugins fail, fall through to browser getUserMedia
        }
      }

      // Browser path: use getUserMedia to trigger the permission prompt
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: needsVideo });
        // Stop all tracks immediately — we only needed the permission grant
        stream.getTracks().forEach(t => t.stop());
        return true;
      } catch (err: any) {
        // NotAllowedError means denied; other errors (NotFoundError etc.) we still allow through
        if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') return false;
        return true;
      }
    } catch (err) {
      return false;
    }
  };

  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [otpError, setOtpError] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0);

  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, string>>({});

  const [statuses, setStatuses] = useState<any[]>([]);
  const [viewingStatus, setViewingStatus] = useState<any | null>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'account' | 'privacy' | 'notifications' | 'backup'>('account');

  const [showNewChat, setShowNewChat] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [newChatNumber, setNewChatNumber] = useState('');
  const [groupName, setGroupName] = useState('');
  const [chatMembers, setChatMembers] = useState<any[]>([]);

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => setOtpCooldown((prev) => Math.max(prev - 1, 0)), 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  // Reset states when switching login methods
  useEffect(() => {
    setPhoneNumber('');
    setEmail('');
    setPassword('');
    setDisplayName('');
    setOtpSent(false);
    setOtp('');
    setOtpError('');
    setConfirmationResult(null);
  }, [loginMethod]);
  const [showMembers, setShowMembers] = useState(false);

  const [isPrivacyProtected, setIsPrivacyProtected] = useState(false);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // Calls - using Agora SDK
  const [calling, setCalling] = useState<{
    type: 'voice' | 'video'; active: boolean; incoming?: boolean;
    remoteId?: string; groupId?: string; signal?: any;
    transport?: 'webrtc' | 'agora';
  } | null>(null);
  const [callTransport, setCallTransport] = useState<'webrtc' | 'agora' | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showEffectsBar, setShowEffectsBar] = useState(false);
  const [videoEffects, setVideoEffects] = useState({
    brightness: 100, contrast: 100, saturate: 100, sepia: 0, blur: 0, hueRotate: 0
  });
  const videoEffectsRef = useRef(videoEffects);
  useEffect(() => { videoEffectsRef.current = videoEffects; }, [videoEffects]);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [processedStream, setProcessedStream] = useState<MediaStream | null>(null);
  const peersRef = useRef<Map<string, any>>(new Map());
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const processingVideoRef = useRef<HTMLVideoElement | null>(null);
  const processingLoopRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [remoteVideoUsers, setRemoteVideoUsers] = useState<Map<string, any>>(new Map());
  const localVideoContainerRef = useRef<HTMLDivElement>(null);

  // Unsubscribe refs
  const unsubMessages = useRef<(() => void) | null>(null);
  const unsubTyping = useRef<(() => void) | null>(null);
  const unsubSignals = useRef<(() => void) | null>(null);

  // â”€â”€â”€ Auth state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      if (!user) return;

      // Always enable signaling for this user as soon as auth is ready.
      // Profile can be missing temporarily; that must not block call reception.
      setUserId(user.uid);
      setupSignalListener(user.uid);

      const profile = await getUserProfile(user.uid);
      if (profile) {
        setUserProfile(profile);
        setOnline(user.uid);
      }
    });
    return () => unsub();
  }, []);

  // â”€â”€â”€ Privacy protection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    if (!userProfile?.screenshotProtection) { setIsPrivacyProtected(false); return; }
    const onBlur = () => setIsPrivacyProtected(true);
    const onFocus = () => setIsPrivacyProtected(false);
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p')) {
        e.preventDefault();
        alert('Screen capture is restricted.');
      }
    };
    const onCtx = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName !== 'INPUT' && t.tagName !== 'TEXTAREA') e.preventDefault();
    };
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    window.addEventListener('keydown', onKey);
    window.addEventListener('contextmenu', onCtx);
    return () => {
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('contextmenu', onCtx);
    };
  }, [userProfile?.screenshotProtection]);

  // â”€â”€â”€ Load chats (support bot + groups) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    if (!userId) return;

    // Always show support chat
    const supportChat: Chat = {
      id: 'support',
      name: '9jaTalk Support',
      avatar: 'https://i.pravatar.cc/150?u=support',
      lastMessage: 'Welcome to 9jaTalk!',
      time: '10:00 AM',
      unread: 0,
      online: true
    };
    setChats([supportChat]);

    // Listen to incoming chats from other users
    const unsubUserChats = listenUserChats(userId, (incomingChats: Chat[]) => {
      setChats((prev: Chat[]) => {
        const groups = prev.filter((c: Chat) => c.isGroup);
        const support = prev.find((c: Chat) => c.id === 'support') || supportChat;
        // Merge incoming chats, avoid duplicates
        const merged = [support, ...incomingChats.filter((c: Chat) => c.id !== 'support'), ...groups];
        return merged;
      });
    });

    // Listen to groups
    const unsub = listenUserGroups(userId, (groups: any[]) => {
      const groupChats: Chat[] = groups.map((g: any) => ({
        id: g.id,
        name: g.name,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(g.name)}&background=008751&color=fff`,
        lastMessage: g.lastMessage || 'Group created',
        time: g.lastMessageTime ? new Date(g.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        unread: 0,
        isGroup: true
      }));
      setChats((prev: Chat[]) => {
        const nonGroup = prev.filter((c: Chat) => !c.isGroup);
        return [...nonGroup, ...groupChats];
      });
    });
    return () => { unsub(); unsubUserChats(); };
  }, [userId]);

  // ─── Mark messages as delivered when user is online ───────────────────────
  // Fires whenever the chat list updates — marks all received messages as
  // 'delivered' (double gray tick) even if the user hasn't opened the chat yet.
  useEffect(() => {
    if (!userId || chats.length === 0) return;
    chats.forEach((chat: Chat) => {
      if (chat.isGroup) return;
      const chatId = getChatId(userId, chat.id);
      markMessagesDelivered(chatId, userId).catch(() => {});
    });
  }, [chats.length, userId]);

  // â”€â”€â”€ Statuses â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    const unsub = listenStatuses(setStatuses);
    return () => unsub();
  }, []);

  // â”€â”€â”€ Messages listener â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    if (!activeChat || !userId) return;
    unsubMessages.current?.();
    unsubTyping.current?.();

    const chatId = activeChat.isGroup
      ? activeChat.id
      : getChatId(userId, activeChat.id);

    unsubMessages.current = listenMessages(chatId, (msgs: Message[]) => {
      try {
        // Filter expired
        const now = Date.now();
        setMessages(msgs.filter((m: Message) => !m.expiresAt || m.expiresAt > now));
        // Mark messages as read — user is actively viewing this chat (turns green)
        markMessagesRead(chatId, userId);
        // Reset unread
        setChats((prev: Chat[]) => prev.map((c: Chat) => c.id === activeChat.id ? { ...c, unread: 0 } : c));
      } catch (err) {
        alert('Error receiving messages. Please check your connection.');
        console.error('Message listener error:', err);
      }
    });

    unsubTyping.current = listenTyping(chatId, userId, (typingUid: string | null) => {
      setChats((prev: Chat[]) => prev.map((c: Chat) =>
        c.id === activeChat.id ? { ...c, typing: !!typingUid } : c
      ));
    });

    return () => {
      try {
        unsubMessages.current?.();
        unsubTyping.current?.();
      } catch (err) {
        console.warn('Error cleaning up listeners:', err);
      }
    };
  }, [activeChat?.id, userId]);

  // â”€â”€â”€ Scroll to bottom â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // TypeScript helper types for callbacks
  type PrevChat = Chat[];
  type PrevMsg = Message[];

  // â”€â”€â”€ Local video ref â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = processedStream || localStream;
    }
  }, [localStream, processedStream, calling?.active]);

  // â”€â”€â”€ Group members â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    if (activeChat?.isGroup) {
      getGroupMembers(activeChat.id).then(setChatMembers);
    } else {
      setChatMembers([]);
    }
  }, [activeChat?.id]);

  // â”€â”€â”€ AI suggestions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!activeChat || messages.length === 0 || !userId) return;
      const last = messages[messages.length - 1];
      if (last.senderId === userId) { setAiSuggestions([]); return; }
      const lastFew = messages.slice(-5).map((m: Message) => m.content);
      const suggestions = await getAiSuggestions(lastFew);
      setAiSuggestions(suggestions);
    }, 1000);
    return () => clearTimeout(timer);
  }, [messages.length, activeChat?.id]);

  // â”€â”€â”€ Disappearing messages cleanup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    const interval = setInterval(() => {
      setMessages((prev: Message[]) => prev.filter((m: Message) => !m.expiresAt || m.expiresAt > Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // â”€â”€â”€ Recording timer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    let interval: any;
    if (isRecording) interval = setInterval(() => setRecordingDuration((d: number) => d + 1), 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  // â”€â”€â”€ WebRTC signal listener â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const setupSignalListener = (uid: string) => {
    unsubSignals.current?.();
    unsubSignals.current = listenSignals(uid, (signal) => {
      if (signal.type === 'call:incoming') {
        // Check if this is an answer from receiver (contains SDP) or new call invitation
        if (signal.payload.sdp && calling && !calling.incoming && calling.remoteId === signal.fromId) {
          // This is the receiver's answer - establish WebRTC connection
          createWebRTCCall(calling.type, signal.fromId, false, signal.payload.sdp);
        } else if (!calling || !calling.active) {
          // This is a new call invitation from caller with SDP
          // Play ring sound for incoming call
          try {
            const ctx = new AudioContext();
            const playRing = () => {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain); gain.connect(ctx.destination);
              osc.type = 'sine';
              osc.frequency.setValueAtTime(880, ctx.currentTime);
              osc.frequency.setValueAtTime(660, ctx.currentTime + 0.3);
              gain.gain.setValueAtTime(0.4, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
              osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.8);
            };
            playRing();
            const ringInterval = setInterval(playRing, 2000);
            (window as any)._ringInterval = ringInterval;
          } catch (e) {}

          // For video calls, request camera permission early
          if (signal.payload.callType === 'video') {
            requestMediaPermissions(true).then(async (hasPermission) => {
              if (hasPermission) {
                try {
                  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                  setLocalStream(stream);
                } catch (e) {
                  console.warn('Could not get camera for incoming video call');
                }
              }
            }).catch(() => {});
          }

          const transport = signal.payload.transport || 'webrtc';
          setCalling({
            active: true, incoming: true,
            type: signal.payload.callType,
            remoteId: signal.fromId,
            signal: transport === 'webrtc' ? signal.payload.sdp : signal.payload.channel,
            transport
          });
        }
      } else if (signal.type === 'call:answer') {
        // Stop ring
        if ((window as any)._ringInterval) { clearInterval((window as any)._ringInterval); (window as any)._ringInterval=null; }
        const peer = peersRef.current.get(signal.fromId);
        if (peer) peer.signal(signal.payload.sdp);
        setCalling((prev) => prev ? { ...prev, incoming: false } : null);
      } else if (signal.type === 'call:reject' || signal.type === 'call:end') {
        if ((window as any)._ringInterval) { clearInterval((window as any)._ringInterval); (window as any)._ringInterval = null; }
        cleanupCall();
      }
    });
  };

  const stopLocalStream = () => {
    localStream?.getTracks().forEach(t => t.stop());
    processedStream?.getTracks().forEach(t => t.stop());
  };

  const cleanupCall = async () => {
    if ((window as any)._ringInterval) { clearInterval((window as any)._ringInterval); (window as any)._ringInterval = null; }
    if ((window as any)._callTimeout) { clearTimeout((window as any)._callTimeout); (window as any)._callTimeout = null; }
    if (callTransport === 'agora') {
      try { await agoraEndCall(); } catch (e) {}
    }
    stopLocalStream();
    if (processingLoopRef.current) cancelAnimationFrame(processingLoopRef.current);
    if (processingVideoRef.current) { processingVideoRef.current.pause(); processingVideoRef.current.srcObject = null; }
    peersRef.current.forEach(p => {
      try { p.destroy(); } catch (e) {}
    });
    peersRef.current.clear();
    setLocalStream(null);
    setProcessedStream(null);
    setCalling(null);
    setCallTransport(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setRemoteVideoUsers(new Map());
    setRemoteStreams(new Map());
  };

  const joinAgoraChannel = async (channel: string, type: 'voice' | 'video') => {
    if (!userId) return;
    setCallTransport('agora');
    try {
      await agoraStartCall(channel, userId, type, {
        onUserJoined: (uid, audioTrack, videoTrack) => {
          if ((window as any)._ringInterval) { clearInterval((window as any)._ringInterval); (window as any)._ringInterval = null; }
          if (videoTrack) {
            setRemoteVideoUsers(prev => new Map(prev.set(String(uid), videoTrack)));
          }
        },
        onUserLeft: (uid) => {
          setRemoteVideoUsers(prev => { const m = new Map(prev); m.delete(String(uid)); return m; });
        },
        onError: (err) => {
          console.error('Agora error:', err);
          cleanupCall();
        }
      });
      if (type === 'video' && localVideoContainerRef.current) {
        playLocalVideo(localVideoContainerRef.current);
      }
    } catch (err) {
      console.error('Failed to join Agora channel:', err);
      cleanupCall();
    }
  };

  const startAgoraFallback = async (type: 'voice' | 'video', targetId: string) => {
    if (!userId) return;
    setCalling(prev => prev ? { ...prev, transport: 'agora' } : null);
    setCallTransport('agora');
    const channel = getCallChannel(userId, targetId);
    await sendSignal(userId, targetId, 'call:incoming', {
      callType: type,
      transport: 'agora',
      channel
    });
    await joinAgoraChannel(channel, type);
  };

  const createWebRTCCall = async (type: 'voice' | 'video', targetId: string, initiator: boolean, remoteSignal?: any) => {
    if (!userId) return;
    
    try {
      let rawStream = localStream;
      if (!rawStream) {
        // Request media permissions if not already done
        const hasPermission = await requestMediaPermissions(type === 'video');
        if (!hasPermission) {
          alert('Camera and microphone permissions are required for calls.');
          cleanupCall();
          return;
        }
        
        rawStream = await navigator.mediaDevices.getUserMedia({ video: type === 'video', audio: true });
        setLocalStream(rawStream);
      }
      
      const stream = rawStream;
      let connected = false;
      
      const peer = new Peer({ initiator, trickle: false, stream });
      
      peer.on('signal', (sdp: any) => {
        const signalType = initiator ? 'call:incoming' : 'call:answer';
        console.log('WebRTC signal sent:', signalType, 'from', userId, 'to', targetId);
        sendSignal(userId, targetId, signalType, {
          callType: type,
          transport: 'webrtc',
          sdp
        });
      });
      
      peer.on('connect', () => {
        console.log('WebRTC peer connected');
        connected = true;
        if ((window as any)._callTimeout) {
          clearTimeout((window as any)._callTimeout);
          (window as any)._callTimeout = null;
        }
        // Stop caller's ring when connected
        if ((window as any)._ringInterval) {
          clearInterval((window as any)._ringInterval);
          (window as any)._ringInterval = null;
        }
      });
      
      peer.on('stream', (remote: MediaStream) => {
        console.log('Remote stream received');
        setRemoteStreams(prev => new Map(prev.set(targetId, remote)));
      });
      
      peer.on('close', () => {
        console.log('WebRTC peer closed');
        peersRef.current.delete(targetId);
        if (peersRef.current.size === 0) {
          cleanupCall();
        }
      });
      
      peer.on('error', (err: any) => {
        console.error('WebRTC peer error:', err, 'connected:', connected);
        peersRef.current.delete(targetId);
        if (!connected && callTransport === 'webrtc') {
          console.log('Falling back to Agora after WebRTC error');
          startAgoraFallback(type, targetId);
        }
      });
      
      if (remoteSignal) {
        console.log('Signaling peer with remote SDP');
        peer.signal(remoteSignal);
      }
      
      peersRef.current.set(targetId, peer);
      
      // Set timeout for connection establishment (30 seconds)
      if (!(window as any)._callTimeout) {
        (window as any)._callTimeout = setTimeout(() => {
          if (!connected) {
            console.warn('WebRTC connection timeout, falling back to Agora');
            startAgoraFallback(type, targetId);
          }
        }, 30000);
      }
    } catch (err) {
      console.error('Failed to create WebRTC call:', err);
      cleanupCall();
    }
  };

  const initiateCall = async (type: 'voice' | 'video') => {
    if (!activeChat || !userId) return;
    if (activeChat.isGroup) {
      setCalling({ type, active: true, incoming: false, groupId: activeChat.id, transport: 'agora' });
      setCallTransport('agora');
      await startAgoraFallback(type, activeChat.id);
      return;
    }

    // Request media permissions and get stream for caller
    const hasPermission = await requestMediaPermissions(type === 'video');
    if (!hasPermission) {
      alert('Camera and microphone permissions are required for calls.');
      return;
    }
    
    const rawStream = await navigator.mediaDevices.getUserMedia({ video: type === 'video', audio: true });
    setLocalStream(rawStream);

    setCalling({ type, active: true, incoming: false, remoteId: activeChat.id, transport: 'webrtc' });
    setCallTransport('webrtc');

    // Create WebRTC call as initiator (caller creates offer)
    await createWebRTCCall(type, activeChat.id, true);
  };

  const answerCall = async () => {
    if (!calling?.remoteId || !userId) return;
    
    // Request permissions before answering
    const hasPermission = await requestMediaPermissions(calling.type === 'video');
    if (!hasPermission) {
      alert('Camera and microphone permissions are required for calls.');
      return;
    }
    
    if ((window as any)._ringInterval) { clearInterval((window as any)._ringInterval); (window as any)._ringInterval = null; }

    const transport = calling.transport || 'webrtc';
    setCalling(prev => prev ? { ...prev, incoming: false } : null);

    if (transport === 'agora') {
      const channel = calling.signal || getCallChannel(userId, calling.remoteId);
      await joinAgoraChannel(channel, calling.type);
      return;
    }

    // Create WebRTC call as receiver (initiator=false) and set remote signal
    await createWebRTCCall(calling.type, calling.remoteId, false, calling.signal);
  };

  const rejectCall = () => {
    if (calling?.remoteId && userId) sendSignal(userId, calling.remoteId, 'call:reject', {});
    cleanupCall();
  };

  const endCall = () => {
    if (calling?.remoteId && userId) sendSignal(userId, calling.remoteId, 'call:end', {});
    cleanupCall();
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (callTransport === 'agora') {
      agoraToggleMuteAudio(newMuted);
    } else {
      const audioTrack = localStream?.getAudioTracks()[0];
      if (audioTrack) audioTrack.enabled = !newMuted;
    }
  };

  const toggleVideo = () => {
    const newOff = !isVideoOff;
    setIsVideoOff(newOff);
    if (callTransport === 'agora') {
      agoraToggleMuteVideo(newOff);
    } else {
      const videoTrack = localStream?.getVideoTracks()[0];
      if (videoTrack) videoTrack.enabled = !newOff;
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (otpCooldown > 0) {
      setOtpError(`Too many requests. Please wait ${otpCooldown}s before retrying.`);
      return;
    }
    if (phoneNumber.length < 8) return;

    setLoginLoading(true);
    setOtpError('');

    try {
      const result = await sendOTP(phoneNumber, 'recaptcha-container');
      setConfirmationResult(result);
      setOtpSent(true);
      setOtpCooldown(60);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/too-many-requests' || code === 'auth/quota-exceeded') {
        setOtpError('Too many OTP requests. Please try again in a minute.');
        setOtpCooldown(60);
      } else if (code === 'auth/invalid-phone-number') {
        setOtpError('Invalid phone number format. Please use the correct country code and number.');
      } else if (code === 'auth/missing-phone-number') {
        setOtpError('Please enter your phone number.');
      } else {
        setOtpError('Unable to send OTP right now. Please try again later.');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // â”€â”€â”€ Login Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{backgroundImage:"url('/bg.png')",backgroundSize:'cover',backgroundPosition:'center'}}>
        {/* Wave decoration */}
        <div className="absolute bottom-0 left-0 right-0 h-32 overflow-hidden opacity-20">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-[200%] h-full wave1">
            <path d="M0,60 C150,100 350,0 600,60 C850,120 1050,20 1200,60 L1200,120 L0,120 Z" fill="white"/>
          </svg>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white/90 p-8 rounded-2xl shadow-xl w-full max-w-md text-center backdrop-blur-md"
        >
          <img src='/logo.png' className='w-36 h-36 object-contain mx-auto mb-2' style={{mixBlendMode:'multiply'}} alt='9jaTalk'/>

          <h1 className="text-2xl font-bold text-gray-800 mb-2">Welcome to 9jaTalk</h1>
          
          {/* Login Method Tabs */}
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setLoginMethod('phone')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${loginMethod === 'phone' ? 'bg-[#008751] text-white' : 'text-gray-600'}`}
            >
              Phone
            </button>
            <button
              onClick={() => setLoginMethod('email')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${loginMethod === 'email' ? 'bg-[#008751] text-white' : 'text-gray-600'}`}
            >
              Email
            </button>
          </div>

          {/* Only show recaptcha on login page, never in the app */}
          {!userId && <div id="recaptcha-container"></div>}
          
          {loginMethod === 'phone' ? (
            <>
              <p className="text-gray-500 mb-6">{otpSent ? 'Enter the OTP sent to ' + phoneNumber : 'Enter your phone number to get started'}</p>
              {!otpSent ? (
                <form onSubmit={handleSendOTP} className="space-y-4">
                  <input type="tel" placeholder="+234 801 234 5678" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#008751] transition-all text-lg" value={phoneNumber} onChange={e=>setPhoneNumber(e.target.value)}/>
                  {otpError && <p className="text-red-500 text-sm">{otpError}</p>}
                  {otpCooldown > 0 && (
                    <p className="text-xs text-yellow-600">Please wait {otpCooldown}s before requesting a new OTP.</p>
                  )}
                  <button type="submit" disabled={loginLoading || otpCooldown > 0} className="w-full bg-[#008751] text-white font-bold py-3 rounded-xl hover:bg-[#006b40] transition-colors shadow-lg disabled:opacity-60">
                    {loginLoading ? 'Sending OTP...' : otpCooldown > 0 ? `Wait ${otpCooldown}s` : 'Send OTP'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div className="flex gap-2 justify-center">
                    <input type="text" inputMode="numeric" maxLength={6} placeholder="Enter 6-digit OTP" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#008751] text-center text-2xl font-bold tracking-widest" value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,''))}/>
                  </div>
                  {otpError && <p className="text-red-500 text-sm">{otpError}</p>}
                  <button type="submit" disabled={loginLoading} className="w-full bg-[#008751] text-white font-bold py-3 rounded-xl hover:bg-[#006b40] transition-colors shadow-lg disabled:opacity-60">
                    {loginLoading ? 'Verifying...' : 'Verify OTP'}
                  </button>
                  <button type="button" onClick={()=>{setOtpSent(false);setOtp('');setOtpError('');}} className="w-full text-gray-500 text-sm py-2 hover:text-gray-700">
                    Change number
                  </button>
                </form>
              )}
            </>
          ) : (
            <>
              <p className="text-gray-500 mb-6">Enter your email and password to get started</p>
              {!otpSent ? (
                <form onSubmit={handleEmailSignUp} className="space-y-4">
                  <input type="text" placeholder="Display Name" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#008751] transition-all text-lg" value={displayName} onChange={e=>setDisplayName(e.target.value)}/>
                  <input type="email" placeholder="Email" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#008751] transition-all text-lg" value={email} onChange={e=>setEmail(e.target.value)}/>
                  <input type="password" placeholder="Password" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#008751] transition-all text-lg" value={password} onChange={e=>setPassword(e.target.value)}/>
                  {otpError && <p className="text-red-500 text-sm">{otpError}</p>}
                  <button type="submit" disabled={loginLoading} className="w-full bg-[#008751] text-white font-bold py-3 rounded-xl hover:bg-[#006b40] transition-colors shadow-lg disabled:opacity-60">
                    {loginLoading ? 'Signing Up...' : 'Sign Up'}
                  </button>
                  <button type="button" onClick={() => setOtpSent(true)} className="w-full text-gray-500 text-sm py-2 hover:text-gray-700">
                    Already have an account? Sign In
                  </button>
                </form>
              ) : (
                <form onSubmit={handleEmailSignIn} className="space-y-4">
                  <input type="email" placeholder="Email" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#008751] transition-all text-lg" value={email} onChange={e=>setEmail(e.target.value)}/>
                  <input type="password" placeholder="Password" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#008751] transition-all text-lg" value={password} onChange={e=>setPassword(e.target.value)}/>
                  {otpError && <p className="text-red-500 text-sm">{otpError}</p>}
                  <button type="submit" disabled={loginLoading} className="w-full bg-[#008751] text-white font-bold py-3 rounded-xl hover:bg-[#006b40] transition-colors shadow-lg disabled:opacity-60">
                    {loginLoading ? 'Signing In...' : 'Sign In'}
                  </button>
                  <button type="button" onClick={() => setOtpSent(false)} className="w-full text-gray-500 text-sm py-2 hover:text-gray-700">
                    Don't have an account? Sign Up
                  </button>
                  <button type="button" onClick={handlePasswordReset} className="w-full text-gray-400 text-xs py-1 hover:text-gray-600">
                    Forgot Password?
                  </button>
                </form>
              )}
            </>
          )}
          
          <p className="mt-6 text-xs text-gray-400">By continuing, you agree to our Terms of Service and Privacy Policy.</p>
          <p className="mt-4 text-[10px] text-green-400 animate-pulse">Designed by Thompson Obosa</p>
        </motion.div>
      </div>
    );
  }

  // Welcome screen after registration
  if (showWelcome) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{backgroundImage:"url('/bg.png')",backgroundSize:'cover',backgroundPosition:'center'}}>
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center"
        >
          <img src='/logo.png' className='w-36 h-36 object-contain mx-auto mb-4' style={{mixBlendMode:'multiply'}} alt='9jaTalk'/>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome!</h1>
          <p className="text-gray-500 mb-6">You're all set up. Let's start chatting!</p>
          <button onClick={() => setShowWelcome(false)} className="w-full bg-[#008751] text-white font-bold py-3 rounded-xl hover:bg-[#006b40] transition-colors shadow-lg">
            Start Chatting
          </button>
          <p className="mt-4 text-[10px] text-green-400 animate-pulse">Designed by Thompson Obosa</p>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      {/* ── SPLASH SCREEN ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#008751]"
          >
            <motion.img
              src="/logo.png"
              alt="9jaTalk"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 18 }}
              className="w-42 h-42 object-contain mb-6 drop-shadow-2xl"
            />
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-white text-3xl font-extrabold tracking-wide mb-2"
            >
              9jaTalk
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-green-200 text-sm mb-8"
            >
              Connect. Chat. Belong.
            </motion.p>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-8 h-8 border-4 border-white border-t-transparent rounded-full"
            />
            <p className="absolute bottom-6 text-green-300 text-xs animate-pulse">Designed by Thompson Obosa</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CALL OVERLAY ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {calling && calling.active && (
          <motion.div
            key="call-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9000] flex flex-col text-white"
            style={{
              background: 'radial-gradient(ellipse at top, #1a3a2a 0%, #0a1a10 60%, #000 100%)',
              touchAction: 'none'
            }}
          >
            {/* Remote video fullscreen background */}
            {calling.type === 'video' && (remoteStreams.size > 0 || remoteVideoUsers.size > 0) && (
              <div className="absolute inset-0">
                {remoteStreams.size > 0 ? (
                  Array.from(remoteStreams.entries()).map(([uid, stream]) => (
                    <video key={uid}
                      className="w-full h-full object-cover"
                      autoPlay
                      playsInline
                      ref={(el) => { if (el) el.srcObject = stream; }}
                    />
                  ))
                ) : (
                  Array.from(remoteVideoUsers.entries()).map(([uid, videoTrack]) => (
                    <div key={uid} className="w-full h-full" ref={(el) => { if (el && videoTrack) videoTrack.play(el); }} />
                  ))
                )}
                <div className="absolute inset-0 bg-black/20" />
              </div>
            )}

            {/* Top bar */}
            <div className="relative z-10 flex items-center justify-between px-5 pt-12 pb-4">
              <div className="text-center flex-1">
                <h2 className="text-xl font-bold">{activeChat?.name || calling.remoteId}</h2>
                <p className="text-green-300 text-sm mt-0.5 flex items-center justify-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-400 inline-block animate-pulse" />
                  {calling.incoming ? ('Incoming ' + calling.type + ' call') : remoteStreams.size > 0 ? 'Connected' : 'Calling...'}
                </p>
              </div>
            </div>

            {/* Center avatar */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center">
              {calling.type === 'video' && !calling.incoming ? (
                <div className="relative w-full h-full">
                  <video ref={localVideoRef} autoPlay muted playsInline
                    className="w-full h-full object-cover" />
                  {isVideoOff && (
                    <div className="absolute inset-0 bg-[#0a1a10] flex items-center justify-center">
                      <div className="w-28 h-28 rounded-full bg-[#008751]/30 flex items-center justify-center text-5xl font-bold border-4 border-[#008751]/50">
                        {(activeChat?.name || '?').charAt(0).toUpperCase()}
                      </div>
                    </div>
                  )}
                </div>
              ) : calling.incoming && calling.type === 'video' && localStream ? (
                <div className="relative w-48 h-64 rounded-2xl overflow-hidden border-4 border-white/30">
                  <video autoPlay muted playsInline
                    className="w-full h-full object-cover"
                    ref={(el) => { if (el && localStream) el.srcObject = localStream; }} />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-6">
                  {/* Pulsing rings for incoming */}
                  <div className="relative">
                    {calling.incoming && (
                      <>
                        <motion.div animate={{ scale: [1, 1.6], opacity: [0.4, 0] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                          className="absolute inset-0 rounded-full bg-[#008751]/30" />
                        <motion.div animate={{ scale: [1, 1.3], opacity: [0.5, 0] }}
                          transition={{ repeat: Infinity, duration: 1.5, delay: 0.3 }}
                          className="absolute inset-0 rounded-full bg-[#008751]/40" />
                      </>
                    )}
                    <div className="w-32 h-32 rounded-full bg-[#008751]/20 border-4 border-[#008751]/60 flex items-center justify-center text-5xl font-bold relative z-10 overflow-hidden">
                      {activeChat?.avatar ? (
                        <img src={activeChat.avatar} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <span>{(activeChat?.name || '?').charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                  </div>
                  <p className="text-white/50 text-sm">
                    {calling.incoming ? 'wants to ' + calling.type + ' call you' : 'Waiting for answer...'}
                  </p>
                </div>
              )}
            </div>

            {/* Local video PiP */}
            {calling.type === 'video' && !calling.incoming && remoteVideoUsers.size > 0 && (
              <div className="absolute top-20 right-4 z-20 w-24 h-36 rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl"
                ref={localVideoContainerRef} />
            )}

            {/* Bottom controls pill */}
            <div className="relative z-[9001] pb-12 px-6 flex flex-col items-center gap-4">
              {calling.incoming ? (
                /* Incoming call controls */
                <div className="flex items-center justify-center gap-12 w-full">
                  <div className="flex flex-col items-center gap-2">
                    <motion.button whileTap={{ scale: 0.9 }}
                      onPointerDown={(e) => { e.stopPropagation(); rejectCall(); }}
                      className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-2xl"
                      style={{ WebkitTapHighlightColor: 'transparent' }}>
                      <PhoneOff className="w-7 h-7 text-white" />
                    </motion.button>
                    <span className="text-white/70 text-xs">Decline</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <motion.button whileTap={{ scale: 0.9 }}
                      onPointerDown={(e) => { e.stopPropagation(); answerCall(); }}
                      className="w-16 h-16 rounded-full bg-[#008751] flex items-center justify-center shadow-2xl"
                      style={{ WebkitTapHighlightColor: 'transparent' }}>
                      <Phone className="w-7 h-7 text-white" />
                    </motion.button>
                    <span className="text-white/70 text-xs">Accept</span>
                  </div>
                </div>
              ) : (
                /* Active call controls - pill style */
                <div className="bg-white/10 backdrop-blur-md rounded-3xl px-6 py-4 flex items-center gap-6 border border-white/10">
                  {/* Mute */}
                  <div className="flex flex-col items-center gap-1.5">
                    <motion.button whileTap={{ scale: 0.9 }}
                      onPointerDown={(e) => { e.stopPropagation(); toggleMute(); }}
                      className={"w-12 h-12 rounded-full flex items-center justify-center transition-colors " + (isMuted ? "bg-red-500" : "bg-white/20")}
                      style={{ WebkitTapHighlightColor: 'transparent' }}>
                      {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
                    </motion.button>
                    <span className="text-white/60 text-[10px]">{isMuted ? 'Unmute' : 'Mute'}</span>
                  </div>

                  {/* Camera (video only) */}
                  {calling.type === 'video' && (
                    <div className="flex flex-col items-center gap-1.5">
                      <motion.button whileTap={{ scale: 0.9 }}
                        onPointerDown={(e) => { e.stopPropagation(); toggleVideo(); }}
                        className={"w-12 h-12 rounded-full flex items-center justify-center transition-colors " + (isVideoOff ? "bg-red-500" : "bg-white/20")}
                        style={{ WebkitTapHighlightColor: 'transparent' }}>
                        {isVideoOff ? <VideoIcon className="w-5 h-5 text-white" /> : <Video className="w-5 h-5 text-white" />}
                      </motion.button>
                      <span className="text-white/60 text-[10px]">{isVideoOff ? 'Cam On' : 'Cam Off'}</span>
                    </div>
                  )}

                  {/* End Call - red, larger */}
                  <div className="flex flex-col items-center gap-1.5">
                    <motion.button whileTap={{ scale: 0.9 }}
                      onPointerDown={(e) => { e.stopPropagation(); endCall(); }}
                      className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center shadow-xl"
                      style={{ WebkitTapHighlightColor: 'transparent' }}>
                      <PhoneOff className="w-6 h-6 text-white" />
                    </motion.button>
                    <span className="text-white/60 text-[10px]">End</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN APP SHELL ────────────────────────────────────────────────── */}
      <div className="fixed inset-0 flex flex-col overflow-hidden" style={{backgroundImage:"url('/bg.png')",backgroundSize:'cover',backgroundPosition:'center',backgroundRepeat:'no-repeat'}}>

        {/* ── CHAT VIEW (full screen when activeChat is set) ─────────────── */}
        <AnimatePresence>
          {activeChat && (
            <motion.div
              key="chat-view"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.22 }}
              className="absolute inset-0 z-50 flex flex-col bg-white"
            >
              {/* Chat header */}
              <div className="flex items-center gap-3 px-3 py-2 bg-[#008751] text-white shadow-md flex-shrink-0">
                <button
                  onClick={() => setActiveChat(null)}
                  className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <img
                  src={activeChat.avatar}
                  alt={activeChat.name}
                  className="w-9 h-9 rounded-full object-cover border-2 border-white/40"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm leading-tight truncate">{activeChat.name}</p>
                  <p className="text-green-200 text-xs">
                    {activeChat.typing ? 'typing...' : (activeChat.online ? 'online' : '')}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => initiateCall('voice')}
                    className="p-2 rounded-full hover:bg-white/20 transition-colors"
                  >
                    <Phone className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => initiateCall('video')}
                    className="p-2 rounded-full hover:bg-white/20 transition-colors"
                  >
                    <Video className="w-5 h-5" />
                  </button>
                  {activeChat.isGroup && (
                    <button
                      onClick={() => setShowMembers(!showMembers)}
                      className="p-2 rounded-full hover:bg-white/20 transition-colors"
                    >
                      <Users className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Group members panel */}
              <AnimatePresence>
                {showMembers && activeChat.isGroup && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-green-50 border-b border-green-100 overflow-hidden flex-shrink-0"
                  >
                    <div className="px-4 py-2">
                      <p className="text-xs font-semibold text-[#008751] mb-2">Members ({chatMembers.length})</p>
                      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                        {chatMembers.map((m: any) => (
                          <div key={m.id} className="flex flex-col items-center gap-1 flex-shrink-0">
                            <img
                              src={m.avatarUrl || ("https://i.pravatar.cc/150?u=" + m.id)}
                              alt={m.username}
                              className="w-9 h-9 rounded-full object-cover border-2 border-[#008751]/30"
                            />
                            <span className="text-[10px] text-gray-600 max-w-[48px] truncate text-center">
                              {m.username || m.phoneNumber}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Messages area */}
              <div
                className="flex-1 overflow-y-auto px-3 py-3 scrollbar-hide"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23008751' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}
              >
                <div className="flex flex-col gap-1">
                  {messages.map((msg) => {
                    const isMine = msg.senderId === userId;
                    const translated = translatedMessages[msg.id];
                    const reactions = msg.reactions ? Object.values(msg.reactions as Record<string, string>) : [];
                    return (
                      <div
                        key={msg.id}
                        className={"flex " + (isMine ? "justify-end" : "justify-start")}
                      >
                        <div className={"max-w-[78%] group relative"}>
                          <div
                            className={"px-3 py-2 rounded-2xl shadow-sm " + (isMine ? "bg-[#dcf8c6] rounded-br-sm" : "bg-white rounded-bl-sm")}
                          >
                            {/* Sender name in groups */}
                            {activeChat.isGroup && !isMine && (
                              <p className="text-[11px] font-semibold text-[#008751] mb-0.5">
                                {msg.senderId}
                              </p>
                            )}

                            {/* Message content */}
                            {msg.type === 'image' ? (
                              <img
                                src={msg.content}
                                alt="media"
                                className="max-w-full rounded-xl max-h-64 object-cover"
                              />
                            ) : msg.type === 'video' ? (
                              <video
                                src={msg.content}
                                controls
                                className="max-w-full rounded-xl max-h-64"
                              />
                            ) : msg.type === 'audio' ? (
                              <audio src={msg.content} controls className="max-w-full" />
                            ) : (
                              <p className="text-base text-gray-800 leading-relaxed break-words">{msg.content}</p>
                            )}

                            {/* Translation */}
                            {translated && (
                              <p className="text-xs text-gray-500 mt-1 italic border-t border-gray-200 pt-1">
                                {translated}
                              </p>
                            )}

                            {/* Timestamp + status */}
                            <div className={"flex items-center gap-1 mt-0.5 " + (isMine ? "justify-end" : "justify-start")}>
                              <span className="text-[10px] text-gray-400">{formatTime(msg.timestamp)}</span>
                              {isMine && (
                                msg.status === 'read'
                                  ? <CheckCheck className="w-3.5 h-3.5 text-green-500" />
                                  : msg.status === 'delivered'
                                  ? <CheckCheck className="w-3.5 h-3.5 text-gray-400" />
                                  : <Check className="w-3.5 h-3.5 text-gray-400" />
                              )}
                            </div>
                          </div>

                          {/* Reactions display */}
                          {reactions.length > 0 && (
                            <div className={"flex gap-0.5 mt-0.5 " + (isMine ? "justify-end" : "justify-start")}>
                              {reactions.slice(0, 5).map((emoji, i) => (
                                <span key={i} className="text-sm">{emoji}</span>
                              ))}
                            </div>
                          )}

                          {/* Reaction + translate buttons (hover) */}
                          <div
                            className={"absolute top-0 " + (isMine ? "left-0 -translate-x-full pr-1" : "right-0 translate-x-full pl-1") + " hidden group-hover:flex items-center gap-1"}
                          >
                            {['👍', '❤️', '😂', '😮', '😢'].map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => handleReact(msg.id, emoji)}
                                className="text-base hover:scale-125 transition-transform"
                              >
                                {emoji}
                              </button>
                            ))}
                            <button
                              onClick={() => handleTranslate(msg.id, msg.content)}
                              className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full hover:bg-gray-200 transition-colors ml-1"
                            >
                              {translatingId === msg.id ? '...' : 'EN'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* AI suggestions */}
              <AnimatePresence>
                {aiSuggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="flex gap-2 px-3 py-2 overflow-x-auto scrollbar-hide flex-shrink-0 bg-white border-t border-gray-100"
                  >
                    <Sparkles className="w-4 h-4 text-[#008751] flex-shrink-0 mt-0.5" />
                    {aiSuggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => setInputText(s)}
                        className="flex-shrink-0 text-xs bg-green-50 text-[#008751] border border-green-200 px-3 py-1.5 rounded-full hover:bg-green-100 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input bar */}
              <div className="flex items-end gap-2 px-3 py-2 bg-white border-t border-gray-100 flex-shrink-0 safe-bottom">
                <label className="p-2 rounded-full hover:bg-gray-100 transition-colors cursor-pointer flex-shrink-0">
                  <Paperclip className="w-5 h-5 text-gray-500" />
                  <input type="file" accept="image/*,video/*" className="hidden" onChange={handleFileUpload} />
                </label>
                <form onSubmit={handleSendMessage} className="flex-1 flex items-end gap-2">
                  <textarea
                    value={inputText}
                    onChange={(e) => handleTyping(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e as any);
                      }
                    }}
                    placeholder="Message"
                    rows={1}
                    className="flex-1 resize-none bg-gray-100 rounded-2xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#008751]/30 max-h-28 overflow-y-auto scrollbar-hide"
                    style={{ lineHeight: '1.4' }}
                  />
                  {inputText.trim() ? (
                    <button
                      type="submit"
                      className="w-10 h-10 rounded-full bg-[#008751] flex items-center justify-center shadow-md hover:bg-[#006b40] transition-colors flex-shrink-0"
                    >
                      <Send className="w-5 h-5 text-white" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onMouseDown={startRecording}
                      onMouseUp={stopRecording}
                      onTouchStart={startRecording}
                      onTouchEnd={stopRecording}
                      className={"w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-colors flex-shrink-0 " + (isRecording ? "bg-red-500 hover:bg-red-600" : "bg-[#008751] hover:bg-[#006b40]")}
                    >
                      {isRecording ? (
                        <span className="text-white text-xs font-bold">{recordingDuration}s</span>
                      ) : (
                        <Mic className="w-5 h-5 text-white" />
                      )}
                    </button>
                  )}
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── TOP TAB BAR ───────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 bg-[#008751] text-white shadow-md">
          <div className="flex items-center px-4 pt-3 pb-0">
            <img src="/logo.png" alt="9jaTalk" className="w-9 h-9 object-contain mr-2" style={{ mixBlendMode: 'screen' }} />
            <span className="font-extrabold text-lg tracking-wide flex-1">9jaTalk</span>
            <button
              onClick={() => setShowNewChat(true)}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
          {/* Tabs */}
          <div className="flex">
            {(['chats', 'updates', 'calls'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={"flex-1 py-3 text-sm font-semibold capitalize transition-colors relative " + (activeTab === tab ? "text-white" : "text-green-300 hover:text-white")}
              >
                {tab === 'chats' && <MessageSquare className="w-4 h-4 inline mr-1 -mt-0.5" />}
                {tab === 'updates' && <CircleDashed className="w-4 h-4 inline mr-1 -mt-0.5" />}
                {tab === 'calls' && <Phone className="w-4 h-4 inline mr-1 -mt-0.5" />}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {activeTab === tab && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── SEARCH BAR (chats tab only) ───────────────────────────────────── */}
        {activeTab === 'chats' && (
          <div className="flex-shrink-0 px-3 py-2 bg-white border-b border-gray-100">
            <div className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-2">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')}>
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── CONTENT AREA ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">

          {/* CHATS TAB */}
          {activeTab === 'chats' && (
            <div>
              {chats
                .filter((c) =>
                  !searchQuery ||
                  c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((chat) => (
                  <motion.button
                    key={chat.id}
                    onClick={() => selectChat(chat)}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-gray-50 text-left"
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={chat.avatar}
                        alt={chat.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      {chat.online && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                      )}
                      {chat.isGroup && (
                        <span className="absolute bottom-0 right-0 w-4 h-4 bg-[#008751] rounded-full border-2 border-white flex items-center justify-center">
                          <Users className="w-2.5 h-2.5 text-white" />
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-semibold text-gray-900 text-sm truncate">{chat.name}</span>
                        <span className="text-[11px] text-gray-400 flex-shrink-0 ml-2">{chat.time}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={"text-xs truncate " + (chat.typing ? "text-[#008751] italic" : "text-gray-500")}>
                          {chat.typing ? 'typing...' : chat.lastMessage}
                        </span>
                        {chat.unread > 0 && (
                          <span className="ml-2 flex-shrink-0 min-w-[20px] h-5 bg-[#008751] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                            {chat.unread > 99 ? '99+' : chat.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.button>
                ))}
              {chats.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm">No chats yet</p>
                  <p className="text-xs mt-1">Tap + to start a conversation</p>
                </div>
              )}
            </div>
          )}

          {/* UPDATES TAB */}
          {activeTab === 'updates' && (
            <div className="px-4 py-4">
              {/* My status */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">My Status</p>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={userProfile?.avatarUrl || ("https://i.pravatar.cc/150?u=" + userId)}
                      alt="me"
                      className="w-14 h-14 rounded-full object-cover border-2 border-[#008751]"
                    />
                    <label className="absolute bottom-0 right-0 w-5 h-5 bg-[#008751] rounded-full flex items-center justify-center cursor-pointer border-2 border-white">
                      <Plus className="w-3 h-3 text-white" />
                      <input type="file" accept="image/*,video/*" className="hidden" onChange={handlePostStatus} />
                    </label>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">My status</p>
                    <p className="text-xs text-gray-500">Tap to add status update</p>
                  </div>
                </div>
              </div>

              {/* Recent updates */}
              {statuses.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent Updates</p>
                  <div className="space-y-3">
                    {statuses.map((status: any) => (
                      <motion.button
                        key={status.id}
                        onClick={() => setViewingStatus(status)}
                        whileTap={{ scale: 0.97 }}
                        className="w-full flex items-center gap-3 text-left"
                      >
                        <div className="w-14 h-14 rounded-full border-2 border-[#008751] p-0.5 flex-shrink-0">
                          {status.type === 'image' ? (
                            <img src={status.content} alt="status" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center">
                              <VideoIcon className="w-5 h-5 text-gray-500" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{status.userId}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(status.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
              {statuses.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <CircleDashed className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm">No status updates</p>
                  <p className="text-xs mt-1">Tap + to share a status</p>
                </div>
              )}
            </div>
          )}

          {/* CALLS TAB */}
          {activeTab === 'calls' && (
            <div className="px-4 py-4">
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Phone className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">No recent calls</p>
                <p className="text-xs mt-1">Start a call from any chat</p>
              </div>
            </div>
          )}
        </div>

        {/* ── BOTTOM BRANDING ───────────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex items-center justify-center gap-2 py-2 bg-white border-t border-gray-100 safe-bottom">
          <img src="/logo.png" alt="9jaTalk" className="w-5 h-5 object-contain" style={{ mixBlendMode: 'multiply' }} />
          <span className="text-[11px] text-gray-400 font-medium">9jaTalk</span>
          <span className="text-[10px] text-gray-300 mx-1">·</span>
          <span className="text-[10px] text-gray-300">Designed by Thompson Obosa</span>
        </div>

        {/* ── FAB (new chat) ────────────────────────────────────────────────── */}
        {activeTab === 'chats' && !activeChat && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowNewChat(true)}
            className="absolute bottom-16 right-4 w-14 h-14 bg-[#008751] rounded-full shadow-xl flex items-center justify-center z-40 hover:bg-[#006b40] transition-colors"
          >
            <MessageSquare className="w-6 h-6 text-white" />
          </motion.button>
        )}
      </div>

      {/* ── NEW CHAT MODAL ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showNewChat && (
          <motion.div
            key="new-chat-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4"
            onClick={() => setShowNewChat(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-800">New Chat</h3>
                <button
                  onClick={() => setShowNewChat(false)}
                  className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleStartNewChat} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+234 801 234 5678"
                    value={newChatNumber}
                    onChange={(e) => setNewChatNumber(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#008751] transition-all text-sm"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handlePickContacts}
                    className="flex-1 bg-gray-100 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-200 transition-colors text-sm"
                  >
                    Pick from Contacts
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#008751] text-white font-semibold py-3 rounded-xl hover:bg-[#006b40] transition-colors shadow-md text-sm"
                  >
                    Start Chat
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── GROUP MODAL ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showGroupModal && (
          <motion.div
            key="group-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4"
            onClick={() => setShowGroupModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-800">New Group</h3>
                <button
                  onClick={() => setShowGroupModal(false)}
                  className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleCreateGroup} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Group Name</label>
                  <input
                    type="text"
                    placeholder="Family, Friends, Work..."
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#008751] transition-all text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#008751] text-white font-semibold py-3 rounded-xl hover:bg-[#006b40] transition-colors shadow-md text-sm"
                >
                  Create Group
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── STATUS VIEWER ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {viewingStatus && (
          <motion.div
            key="status-viewer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col bg-black"
            onClick={() => setViewingStatus(null)}
          >
            <div className="flex items-center gap-3 px-4 py-3 bg-black/50 absolute top-0 left-0 right-0 z-10">
              <button
                onClick={() => setViewingStatus(null)}
                className="p-1 rounded-full hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
              <img
                src={userProfile?.avatarUrl || ("https://i.pravatar.cc/150?u=" + viewingStatus.userId)}
                alt="user"
                className="w-9 h-9 rounded-full object-cover border-2 border-white/40"
              />
              <div>
                <p className="text-white font-semibold text-sm">{viewingStatus.userId}</p>
                <p className="text-white/70 text-xs">
                  {new Date(viewingStatus.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center">
              {viewingStatus.type === 'image' ? (
                <img
                  src={viewingStatus.content}
                  alt="status"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <video
                  src={viewingStatus.content}
                  controls
                  autoPlay
                  className="max-w-full max-h-full"
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SETTINGS BOTTOM SHEET ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            key="settings-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
                <h3 className="text-xl font-bold text-gray-800">Settings</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-100 flex-shrink-0">
                {(['account', 'privacy', 'notifications', 'backup'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveSettingsTab(tab)}
                    className={"flex-1 py-3 text-xs font-semibold capitalize transition-colors relative " + (activeSettingsTab === tab ? "text-[#008751]" : "text-gray-400 hover:text-gray-600")}
                  >
                    {tab}
                    {activeSettingsTab === tab && (
                      <motion.div
                        layoutId="settings-tab-indicator"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#008751] rounded-full"
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto scrollbar-hide">
                {/* ACCOUNT TAB */}
                {activeSettingsTab === 'account' && (
                  <div className="p-5 space-y-5">
                    {/* Avatar */}
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative">
                        <img
                          src={userProfile?.avatarUrl || ("https://i.pravatar.cc/150?u=" + userId)}
                          alt="me"
                          className="w-24 h-24 rounded-full object-cover border-4 border-[#008751]/20"
                        />
                        <label className="absolute bottom-0 right-0 w-8 h-8 bg-[#008751] rounded-full flex items-center justify-center cursor-pointer border-2 border-white shadow-md">
                          <UserIcon className="w-4 h-4 text-white" />
                          <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                        </label>
                      </div>
                      <p className="text-xs text-gray-500">Tap to change profile photo</p>
                    </div>

                    {/* Name */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Name</label>
                      <input
                        type="text"
                        value={userProfile?.username || ''}
                        onChange={(e) => handleUpdateProfile({ username: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#008751] text-sm"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone</label>
                      <input
                        type="tel"
                        value={userProfile?.phoneNumber || ''}
                        disabled
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-500"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
                      <input
                        type="email"
                        value={userProfile?.email || ''}
                        onChange={(e) => handleUpdateProfile({ email: e.target.value })}
                        placeholder="your@email.com"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#008751] text-sm"
                      />
                    </div>

                    {/* Sign out */}
                    <button
                      onClick={() => {
                        if (confirm('Sign out of 9jaTalk?')) {
                          auth.signOut();
                          window.location.reload();
                        }
                      }}
                      className="w-full bg-red-50 text-red-600 font-semibold py-3 rounded-xl hover:bg-red-100 transition-colors text-sm"
                    >
                      Sign Out
                    </button>
                  </div>
                )}

                {/* PRIVACY TAB */}
                {activeSettingsTab === 'privacy' && (
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Read Receipts</p>
                        <p className="text-xs text-gray-500">Show when you've read messages</p>
                      </div>
                      <button
                        onClick={() => handleUpdateProfile({ readReceipts: !userProfile?.readReceipts })}
                        className={"w-12 h-6 rounded-full transition-colors relative " + (userProfile?.readReceipts ? "bg-[#008751]" : "bg-gray-300")}
                      >
                        <span
                          className={"absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform " + (userProfile?.readReceipts ? "left-6" : "left-0.5")}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Last Seen</p>
                        <p className="text-xs text-gray-500">Show when you were last online</p>
                      </div>
                      <button
                        onClick={() => handleUpdateProfile({ lastSeenStatus: !userProfile?.lastSeenStatus })}
                        className={"w-12 h-6 rounded-full transition-colors relative " + (userProfile?.lastSeenStatus ? "bg-[#008751]" : "bg-gray-300")}
                      >
                        <span
                          className={"absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform " + (userProfile?.lastSeenStatus ? "left-6" : "left-0.5")}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Screenshot Protection</p>
                        <p className="text-xs text-gray-500">Blur screen when app is in background</p>
                      </div>
                      <button
                        onClick={() => handleUpdateProfile({ screenshotProtection: !userProfile?.screenshotProtection })}
                        className={"w-12 h-6 rounded-full transition-colors relative " + (userProfile?.screenshotProtection ? "bg-[#008751]" : "bg-gray-300")}
                      >
                        <span
                          className={"absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform " + (userProfile?.screenshotProtection ? "left-6" : "left-0.5")}
                        />
                      </button>
                    </div>

                    <div className="pt-3 border-t border-gray-100">
                      <p className="text-sm font-semibold text-gray-800 mb-2">Disappearing Messages</p>
                      <p className="text-xs text-gray-500 mb-3">Set default timer for new chats</p>
                      <div className="flex gap-2 flex-wrap">
                        {[0, 60, 300, 3600, 86400].map((sec) => (
                          <button
                            key={sec}
                            onClick={() => handleUpdateProfile({ disappearingTimer: sec })}
                            className={"px-4 py-2 rounded-full text-xs font-semibold transition-colors " + (userProfile?.disappearingTimer === sec ? "bg-[#008751] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200")}
                          >
                            {sec === 0 ? 'Off' : sec === 60 ? '1m' : sec === 300 ? '5m' : sec === 3600 ? '1h' : '24h'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* NOTIFICATIONS TAB */}
                {activeSettingsTab === 'notifications' && (
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Push Notifications</p>
                        <p className="text-xs text-gray-500">Receive notifications for new messages</p>
                      </div>
                      <button
                        onClick={() => handleUpdateProfile({ pushEnabled: !userProfile?.pushEnabled })}
                        className={"w-12 h-6 rounded-full transition-colors relative " + (userProfile?.pushEnabled ? "bg-[#008751]" : "bg-gray-300")}
                      >
                        <span
                          className={"absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform " + (userProfile?.pushEnabled ? "left-6" : "left-0.5")}
                        />
                      </button>
                    </div>

                    <div className="pt-3 border-t border-gray-100">
                      <p className="text-sm font-semibold text-gray-800 mb-2">Ringtone</p>
                      <select
                        value={userProfile?.ringtone || 'Default'}
                        onChange={(e) => handleUpdateProfile({ ringtone: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#008751] text-sm"
                      >
                        <option>Default</option>
                        <option>Classic</option>
                        <option>Modern</option>
                        <option>Silent</option>
                      </select>
                    </div>

                    <div className="pt-3 border-t border-gray-100">
                      <p className="text-sm font-semibold text-gray-800 mb-2">Message Tone</p>
                      <select
                        value={userProfile?.messageTone || 'Default'}
                        onChange={(e) => handleUpdateProfile({ messageTone: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#008751] text-sm"
                      >
                        <option>Default</option>
                        <option>Chime</option>
                        <option>Ding</option>
                        <option>Silent</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* BACKUP TAB */}
                {activeSettingsTab === 'backup' && (
                  <div className="p-5 space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-100">
                      <Database className="w-5 h-5 text-[#008751] flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Auto Backup</p>
                        <p className="text-xs text-gray-500">Your chats are backed up to Firebase</p>
                      </div>
                    </div>

                    <button
                      onClick={() => alert('Backup feature coming soon!')}
                      className="w-full bg-[#008751] text-white font-semibold py-3 rounded-xl hover:bg-[#006b40] transition-colors text-sm"
                    >
                      Backup Now
                    </button>

                    <button
                      onClick={() => alert('Restore feature coming soon!')}
                      className="w-full bg-gray-100 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-200 transition-colors text-sm"
                    >
                      Restore from Backup
                    </button>
                  </div>
                )}
              </div>

              {/* Footer branding */}
              <div className="flex-shrink-0 flex items-center justify-center gap-2 py-3 border-t border-gray-100 bg-gray-50">
                <img src="/logo.png" alt="9jaTalk" className="w-4 h-4 object-contain" style={{ mixBlendMode: 'multiply' }} />
                <span className="text-[10px] text-gray-400">Designed by Thompson Obosa</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PRIVACY BLUR OVERLAY ──────────────────────────────────────────── */}
      <AnimatePresence>
        {isPrivacyProtected && (
          <motion.div
            key="privacy-blur"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] backdrop-blur-3xl bg-white/80 flex flex-col items-center justify-center"
          >
            <Lock className="w-16 h-16 text-[#008751] mb-4" />
            <p className="text-lg font-bold text-gray-800">9jaTalk is locked</p>
            <p className="text-sm text-gray-500 mt-1">Tap to unlock</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
