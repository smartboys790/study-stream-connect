
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Peer, { MediaConnection } from "peerjs";

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  stream?: MediaStream;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  peerId?: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: Date;
}

interface PeerConnection {
  peerId: string;
  call: MediaConnection;
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
  const peerRef = useRef<Peer | null>(null);
  const peerConnectionsRef = useRef<Map<string, PeerConnection>>(new Map());

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

      // Close all peer connections
      if (peerRef.current) {
        peerRef.current.destroy();
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
          user_id
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
          const userId = p.user_id;
          const email = `user-${userId.substring(0, 8)}@example.com`;
          const name = email.split('@')[0];
          
          return {
            id: userId,
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

  const initializePeer = () => {
    if (!user || !roomId) return null;
    
    try {
      const peerId = `${roomId}-${user.id}`;
      const peer = new Peer(peerId);
      
      peer.on('open', (id) => {
        console.log('My peer ID is: ' + id);
        // Update my participant entry with peerId
        if (user) {
          setParticipants(prev => 
            prev.map(p => 
              p.id === user.id ? { ...p, peerId: id } : p
            )
          );
        }
      });
      
      peer.on('call', (call) => {
        console.log('Receiving call from:', call.peer);
        
        if (localStreamRef.current) {
          call.answer(localStreamRef.current);
          
          call.on('stream', (remoteStream) => {
            console.log('Received remote stream from:', call.peer);
            const remotePeerId = call.peer;
            const remoteUserId = remotePeerId.split('-')[1];
            
            setParticipants(prev => 
              prev.map(p => {
                if (p.id === remoteUserId) {
                  return { ...p, stream: remoteStream, peerId: remotePeerId };
                }
                return p;
              })
            );
          });
        } else {
          console.warn('No local stream to answer call with');
          call.answer(); // Answer without a stream
        }
        
        // Store the call in our connections
        const remotePeerId = call.peer;
        peerConnectionsRef.current.set(remotePeerId, {
          peerId: remotePeerId,
          call
        });
      });
      
      peer.on('error', (err) => {
        console.error('Peer connection error:', err);
        toast.error('Connection error. Please try rejoining the room.');
      });
      
      peerRef.current = peer;
      return peer;
    } catch (err) {
      console.error('Error initializing peer:', err);
      toast.error('Failed to establish peer connection.');
      return null;
    }
  };

  const connectToPeers = () => {
    if (!peerRef.current || !localStreamRef.current || !user) return;
    
    // Connect to each participant
    participants.forEach(participant => {
      if (participant.id === user.id || !participant.peerId) return; // Skip self or participants without peerId
      
      // Check if we already have a connection to this peer
      if (peerConnectionsRef.current.has(participant.peerId)) return;
      
      console.log('Calling peer:', participant.peerId);
      
      const call = peerRef.current!.call(participant.peerId, localStreamRef.current!);
      
      call.on('stream', (remoteStream) => {
        console.log('Received stream from call to:', participant.peerId);
        
        setParticipants(prev => 
          prev.map(p => {
            if (p.id === participant.id) {
              return { ...p, stream: remoteStream };
            }
            return p;
          })
        );
      });
      
      // Store the call
      peerConnectionsRef.current.set(participant.peerId, {
        peerId: participant.peerId,
        call
      });
    });
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
        
        // Extract peer IDs from presence state
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (presence.peerId && presence.user_id !== user.id) {
              // Update participant with peer ID
              setParticipants(prev => 
                prev.map(p => 
                  p.id === presence.user_id ? { ...p, peerId: presence.peerId } : p
                )
              );
            }
          });
        });
        
        // Try to connect to peers after we have their peer IDs
        connectToPeers();
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
        
        // Extract peer IDs from new presences
        newPresences.forEach((presence: any) => {
          if (presence.peerId && presence.user_id !== user.id) {
            // Update participant with peer ID
            setParticipants(prev => 
              prev.map(p => 
                p.id === presence.user_id ? { ...p, peerId: presence.peerId } : p
              )
            );
            
            // Try to connect to this new peer
            setTimeout(connectToPeers, 1000);
          }
        });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
        
        const leftIds = leftPresences.map((p: any) => p.user_id);
        if (leftIds.length > 0) {
          // Remove participants who left
          setParticipants(prev => prev.filter(p => !leftIds.includes(p.id)));
          
          // Close and remove peer connections
          leftPresences.forEach((presence: any) => {
            if (presence.peerId) {
              const connection = peerConnectionsRef.current.get(presence.peerId);
              if (connection) {
                connection.call.close();
                peerConnectionsRef.current.delete(presence.peerId);
              }
            }
          });
        }
      });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        const peer = peerRef.current;
        
        await channel.track({
          user_id: user.id,
          name: user.name,
          peerId: peer ? peer.id : undefined,
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
      
      // Initialize media stream
      const stream = await initLocalStream();
      
      // Set room ID
      setRoomId(id);
      
      // Fetch existing participants
      await fetchRoomParticipants(id);
      
      // Initialize WebRTC peer
      initializePeer();
      
      // Setup presence channel for signaling
      setupRealTimePresence(id);
      
      // Setup chat channel
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
    // Stop and clear local media streams
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    if (screenShareStreamRef.current) {
      screenShareStreamRef.current.getTracks().forEach(track => track.stop());
      screenShareStreamRef.current = null;
    }
    
    // Close peer connections
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    
    peerConnectionsRef.current.forEach(connection => {
      connection.call.close();
    });
    peerConnectionsRef.current.clear();
    
    // Close Supabase channels
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    // Reset state
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
          peerId: peerRef.current?.id,
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
          peerId: peerRef.current?.id,
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
          
          // Reconnect with camera stream
          peerConnectionsRef.current.forEach(connection => {
            // Close existing connection
            connection.call.close();
            
            // Create a new call with camera stream
            if (peerRef.current && localStreamRef.current) {
              const newCall = peerRef.current.call(connection.peerId, localStreamRef.current);
              
              newCall.on('stream', (remoteStream) => {
                const remotePeerId = newCall.peer;
                const remoteUserId = remotePeerId.split('-')[1];
                
                setParticipants(prev => 
                  prev.map(p => {
                    if (p.id === remoteUserId) {
                      return { ...p, stream: remoteStream };
                    }
                    return p;
                  })
                );
              });
              
              // Update the stored call
              peerConnectionsRef.current.set(connection.peerId, {
                peerId: connection.peerId,
                call: newCall
              });
            }
          });
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
            peerId: peerRef.current?.id,
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
          
          // Reconnect with screen share stream
          peerConnectionsRef.current.forEach(connection => {
            // Close existing connection
            connection.call.close();
            
            // Create a new call with screen stream
            if (peerRef.current) {
              const newCall = peerRef.current.call(connection.peerId, screenStream);
              
              newCall.on('stream', (remoteStream) => {
                const remotePeerId = newCall.peer;
                const remoteUserId = remotePeerId.split('-')[1];
                
                setParticipants(prev => 
                  prev.map(p => {
                    if (p.id === remoteUserId) {
                      return { ...p, stream: remoteStream };
                    }
                    return p;
                  })
                );
              });
              
              // Update the stored call
              peerConnectionsRef.current.set(connection.peerId, {
                peerId: connection.peerId,
                call: newCall
              });
            }
          });
          
          screenStream.getVideoTracks()[0].onended = () => {
            // Handle the case when the user stops sharing via the browser UI
            if (localStreamRef.current) {
              setLocalStream(localStreamRef.current);
              
              // Reconnect with camera stream
              peerConnectionsRef.current.forEach(connection => {
                // Close existing connection
                connection.call.close();
                
                // Create a new call with camera stream
                if (peerRef.current && localStreamRef.current) {
                  const newCall = peerRef.current.call(connection.peerId, localStreamRef.current);
                  
                  newCall.on('stream', (remoteStream) => {
                    const remotePeerId = newCall.peer;
                    const remoteUserId = remotePeerId.split('-')[1];
                    
                    setParticipants(prev => 
                      prev.map(p => {
                        if (p.id === remoteUserId) {
                          return { ...p, stream: remoteStream };
                        }
                        return p;
                      })
                    );
                  });
                  
                  // Update the stored call
                  peerConnectionsRef.current.set(connection.peerId, {
                    peerId: connection.peerId,
                    call: newCall
                  });
                }
              });
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
                peerId: peerRef.current?.id,
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
              peerId: peerRef.current?.id,
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
