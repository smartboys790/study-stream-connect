
import { useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRoom } from "@/contexts/RoomContext";
import { Mic, MicOff, Monitor, Video, VideoOff } from "lucide-react";

const VideoGrid = () => {
  const { participants } = useRoom();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 w-full h-full">
      {participants.length === 0 ? (
        <div className="col-span-full flex items-center justify-center h-full">
          <div className="text-center p-6">
            <p className="text-lg text-muted-foreground">No participants yet</p>
          </div>
        </div>
      ) : (
        participants.map((participant) => (
          <VideoTile key={participant.id} participant={participant} />
        ))
      )}
    </div>
  );
};

interface VideoTileProps {
  participant: {
    id: string;
    name: string;
    avatar?: string;
    stream?: MediaStream;
    isMuted: boolean;
    isVideoOff: boolean;
    isScreenSharing: boolean;
  };
}

const VideoTile = ({ participant }: VideoTileProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  };

  const hasVideoStream = participant.stream && 
    participant.stream.getVideoTracks().length > 0 && 
    !participant.isVideoOff;

  return (
    <div className="relative aspect-video rounded-lg overflow-hidden border border-border bg-card shadow-sm flex items-center justify-center">
      {hasVideoStream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant.isMuted}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary">
          <Avatar className="h-24 w-24">
            <AvatarImage src={participant.avatar} alt={participant.name} />
            <AvatarFallback className="text-2xl">
              {getInitials(participant.name)}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{participant.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {participant.isScreenSharing && (
            <div className="p-1 rounded-full bg-blue-500/70">
              <Monitor size={14} />
            </div>
          )}
          <div
            className={`p-1 rounded-full ${
              participant.isVideoOff ? "bg-red-500/70" : "bg-green-500/70"
            }`}
          >
            {participant.isVideoOff ? (
              <VideoOff size={14} />
            ) : (
              <Video size={14} />
            )}
          </div>
          <div
            className={`p-1 rounded-full ${
              participant.isMuted ? "bg-red-500/70" : "bg-green-500/70"
            }`}
          >
            {participant.isMuted ? (
              <MicOff size={14} />
            ) : (
              <Mic size={14} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoGrid;
