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
  sendOTP, verifyOTP, onAuthChange, getUserProfile, updateUserProfile,
  searchUserByPhone, setOnline,
  getChatId, sendMessage as fbSendMessage, listenMessages, listenUserChats,
  markMessagesRead, reactToMessage, setTyping, listenTyping,
  postStatus, listenStatuses, createGroup, getGroupMembers,
  listenUserGroups, sendSignal, listenSignals, uploadFile,
  getAiSuggestions, translateText
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
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState('chats');

  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [otpError, setOtpError] = useState('');

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
  const [showMembers, setShowMembers] = useState(false);

  const [isPrivacyProtected, setIsPrivacyProtected] = useState(false);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // Calls
  const [calling, setCalling] = useState<{
    type: 'voice' | 'video'; active: boolean; incoming?: boolean;
    remoteId?: string; groupId?: string; signal?: any;
  } | null>(null);
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

  // Unsubscribe refs
  const unsubMessages = useRef<(() => void) | null>(null);
  const unsubTyping = useRef<(() => void) | null>(null);
  const unsubSignals = useRef<(() => void) | null>(null);

  // â”€â”€â”€ Auth state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      if (user) {
        const profile = await getUserProfile(user.uid);
        if (profile) {
          setUserId(user.uid);
          setUserProfile(profile);
          setOnline(user.uid);
          setupSignalListener(user.uid);
        }
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
    const unsubUserChats = listenUserChats(userId, (incomingChats) => {
      setChats(prev => {
        const groups = prev.filter(c => c.isGroup);
        const support = prev.find(c => c.id === 'support') || supportChat;
        // Merge incoming chats, avoid duplicates
        const merged = [support, ...incomingChats.filter(c => c.id !== 'support'), ...groups];
        return merged;
      });
    });

    // Listen to groups
    const unsub = listenUserGroups(userId, (groups) => {
      const groupChats: Chat[] = groups.map(g => ({
        id: g.id,
        name: g.name,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(g.name)}&background=008751&color=fff`,
        lastMessage: g.lastMessage || 'Group created',
        time: g.lastMessageTime ? new Date(g.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        unread: 0,
        isGroup: true
      }));
      setChats(prev => {
        const nonGroup = prev.filter(c => !c.isGroup);
        return [...nonGroup, ...groupChats];
      });
    });
    return () => { unsub(); unsubUserChats(); };
  }, [userId]);

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

    unsubMessages.current = listenMessages(chatId, (msgs) => {
      // Filter expired
      const now = Date.now();
      setMessages(msgs.filter(m => !m.expiresAt || m.expiresAt > now));
      // Mark as read
      markMessagesRead(chatId, userId);
      // Reset unread
      setChats(prev => prev.map(c => c.id === activeChat.id ? { ...c, unread: 0 } : c));
    });

    unsubTyping.current = listenTyping(chatId, userId, (typingUid) => {
      setChats(prev => prev.map(c =>
        c.id === activeChat.id ? { ...c, typing: !!typingUid } : c
      ));
    });

    return () => {
      unsubMessages.current?.();
      unsubTyping.current?.();
    };
  }, [activeChat?.id, userId]);

  // â”€â”€â”€ Scroll to bottom â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

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
      const lastFew = messages.slice(-5).map(m => m.content);
      const suggestions = await getAiSuggestions(lastFew);
      setAiSuggestions(suggestions);
    }, 1000);
    return () => clearTimeout(timer);
  }, [messages.length, activeChat?.id]);

  // â”€â”€â”€ Disappearing messages cleanup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    const interval = setInterval(() => {
      setMessages(prev => prev.filter(m => !m.expiresAt || m.expiresAt > Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // â”€â”€â”€ Recording timer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    let interval: any;
    if (isRecording) interval = setInterval(() => setRecordingDuration(d => d + 1), 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  // â”€â”€â”€ WebRTC signal listener â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const setupSignalListener = (uid: string) => {
    unsubSignals.current?.();
    unsubSignals.current = listenSignals(uid, (signal) => {
      if (signal.type === 'call:incoming') {
        // Play ring sound for incoming call
        const audio = new Audio('https://www.soundjay.com/phone/sounds/phone-ringing-1.mp3');
        audio.loop = true;
        audio.play().catch(() => {});
        (window as any)._ringAudio = audio;
        setCalling({
          active: true, incoming: true,
          type: signal.payload.callType,
          remoteId: signal.fromId,
          signal: signal.payload.sdp
        });
      } else if (signal.type === 'call:answer') {
        // Stop ring
        if ((window as any)._ringAudio) { (window as any)._ringAudio.pause(); (window as any)._ringAudio = null; }
        const peer = peersRef.current.get(signal.fromId);
        if (peer) peer.signal(signal.payload.sdp);
        setCalling(prev => prev ? { ...prev, incoming: false } : null);
      } else if (signal.type === 'call:reject' || signal.type === 'call:end') {
        if ((window as any)._ringAudio) { (window as any)._ringAudio.pause(); (window as any)._ringAudio = null; }
        cleanupCall();
      }
    });
  };

  const handleSendOTP = async (e) => {
    e.preventDefault(); if (phoneNumber.length < 8) return;
    setLoginLoading(true); setOtpError('');
    try { const result = await sendOTP(phoneNumber, 'recaptcha-container'); setConfirmationResult(result); setOtpSent(true); }
    catch (err) { setOtpError(err.message || 'Failed to send OTP.'); }
    finally { setLoginLoading(false); }
  };
  const handleVerifyOTP = async (e) => {
    e.preventDefault(); if (!confirmationResult || otp.length < 4) return;
    setLoginLoading(true); setOtpError('');
    try { const user = await verifyOTP(confirmationResult, otp); const profile = await getUserProfile(user.uid); setUserId(user.uid); setUserProfile(profile); setOnline(user.uid); setupSignalListener(user.uid); }
    catch (err) { setOtpError('Invalid OTP. Please try again.'); }
    finally { setLoginLoading(false); }
  };

  // â”€â”€â”€ Send message â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChat || !userId) return;
    const text = inputText;
    setInputText('');
    const chatId = activeChat.isGroup ? activeChat.id : getChatId(userId, activeChat.id);
    setTyping(chatId, userId, false);
    await fbSendMessage(userId, activeChat.id, text, 'text', !!activeChat.isGroup, activeChat.disappearingTimer || 0);
    setChats(prev => prev.map(c =>
      c.id === activeChat.id ? { ...c, lastMessage: text, time: 'Just now' } : c
    ));
  };

  const handleTyping = (text: string) => {
    setInputText(text);
    if (activeChat && userId) {
      const chatId = activeChat.isGroup ? activeChat.id : getChatId(userId, activeChat.id);
      setTyping(chatId, userId, text.length > 0);
    }
  };

  // â”€â”€â”€ File upload â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat || !userId) return;
    try {
      const url = await uploadFile(file, 'media');
      const type = file.type.startsWith('video') ? 'video' : 'image';
      await fbSendMessage(userId, activeChat.id, url, type, !!activeChat.isGroup);
    } catch (err) { console.error('Upload failed', err); }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    try {
      const url = await uploadFile(file, 'avatars');
      const updated = await updateUserProfile(userId, { avatarUrl: url });
      setUserProfile(updated);
    } catch (err) { console.error('Avatar upload failed', err); }
  };

  const handlePostStatus = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    try {
      const url = await uploadFile(file, 'statuses');
      const type = file.type.startsWith('video') ? 'video' : 'image';
      await postStatus(userId, url, type);
    } catch (err) { console.error('Status post failed', err); }
  };

  // â”€â”€â”€ Voice recording â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], 'voice_note.webm', { type: 'audio/webm' });
        if (activeChat && userId) {
          const url = await uploadFile(file, 'audio');
          await fbSendMessage(userId, activeChat.id, url, 'audio', !!activeChat.isGroup);
        }
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingDuration(0);
    } catch (err) { console.error('Recording failed', err); }
  };

  const stopRecording = () => { mediaRecorder?.stop(); setIsRecording(false); };

  // â”€â”€â”€ New chat / group â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleStartNewChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newChatNumber.length < 6) return;
    const userData = await searchUserByPhone(newChatNumber);
    if (!userData) return;
    const newChat: Chat = {
      id: userData.id,
      name: userData.username || `User ${newChatNumber}`,
      avatar: userData.avatarUrl || `https://i.pravatar.cc/150?u=${userData.id}`,
      lastMessage: '',
      time: 'Now',
      unread: 0
    };
    setChats(prev => prev.find(c => c.id === newChat.id) ? prev : [newChat, ...prev]);
    setActiveChat(newChat);
    setShowNewChat(false);
    setNewChatNumber('');
    setIsSidebarOpen(false);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName || !userId) return;
    const groupId = await createGroup(groupName, userId, []);
    const newGroup: Chat = {
      id: groupId,
      name: groupName,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(groupName)}&background=008751&color=fff`,
      lastMessage: 'Group created',
      time: 'Now',
      unread: 0,
      isGroup: true
    };
    setChats(prev => [newGroup, ...prev]);
    setActiveChat(newGroup);
    setShowGroupModal(false);
    setGroupName('');
    setIsSidebarOpen(false);
  };

  const selectChat = (chat: Chat) => {
    setActiveChat(chat);
    setIsSidebarOpen(false);
    setChats(prev => prev.map(c => c.id === chat.id ? { ...c, unread: 0 } : c));
  };

  // â”€â”€â”€ Profile update â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleUpdateProfile = async (updates: any) => {
    if (!userId) return;
    const updated = await updateUserProfile(userId, updates);
    setUserProfile(updated);
  };

  // â”€â”€â”€ Reactions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleReact = async (messageId: string, emoji: string) => {
    if (!activeChat || !userId) return;
    const chatId = activeChat.isGroup ? activeChat.id : getChatId(userId, activeChat.id);
    await reactToMessage(chatId, messageId, userId, emoji);
  };

  // â”€â”€â”€ Translation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleTranslate = async (msgId: string, text: string) => {
    setTranslatingId(msgId);
    const translated = await translateText(text, 'English');
    setTranslatedMessages(prev => ({ ...prev, [msgId]: translated }));
    setTranslatingId(null);
  };

  // â”€â”€â”€ Disappearing timer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const setChatDisappearingTimer = async (seconds: number) => {
    if (!activeChat) return;
    setChats(prev => prev.map(c =>
      c.id === activeChat.id ? { ...c, disappearingTimer: seconds } : c
    ));
    setActiveChat(prev => prev ? { ...prev, disappearingTimer: seconds } : prev);
  };

  // â”€â”€â”€ WebRTC calls â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const getEnhancedStream = (rawStream: MediaStream) => {
    if (rawStream.getVideoTracks().length === 0) return rawStream;
    const canvas = document.createElement('canvas');
    const settings = rawStream.getVideoTracks()[0].getSettings();
    canvas.width = settings.width || 640;
    canvas.height = settings.height || 480;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return rawStream;
    const v = document.createElement('video');
    v.srcObject = rawStream; v.muted = true; v.play().catch(console.error);
    processingVideoRef.current = v;
    const process = () => {
      const f = videoEffectsRef.current;
      ctx.filter = `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturate}%) sepia(${f.sepia}%) blur(${f.blur}px) hue-rotate(${f.hueRotate}deg)`;
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      processingLoopRef.current = requestAnimationFrame(process);
    };
    process();
    const canvasStream = canvas.captureStream(30);
    const result = new MediaStream([canvasStream.getVideoTracks()[0], rawStream.getAudioTracks()[0]]);
    setProcessedStream(result);
    return result;
  };

  const cleanupCall = () => {
    // Stop any ring audio
    if ((window as any)._ringAudio) { (window as any)._ringAudio.pause(); (window as any)._ringAudio = null; }
    localStream?.getTracks().forEach(t => t.stop());
    processedStream?.getTracks().forEach(t => t.stop());
    if (processingLoopRef.current) cancelAnimationFrame(processingLoopRef.current);
    if (processingVideoRef.current) { processingVideoRef.current.pause(); processingVideoRef.current.srcObject = null; }
    peersRef.current.forEach(p => p.destroy());
    peersRef.current.clear();
    setLocalStream(null); setProcessedStream(null);
    setRemoteStreams(new Map()); setCalling(null);
    setIsMuted(false); setIsVideoOff(false);
  };

  const iceConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' }
    ]
  };

  const initiateCall = async (type: 'voice' | 'video') => {
    if (!activeChat || !userId) return;
    // Play outgoing ring
    const ringAudio = new Audio('https://www.soundjay.com/phone/sounds/phone-ringing-3.mp3');
    ringAudio.loop = true;
    ringAudio.play().catch(() => {});
    (window as any)._ringAudio = ringAudio;
    const rawStream = await navigator.mediaDevices.getUserMedia({ video: type === 'video', audio: true });
    setLocalStream(rawStream);
    const stream = type === 'video' ? getEnhancedStream(rawStream) : rawStream;
    const createPeer = (targetId: string) => {
      const peer = new Peer({ initiator: true, trickle: true, stream, config: iceConfig });
      peer.on('signal', (sdp: any) => sendSignal(userId, targetId, 'call:incoming', { callType: type, sdp }));
      peer.on('stream', (remote: MediaStream) => setRemoteStreams(prev => new Map(prev.set(targetId, remote))));
      peersRef.current.set(targetId, peer);
    };
    if (activeChat.isGroup) {
      chatMembers.forEach(m => { if (m.id !== userId) createPeer(m.id); });
      setCalling({ type, active: true, incoming: false, groupId: activeChat.id });
    } else {
      createPeer(activeChat.id);
      setCalling({ type, active: true, incoming: false, remoteId: activeChat.id });
    }
  };

  const answerCall = async () => {
    if (!calling?.remoteId || !userId) return;
    const rawStream = await navigator.mediaDevices.getUserMedia({ video: calling.type === 'video', audio: true });
    setLocalStream(rawStream);
    const stream = calling.type === 'video' ? getEnhancedStream(rawStream) : rawStream;
    const peer = new Peer({ initiator: false, trickle: true, stream, config: iceConfig });
    peer.on('signal', (sdp: any) => sendSignal(userId, calling.remoteId!, 'call:answer', { sdp }));
    peer.on('stream', (remote: MediaStream) => setRemoteStreams(prev => new Map(prev.set(calling.remoteId!, remote))));
    if (calling.signal) peer.signal(calling.signal);
    peersRef.current.set(calling.remoteId, peer);
    setCalling(prev => prev ? { ...prev, incoming: false } : null);
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
    const track = localStream?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setIsMuted(!track.enabled); }
  };

  const toggleVideo = () => {
    const track = localStream?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setIsVideoOff(!track.enabled); }
  };

  // â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // â”€â”€â”€ Login Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  if (!userId) {
    return (
      <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center"
        >
          <img src='/logo.png' className='w-28 h-28 object-contain mx-auto mb-2' style={{mixBlendMode:'multiply'}} alt='9jaTalk'/>


          <h1 className="text-2xl font-bold text-gray-800 mb-2">Welcome to 9jaTalk</h1>
          <p className="text-gray-500 mb-6">{otpSent ? 'Enter the OTP sent to ' + phoneNumber : 'Enter your phone number to get started'}</p>
          <div id="recaptcha-container"></div>
          {!otpSent ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <input type="tel" placeholder="+234 801 234 5678" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#008751] transition-all text-lg" value={phoneNumber} onChange={e=>setPhoneNumber(e.target.value)}/>
              {otpError && <p className="text-red-500 text-sm">{otpError}</p>}
              <button type="submit" disabled={loginLoading} className="w-full bg-[#008751] text-white font-bold py-3 rounded-xl hover:bg-[#006b40] transition-colors shadow-lg disabled:opacity-60">
                {loginLoading ? 'Sending OTP...' : 'Send OTP'}
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
          <p className="mt-6 text-xs text-gray-400">By continuing, you agree to our Terms of Service and Privacy Policy.</p>
          <p className="mt-4 text-[10px] text-gray-300">Designed by Thompson Obosa</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-white overflow-hidden">
      {activeChat ? (
        <div className="flex flex-col h-full">
          <div className="bg-[#008751] px-3 flex items-center gap-3 text-white flex-shrink-0" style={{paddingTop:'calc(env(safe-area-inset-top) + 10px)',paddingBottom:'10px'}}>
            <button onClick={()=>setActiveChat(null)} className="p-1 flex-shrink-0"><ArrowLeft className="w-6 h-6"/></button>
            <img src={activeChat.avatar} className="w-9 h-9 rounded-full object-cover flex-shrink-0"/>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">{activeChat.name}</h3>
              <p className="text-[11px] text-white/70">{activeChat.typing?'typing...':activeChat.isGroup?(chatMembers.length+' members'):'online'}</p>
            </div>
            <button onClick={()=>initiateCall('voice')} className="p-2"><Phone className="w-5 h-5"/></button>
            <button onClick={()=>initiateCall('video')} className="p-2"><Video className="w-5 h-5"/></button>
            <button className="p-2"><MoreVertical className="w-5 h-5"/></button>
          </div>

          {calling?.active && (
            <div className="absolute inset-0 z-50 bg-[#075e54] flex flex-col items-center justify-center text-white">
              {calling.type==='video' && (
                <div className="absolute inset-0">
                  <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover opacity-80"/>
                  {[...remoteStreams.entries()].map(([id,stream])=>(
                    <video key={id} autoPlay playsInline ref={el=>{if(el)el.srcObject=stream;}} className="absolute top-4 right-4 w-28 h-40 object-cover rounded-xl border-2 border-white"/>
                  ))}
                </div>
              )}
              <div className="relative z-10 flex flex-col items-center">
                <img src={activeChat.avatar} className="w-24 h-24 rounded-full border-4 border-white/30 mb-4 object-cover"/>
                <h2 className="text-2xl font-bold mb-1">{activeChat.name}</h2>
                <p className="text-white/70 animate-pulse text-sm">{calling.incoming?('Incoming '+calling.type+' call...'):(remoteStreams.size>0?'Connected':'Calling...')}</p>
              </div>
              <div className="absolute bottom-16 flex items-center gap-8 z-10">
                {calling.incoming?(
                  <>
                    <button onClick={rejectCall} className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-xl"><PhoneOff className="w-7 h-7"/></button>
                    <button onClick={answerCall} className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-xl">{calling.type==='video'?<VideoIcon className="w-7 h-7"/>:<Phone className="w-7 h-7"/>}</button>
                  </>
                ):(
                  <>
                    <button onClick={toggleMute} className={`w-14 h-14 rounded-full flex items-center justify-center ${isMuted?'bg-red-500':'bg-white/20'}`}>{isMuted?<VolumeX className="w-6 h-6"/>:<Mic className="w-6 h-6"/>}</button>
                    {calling.type==='video'&&<button onClick={toggleVideo} className={`w-14 h-14 rounded-full flex items-center justify-center ${isVideoOff?'bg-red-500':'bg-white/20'}`}><VideoIcon className="w-6 h-6"/></button>}
                    <button onClick={endCall} className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-xl"><PhoneOff className="w-7 h-7"/></button>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto bg-[#efeae2] px-3 py-2 space-y-1 pb-2">
            <div className="flex justify-center my-2"><span className="bg-[#fff9c4] text-[10px] text-gray-500 px-3 py-1 rounded-full shadow-sm">Messages are end-to-end encrypted</span></div>
            <AnimatePresence initial={false}>
              {messages.filter(m=>activeChat.isGroup?(m.receiverId===activeChat.id||m.senderId===userId):(m.senderId===userId&&m.receiverId===activeChat.id)||(m.senderId===activeChat.id&&m.receiverId===userId)).map(msg=>(
                <motion.div key={msg.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} className={`flex ${msg.senderId===userId?'justify-end':'justify-start'}`}>
                  <div className={`max-w-[78%] rounded-2xl shadow-sm px-3 py-2 ${msg.senderId===userId?'bg-[#dcf8c6] rounded-tr-sm':'bg-white rounded-tl-sm'}`}>
                    {msg.type==='image'?<img src={msg.content} className="rounded-xl max-w-full max-h-56 object-cover"/>:msg.type==='audio'?<div className="flex items-center gap-2 min-w-[160px]"><div className="w-8 h-8 rounded-full bg-[#008751] flex items-center justify-center text-white flex-shrink-0"><Mic className="w-4 h-4"/></div><audio src={msg.content} controls className="h-7 flex-1"/></div>:<p className="text-[14px] leading-relaxed">{msg.content}</p>}
                    {translatedMessages[msg.id]&&<p className="text-[11px] italic text-[#005a32] mt-1 pt-1 border-t border-black/10">{translatedMessages[msg.id]}</p>}
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      <span className="text-[10px] text-gray-400">{formatTime(msg.timestamp)}</span>
                      {msg.senderId===userId&&(msg.status==='read'?<CheckCheck className="w-3 h-3 text-blue-400"/>:<Check className="w-3 h-3 text-gray-400"/>)}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef}/>
          </div>

          {aiSuggestions.length>0&&(
            <div className="flex gap-2 overflow-x-auto px-3 py-1 bg-white border-t border-gray-100">
              {aiSuggestions.map((s,i)=><button key={i} onClick={()=>{setInputText(s);setAiSuggestions([]);}} className="flex-shrink-0 bg-gray-100 px-3 py-1 rounded-full text-xs text-gray-700 hover:bg-[#008751] hover:text-white transition-all">{s}</button>)}
            </div>
          )}

          <div className="bg-[#f0f2f5] px-2 py-2 flex items-end gap-2 flex-shrink-0" style={{paddingBottom:'calc(env(safe-area-inset-bottom) + 8px)'}}>
            {isRecording?(
              <div className="flex-1 flex items-center justify-between bg-white rounded-full px-4 py-2 border border-red-200">
                <div className="flex items-center gap-2"><div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"/><span className="text-red-500 text-sm font-medium">{recordingDuration}s</span></div>
                <button onClick={stopRecording} className="text-red-500"><Square className="w-5 h-5 fill-current"/></button>
              </div>
            ):(
              <>
                <div className="flex gap-2 text-gray-500 pb-1">
                  <Smile className="w-6 h-6 cursor-pointer"/>
                  <label className="cursor-pointer"><Paperclip className="w-6 h-6"/><input type="file" className="hidden" accept="image/*,video/*" onChange={handleFileUpload}/></label>
                </div>
                <form onSubmit={handleSendMessage} className="flex-1 flex items-end gap-2">
                  <input type="text" placeholder="Type a message" className="flex-1 bg-white rounded-full px-4 py-2.5 outline-none text-sm" value={inputText} onChange={e=>handleTyping(e.target.value)}/>
                  {inputText.trim()?
                    <button type="submit" className="w-10 h-10 bg-[#008751] text-white rounded-full flex items-center justify-center flex-shrink-0"><Send className="w-5 h-5"/></button>:
                    <button type="button" onClick={startRecording} className="w-10 h-10 bg-[#008751] text-white rounded-full flex items-center justify-center flex-shrink-0"><Mic className="w-5 h-5"/></button>
                  }
                </form>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          <div className="bg-[#008751] px-4 flex items-center justify-between flex-shrink-0" style={{paddingTop:'calc(env(safe-area-inset-top) + 12px)',paddingBottom:'12px'}}>
            <div className="flex items-center gap-2">
              <img src="/logo.png" className="w-8 h-8 object-contain" style={{mixBlendMode:'screen'}} alt="9jaTalk"/>
              <h1 className="text-white text-xl font-bold">9jaTalk</h1>
            </div>
            <div className="flex items-center gap-4 text-white">
              <button onClick={()=>setShowNewChat(true)}><Search className="w-5 h-5"/></button>
              <button onClick={()=>setShowSettings(true)}><MoreVertical className="w-5 h-5"/></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {(activeTab as string)==='chats' && (
              <div>
                <div className="px-3 py-2 bg-white sticky top-0 z-10 border-b border-gray-100">
                  <div className="bg-[#f0f2f5] rounded-full flex items-center px-4 py-2">
                    <Search className="w-4 h-4 text-gray-400 flex-shrink-0"/>
                    <input type="text" placeholder="Search or start new chat" className="bg-transparent outline-none w-full ml-2 text-sm" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}/>
                  </div>
                </div>
                {chats.filter(c=>c.name.toLowerCase().includes(searchQuery.toLowerCase())||c.id.includes(searchQuery)).map(chat=>(
                  <div key={chat.id} onClick={()=>selectChat(chat)} className="flex items-center px-4 py-3 active:bg-gray-100 cursor-pointer border-b border-gray-50">
                    <div className="relative flex-shrink-0">
                      <img src={chat.avatar} className="w-12 h-12 rounded-full object-cover"/>
                      {chat.online&&<div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"/>}
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <h3 className="font-semibold text-gray-900 text-[15px] truncate">{chat.name}</h3>
                        <span className={`text-xs flex-shrink-0 ml-2 ${chat.unread>0?'text-[#008751] font-semibold':'text-gray-400'}`}>{chat.time}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className={`text-sm truncate ${chat.unread>0?'text-gray-800 font-medium':'text-gray-500'}`}>{chat.typing?<span className="text-[#008751]">typing...</span>:chat.lastMessage}</p>
                        {chat.unread>0&&<span className="bg-[#008751] text-white text-[11px] min-w-[20px] h-5 flex items-center justify-center rounded-full font-bold ml-2 px-1">{chat.unread}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {(activeTab as string)==='updates' && (
              <div className="p-4">
                <label className="flex items-center gap-3 cursor-pointer mb-4">
                  <div className="relative">
                    <img src={userProfile?.avatarUrl||`https://i.pravatar.cc/150?u=${userId}`} className="w-12 h-12 rounded-full object-cover"/>
                    <div className="absolute bottom-0 right-0 bg-[#008751] text-white rounded-full p-0.5 border-2 border-white"><Plus className="w-3 h-3"/></div>
                  </div>
                  <div><p className="font-semibold text-gray-800">My Status</p><p className="text-xs text-gray-500">Tap to add status update</p></div>
                  <input type="file" className="hidden" accept="image/*,video/*" onChange={handlePostStatus}/>
                </label>
                {statuses.map(s=>(
                  <button key={s.id} onClick={()=>setViewingStatus(s)} className="flex items-center gap-3 w-full py-2 border-b border-gray-50">
                    <div className="w-12 h-12 rounded-full p-0.5 border-2 border-[#008751]"><img src={s.avatarUrl||`https://i.pravatar.cc/150?u=${s.userId}`} className="w-full h-full rounded-full object-cover"/></div>
                    <div className="text-left"><p className="font-semibold text-gray-800 text-sm">{s.username||`User ${s.userId}`}</p><p className="text-xs text-gray-500">{new Date(s.createdAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</p></div>
                  </button>
                ))}
              </div>
            )}
            {(activeTab as string)==='calls' && (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Phone className="w-12 h-12 mb-3 opacity-30"/>
                <p className="text-sm">No recent calls</p>
              </div>
            )}
          </div>

          <div className="bg-white border-t border-gray-200 flex flex-shrink-0" style={{paddingBottom:'env(safe-area-inset-bottom)'}}>
            {([{id:'chats',label:'Chats',Icon:MessageSquare},{id:'updates',label:'Updates',Icon:CircleDashed},{id:'calls',label:'Calls',Icon:Phone}] as const).map(tab=>(
              <button key={tab.id} onClick={()=>setActiveTab(tab.id)} className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors ${(activeTab as string)===tab.id?'text-[#008751]':'text-gray-500'}`}>
                <tab.Icon className="w-5 h-5"/>
                <span className="text-[11px] font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {viewingStatus&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center" onClick={()=>setViewingStatus(null)}>
            <div className="absolute top-12 left-4 right-4 h-1 bg-white/30 rounded-full overflow-hidden"><motion.div className="h-full bg-white" initial={{width:'0%'}} animate={{width:'100%'}} transition={{duration:5,ease:'linear'}} onAnimationComplete={()=>setViewingStatus(null)}/></div>
            <button className="absolute top-6 right-4 text-white z-10" onClick={()=>setViewingStatus(null)}><X className="w-7 h-7"/></button>
            {viewingStatus.type==='video'?<video src={viewingStatus.content} autoPlay className="max-h-[85vh] max-w-full"/>:<img src={viewingStatus.content} className="max-h-[85vh] max-w-full object-contain"/>}
          </motion.div>
        )}
        {showNewChat&&(
          <motion.div key="nc" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-40 bg-black/50 flex items-end" onClick={()=>setShowNewChat(false)}>
            <motion.div initial={{y:300}} animate={{y:0}} exit={{y:300}} className="bg-white rounded-t-3xl p-6 w-full" onClick={e=>e.stopPropagation()}>
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4"/>
              <h2 className="text-lg font-bold mb-4">New Chat</h2>
              <form onSubmit={handleStartNewChat} className="space-y-3">
                <input type="tel" placeholder="+234 801 234 5678" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#008751]" value={newChatNumber} onChange={e=>setNewChatNumber(e.target.value)} autoFocus/>
                <button type="submit" className="w-full py-3 rounded-xl bg-[#008751] text-white font-semibold">Start Chat</button>
              </form>
              <div style={{height:'env(safe-area-inset-bottom)'}}/>
            </motion.div>
          </motion.div>
        )}
        {showGroupModal&&(
          <motion.div key="gm" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-40 bg-black/50 flex items-end" onClick={()=>setShowGroupModal(false)}>
            <motion.div initial={{y:300}} animate={{y:0}} exit={{y:300}} className="bg-white rounded-t-3xl p-6 w-full" onClick={e=>e.stopPropagation()}>
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4"/>
              <h2 className="text-lg font-bold mb-4">Create Group</h2>
              <form onSubmit={handleCreateGroup} className="space-y-3">
                <input type="text" placeholder="Group name" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#008751]" value={groupName} onChange={e=>setGroupName(e.target.value)} autoFocus/>
                <button type="submit" className="w-full py-3 rounded-xl bg-[#008751] text-white font-semibold">Create Group</button>
              </form>
              <div style={{height:'env(safe-area-inset-bottom)'}}/>
            </motion.div>
          </motion.div>
        )}
        {showSettings&&(
          <motion.div key="st" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-40 bg-black/50 flex items-end" onClick={()=>setShowSettings(false)}>
            <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}} className="bg-white rounded-t-3xl w-full max-h-[90vh] flex flex-col" onClick={e=>e.stopPropagation()}>
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-2"/>
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <h2 className="text-lg font-bold">Settings</h2>
                <button onClick={()=>setShowSettings(false)}><X className="w-5 h-5 text-gray-500"/></button>
              </div>
              <div className="overflow-y-auto flex-1 p-5 space-y-5">
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                    <img src={userProfile?.avatarUrl||`https://i.pravatar.cc/150?u=${userId}`} className="w-full h-full object-cover"/>
                    <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 cursor-pointer"><Paperclip className="text-white w-4 h-4"/><input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload}/></label>
                  </div>
                  <div className="flex-1">
                    <input type="text" defaultValue={userProfile?.username||''} onBlur={e=>handleUpdateProfile({username:e.target.value})} className="w-full text-lg font-bold outline-none border-b-2 border-transparent focus:border-[#008751]" placeholder="Your name"/>
                    <p className="text-sm text-gray-500 mt-1">{userProfile?.phoneNumber}</p>
                  </div>
                </div>
                {[{id:'readReceipts',label:'Read Receipts',desc:'Show when you have read messages'},{id:'lastSeenStatus',label:'Last Seen',desc:'Show your last seen time'},{id:'screenshotProtection',label:'Privacy Mode',desc:'Blur content when app loses focus'}].map(item=>(
                  <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50">
                    <div><p className="font-medium text-gray-800">{item.label}</p><p className="text-sm text-gray-500">{item.desc}</p></div>
                    <div onClick={()=>handleUpdateProfile({[item.id]:userProfile?.[item.id]?0:1})} className={`w-12 h-6 rounded-full cursor-pointer transition-colors relative ${userProfile?.[item.id]?'bg-[#008751]':'bg-gray-300'}`}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow ${userProfile?.[item.id]?'left-7':'left-1'}`}/>
                    </div>
                  </div>
                ))}
                <p className="text-center text-[10px] text-gray-300 pt-4">9jaTalk v1.2 — Designed by Thompson Obosa</p>
              </div>
              <div style={{height:'env(safe-area-inset-bottom)'}}/>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!activeChat && (activeTab as string)==='chats' && (
        <button onClick={()=>setShowNewChat(true)} className="fixed right-4 bg-[#008751] text-white w-14 h-14 rounded-full shadow-xl flex items-center justify-center z-30" style={{bottom:'calc(env(safe-area-inset-bottom) + 72px)'}}>
          <MessageSquare className="w-6 h-6"/>
        </button>
      )}
    </div>
  );
}