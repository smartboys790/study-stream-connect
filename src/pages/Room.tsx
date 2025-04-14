
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRoom } from "@/contexts/RoomContext";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import VideoGrid from "@/components/VideoGridNew";
import ChatPanel from "@/components/ChatPanel";
import RoomControls from "@/components/RoomControls";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Room = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { user, isAuthenticated } = useAuth();
  const { joinRoom, leaveRoom, participants, isJoining } = useRoom();
  const navigate = useNavigate();
  const [hasJoined, setHasJoined] = useState(false);
  const [roomName, setRoomName] = useState<string>("");
  const [roomError, setRoomError] = useState<string>("");
  const [isPublicRoom, setIsPublicRoom] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);

  useEffect(() => {
    if (!roomId) return;

    const checkRoomAccess = async () => {
      try {
        const { data: roomData, error: roomError } = await supabase
          .from('rooms')
          .select('name, is_public')
          .eq('id', roomId)
          .single();

        if (roomError || !roomData) {
          setRoomError("Room not found or inaccessible");
          return;
        }

        setRoomName(roomData.name);
        setIsPublicRoom(roomData.is_public);

        if (roomData.is_public) {
          setIsAuthorized(true);
        } else if (isAuthenticated) {
          setIsAuthorized(true);
        } else {
          setRoomError("This room requires authentication");
          return;
        }

        if (user) {
          // Fix the upsert query by correctly specifying onConflict options
          const { error: participantError } = await supabase
            .from('room_participants')
            .upsert({
              room_id: roomId,
              user_id: user.id,
              is_active: true
            }, {
              onConflict: 'room_id,user_id'
            });

          if (participantError) {
            console.error("Error upserting participant:", participantError);
            toast.error("Failed to join room as participant");
          }
        }

        if (!hasJoined && isAuthorized) {
          setHasJoined(true);
          joinRoom(roomId);
        }
      } catch (err) {
        console.error("Error checking room access:", err);
        setRoomError("Error checking room access");
      }
    };

    checkRoomAccess();

    return () => {
      if (hasJoined && roomId && user) {
        supabase
          .from('room_participants')
          .update({ is_active: false })
          .eq('room_id', roomId)
          .eq('user_id', user.id);
      }
    };
  }, [roomId, isAuthenticated, user, hasJoined, joinRoom, isAuthorized]);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel('room_participants_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'room_participants',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        console.log('Participants change:', payload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const handleLeaveRoom = async () => {
    if (user && roomId) {
      const { error } = await supabase
        .from('room_participants')
        .update({ is_active: false })
        .eq('room_id', roomId)
        .eq('user_id', user.id);

      if (error) {
        console.error("Error updating room status:", error);
        toast.error("Error updating room status");
      }
    }
    
    leaveRoom();
    navigate("/dashboard");
  };

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  if (roomError) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="mx-auto mb-4 text-red-500">
              <AlertCircle size={48} />
            </div>
            <h2 className="text-2xl font-semibold mb-4">Room Error</h2>
            <p className="text-muted-foreground mb-6">
              {roomError}
            </p>
            {!isAuthenticated && !isPublicRoom && (
              <div className="mb-4">
                <p className="mb-2">This room requires authentication.</p>
                <Button onClick={() => navigate("/login")} className="mr-2">
                  Login
                </Button>
                <Button variant="outline" onClick={() => navigate("/signup")}>
                  Sign Up
                </Button>
              </div>
            )}
            <Button onClick={() => navigate("/dashboard")}>
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!roomId) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-4">Invalid Room</h2>
            <p className="text-muted-foreground mb-6">
              This room does not exist or the link is invalid.
            </p>
            <Button onClick={() => navigate("/dashboard")}>
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isJoining || !isAuthorized) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full border-4 border-study-600 border-t-transparent animate-spin mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2">Joining Room...</h2>
            <p className="text-muted-foreground">
              Setting up your video and audio...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/dashboard")}
              className="h-8 w-8"
            >
              <ArrowLeft size={16} />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">{roomName || "Study Room"}</h1>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <span>Room ID:</span>
                <span className="font-medium">{roomId}</span>
                <span className="text-xs">({participants.length} participants)</span>
                {isPublicRoom && <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full ml-2">Public</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <main className="flex-1 flex flex-col md:flex-row gap-4 p-4">
        <div className="flex-1 flex flex-col min-h-[400px] md:min-h-0">
          <div className="flex-1 bg-card rounded-lg border border-border overflow-hidden">
            <VideoGrid />
          </div>
          <RoomControls onLeaveRoom={handleLeaveRoom} toggleChat={toggleChat} isChatOpen={isChatOpen} />
        </div>
        
        {isChatOpen && (
          <div className="md:w-80 h-80 md:h-auto animate-in slide-in-from-right duration-300">
            <ChatPanel />
          </div>
        )}
      </main>
    </div>
  );
};

export default Room;
