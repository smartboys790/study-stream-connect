
import { useRef, useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRoom } from '@/contexts/RoomContext';
import { Mic, MicOff, Video, VideoOff, MonitorSmartphone } from 'lucide-react';

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

const VideoTile = ({ 
  participant,
  isSelfView = false,
  className = '',
  isLarge = false
}: {
  participant: Participant;
  isSelfView?: boolean;
  className?: string;
  isLarge?: boolean;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    if (!videoRef.current || !participant.stream) {
      setVideoLoaded(false);
      return;
    }

    const video = videoRef.current;
    
    try {
      video.srcObject = participant.stream;
      video.muted = isSelfView;
      
      const handlePlay = () => {
        console.log(`Video playing for ${participant.name}`);
        setVideoLoaded(true);
        setVideoError(false);
      };
      
      const handleError = (err: Event) => {
        console.error(`Video playback error for ${participant.name}:`, err);
        setVideoError(true);
        setVideoLoaded(false);
      };
      
      video.addEventListener('playing', handlePlay);
      video.addEventListener('error', handleError);
      
      video.play().catch(err => {
        console.warn(`Initial play failed for ${participant.name}:`, err);
        // Auto-retry play on user interaction
        document.addEventListener('click', function playOnClick() {
          video.play().catch(console.error);
          document.removeEventListener('click', playOnClick);
        }, { once: true });
      });

      return () => {
        video.removeEventListener('playing', handlePlay);
        video.removeEventListener('error', handleError);
        
        if (video.srcObject) {
          // Don't stop tracks here as they might be used elsewhere
          video.srcObject = null;
        }
      };
    } catch (err) {
      console.error('Error setting video source:', err);
      setVideoError(true);
    }
  }, [participant.stream, participant.name, isSelfView]);

  const getInitials = (name: string) => 
    name.split(' ').map(n => n[0]).join('').toUpperCase();

  const hasVideo = participant.stream?.getVideoTracks().length > 0 && !participant.isVideoOff;
  const isScreenSharing = participant.isScreenSharing;

  const tileClasses = `
    relative aspect-video rounded-lg overflow-hidden bg-gray-800 
    ${isLarge ? 'col-span-2 row-span-2' : ''}
    ${className}
  `;

  return (
    <div className={tileClasses}>
      {hasVideo ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover ${videoLoaded ? 'opacity-100' : 'opacity-0'}`}
          />
          {!videoLoaded && !videoError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </>
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
          <span className="text-sm font-medium flex items-center gap-2">
            {isScreenSharing && <MonitorSmartphone size={16} className="text-green-400" />}
            {participant.name} {isSelfView && '(You)'}
          </span>
          <div className="flex gap-2">
            <div className={`p-1 rounded-full ${participant.isVideoOff ? 'bg-red-500' : 'bg-green-500'}`}>
              {participant.isVideoOff ? <VideoOff size={14} /> : <Video size={14} />}
            </div>
            <div className={`p-1 rounded-full ${participant.isMuted ? 'bg-red-500' : 'bg-green-500'}`}>
              {participant.isMuted ? <MicOff size={14} /> : <Mic size={14} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const VideoGrid = () => {
  const { participants, localParticipant } = useRoom();
  
  // Check if any participant is screen sharing
  // Adding null checks to prevent errors when participants or localParticipant are undefined
  const screenSharingParticipant = 
    participants && localParticipant ? 
    [localParticipant, ...participants].find(p => p && p.isScreenSharing) : 
    undefined;
  
  // Determine grid layout
  const getGridClass = () => {
    // Add safe checks to handle potential undefined values
    const count = (participants?.length || 0) + 1; // +1 for local participant
    
    // If someone is sharing their screen, use a different layout
    if (screenSharingParticipant) {
      if (count <= 2) return 'grid-cols-1';
      if (count <= 5) return 'grid-cols-2';
      return 'grid-cols-3';
    }
    
    // Regular video conference layout
    if (count <= 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-1 md:grid-cols-2';
    if (count <= 4) return 'grid-cols-2';
    if (count <= 9) return 'grid-cols-3';
    return 'grid-cols-4';
  };

  // Early return if localParticipant is not available yet
  if (!localParticipant) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className={`grid ${getGridClass()} gap-4 p-4 w-full h-full auto-rows-min`}>
      {/* If someone is screen sharing, show them first and larger */}
      {screenSharingParticipant && (
        <VideoTile 
          key={`screen-${screenSharingParticipant.id}`}
          participant={screenSharingParticipant}
          isSelfView={screenSharingParticipant.id === localParticipant.id}
          isLarge={true}
          className="col-span-full row-span-2 md:row-span-3"
        />
      )}
      
      {/* Then show all participants including local participant */}
      {[localParticipant, ...(participants || [])]
        // Filter out the screen sharing participant if they're already displayed
        // Also add null checks for safety
        .filter(p => p && (screenSharingParticipant ? p.id !== screenSharingParticipant.id : true))
        .map(participant => (
          <VideoTile 
            key={participant.id} 
            participant={participant} 
            isSelfView={participant.id === localParticipant.id}
            className={participant.id === localParticipant.id ? "border-2 border-primary" : ""}
          />
        ))}
    </div>
  );
};

export default VideoGrid;
