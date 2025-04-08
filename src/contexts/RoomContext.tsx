
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

  // Cleanup function for when component unmounts or user leaves room
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (screenShareStreamRef.current) {
        screenShareStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Clean up any Supabase channel subscriptions
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
      // Note: The actual room creation is now handled in RoomJoinCard component
      // This function is kept for interface compatibility
      // In a real app with WebRTC, we would create signaling channels here
      
      // Generate a room ID for convenience
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
          auth.users (
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

      // Format participants data to match our Participant interface
      // For a real app, this would include setting up WebRTC connections
      const roomParticipants = data
        .filter(p => p.user_id !== user?.id) // Filter out current user
        .map(p => {
          // Extract user info
          const userData = p.auth?.users || {};
          const email = userData.email || "Unknown User";
          const name = email.split('@')[0]; // Simple name extraction
          
          return {
            id: p.user_id,
            name: name,
            avatar: `https://avatar.vercel.sh/${email}?size=128`,
            isMuted: false,
            isVideoOff: false,
            isScreenSharing: false
          };
        });

      // Update participants state to include these remote participants
      if (roomParticipants.length > 0) {
        setParticipants(prev => {
          // Filter out any duplicates
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
      // Try to get user media with both video and audio
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      });
      
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsAudioMuted(false);
      setIsVideoOff(false);
      
      // Initial participant is the local user
      if (user) {
        setParticipants(prev => {
          // Check if user is already in participants list
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
        // If we can't get both, try just audio
        const audioOnlyStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false
        });
        
        localStreamRef.current = audioOnlyStream;
        setLocalStream(audioOnlyStream);
        setIsAudioMuted(false);
        setIsVideoOff(true); // Video is off since we don't have it
        
        // Initial participant is the local user with audio only
        if (user) {
          setParticipants(prev => {
            // Check if user is already in participants list
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
        
        // If we can't get any media, join without media but set participant
        if (user) {
          setParticipants(prev => {
            // Check if user is already in participants list
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

    // Clean up previous channel if it exists
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Set up real-time presence for this room
    const channel = supabase.channel(`room:${roomId}`);

    // Set up presence events
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        console.log('Presence sync state:', state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
        // In a real app, we would initiate WebRTC connections here
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
        
        // Remove participants who have left
        const leftIds = leftPresences.map((p: any) => p.user_id);
        if (leftIds.length > 0) {
          setParticipants(prev => prev.filter(p => !leftIds.includes(p.id)));
        }
      });

    // Subscribe to the channel
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Track user's presence in the room
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

    // Save channel reference for cleanup
    channelRef.current = channel;
  };

  // Set up broadcast channel for chat messages
  const setupChatChannel = (roomId: string) => {
    if (!roomId || !user) return;

    // Set up a channel for chat messages
    const chatChannel = supabase.channel(`chat:${roomId}`);

    chatChannel
      .on('broadcast', { event: 'chat_message' }, (payload) => {
        // Handle incoming chat message
        if (payload.payload && payload.payload.message) {
          const msg = payload.payload.message;
          
          // Add to chat messages if it's not from the current user
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

    // Add to channelRef for cleanup
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
      
      // Initialize local media stream - now handles fallbacks for no media devices
      await initLocalStream();
      
      // Set room ID
      setRoomId(id);
      
      // Fetch existing participants
      await fetchRoomParticipants(id);
      
      // Set up real-time presence
      setupRealTimePresence(id);
      
      // Set up chat channel
      setupChatChannel(id);
      
      // Add some initial chat messages for demo purposes
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
    // Stop all local media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    if (screenShareStreamRef.current) {
      screenShareStreamRef.current.getTracks().forEach(track => track.stop());
      screenShareStreamRef.current = null;
    }
    
    // Clean up channel subscriptions
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
    
    // Add to local chat messages
    setChatMessages(prev => [...prev, newMessage]);
    
    // Broadcast to other participants
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
      // If no stream, can't toggle audio
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
    
    // Update participant list
    if (user) {
      setParticipants(prev => 
        prev.map(p => 
          p.id === user.id ? { ...p, isMuted: newMuteState } : p
        )
      );
      
      // Broadcast audio status change if in a room
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
      // If no stream, can't toggle video
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
    
    // Update participant list
    if (user) {
      setParticipants(prev => 
        prev.map(p => 
          p.id === user.id ? { ...p, isVideoOff: newVideoOffState } : p
        )
      );
      
      // Broadcast video status change if in a room
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
        // Stop screen sharing
        if (screenShareStreamRef.current) {
          screenShareStreamRef.current.getTracks().forEach(track => track.stop());
          screenShareStreamRef.current = null;
        }
        
        // Revert back to camera
        if (localStreamRef.current) {
          setLocalStream(localStreamRef.current);
        }
        
        setIsScreenSharing(false);
        
        // Update participant list
        setParticipants(prev => 
          prev.map(p => 
            p.id === user.id ? { ...p, isScreenSharing: false } : p
          )
        );
        
        // Broadcast screen sharing status change
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
        // Start screen sharing
        try {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true
          });
          
          screenShareStreamRef.current = screenStream;
          setLocalStream(screenStream);
          setIsScreenSharing(true);
          
          // Handle when user stops sharing via browser UI
          screenStream.getVideoTracks()[0].onended = () => {
            if (localStreamRef.current) {
              setLocalStream(localStreamRef.current);
            }
            setIsScreenSharing(false);
            
            // Update participant list
            setParticipants(prev => 
              prev.map(p => 
                p.id === user.id ? { ...p, isScreenSharing: false } : p
              )
            );
            
            // Broadcast screen sharing status change
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
          
          // Update participant list
          setParticipants(prev => 
            prev.map(p => 
              p.id === user.id ? { ...p, isScreenSharing: true } : p
            )
          );
          
          // Broadcast screen sharing status change
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
