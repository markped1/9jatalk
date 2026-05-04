import { io, Socket } from "socket.io-client";

class SocketService {
  private socket: Socket | null = null;
  private userId: string | null = null;

  connect(userId: string) {
    this.userId = userId;
    this.socket = io(window.location.origin);
    
    this.socket.on("connect", () => {
      console.log("Connected to server");
      this.socket?.emit("auth", userId);
    });

    return this.socket;
  }

  getSocket() {
    return this.socket;
  }

  disconnect() {
    this.socket?.disconnect();
  }

  sendMessage(receiverId: string, content: string, type: string = 'text', isGroup: boolean = false) {
    this.socket?.emit("message:send", { receiverId, content, type, isGroup });
  }

  markAsRead(senderId: string, receiverId: string) {
    this.socket?.emit("message:read", { senderId, receiverId });
  }

  sendTypingStatus(receiverId: string, isTyping: boolean) {
    this.socket?.emit("status:typing", { receiverId, isTyping });
  }

  initiateCall(receiverId: string, type: 'voice' | 'video', signal: any, isGroup: boolean = false) {
    this.socket?.emit("call:initiate", { receiverId, type, signal, isGroup });
  }

  answerCall(receiverId: string, signal: any, isGroup: boolean = false, groupId?: string) {
    this.socket?.emit("call:answer", { receiverId, signal, isGroup, groupId });
  }

  rejectCall(receiverId: string) {
    this.socket?.emit("call:reject", { receiverId });
  }

  endCall(receiverId: string) {
    this.socket?.emit("call:end", { receiverId });
  }
}

export const socketService = new SocketService();
