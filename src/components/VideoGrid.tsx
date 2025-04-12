
import { useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRoom } from "@/contexts/RoomContext";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";

const VideoGrid = () => {
  const { participants, localParticipant } = useRoom();

  // Early return if localParticipant is not ready
  if (!localParticipant) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Zoom-style grid layout
  const getGridClass = () => {
    const count = (participants?.length || 0) + 1; // +1 for local participant
    if (count <= 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-2";
    if (count <= 4) return "grid-cols-2";
    if (count <= 9) return "grid-cols-3";
    return "grid-cols-4";
  };

  return (
    <div className={`grid ${getGridClass()} gap-4 p-4 w-full h-full`}>
      {/* Local participant (self view) */}
      <VideoTile 
        participant={localParticipant} 
        isSelfView 
        className="border-2 border-primary"
      />

      {/* Remote participants */}
      {participants && participants.map((participant) => (
        <VideoTile 
          key={participant.id} 
          participant={participant}
        />
      ))}
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
  };
  isSelfView?: boolean;
  className?: string;
}

const VideoTile = ({ participant, isSelfView, className = "" }: VideoTileProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current || !participant.stream) return;

    const video = videoRef.current;
    video.srcObject = participant.stream;
    video.muted = isSelfView; // Always mute self view

    video.play().catch(err => {
      console.warn("Video playback error:", err);
    });

    return () => {
      if (video.srcObject) {
        const tracks = (video.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [participant.stream, isSelfView]);

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };

  const hasVideo = participant.stream?.getVideoTracks().length > 0 && !participant.isVideoOff;

  return (
    <div className={`relative aspect-video rounded-lg overflow-hidden bg-gray-800 ${className}`}>
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
          <Avatar className="h-24 w-24">
            <AvatarImage src={participant.avatar} />
            <AvatarFallback className="text-2xl">
              {getInitials(participant.name)}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent text-white">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            {participant.name} {isSelfView && "(You)"}
          </span>
          <div className="flex gap-2">
            <div className={`p-1 rounded-full ${participant.isVideoOff ? "bg-red-500" : "bg-green-500"}`}>
              {participant.isVideoOff ? <VideoOff size={14} /> : <Video size={14} />}
            </div>
            <div className={`p-1 rounded-full ${participant.isMuted ? "bg-red-500" : "bg-green-500"}`}>
              {participant.isMuted ? <MicOff size={14} /> : <Mic size={14} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoGrid;
