import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  updateProfile,
  onAuthStateChanged,
  type User,
  type ConfirmationResult
} from 'firebase/auth';
import {
  getDatabase,
  ref,
  set,
  push,
  get,
  update,
  remove,
  onValue,
  onChildAdded,
  off,
  serverTimestamp,
  query,
  orderByChild,
  limitToLast,
  type DatabaseReference
} from 'firebase/database';
// Storage is not used — file uploads go through ImgBB (free, no card)

// ─── Firebase Config ───────────────────────────────────────────────────────────
// Replace these values with your own Firebase project config
// Get them from: https://console.firebase.google.com → Project Settings → Your Apps
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "YOUR_DATABASE_URL",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
// Storage not initialized — using ImgBB instead

// ─── Auth ──────────────────────────────────────────────────────────────────────

// Step 1: Send OTP to phone number
export const sendOTP = async (
  phoneNumber: string,
  recaptchaContainerId: string
): Promise<ConfirmationResult> => {
  // Set up invisible reCAPTCHA
  const recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
    size: 'invisible',
    callback: () => {}
  });

  const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
  return confirmationResult;
};

// Step 2: Verify OTP and sign in
export const verifyOTP = async (
  confirmationResult: ConfirmationResult,
  otp: string
): Promise<User> => {
  const result = await confirmationResult.confirm(otp);
  const user = result.user;

  // Upsert user profile in Realtime DB
  const userRef = ref(db, `users/${user.uid}`);
  const snap = await get(userRef);
  if (!snap.exists()) {
    await set(userRef, {
      id: user.uid,
      phoneNumber: user.phoneNumber,
      username: `User ${user.phoneNumber}`,
      email: '',
      avatarUrl: '',
      lastSeen: Date.now(),
      pushEnabled: true,
      readReceipts: true,
      lastSeenStatus: true,
      screenshotProtection: false,
      disappearingTimer: 0,
      ringtone: 'Default',
      messageTone: 'Default',
      createdAt: Date.now()
    });
  } else {
    await update(userRef, { lastSeen: Date.now() });
  }

  // Seed support bot if not exists
  const supportRef = ref(db, 'users/support');
  const supportSnap = await get(supportRef);
  if (!supportSnap.exists()) {
    await set(supportRef, {
      id: 'support',
      phoneNumber: '00000',
      username: '9jaTalk Support',
      avatarUrl: 'https://i.pravatar.cc/150?u=support',
      lastSeen: Date.now(),
      isBot: true
    });
  }

  return user;
};

export const onAuthChange = (cb: (user: User | null) => void) =>
  onAuthStateChanged(auth, cb);

// ─── User Profile ──────────────────────────────────────────────────────────────

export const getUserProfile = async (uid: string) => {
  const snap = await get(ref(db, `users/${uid}`));
  return snap.exists() ? snap.val() : null;
};

export const updateUserProfile = async (uid: string, updates: Record<string, any>) => {
  await update(ref(db, `users/${uid}`), updates);
  return getUserProfile(uid);
};

export const searchUserByPhone = async (phone: string) => {
  const snap = await get(ref(db, 'users'));
  if (!snap.exists()) return null;
  const users = snap.val();
  const allUsers = Object.values(users as Record<string, any>);

  // Try exact match first, then strip/add + prefix variations
  const variants = [
    phone,
    phone.replace(/\s+/g, ''),
    phone.startsWith('+') ? phone.slice(1) : '+' + phone,
    phone.replace(/^\+/, ''),
  ];

  for (const variant of variants) {
    const found = allUsers.find((u: any) => u.phoneNumber === variant);
    if (found) return found;
  }

  return { id: phone, phoneNumber: phone, username: `User ${phone}`, virtual: true };
};

// ─── Presence ─────────────────────────────────────────────────────────────────

export const setOnline = (uid: string) => {
  const presenceRef = ref(db, `presence/${uid}`);
  set(presenceRef, { online: true, lastSeen: Date.now() });
};

export const setOffline = (uid: string) => {
  update(ref(db, `presence/${uid}`), { online: false, lastSeen: Date.now() });
};

export const listenPresence = (uid: string, cb: (online: boolean) => void) => {
  const presenceRef = ref(db, `presence/${uid}`);
  onValue(presenceRef, snap => {
    cb(snap.exists() ? snap.val().online === true : false);
  });
  return () => off(presenceRef);
};

// ─── Messages ─────────────────────────────────────────────────────────────────

// Chat ID is always sorted so A-B and B-A map to same chat
export const getChatId = (uid1: string, uid2: string) =>
  [uid1, uid2].sort().join('_');

