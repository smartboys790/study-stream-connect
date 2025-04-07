
import { Button } from "@/components/ui/button";
import { useRoom } from "@/contexts/RoomContext";
import { useNavigate } from "react-router-dom";
import {
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  Phone,
  Video,
  VideoOff,
} from "lucide-react";

const RoomControls = () => {
  const {
    isAudioMuted,
    isVideoOff,
    isScreenSharing,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    leaveRoom,
  } = useRoom();
  const navigate = useNavigate();

  const handleLeaveRoom = () => {
    leaveRoom();
    navigate("/dashboard");
  };

  return (
    <div className="px-4 py-3 bg-card border-t border-border flex items-center justify-center gap-3">
      <Button
        variant={isAudioMuted ? "destructive" : "outline"}
        size="icon"
        onClick={toggleAudio}
        className="rounded-full h-10 w-10"
      >
        {isAudioMuted ? <MicOff size={18} /> : <Mic size={18} />}
      </Button>

      <Button
        variant={isVideoOff ? "destructive" : "outline"}
        size="icon"
        onClick={toggleVideo}
        className="rounded-full h-10 w-10"
      >
        {isVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
      </Button>

      <Button
        variant={isScreenSharing ? "secondary" : "outline"}
        size="icon"
        onClick={toggleScreenShare}
        className="rounded-full h-10 w-10"
      >
        {isScreenSharing ? <MonitorOff size={18} /> : <Monitor size={18} />}
      </Button>

      <Button
        variant="destructive"
        size="icon"
        onClick={handleLeaveRoom}
        className="rounded-full h-10 w-10"
      >
        <Phone size={18} className="rotate-[135deg]" />
      </Button>
    </div>
  );
};

export default RoomControls;
