
import { Button } from "@/components/ui/button";
import { useRoom } from "@/contexts/RoomContext";
import {
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  Phone,
  Users,
  Video,
  VideoOff,
  Copy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useParams } from "react-router-dom";

interface RoomControlsProps {
  onLeaveRoom?: () => void;
}

const RoomControls = ({ onLeaveRoom }: RoomControlsProps) => {
  const {
    isAudioMuted,
    isVideoOff,
    isScreenSharing,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    leaveRoom,
    participants,
  } = useRoom();
  
  const { roomId } = useParams<{ roomId: string }>();

  const handleLeaveRoom = () => {
    if (onLeaveRoom) {
      onLeaveRoom();
    } else {
      leaveRoom();
    }
  };
  
  const copyRoomIdToClipboard = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId)
        .then(() => {
          toast.success("Room ID copied to clipboard");
        })
        .catch(() => {
          toast.error("Failed to copy room ID");
        });
    }
  };

  return (
    <div className="px-4 py-3 bg-card border-t border-border flex items-center justify-between">
      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={copyRoomIdToClipboard}
          className="flex items-center gap-1 text-xs"
        >
          <Copy size={14} />
          Copy ID
        </Button>
      </div>
      
      <div className="flex items-center justify-center gap-3">
        <Button
          variant={isAudioMuted ? "destructive" : "outline"}
          size="icon"
          onClick={toggleAudio}
          className="rounded-full h-10 w-10"
          title={isAudioMuted ? "Unmute microphone" : "Mute microphone"}
        >
          {isAudioMuted ? <MicOff size={18} /> : <Mic size={18} />}
        </Button>

        <Button
          variant={isVideoOff ? "destructive" : "outline"}
          size="icon"
          onClick={toggleVideo}
          className="rounded-full h-10 w-10"
          title={isVideoOff ? "Turn on camera" : "Turn off camera"}
        >
          {isVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
        </Button>

        <Button
          variant={isScreenSharing ? "secondary" : "outline"}
          size="icon"
          onClick={toggleScreenShare}
          className="rounded-full h-10 w-10"
          title={isScreenSharing ? "Stop sharing screen" : "Share screen"}
        >
          {isScreenSharing ? <MonitorOff size={18} /> : <Monitor size={18} />}
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="rounded-full h-10 w-10 relative"
          title="Participants"
        >
          <Users size={18} />
          <Badge variant="default" className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0">
            {participants.length}
          </Badge>
        </Button>

        <Button
          variant="destructive"
          size="icon"
          onClick={handleLeaveRoom}
          className="rounded-full h-10 w-10"
          title="Leave room"
        >
          <Phone size={18} className="rotate-[135deg]" />
        </Button>
      </div>
      
      <div className="w-[70px]">
        {/* Empty div for spacing */}
      </div>
    </div>
  );
};

export default RoomControls;