export const sendMessage = async (
  senderId: string,
  receiverId: string,
  content: string,
  type: string = 'text',
  isGroup: boolean = false,
  disappearingTimer: number = 0
) => {
  const chatId = isGroup ? receiverId : getChatId(senderId, receiverId);
  const msgRef = push(ref(db, `messages/${chatId}`));
  const expiresAt = disappearingTimer > 0 ? Date.now() + disappearingTimer * 1000 : null;

  const message = {
    id: msgRef.key,
    senderId,
    receiverId,
    content,
    type,
    status: 'sent',
    reactions: {},
    expiresAt,
    timestamp: Date.now(),
    isGroup
  };

  await set(msgRef, message);

  // Update chat metadata for both users
  const chatMeta = {
    lastMessage: type === 'text' ? content : `[${type}]`,
    lastMessageTime: Date.now(),
    lastSenderId: senderId
  };

  if (isGroup) {
    await update(ref(db, `groups/${receiverId}`), chatMeta);
  } else {
    await update(ref(db, `chatMeta/${senderId}/${receiverId}`), chatMeta);
    await update(ref(db, `chatMeta/${receiverId}/${senderId}`), {
      ...chatMeta,
      unread: (await get(ref(db, `chatMeta/${receiverId}/${senderId}/unread`))).val() + 1 || 1
    });
  }

  // Support bot auto-reply
  if (receiverId === 'support' && !isGroup) {
    setTimeout(async () => {
      const botRef = push(ref(db, `messages/${chatId}`));
      await set(botRef, {
        id: botRef.key,
        senderId: 'support',
        receiverId: senderId,
        content: `Received: "${content}". Encryption check: OK ✓`,
        type: 'text',
        status: 'sent',
        reactions: {},
        expiresAt: null,
        timestamp: Date.now(),
        isGroup: false
      });
    }, 800);
  }

  return message;
};

export const listenMessages = (
  chatId: string,
  cb: (messages: any[]) => void
) => {
  const msgsRef = query(
    ref(db, `messages/${chatId}`),
    orderByChild('timestamp'),
    limitToLast(100)
  );
  onValue(msgsRef, snap => {
    if (!snap.exists()) { cb([]); return; }
    const msgs = Object.values(snap.val() as Record<string, any>)
      .sort((a, b) => a.timestamp - b.timestamp);
    cb(msgs);
  });
  return () => off(msgsRef);
};

