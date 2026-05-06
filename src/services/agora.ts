import AgoraRTC, {
  IAgoraRTCClient,
  ILocalAudioTrack,
  ILocalVideoTrack,
  IRemoteAudioTrack,
  IRemoteVideoTrack,
  UID
} from 'agora-rtc-sdk-ng';

// Your Agora App ID
const AGORA_APP_ID = 'bfb937cbcc2e49988710b544e85ce49e';

// Configure Agora log level (0=DEBUG, 1=INFO, 2=WARNING, 3=ERROR, 4=NONE)
AgoraRTC.setLogLevel(3);

let client: IAgoraRTCClient | null = null;
let localAudioTrack: ILocalAudioTrack | null = null;
let localVideoTrack: ILocalVideoTrack | null = null;

export type CallEventHandlers = {
  onUserJoined: (uid: UID, audioTrack?: IRemoteAudioTrack, videoTrack?: IRemoteVideoTrack) => void;
  onUserLeft: (uid: UID) => void;
  onError: (err: any) => void;
};

// Generate a channel name from two user IDs (sorted so both get same channel)
export const getCallChannel = (uid1: string, uid2: string): string => {
  return [uid1, uid2].sort().join('_call_');
};

// Convert Firebase UID string to numeric UID for Agora
// Agora requires numeric UIDs - we use a hash
export const uidToNumber = (uid: string): number => {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    const char = uid.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash) % 100000000; // Keep it positive and reasonable
};

export const startCall = async (
  channelName: string,
  userId: string,
  callType: 'voice' | 'video',
  handlers: CallEventHandlers
): Promise<{ audioTrack: ILocalAudioTrack | null; videoTrack: ILocalVideoTrack | null }> => {
  // Create client
  client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

  // Set up event handlers
  client.on('user-published', async (user, mediaType) => {
    await client!.subscribe(user, mediaType);
    if (mediaType === 'audio') {
      user.audioTrack?.play();
      handlers.onUserJoined(user.uid, user.audioTrack, undefined);
    }
    if (mediaType === 'video') {
      handlers.onUserJoined(user.uid, undefined, user.videoTrack);
    }
  });

  client.on('user-unpublished', (user) => {
    handlers.onUserLeft(user.uid);
  });

  client.on('user-left', (user) => {
    handlers.onUserLeft(user.uid);
  });

  // Join channel - use null token for testing (set up token server for production)
  const numericUid = uidToNumber(userId);
  await client.join(AGORA_APP_ID, channelName, null, numericUid);

  // Create and publish local tracks
  localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
    encoderConfig: 'music_standard',
    AEC: true,
    ANS: true,
    AGC: true
  });

  if (callType === 'video') {
    localVideoTrack = await AgoraRTC.createCameraVideoTrack({
      encoderConfig: '480p_1',
      facingMode: 'user'
    });
    await client.publish([localAudioTrack, localVideoTrack]);
  } else {
    await client.publish([localAudioTrack]);
  }

  return { audioTrack: localAudioTrack, videoTrack: localVideoTrack };
};

export const endCall = async (): Promise<void> => {
  if (localAudioTrack) {
    localAudioTrack.stop();
    localAudioTrack.close();
    localAudioTrack = null;
  }
  if (localVideoTrack) {
    localVideoTrack.stop();
    localVideoTrack.close();
    localVideoTrack = null;
  }
  if (client) {
    await client.leave();
    client = null;
  }
};

export const toggleMuteAudio = (mute: boolean): void => {
  if (localAudioTrack) {
    localAudioTrack.setEnabled(!mute);
  }
};

export const toggleMuteVideo = (mute: boolean): void => {
  if (localVideoTrack) {
    localVideoTrack.setEnabled(!mute);
  }
};

export const playLocalVideo = (element: HTMLElement): void => {
  if (localVideoTrack) {
    localVideoTrack.play(element);
  }
};

export const getLocalVideoTrack = (): ILocalVideoTrack | null => localVideoTrack;
export const getLocalAudioTrack = (): ILocalAudioTrack | null => localAudioTrack;
