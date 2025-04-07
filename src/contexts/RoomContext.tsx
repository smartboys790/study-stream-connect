
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";

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

  // Cleanup function for when component unmounts or user leaves room
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (screenShareStreamRef.current) {
        screenShareStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const createRoom = async () => {
    if (!user) {
      toast.error("You must be logged in to create a room");
      navigate("/login");
      return "";
    }

    // In a real app, we would make an API call to create a room
    // For demo, we'll generate a random room ID
    const newRoomId = Math.random().toString(36).substring(2, 9);
    
    try {
      // In a real app, we would register this room on the backend
      toast.success(`Room created successfully!`);
      return newRoomId;
    } catch (error) {
      console.error("Error creating room:", error);
      toast.error("Failed to create room. Please try again.");
      return "";
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
        setParticipants([
          {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            stream,
            isMuted: false,
            isVideoOff: false,
            isScreenSharing: false
          }
        ]);
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
          setParticipants([
            {
              id: user.id,
              name: user.name,
              avatar: user.avatar,
              stream: audioOnlyStream,
              isMuted: false,
              isVideoOff: true,
              isScreenSharing: false
            }
          ]);
        }
        
        toast.info("Video camera not available. Using audio only.");
        return audioOnlyStream;
      } catch (audioErr) {
        console.error("Error accessing audio devices:", audioErr);
        
        // If we can't get any media, join without media but set participant
        if (user) {
          setParticipants([
            {
              id: user.id,
              name: user.name,
              avatar: user.avatar,
              isMuted: true,
              isVideoOff: true,
              isScreenSharing: false
            }
          ]);
        }
        
        setIsAudioMuted(true);
        setIsVideoOff(true);
        toast.warning("Could not access camera or microphone. You can still chat with others.");
        return null;
      }
    }
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
      
      // In a real app, we would make an API call to join a room
      // For demo, we'll just set the room ID and add some mock participants
      setRoomId(id);
      
      // Add mock participants for demo
      const mockParticipants = [
        {
          id: "user-1",
          name: "Alex Johnson",
          avatar: "https://avatar.vercel.sh/alex@example.com?size=128",
          isMuted: false,
          isVideoOff: false,
          isScreenSharing: false
        },
        {
          id: "user-2",
          name: "Sam Taylor",
          avatar: "https://avatar.vercel.sh/sam@example.com?size=128",
          isMuted: true,
          isVideoOff: false,
          isScreenSharing: false
        }
      ];
      
      // In a real app, we would establish WebRTC connections with other participants
      setParticipants(prev => {
        // Filter out any duplicates (in case user is already in the list)
        const existingUserIds = prev.map(p => p.id);
        const filteredMockParticipants = mockParticipants.filter(
          p => !existingUserIds.includes(p.id)
        );
        
        return [...prev, ...filteredMockParticipants];
      });
      
      // Add some mock chat messages
      setChatMessages([
        {
          id: "msg-1",
          senderId: "user-1",
          senderName: "Alex Johnson",
          text: "Hey everyone! Ready to study?",
          timestamp: new Date(Date.now() - 1000 * 60 * 5) // 5 minutes ago
        },
        {
          id: "msg-2",
          senderId: "user-2",
          senderName: "Sam Taylor",
          text: "Yes, let's focus on chapter 5 today.",
          timestamp: new Date(Date.now() - 1000 * 60 * 4) // 4 minutes ago
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
    
    setLocalStream(null);
    setIsScreenSharing(false);
    setRoomId(null);
    setParticipants([]);
    setChatMessages([]);
    toast.info("You have left the room");
  };

  const sendChatMessage = (text: string) => {
    if (!user || !roomId) return;
    
    const newMessage: ChatMessage = {
      id: `msg-${Math.random().toString(36).substring(2, 9)}`,
      senderId: user.id,
      senderName: user.name,
      text,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, newMessage]);
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
            
            toast.info("Screen sharing stopped");
          };
          
          // Update participant list
          setParticipants(prev => 
            prev.map(p => 
              p.id === user.id ? { ...p, isScreenSharing: true } : p
            )
          );
          
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