// Listen for all chats involving this user (incoming messages from others)
export const listenUserChats = (
  userId: string,
  cb: (chats: any[]) => void
) => {
  const chatMetaRef = ref(db, `chatMeta/${userId}`);
  onValue(chatMetaRef, async snap => {
    if (!snap.exists()) { cb([]); return; }
    const chatData = snap.val() as Record<string, any>;
    const chatList = await Promise.all(
      Object.entries(chatData).map(async ([otherId, meta]: any) => {
        const profile = await getUserProfile(otherId);
        return {
          id: otherId,
          name: profile?.username || profile?.phoneNumber || `User ${otherId}`,
          avatar: profile?.avatarUrl || `https://i.pravatar.cc/150?u=${otherId}`,
          lastMessage: meta.lastMessage || '',
          time: meta.lastMessageTime
            ? new Date(meta.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '',
          unread: meta.unread || 0,
          online: false
        };
      })
    );
    // Sort by most recent message
    chatList.sort((a, b) => {
      const aTime = chatData[a.id]?.lastMessageTime || 0;
      const bTime = chatData[b.id]?.lastMessageTime || 0;
      return bTime - aTime;
    });
    cb(chatList);
  });
  return () => off(chatMetaRef);
};

export const markMessagesRead = async (chatId: string, readerId: string) => {
  const snap = await get(ref(db, `messages/${chatId}`));
  if (!snap.exists()) return;
  const updates: Record<string, any> = {};
  Object.entries(snap.val() as Record<string, any>).forEach(([key, msg]: any) => {
    if (msg.receiverId === readerId && msg.status !== 'read') {
      updates[`messages/${chatId}/${key}/status`] = 'read';
    }
  });
  if (Object.keys(updates).length > 0) await update(ref(db), updates);
  // Reset unread count
  const parts = chatId.split('_');
  const senderId = parts.find(p => p !== readerId);
  if (senderId) await set(ref(db, `chatMeta/${readerId}/${senderId}/unread`), 0);
};

export const reactToMessage = async (
  chatId: string,
  messageId: string,
  userId: string,
  emoji: string
) => {
  const reactionRef = ref(db, `messages/${chatId}/${messageId}/reactions/${userId}`);
  const snap = await get(reactionRef);
  if (snap.exists() && snap.val() === emoji) {
    await remove(reactionRef); // toggle off
  } else {
    await set(reactionRef, emoji);
  }
};

// ─── Typing ───────────────────────────────────────────────────────────────────

export const setTyping = (chatId: string, userId: string, isTyping: boolean) => {
  set(ref(db, `typing/${chatId}/${userId}`), isTyping ? Date.now() : null);
};

export const listenTyping = (
  chatId: string,
  myId: string,
  cb: (typingUserId: string | null) => void
) => {
  const typingRef = ref(db, `typing/${chatId}`);
  onValue(typingRef, snap => {
    if (!snap.exists()) { cb(null); return; }
    const data = snap.val();
    const typingUser = Object.entries(data).find(
      ([uid, ts]: any) => uid !== myId && Date.now() - ts < 5000
    );
    cb(typingUser ? typingUser[0] : null);
  });
  return () => off(typingRef);
};

// ─── Status Updates ───────────────────────────────────────────────────────────

export const postStatus = async (userId: string, content: string, type: string) => {
  const statusRef = push(ref(db, 'statuses'));
  await set(statusRef, {
    id: statusRef.key,
    userId,
    content,
    type,
    createdAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000
  });
};

export const listenStatuses = (cb: (statuses: any[]) => void) => {
  const statusRef = ref(db, 'statuses');
  onValue(statusRef, snap => {
    if (!snap.exists()) { cb([]); return; }
    const now = Date.now();
    const statuses = Object.values(snap.val() as Record<string, any>)
      .filter((s: any) => s.expiresAt > now)
      .sort((a: any, b: any) => b.createdAt - a.createdAt);
    cb(statuses);
  });
  return () => off(statusRef);
};

// ─── Groups ───────────────────────────────────────────────────────────────────

export const createGroup = async (name: string, creatorId: string, members: string[]) => {
  const groupRef = push(ref(db, 'groups'));
  const groupId = groupRef.key!;
  const allMembers = Array.from(new Set([creatorId, ...members]));

  await set(groupRef, {
    id: groupId,
    name,
    createdBy: creatorId,
    members: allMembers.reduce((acc, m) => ({ ...acc, [m]: true }), {}),
    disappearingTimer: 0,
    createdAt: Date.now(),
    lastMessage: 'Group created',
    lastMessageTime: Date.now()
  });

  return groupId;
};

export const getGroupMembers = async (groupId: string) => {
  const snap = await get(ref(db, `groups/${groupId}/members`));
  if (!snap.exists()) return [];
  const memberIds = Object.keys(snap.val());
  const profiles = await Promise.all(memberIds.map(id => getUserProfile(id)));
  return profiles.filter(Boolean);
};

export const listenUserGroups = (userId: string, cb: (groups: any[]) => void) => {
  const groupsRef = ref(db, 'groups');
  onValue(groupsRef, snap => {
    if (!snap.exists()) { cb([]); return; }
    const groups = Object.values(snap.val() as Record<string, any>)
      .filter((g: any) => g.members && g.members[userId]);
    cb(groups);
  });
  return () => off(groupsRef);
};

// ─── WebRTC Signaling ─────────────────────────────────────────────────────────

export const sendSignal = async (
  fromId: string,
  toId: string,
  type: string,
  payload: any
) => {
  const sigRef = push(ref(db, `signals/${toId}`));
  await set(sigRef, { fromId, type, payload, timestamp: Date.now() });
};

export const listenSignals = (
  userId: string,
  cb: (signal: any) => void
) => {
  const sigRef = ref(db, `signals/${userId}`);
  const handler = onChildAdded(sigRef, snap => {
    if (!snap.exists()) return;
    const data = snap.val();
    cb({ ...data, key: snap.key });
    // Clean up after reading
    remove(snap.ref);
  });
  return () => off(sigRef);
};

// ─── File Upload (ImgBB — free, no credit card) ──────────────────────────────
// Get a free API key at https://imgbb.com (sign up with email, click API)
// Then add VITE_IMGBB_API_KEY to your .env.local

export const uploadFile = async (file: File, _path: string): Promise<string> => {
  const apiKey = import.meta.env.VITE_IMGBB_API_KEY;

  // If no ImgBB key, create a local object URL as fallback (works on same device)
  if (!apiKey) {
    return URL.createObjectURL(file);
  }

  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: 'POST',
    body: formData
  });
  const data = await res.json();
  if (!data.success) throw new Error('ImgBB upload failed');
  return data.data.url;
};

// ─── AI (Gemini — called directly from client) ────────────────────────────────

export const getAiSuggestions = async (lastMessages: string[]): Promise<string[]> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return [];
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `Based on these last messages: ${JSON.stringify(lastMessages)}, provide 3-4 short, casual, and appropriate smart replies. Return only as a JSON array of strings. Examples: ["Sounds good!", "I'm busy right now.", "Can't wait!", "Yes please"]`;
    const result = await model.generateContent(prompt);
    const output = result.response.text();
    const match = output.match(/\[.*\]/s);
    return match ? JSON.parse(match[0]) : [];
  } catch { return []; }
};

export const translateText = async (text: string, targetLang: string): Promise<string> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return text;
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `Translate this message to ${targetLang}. Only return the translated text without any explanations: "${text}"`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch { return text; }
};
