import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
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
        setCalling({
          active: true, incoming: true,
          type: signal.payload.callType,
          remoteId: signal.fromId,
          signal: signal.payload.sdp
        });
      } else if (signal.type === 'call:answer') {
        const peer = peersRef.current.get(signal.fromId);
        if (peer) peer.signal(signal.payload.sdp);
        setCalling(prev => prev ? { ...prev, incoming: false } : null);
      } else if (signal.type === 'call:reject' || signal.type === 'call:end') {
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

  const initiateCall = async (type: 'voice' | 'video') => {
    if (!activeChat || !userId) return;
    const rawStream = await navigator.mediaDevices.getUserMedia({ video: type === 'video', audio: true });
    setLocalStream(rawStream);
    const stream = type === 'video' ? getEnhancedStream(rawStream) : rawStream;
    const createPeer = (targetId: string) => {
      const peer = new Peer({ initiator: true, trickle: false, stream });
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
    const peer = new Peer({ initiator: false, trickle: false, stream });
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
          <div className="w-16 h-16 bg-[#008751] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-200">
            <MessageSquare className="text-white w-8 h-8" />
          </div>
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
    <div className={'flex h-[100dvh] bg-[#f0f2f5] overflow-hidden ' + (isPrivacyProtected ? 'blur-sm' : '')}>
      <div className={(isSidebarOpen ? 'flex' : 'hidden md:flex') + ' w-full md:w-[340px] flex-col bg-white border-r border-gray-200 z-10 flex-shrink-0'}>
        <div className='bg-[#f0f2f5] px-4 py-3 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <img src={userProfile?.avatarUrl || ('https://i.pravatar.cc/100?u=' + userId)} className='w-10 h-10 rounded-full object-cover'/>
            <span className='text-sm font-bold text-gray-700'>{userProfile?.username || userProfile?.phoneNumber}</span>
          </div>
          <div className='flex items-center gap-4 text-gray-500'>
            <Users className='w-5 h-5 cursor-pointer' onClick={()=>setShowGroupModal(true)}/>
            <MessageSquare className='w-5 h-5 cursor-pointer' onClick={()=>setShowNewChat(true)}/>
            <Settings className='w-5 h-5 cursor-pointer' onClick={()=>setShowSettings(true)}/>
          </div>
        </div>
        <div className='p-3'>
          <div className='bg-[#f0f2f5] rounded-xl flex items-center px-3 py-2'>
            <Search className='w-4 h-4 text-gray-400'/>
            <input type='text' placeholder='Search or start new chat' className='bg-transparent border-none outline-none w-full ml-3 text-sm' value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}/>
          </div>
        </div>
        <div className='flex-1 overflow-y-auto'>
          {chats.filter(c=>c.name.toLowerCase().includes(searchQuery.toLowerCase())).map(chat=>(
            <div key={chat.id} onClick={()=>selectChat(chat)} className={'flex items-center px-4 py-3 cursor-pointer ' + (activeChat?.id===chat.id ? 'bg-[#f0f2f5]' : 'hover:bg-[#f5f6f6]')}>
              <div className='relative w-12 h-12 flex-shrink-0'>
                <img src={chat.avatar} className='rounded-full w-full h-full object-cover'/>
                {chat.online && <div className='absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full'/>}
              </div>
              <div className='ml-3 flex-1 min-w-0'>
                <div className='flex justify-between items-baseline'>
                  <h3 className='font-medium text-gray-900 truncate'>{chat.name}</h3>
                  <span className={'text-xs ml-2 ' + (chat.unread > 0 ? 'text-[#008751] font-bold' : 'text-gray-400')}>{chat.time}</span>
                </div>
                <p className={'text-sm truncate ' + (chat.unread > 0 ? 'font-medium text-gray-900' : 'text-gray-500')}>{chat.typing ? <span className='text-[#008751] animate-pulse'>typing...</span> : chat.lastMessage}</p>
              </div>
              {chat.unread > 0 && <span className='bg-[#008751] text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold ml-2'>{chat.unread}</span>}
            </div>
          ))}
        </div>
        <div className='p-3 text-center border-t border-gray-100'><p className='text-[9px] text-gray-300'>Designed by Thompson Obosa</p></div>
      </div>
      <div className={(activeChat ? 'flex' : 'hidden md:flex') + ' flex-1 flex-col bg-[#efeae2] relative overflow-hidden'}>
        {activeChat ? (
          <>
            <div className='bg-[#f0f2f5] px-4 py-2 flex items-center justify-between border-l border-gray-200 shadow-sm z-10'>
              <div className='flex items-center'>
                <button onClick={()=>setIsSidebarOpen(true)} className='md:hidden mr-3 text-gray-500'><ArrowLeft className='w-6 h-6'/></button>
                <img src={activeChat.avatar} className='w-10 h-10 rounded-full object-cover mr-3'/>
                <div>
                  <h3 className='font-medium text-gray-900'>{activeChat.name}</h3>
                  <p className='text-[11px] text-gray-500'>{activeChat.typing ? 'typing...' : activeChat.isGroup ? (chatMembers.length + ' members') : 'online'}</p>
                </div>
              </div>
              <div className='flex items-center gap-4 text-gray-500'>
                <Video onClick={()=>initiateCall('video')} className='w-5 h-5 cursor-pointer'/>
                <Phone onClick={()=>initiateCall('voice')} className='w-5 h-5 cursor-pointer'/>
                <Sparkles className='w-5 h-5 text-[#008751]'/>
              </div>
            </div>
            <div className='flex-1 overflow-y-auto p-4 space-y-2 pb-24'>
              <div className='flex justify-center mb-4'><div className='bg-[#fff9c4] text-[11px] text-gray-600 px-4 py-1 rounded shadow-sm flex items-center gap-2'><CheckCheck className='w-3 h-3'/>End-to-end encrypted</div></div>
              <AnimatePresence initial={false}>
                {messages.filter(m => activeChat.isGroup ? (m.receiverId===activeChat.id || m.senderId===userId) : (m.senderId===userId && m.receiverId===activeChat.id) || (m.senderId===activeChat.id && m.receiverId===userId)).map(msg=>(
                  <motion.div key={msg.id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className={'flex ' + (msg.senderId===userId ? 'justify-end' : 'justify-start')}>
                    <div className={'max-w-[75%] rounded-xl shadow-sm relative group ' + (msg.senderId===userId ? 'bg-[#dcf8c6]' : 'bg-white')}>
                      <div className='hidden group-hover:flex absolute -top-6 left-0 gap-1 bg-white rounded-full px-1 py-0.5 shadow-md border border-gray-100 z-10'>
                        {['👍','❤️','😂','😮','😢'].map(e=><button key={e} onClick={()=>handleReact(msg.id,e)} className='hover:scale-125 transition-transform text-xs px-0.5'>{e}</button>)}
                      </div>
                      <div className='px-3 py-2'>
                        {msg.type==='image' ? <img src={msg.content} className='rounded-lg max-w-full max-h-64 object-cover mb-1'/> : msg.type==='audio' ? <div className='flex items-center gap-3 py-1 min-w-[180px]'><div className='w-9 h-9 rounded-full bg-[#008751] flex items-center justify-center text-white'><Mic className='w-4 h-4'/></div><audio src={msg.content} controls className='h-8 w-full max-w-[140px]'/></div> : <p className='text-[15px] leading-relaxed pr-6'>{msg.content}</p>}
                        {translatedMessages[msg.id] && <p className='text-[12px] italic text-[#005a32] mt-1 pt-1 border-t border-black/10'><span className='text-[9px] uppercase font-black mr-1 opacity-60'>Translated:</span>{translatedMessages[msg.id]}</p>}
                        {translatingId===msg.id && <p className='text-[10px] animate-pulse text-gray-400 mt-1'>Translating...</p>}
                        <div className='flex items-center justify-end gap-1 mt-1'>
                          <span className='text-[10px] text-gray-400'>{formatTime(msg.timestamp)}</span>
                          {msg.senderId===userId && (msg.status==='read' ? <CheckCheck className='w-3 h-3 text-blue-400'/> : <Check className='w-3 h-3 text-gray-400'/>)}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef}/>
            </div>
            {aiSuggestions.length > 0 && (
              <div className='absolute bottom-20 left-0 right-0 flex gap-2 overflow-x-auto px-4 pb-2 z-10'>
                {aiSuggestions.map((s,i)=><button key={i} onClick={()=>{setInputText(s);setAiSuggestions([]);}} className='bg-white/90 border border-black/5 px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap hover:bg-[#008751] hover:text-white transition-all shadow-sm flex-shrink-0'>{s}</button>)}
              </div>
            )}
            <div className='bg-[#f0f2f5] p-3 flex items-center absolute bottom-0 left-0 right-0 z-10 border-t border-gray-200'>
              {isRecording ? (
                <div className='flex-1 flex items-center justify-between bg-white rounded-full px-6 py-3 shadow-md border border-red-100 mx-2'>
                  <div className='flex items-center gap-3'><div className='w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse'/><span className='text-red-500 font-bold'>Recording: {recordingDuration}s</span></div>
                  <button onClick={stopRecording} className='text-red-500 bg-red-50 p-2 rounded-full'><Square className='w-5 h-5 fill-current'/></button>
                </div>
              ) : (
                <>
                  <div className='flex gap-3 px-2 text-gray-500'>
                    <Smile className='w-6 h-6 cursor-pointer'/>
                    <label className='cursor-pointer'><Paperclip className='w-6 h-6'/><input type='file' className='hidden' accept='image/*,video/*' onChange={handleFileUpload}/></label>
                  </div>
                  <form onSubmit={handleSendMessage} className='flex-1 flex items-center mx-2'>
                    <input type='text' placeholder='Type a message' className='w-full bg-white rounded-xl px-4 py-3 outline-none shadow-sm text-sm' value={inputText} onChange={e=>handleTyping(e.target.value)}/>
                    {inputText.trim() ? <button type='submit' className='ml-3 bg-[#008751] text-white p-3 rounded-full hover:bg-[#006b40] shadow-lg'><Send className='w-5 h-5 fill-current'/></button> : <button type='button' onClick={startRecording} className='ml-3 text-gray-500 p-2 rounded-full'><Mic className='w-7 h-7'/></button>}
                  </form>
                </>
              )}
            </div>
          </>
        ) : (
          <div className='flex-1 flex flex-col items-center justify-center p-12 text-center'>
            <div className='w-28 h-28 bg-gray-100 rounded-full flex items-center justify-center mb-6 opacity-40'><MessageSquare className='w-14 h-14 text-gray-400'/></div>
            <h2 className='text-2xl font-light text-gray-600 mb-3'>Select a chat to start messaging</h2>
            <p className='text-gray-400 text-sm max-w-xs'>Send and receive messages, photos, videos and voice notes.</p>
            <div className='flex items-center gap-2 text-xs text-gray-400 mt-6'><CheckCheck className='w-4 h-4'/> End-to-end encrypted</div>
            <p className='mt-8 text-[10px] text-gray-300'>Designed by Thompson Obosa</p>
          </div>
        )}
      </div>
      <AnimatePresence>
        {showNewChat && (
          <motion.div key='nc' initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className='fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4' onClick={()=>setShowNewChat(false)}>
            <motion.div initial={{scale:0.9}} animate={{scale:1}} exit={{scale:0.9}} className='bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl' onClick={e=>e.stopPropagation()}>
              <h2 className='text-lg font-bold mb-4'>New Chat</h2>
              <form onSubmit={handleStartNewChat} className='space-y-3'>
                <input type='tel' placeholder='Phone e.g. +2348012345678' className='w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#008751]' value={newChatNumber} onChange={e=>setNewChatNumber(e.target.value)} autoFocus/>
                <div className='flex gap-2'>
                  <button type='button' onClick={()=>setShowNewChat(false)} className='flex-1 py-2 rounded-xl border border-gray-200 text-gray-600'>Cancel</button>
                  <button type='submit' className='flex-1 py-2 rounded-xl bg-[#008751] text-white font-semibold'>Start Chat</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
        {showGroupModal && (
          <motion.div key='gm' initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className='fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4' onClick={()=>setShowGroupModal(false)}>
            <motion.div initial={{scale:0.9}} animate={{scale:1}} exit={{scale:0.9}} className='bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl' onClick={e=>e.stopPropagation()}>
              <h2 className='text-lg font-bold mb-4'>Create Group</h2>
              <form onSubmit={handleCreateGroup} className='space-y-3'>
                <input type='text' placeholder='Group name' className='w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#008751]' value={groupName} onChange={e=>setGroupName(e.target.value)} autoFocus/>
                <div className='flex gap-2'>
                  <button type='button' onClick={()=>setShowGroupModal(false)} className='flex-1 py-2 rounded-xl border border-gray-200 text-gray-600'>Cancel</button>
                  <button type='submit' className='flex-1 py-2 rounded-xl bg-[#008751] text-white font-semibold'>Create</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
        {showSettings && (
          <motion.div key='st' initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className='fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4' onClick={()=>setShowSettings(false)}>
            <motion.div initial={{scale:0.95,y:20}} animate={{scale:1,y:0}} exit={{scale:0.95,y:20}} className='bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]' onClick={e=>e.stopPropagation()}>
              <div className='flex items-center justify-between px-6 py-4 border-b border-gray-100'>
                <h2 className='text-lg font-bold'>Settings</h2>
                <button onClick={()=>setShowSettings(false)}><X className='w-5 h-5 text-gray-500'/></button>
              </div>
              <div className='flex border-b border-gray-100'>
                {(['account','privacy','notifications','backup']).map(tab=>(
                  <button key={tab} onClick={()=>setActiveSettingsTab(tab as any)} className={'flex-1 py-3 text-sm font-medium capitalize ' + (activeSettingsTab===tab ? 'text-[#008751] border-b-2 border-[#008751]' : 'text-gray-500')}>{tab}</button>
                ))}
              </div>
              <div className='flex-1 overflow-y-auto p-6 space-y-5'>
                {activeSettingsTab==='account' && (
                  <div className='space-y-5'>
                    <div className='flex items-center gap-4'>
                      <div className='relative w-20 h-20 rounded-full overflow-hidden bg-gray-200'>
                        <img src={userProfile?.avatarUrl || ('https://i.pravatar.cc/150?u=' + userId)} className='w-full h-full object-cover'/>
                        <label className='absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 cursor-pointer'><Paperclip className='text-white w-5 h-5'/><input type='file' className='hidden' accept='image/*' onChange={handleAvatarUpload}/></label>
                      </div>
                      <div className='flex-1'>
                        <label className='text-xs font-bold text-gray-400 uppercase'>Name</label>
                        <input type='text' defaultValue={userProfile?.username||''} onBlur={e=>handleUpdateProfile({username:e.target.value})} className='w-full text-lg font-semibold outline-none border-b-2 border-transparent focus:border-[#008751] pb-1 mt-1'/>
                      </div>
                    </div>
                    <div><label className='text-xs font-bold text-gray-400 uppercase'>Phone</label><p className='text-gray-700 mt-1'>{userProfile?.phoneNumber}</p></div>
                    <div><label className='text-xs font-bold text-gray-400 uppercase'>Email</label><input type='email' defaultValue={userProfile?.email||''} onBlur={e=>handleUpdateProfile({email:e.target.value})} placeholder='email@example.com' className='w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 mt-1 outline-none focus:ring-2 focus:ring-[#008751]'/></div>
                  </div>
                )}
                {activeSettingsTab==='privacy' && (
                  <div className='space-y-5'>
                    {[{id:'readReceipts',label:'Read Receipts',desc:'Show when you have read messages'},{id:'lastSeenStatus',label:'Last Seen',desc:'Show your last seen time'},{id:'screenshotProtection',label:'Privacy Mode',desc:'Blur content when app loses focus'}].map(item=>(
                      <div key={item.id} className='flex items-center justify-between'>
                        <div><p className='font-medium text-gray-700'>{item.label}</p><p className='text-sm text-gray-400'>{item.desc}</p></div>
                        <div onClick={()=>handleUpdateProfile({[item.id]:userProfile?.[item.id]?0:1})} className={'w-12 h-6 rounded-full cursor-pointer transition-colors relative ' + (userProfile?.[item.id] ? 'bg-[#008751]' : 'bg-gray-300')}>
                          <div className={'absolute top-1 w-4 h-4 rounded-full bg-white transition-all ' + (userProfile?.[item.id] ? 'left-7' : 'left-1')}/>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {activeSettingsTab==='notifications' && (
                  <div className='flex items-center justify-between'>
                    <div><p className='font-medium text-gray-700'>Push Notifications</p><p className='text-sm text-gray-400'>Receive message notifications</p></div>
                    <div onClick={()=>handleUpdateProfile({pushEnabled:userProfile?.pushEnabled?0:1})} className={'w-12 h-6 rounded-full cursor-pointer transition-colors relative ' + (userProfile?.pushEnabled ? 'bg-[#008751]' : 'bg-gray-300')}>
                      <div className={'absolute top-1 w-4 h-4 rounded-full bg-white transition-all ' + (userProfile?.pushEnabled ? 'left-7' : 'left-1')}/>
                    </div>
                  </div>
                )}
                {activeSettingsTab==='backup' && (
                  <div className='bg-gray-50 rounded-2xl p-5'>
                    <p className='font-bold text-gray-700 mb-2'>Chat Backup</p>
                    <p className='text-sm text-gray-500 mb-4'>Messages stored securely in Firebase. No manual backup needed.</p>
                    <div className='flex items-center gap-2 text-[#008751]'><CheckCheck className='w-4 h-4'/><span className='text-sm font-medium'>Auto-synced to Firebase</span></div>
                  </div>
                )}
              </div>
              <div className='px-6 py-3 border-t border-gray-100 text-center'><p className='text-[9px] text-gray-300'>9jaTalk v1.2 - Designed by Thompson Obosa</p></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
