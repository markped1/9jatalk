import AgoraRTC, {
  IAgoraRTCClient,
  ILocalAudioTrack,
  ILocalVideoTrack,
  IRemoteAudioTrack,
  IRemoteVideoTrack,
  UID,
} from 'agora-rtc-sdk-ng';

const AGORA_APP_ID = 'bfb937cbcc2e49988710b544e85ce49e';

// Use null token for testing (enable App Certificate later for production)
const TOKEN = null;

let client: IAgoraRTCClient | null = null;
let localAudioTrack: ILocalAudioTrack | null = null;
let localVideoTrack: ILocalVideoTrack | null = null;

export type RemoteUser = {
  uid: UID;
  audioTrack?: IRemoteAudioTrack;
  videoTrack?: IRemoteVideoTrack;
};

export const initAgora = () => {
  client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
  AgoraRTC.setLogLevel(4); // Error only
  return client;
};

export const getClient = () => client;

export const joinChannel = async (
  channelName: string,
  uid: string,
  withVideo: boolean,
  onUserJoined: (user: RemoteUser) => void,
  onUserLeft: (uid: UID) => void
) => {
  if (!client) initAgora();

  // Join the channel - use uid hash as numeric UID for Agora
  const numericUid = Math.abs(uid.split('').reduce((a, c) => (a << 5) - a + c.charCodeAt(0), 0)) % 100000;

  await client!.join(AGORA_APP_ID, channelName, TOKEN, numericUid);

  // Create local tracks
  if (withVideo) {
    [localAudioTrack, localVideoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
      { encoderConfig: 'music_standard' },
      { encoderConfig: '480p_1', facingMode: 'user' }
    );
    await client!.publish([localAudioTrack, localVideoTrack]);
  } else {
    localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({ encoderConfig: 'music_standard' });
    await client!.publish([localAudioTrack]);
  }

  // Handle remote users
  client!.on('user-published', async (user, mediaType) => {
    await client!.subscribe(user, mediaType);
    if (mediaType === 'audio') {
      user.audioTrack?.play();
    }
    onUserJoined({
      uid: user.uid,
      audioTrack: user.audioTrack,
      videoTrack: user.videoTrack,
    });
  });

  client!.on('user-unpublished', (user) => {
    onUserLeft(user.uid);
  });

  client!.on('user-left', (user) => {
    onUserLeft(user.uid);
  });

  return { localAudioTrack, localVideoTrack, numericUid };
};

export const leaveChannel = async () => {
  localAudioTrack?.close();
  localVideoTrack?.close();
  localAudioTrack = null;
  localVideoTrack = null;
  if (client) {
    await client.leave();
  }
};

export const toggleMuteAudio = (mute: boolean) => {
  localAudioTrack?.setEnabled(!mute);
};

export const toggleMuteVideo = (mute: boolean) => {
  localVideoTrack?.setEnabled(!mute);
};

export const getLocalVideoTrack = () => localVideoTrack;
export const getLocalAudioTrack = () => localAudioTrack;

export const startCall = joinChannel;
export const endCall = leaveChannel;

export const playLocalVideo = (container: HTMLElement | null) => {
  if (container && localVideoTrack) {
    localVideoTrack.play(container);
  }
};

// Generate a channel name from two user IDs (sorted so both get same channel)
export const getCallChannel = (uid1: string, uid2: string) =>
  'call_' + [uid1, uid2].sort().join('_').replace(/[^a-zA-Z0-9_]/g, '').substring(0, 64);
