import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  stream?: MediaStream;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: Date;
}

interface RoomContextType {
  roomId: string | null;
  participants: Participant[];
  chatMessages: ChatMessage[];
  localStream: MediaStream | null;
  isAudioMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  createRoom: () => Promise<string>;
  joinRoom: (roomId: string) => Promise<void>;
  leaveRoom: () => void;
  sendChatMessage: (text: string) => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => Promise<void>;
  isJoining: boolean;
}

const RoomContext = createContext<RoomContextType | undefined>(undefined);

export const useRoom = () => {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error("useRoom must be used within an RoomProvider");
  }
  return context;
};

interface RoomProviderProps {
  children: ReactNode;
}

export const RoomProvider = ({ children }: RoomProviderProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenShareStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (screenShareStreamRef.current) {
        screenShareStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  const createRoom = async () => {
    if (!user) {
      toast.error("You must be logged in to create a room");
      navigate("/login");
      return "";
    }

    try {
      const newRoomId = crypto.randomUUID();
      toast.success(`Room created successfully!`);
      return newRoomId;
    } catch (error) {
      console.error("Error creating room:", error);
      toast.error("Failed to create room. Please try again.");
      return "";
    }
  };

  const fetchRoomParticipants = async (roomId: string) => {
    if (!roomId) return;

    try {
      const { data, error } = await supabase
        .from('room_participants')
        .select(`
          id,
          user_id,
          auth.users!inner (
            id,
            email
          )
        `)
        .eq('room_id', roomId)
        .eq('is_active', true);

      if (error) {
        console.error("Error fetching participants:", error);
        return;
      }

      const roomParticipants = data
        .filter(p => p.user_id !== user?.id)
        .map(p => {
          const userData = p.auth?.users || {};
          const email = userData.email || "Unknown User";
          const name = email.split('@')[0];
          
          return {
            id: p.user_id,
            name: name,
            avatar: `https://avatar.vercel.sh/${email}?size=128`,
            isMuted: false,
            isVideoOff: false,
            isScreenSharing: false
          };
        });

      if (roomParticipants.length > 0) {
        setParticipants(prev => {
          const existingIds = prev.map(p => p.id);
          const newParticipants = roomParticipants.filter(p => !existingIds.includes(p.id));
          return [...prev, ...newParticipants];
        });
      }
    } catch (err) {
      console.error("Error processing participants:", err);
    }
  };

  const initLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      });
      
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsAudioMuted(false);
      setIsVideoOff(false);
      
      if (user) {
        setParticipants(prev => {
          const isExisting = prev.some(p => p.id === user.id);
          if (isExisting) {
            return prev.map(p => 
              p.id === user.id 
                ? { 
                    ...p, 
                    stream, 
                    isMuted: false, 
                    isVideoOff: false, 
                    isScreenSharing: false 
                  } 
                : p
            );
          } else {
            return [
              ...prev,
              {
                id: user.id,
                name: user.name,
                avatar: user.avatar,
                stream,
                isMuted: false,
                isVideoOff: false,
                isScreenSharing: false
              }
            ];
          }
        });
      }
      
      return stream;
    } catch (err) {
      console.error("Error accessing media devices:", err);
      
      try {
        const audioOnlyStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false
        });
        
        localStreamRef.current = audioOnlyStream;
        setLocalStream(audioOnlyStream);
        setIsAudioMuted(false);
        setIsVideoOff(true);
        
        if (user) {
          setParticipants(prev => {
            const isExisting = prev.some(p => p.id === user.id);
            if (isExisting) {
              return prev.map(p => 
                p.id === user.id 
                  ? { 
                      ...p, 
                      stream: audioOnlyStream, 
                      isMuted: false, 
                      isVideoOff: true, 
                      isScreenSharing: false 
                    } 
                  : p
              );
            } else {
              return [
                ...prev,
                {
                  id: user.id,
                  name: user.name,
                  avatar: user.avatar,
                  stream: audioOnlyStream,
                  isMuted: false,
                  isVideoOff: true,
                  isScreenSharing: false
                }
              ];
            }
          });
        }
        
        toast.info("Video camera not available. Using audio only.");
        return audioOnlyStream;
      } catch (audioErr) {
        console.error("Error accessing audio devices:", audioErr);
        
        if (user) {
          setParticipants(prev => {
            const isExisting = prev.some(p => p.id === user.id);
            if (isExisting) {
              return prev.map(p => 
                p.id === user.id 
                  ? { 
                      ...p, 
                      isMuted: true, 
                      isVideoOff: true, 
                      isScreenSharing: false 
                    } 
                  : p
              );
            } else {
              return [
                ...prev,
                {
                  id: user.id,
                  name: user.name,
                  avatar: user.avatar,
                  isMuted: true,
                  isVideoOff: true,
                  isScreenSharing: false
                }
              ];
            }
          });
        }
        
        setIsAudioMuted(true);
        setIsVideoOff(true);
        toast.warning("Could not access camera or microphone. You can still chat with others.");
        return null;
      }
    }
  };

  const setupRealTimePresence = (roomId: string) => {
    if (!roomId || !user) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase.channel(`room:${roomId}`);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        console.log('Presence sync state:', state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
        
        const leftIds = leftPresences.map((p: any) => p.user_id);
        if (leftIds.length > 0) {
          setParticipants(prev => prev.filter(p => !leftIds.includes(p.id)));
        }
      });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: user.id,
          name: user.name,
          status: 'online',
          media_status: {
            audio: !isAudioMuted,
            video: !isVideoOff,
            screen: isScreenSharing
          }
        });
      }
    });

    channelRef.current = channel;
  };

  const setupChatChannel = (roomId: string) => {
    if (!roomId || !user) return;

    const chatChannel = supabase.channel(`chat:${roomId}`);

    chatChannel
      .on('broadcast', { event: 'chat_message' }, (payload) => {
        if (payload.payload && payload.payload.message) {
          const msg = payload.payload.message;
          
          if (msg.senderId !== user.id) {
            setChatMessages(prev => [...prev, {
              id: msg.id,
              senderId: msg.senderId,
              senderName: msg.senderName,
              text: msg.text,
              timestamp: new Date(msg.timestamp)
            }]);
          }
        }
      })
      .subscribe();

    const prevChannel = channelRef.current;
    channelRef.current = {
      ...prevChannel,
      unsubscribe: () => {
        prevChannel?.unsubscribe();
        chatChannel.unsubscribe();
      }
    } as any;
  };

  const joinRoom = async (id: string) => {
    if (!user) {
      toast.error("You must be logged in to join a room");
      navigate("/login");
      return;
    }

    try {
      setIsJoining(true);
      
      await initLocalStream();
      
      setRoomId(id);
      
      await fetchRoomParticipants(id);
      
      setupRealTimePresence(id);
      
      setupChatChannel(id);
      
      setChatMessages([
        {
          id: "msg-system-1",
          senderId: "system",
          senderName: "System",
          text: "Welcome to the room! You can chat with other participants here.",
          timestamp: new Date()
        }
      ]);
      
      toast.success(`Joined room successfully!`);
    } catch (error) {
      console.error("Error joining room:", error);
      toast.error("Failed to join room. Please try again.");
      setRoomId(null);
    } finally {
      setIsJoining(false);
    }
  };

  const leaveRoom = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    if (screenShareStreamRef.current) {
      screenShareStreamRef.current.getTracks().forEach(track => track.stop());
      screenShareStreamRef.current = null;
    }
    
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    setLocalStream(null);
    setIsScreenSharing(false);
    setRoomId(null);
    setParticipants([]);
    setChatMessages([]);
    toast.info("You have left the room");
  };

  const sendChatMessage = (text: string) => {
    if (!user || !roomId) return;
    
    const messageId = `msg-${crypto.randomUUID()}`;
    
    const newMessage: ChatMessage = {
      id: messageId,
      senderId: user.id,
      senderName: user.name,
      text,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, newMessage]);
    
    const channel = supabase.channel(`chat:${roomId}`);
    channel.send({
      type: 'broadcast',
      event: 'chat_message',
      payload: {
        message: {
          id: messageId,
          senderId: user.id,
          senderName: user.name,
          text,
          timestamp: new Date().toISOString()
        }
      }
    });
  };

  const toggleAudio = () => {
    if (!localStream) {
      toast.error("No audio available");
      return;
    }
    
    const audioTracks = localStream.getAudioTracks();
    if (audioTracks.length === 0) {
      toast.error("No audio device available");
      return;
    }
    
    const newMuteState = !isAudioMuted;
    audioTracks.forEach(track => {
      track.enabled = !newMuteState;
    });
    
    setIsAudioMuted(newMuteState);
    
    if (user) {
      setParticipants(prev => 
        prev.map(p => 
          p.id === user.id ? { ...p, isMuted: newMuteState } : p
        )
      );
      
      if (roomId && channelRef.current) {
        channelRef.current.track({
          user_id: user.id,
          name: user.name,
          status: 'online',
          media_status: {
            audio: !newMuteState,
            video: !isVideoOff,
            screen: isScreenSharing
          }
        });
      }
    }
    
    toast.info(newMuteState ? "Microphone muted" : "Microphone unmuted");
  };

  const toggleVideo = () => {
    if (!localStream) {
      toast.error("No video available");
      return;
    }
    
    const videoTracks = localStream.getVideoTracks();
    if (videoTracks.length === 0) {
      toast.error("No video device available");
      return;
    }
    
    const newVideoOffState = !isVideoOff;
    videoTracks.forEach(track => {
      track.enabled = !newVideoOffState;
    });
    
    setIsVideoOff(newVideoOffState);
    
    if (user) {
      setParticipants(prev => 
        prev.map(p => 
          p.id === user.id ? { ...p, isVideoOff: newVideoOffState } : p
        )
      );
      
      if (roomId && channelRef.current) {
        channelRef.current.track({
          user_id: user.id,
          name: user.name,
          status: 'online',
          media_status: {
            audio: !isAudioMuted,
            video: !newVideoOffState,
            screen: isScreenSharing
          }
        });
      }
    }
    
    toast.info(newVideoOffState ? "Camera turned off" : "Camera turned on");
  };

  const toggleScreenShare = async () => {
    if (!user) return;
    
    try {
      if (isScreenSharing) {
        if (screenShareStreamRef.current) {
          screenShareStreamRef.current.getTracks().forEach(track => track.stop());
          screenShareStreamRef.current = null;
        }
        
        if (localStreamRef.current) {
          setLocalStream(localStreamRef.current);
        }
        
        setIsScreenSharing(false);
        
        setParticipants(prev => 
          prev.map(p => 
            p.id === user.id ? { ...p, isScreenSharing: false } : p
          )
        );
        
        if (roomId && channelRef.current) {
          channelRef.current.track({
            user_id: user.id,
            name: user.name,
            status: 'online',
            media_status: {
              audio: !isAudioMuted,
              video: !isVideoOff,
              screen: false
            }
          });
        }
        
        toast.info("Screen sharing stopped");
      } else {
        try {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true
          });
          
          screenShareStreamRef.current = screenStream;
          setLocalStream(screenStream);
          setIsScreenSharing(true);
          
          screenStream.getVideoTracks()[0].onended = () => {
            if (localStreamRef.current) {
              setLocalStream(localStreamRef.current);
            }
            setIsScreenSharing(false);
            
            setParticipants(prev => 
              prev.map(p => 
                p.id === user.id ? { ...p, isScreenSharing: false } : p
              )
            );
            
            if (roomId && channelRef.current) {
              channelRef.current.track({
                user_id: user.id,
                name: user.name,
                status: 'online',
                media_status: {
                  audio: !isAudioMuted,
                  video: !isVideoOff,
                  screen: false
                }
              });
            }
            
            toast.info("Screen sharing stopped");
          };
          
          setParticipants(prev => 
            prev.map(p => 
              p.id === user.id ? { ...p, isScreenSharing: true } : p
            )
          );
          
          if (roomId && channelRef.current) {
            channelRef.current.track({
              user_id: user.id,
              name: user.name,
              status: 'online',
              media_status: {
                audio: !isAudioMuted,
                video: !isVideoOff,
                screen: true
              }
            });
          }
          
          toast.success("Screen sharing started");
        } catch (err) {
          console.error("Error starting screen share:", err);
          toast.error("Failed to share screen. You may have denied permission.");
        }
      }
    } catch (error) {
      console.error("Error toggling screen share:", error);
      toast.error("Failed to share screen. Please try again.");
    }
  };

  return (
    <RoomContext.Provider
      value={{
        roomId,
        participants,
        chatMessages,
        localStream,
        isAudioMuted,
        isVideoOff,
        isScreenSharing,
        createRoom,
        joinRoom,
        leaveRoom,
        sendChatMessage,
        toggleAudio,
        toggleVideo,
        toggleScreenShare,
        isJoining
      }}
    >
      {children}
    </RoomContext.Provider>
  );
};
