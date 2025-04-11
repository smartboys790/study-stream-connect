
import { Button } from "@/components/ui/button";
import { useRoom } from "@/contexts/RoomContext";
import {
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  Phone,
  MessageSquare,
  Users,
  Video,
  VideoOff,
  Copy,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useParams } from "react-router-dom";
import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface RoomControlsProps {
  onLeaveRoom?: () => void;
  toggleChat: () => void;
  isChatOpen: boolean;
}

const RoomControls = ({ onLeaveRoom, toggleChat, isChatOpen }: RoomControlsProps) => {
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
  const [participantsDrawerOpen, setParticipantsDrawerOpen] = useState(false);

  const handleLeaveRoom = () => {
    // Turn off camera and mic before leaving
    if (!isAudioMuted) {
      toggleAudio();
    }
    if (!isVideoOff) {
      toggleVideo();
    }
    
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

  const toggleParticipantsDrawer = () => {
    setParticipantsDrawerOpen(!participantsDrawerOpen);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  };

  return (
    <>
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
            onClick={toggleParticipantsDrawer}
          >
            <Users size={18} />
            <Badge variant="default" className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0">
              {participants.length}
            </Badge>
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={toggleChat}
            className="rounded-full h-10 w-10"
            title={isChatOpen ? "Close chat" : "Open chat"}
          >
            <MessageSquare size={18} />
            {isChatOpen ? <ChevronRight size={12} className="absolute top-1 right-1" /> : <ChevronLeft size={12} className="absolute top-1 right-1" />}
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

      <Drawer open={participantsDrawerOpen} onOpenChange={setParticipantsDrawerOpen}>
        <DrawerContent className="max-h-[80vh]">
          <DrawerHeader>
            <DrawerTitle>Room Participants ({participants.length})</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 space-y-4">
            {participants.map((participant) => (
              <div key={participant.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={participant.avatar} />
                    <AvatarFallback>{getInitials(participant.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{participant.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center ${participant.isMuted ? "text-red-500" : "text-green-500"}`}>
                        {participant.isMuted ? <MicOff size={14} /> : <Mic size={14} />}
                      </span>
                      <span className={`inline-flex items-center ${participant.isVideoOff ? "text-red-500" : "text-green-500"}`}>
                        {participant.isVideoOff ? <VideoOff size={14} /> : <Video size={14} />}
                      </span>
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Message
                </Button>
              </div>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default RoomControls;
