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

const DEFAULT_LOCAL_PARTICIPANT: Participant = {
  id: 'local',
  name: 'You',
  isMuted: false,
  isVideoOff: false,
  isScreenSharing: false
};

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
  localParticipant: Participant;
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
  
  const [localParticipant, setLocalParticipant] = useState<Participant>({
    ...DEFAULT_LOCAL_PARTICIPANT,
    id: user?.id || 'local',
    name: user?.name || 'You'
  });
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenShareStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const peerConnectionsRef = useRef<Map<string, PeerConnection>>(new Map());

  useEffect(() => {
    if (user) {
      setLocalParticipant(prev => ({
        ...prev,
        id: user.id,
        name: user.name || 'You',
        avatar: user.avatar
      }));
    }
  }, [user]);

  useEffect(() => {
    setLocalParticipant(prev => ({
      ...prev,
      stream: localStream,
      isMuted: isAudioMuted,
      isVideoOff: isVideoOff,
      isScreenSharing: isScreenSharing
    }));
  }, [localStream, isAudioMuted, isVideoOff, isScreenSharing]);

  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (screenShareStreamRef.current) {
        screenShareStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }

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

      const currentParticipantIds = participants.map(p => p.id);
      const roomParticipants = data
        .filter(p => !user || p.user_id !== user.id)
        .filter(p => !currentParticipantIds.includes(p.user_id))
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
        setParticipants(prev => [...prev, ...roomParticipants]);
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
      
      const participantId = user ? user.id : `guest-${Math.random().toString(36).substring(2, 9)}`;
      const participantName = user ? user.name : `Guest ${Math.floor(Math.random() * 1000)}`;
      const participantAvatar = user ? user.avatar : `https://avatar.vercel.sh/guest-${participantId}?size=128`;
      
      setLocalParticipant({
        id: participantId,
        name: participantName,
        avatar: participantAvatar,
        stream,
        isMuted: false,
        isVideoOff: false,
        isScreenSharing: false
      });
      
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
        
        const participantId = user ? user.id : `guest-${Math.random().toString(36).substring(2, 9)}`;
        const participantName = user ? user.name : `Guest ${Math.floor(Math.random() * 1000)}`;
        const participantAvatar = user ? user.avatar : `https://avatar.vercel.sh/guest-${participantId}?size=128`;
        
        setLocalParticipant({
          id: participantId,
          name: participantName,
          avatar: participantAvatar,
          stream: audioOnlyStream,
          isMuted: false,
          isVideoOff: true,
          isScreenSharing: false
        });
        
        toast.info("Video camera not available. Using audio only.");
        return audioOnlyStream;
      } catch (audioErr) {
        console.error("Error accessing audio devices:", audioErr);
        
        const participantId = user ? user.id : `guest-${Math.random().toString(36).substring(2, 9)}`;
        const participantName = user ? user.name : `Guest ${Math.floor(Math.random() * 1000)}`;
        const participantAvatar = user ? user.avatar : `https://avatar.vercel.sh/guest-${participantId}?size=128`;
        
        setLocalParticipant({
          id: participantId,
          name: participantName,
          avatar: participantAvatar,
          isMuted: true,
          isVideoOff: true,
          isScreenSharing: false
        });
        
        setIsAudioMuted(true);
        setIsVideoOff(true);
        toast.warning("Could not access camera or microphone. You can still chat with others.");
        return null;
      }
    }
  };

  const initializePeer = () => {
    if (!roomId) return null;
    
    try {
      const userId = user ? user.id : `guest-${Math.random().toString(36).substring(2, 9)}`;
      const peerId = `${roomId}-${userId}`;
      
      console.log("Initializing peer with ID:", peerId);
      
      const peer = new Peer(peerId, {
        debug: 3
      });
      
      peer.on('open', (id) => {
        console.log('Peer connection opened with ID:', id);
        const currentId = user ? user.id : userId;
        setParticipants(prev => 
          prev.map(p => 
            p.id === currentId ? { ...p, peerId: id } : p
          )
        );
        
        if (roomId && channelRef.current) {
          channelRef.current.track({
            user_id: currentId,
            name: user ? user.name : `Guest ${Math.floor(Math.random() * 1000)}`,
            peerId: id,
            status: 'online',
            media_status: {
              audio: !isAudioMuted,
              video: !isVideoOff,
              screen: isScreenSharing
            }
          });
        }
      });
      
      peer.on('call', (call) => {
        console.log('Receiving call from:', call.peer);
        
        if (localStreamRef.current) {
          console.log('Answering call with local stream');
          call.answer(localStreamRef.current);
          
          call.on('stream', (remoteStream) => {
            console.log('Received remote stream from:', call.peer);
            const remotePeerId = call.peer;
            const remoteUserId = remotePeerId.split('-')[1];
            
            console.log('Remote user ID:', remoteUserId);
            
            setParticipants(prev => {
              const existingParticipant = prev.find(p => p.id === remoteUserId);
              
              if (existingParticipant) {
                return prev.map(p => {
                  if (p.id === remoteUserId) {
                    return { ...p, stream: remoteStream, peerId: remotePeerId };
                  }
                  return p;
                });
              } else {
                const newParticipant = {
                  id: remoteUserId,
                  name: `User ${remoteUserId.substring(0, 5)}`,
                  avatar: `https://avatar.vercel.sh/${remoteUserId}?size=128`,
                  stream: remoteStream,
                  peerId: remotePeerId,
                  isMuted: false,
                  isVideoOff: false,
                  isScreenSharing: false
                };
                
                console.log('Adding new participant:', newParticipant);
                return [...prev, newParticipant];
              }
            });
          });
          
          call.on('error', (err) => {
            console.error('Call error:', err);
          });
        } else {
          console.warn('No local stream to answer call with');
          call.answer(); // Answer without a stream
        }
        
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
      
      peer.on('disconnected', () => {
        console.log('Peer disconnected');
        peer.reconnect();
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
    if (!peerRef.current || !localStreamRef.current) return;
    
    console.log('Attempting to connect to peers:', participants);
    
    participants.forEach(participant => {
      if (user && participant.id === user.id) {
        console.log('Skipping self:', participant.id);
        return;
      }
      
      if (!participant.peerId) {
        console.log('Participant has no peerId:', participant.id);
        return;
      }
      
      if (peerConnectionsRef.current.has(participant.peerId)) {
        console.log('Already connected to:', participant.peerId);
        return;
      }
      
      console.log('Calling peer:', participant.peerId);
      
      try {
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
        
        call.on('error', (err) => {
          console.error('Call error:', err);
        });
        
        peerConnectionsRef.current.set(participant.peerId, {
          peerId: participant.peerId,
          call
        });
      } catch (err) {
        console.error('Error calling peer:', participant.peerId, err);
      }
    });
  };

  const setupRealTimePresence = (roomId: string) => {
    if (!roomId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    console.log('Setting up real-time presence for room:', roomId);
    
    const userId = user ? user.id : `guest-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase.channel(`room:${roomId}`);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        console.log('Presence sync state:', state);
        
        const newParticipants: Participant[] = [];
        const currentParticipantIds = new Set<string>();
        
        participants.forEach(p => {
          currentParticipantIds.add(p.id);
        });
        
        Object.entries(state).forEach(([key, presences]: [string, any]) => {
          presences.forEach((presence: any) => {
            if (presence.user_id && presence.user_id !== userId) {
              const existingParticipant = participants.find(p => p.id === presence.user_id);
              
              if (existingParticipant) {
                newParticipants.push({
                  ...existingParticipant,
                  peerId: presence.peerId || existingParticipant.peerId,
                  name: presence.name || existingParticipant.name,
                  isMuted: presence.media_status ? !presence.media_status.audio : existingParticipant.isMuted,
                  isVideoOff: presence.media_status ? !presence.media_status.video : existingParticipant.isVideoOff,
                  isScreenSharing: presence.media_status ? presence.media_status.screen : existingParticipant.isScreenSharing
                });
              } else {
                newParticipants.push({
                  id: presence.user_id,
                  name: presence.name || `User ${presence.user_id.substring(0, 5)}`,
                  avatar: `https://avatar.vercel.sh/${presence.user_id}?size=128`,
                  peerId: presence.peerId,
                  isMuted: presence.media_status ? !presence.media_status.audio : false,
                  isVideoOff: presence.media_status ? !presence.media_status.video : false,
                  isScreenSharing: presence.media_status ? presence.media_status.screen : false
                });
              }
              
              currentParticipantIds.delete(presence.user_id);
            }
          });
        });
        
        const filteredParticipants = newParticipants.filter(p => !currentParticipantIds.has(p.id));
        
        setParticipants(filteredParticipants);
        setTimeout(connectToPeers, 1000);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
        
        newPresences.forEach((presence: any) => {
          if (presence.peerId && presence.user_id !== userId) {
            console.log('New user joined with peer ID:', presence);
            
            setParticipants(prev => {
              const existingParticipant = prev.find(p => p.id === presence.user_id);
              
              if (existingParticipant) {
                return prev.map(p => 
                  p.id === presence.user_id ? { 
                    ...p, 
                    peerId: presence.peerId,
                    name: presence.name || p.name,
                    isMuted: presence.media_status ? !presence.media_status.audio : p.isMuted,
                    isVideoOff: presence.media_status ? !presence.media_status.video : p.isVideoOff,
                    isScreenSharing: presence.media_status ? presence.media_status.screen : p.isScreenSharing
                  } : p
                );
              } else {
                return [...prev, {
                  id: presence.user_id,
                  name: presence.name || `User ${presence.user_id.substring(0, 5)}`,
                  avatar: `https://avatar.vercel.sh/${presence.user_id}?size=128`,
                  peerId: presence.peerId,
                  isMuted: presence.media_status ? !presence.media_status.audio : false,
                  isVideoOff: presence.media_status ? !presence.media_status.video : false,
                  isScreenSharing: presence.media_status ? presence.media_status.screen : false
                }];
              }
            });
            
            setTimeout(connectToPeers, 1000);
          }
        });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
        
        const leftIds = leftPresences.map((p: any) => p.user_id);
        if (leftIds.length > 0) {
          setParticipants(prev => prev.filter(p => !leftIds.includes(p.id)));
          
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
        console.log('Subscribed to presence channel');
        const peer = peerRef.current;
        
        await channel.track({
          user_id: userId,
          name: user ? user.name : `Guest ${Math.floor(Math.random() * 1000)}`,
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
    if (!roomId) return;

    const userId = user ? user.id : `guest-${Math.random().toString(36).substring(2, 9)}`;
    const chatChannel = supabase.channel(`chat:${roomId}`);

    chatChannel
      .on('broadcast', { event: 'chat_message' }, (payload) => {
        if (payload.payload && payload.payload.message) {
          const msg = payload.payload.message;
          
          if (msg.senderId !== userId) {
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
    try {
      setIsJoining(true);
      
      console.log('Joining room:', id);
      
      const stream = await initLocalStream();
      
      setRoomId(id);
      
      await fetchRoomParticipants(id);
      
      initializePeer();
      
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
    
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    
    peerConnectionsRef.current.forEach(connection => {
      connection.call.close();
    });
    peerConnectionsRef.current.clear();
    
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
    if (!roomId) return;
    
    const userId = user ? user.id : `guest-${Math.random().toString(36).substring(2, 9)}`;
    const userName = user ? user.name : `Guest ${Math.floor(Math.random() * 1000)}`;
    
    const messageId = `msg-${crypto.randomUUID()}`;
    
    const newMessage: ChatMessage = {
      id: messageId,
      senderId: userId,
      senderName: userName,
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
          senderId: userId,
          senderName: userName,
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
    
    const userId = user ? user.id : `guest-${Math.random().toString(36).substring(2, 9)}`;
    
    setLocalParticipant(prev => ({
      ...prev,
      isMuted: newMuteState
    }));
    
    if (roomId && channelRef.current && typeof channelRef.current.send === 'function') {
      channelRef.current.send({
        type: 'broadcast',
        event: 'media_status_change',
        payload: {
          user_id: userId,
          name: user ? user.name : `Guest ${Math.floor(Math.random() * 1000)}`,
          peerId: peerRef.current?.id,
          media_status: {
            audio: !newMuteState,
            video: !isVideoOff,
            screen: isScreenSharing
          }
        }
      });
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
    
    const userId = user ? user.id : `guest-${Math.random().toString(36).substring(2, 9)}`;
    
    setLocalParticipant(prev => ({
      ...prev,
      isVideoOff: newVideoOffState
    }));
    
    if (roomId && channelRef.current && typeof channelRef.current.send === 'function') {
      channelRef.current.send({
        type: 'broadcast',
        event: 'media_status_change',
        payload: {
          user_id: userId,
          name: user ? user.name : `Guest ${Math.floor(Math.random() * 1000)}`,
          peerId: peerRef.current?.id,
          media_status: {
            audio: !isAudioMuted,
            video: !newVideoOffState,
            screen: isScreenSharing
          }
        }
      });
    }
    
    toast.info(newVideoOffState ? "Camera turned off" : "Camera turned on");
  };

  const toggleScreenShare = async () => {
    try {
      const userId = user ? user.id : `guest-${Math.random().toString(36).substring(2, 9)}`;
      
      if (isScreenSharing) {
        if (screenShareStreamRef.current) {
          screenShareStreamRef.current.getTracks().forEach(track => track.stop());
          screenShareStreamRef.current = null;
        }
        
        if (localStreamRef.current) {
          setLocalStream(localStreamRef.current);
          
          peerConnectionsRef.current.forEach(connection => {
            connection.call.close();
            
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
              
              peerConnectionsRef.current.set(connection.peerId, {
                peerId: connection.peerId,
                call: newCall
              });
            }
          });
        }
        
        setIsScreenSharing(false);
        
        setLocalParticipant(prev => ({
          ...prev,
          isScreenSharing: false,
          stream: localStreamRef.current || undefined
        }));
        
        if (roomId && channelRef.current && typeof channelRef.current.send === 'function') {
          channelRef.current.send({
            type: 'broadcast',
            event: 'media_status_change',
            payload: {
              user_id: userId,
              name: user ? user.name : `Guest ${Math.floor(Math.random() * 1000)}`,
              peerId: peerRef.current?.id,
              media_status: {
                audio: !isAudioMuted,
                video: !isVideoOff,
                screen: false
              }
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
          
          peerConnectionsRef.current.forEach(connection => {
            connection.call.close();
            
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
              
              peerConnectionsRef.current.set(connection.peerId, {
                peerId: connection.peerId,
                call: newCall
              });
            }
          });
          
          screenStream.getVideoTracks()[0].onended = () => {
            if (localStreamRef.current) {
              setLocalStream(localStreamRef.current);
              
              peerConnectionsRef.current.forEach(connection => {
                connection.call.close();
                
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
                  
                  peerConnectionsRef.current.set(connection.peerId, {
                    peerId: connection.peerId,
                    call: newCall
                  });
                }
              });
            }
            
            setIsScreenSharing(false);
            
            setLocalParticipant(prev => ({
              ...prev,
              isScreenSharing: false,
              stream: localStreamRef.current || undefined
            }));
            
            if (roomId && channelRef.current && typeof channelRef.current.send === 'function') {
              channelRef.current.send({
                type: 'broadcast',
                event: 'media_status_change',
                payload: {
                  user_id: userId,
                  name: user ? user.name : `Guest ${Math.floor(Math.random() * 1000)}`,
                  peerId: peerRef.current?.id,
                  media_status: {
                    audio: !isAudioMuted,
                    video: !isVideoOff,
                    screen: false
                  }
                }
              });
            }
            
            toast.info("Screen sharing stopped");
          };
          
          setLocalParticipant(prev => ({
            ...prev,
            isScreenSharing: true,
            stream: screenStream
          }));
          
          if (roomId && channelRef.current && typeof channelRef.current.send === 'function') {
            channelRef.current.send({
              type: 'broadcast',
              event: 'media_status_change',
              payload: {
                user_id: userId,
                name: user ? user.name : `Guest ${Math.floor(Math.random() * 1000)}`,
                peerId: peerRef.current?.id,
                media_status: {
                  audio: !isAudioMuted,
                  video: !isVideoOff,
                  screen: true
                }
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
        localParticipant,
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
