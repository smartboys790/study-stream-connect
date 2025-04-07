
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRoom } from "@/contexts/RoomContext";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import VideoGrid from "@/components/VideoGrid";
import ChatPanel from "@/components/ChatPanel";
import RoomControls from "@/components/RoomControls";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const Room = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { user, isAuthenticated } = useAuth();
  const { joinRoom, leaveRoom, participants, isJoining } = useRoom();
  const navigate = useNavigate();
  const [hasJoined, setHasJoined] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    // Only join the room if we haven't already joined
    if (roomId && !hasJoined) {
      setHasJoined(true);
      joinRoom(roomId);
    }

    // Only clean up when component is unmounting completely
    return () => {
      // We don't automatically leave the room here anymore
      // This prevents the room from being left when the component
      // re-renders due to state changes
    };
  }, [roomId, isAuthenticated, joinRoom, navigate, hasJoined]);

  // Handle manual leaving
  const handleLeaveRoom = () => {
    leaveRoom();
    navigate("/dashboard");
  };

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

  if (isJoining) {
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
              <h1 className="text-xl font-semibold">Study Room</h1>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <span>Room:</span>
                <span className="font-medium">{roomId}</span>
                <span className="text-xs">({participants.length} participants)</span>
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
          <RoomControls onLeaveRoom={handleLeaveRoom} />
        </div>
        
        <div className="md:w-80 h-80 md:h-auto">
          <ChatPanel />
        </div>
      </main>
    </div>
  );
};

export default Room;
