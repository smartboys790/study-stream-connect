
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useRoom } from "@/contexts/RoomContext";
import { ArrowRight, Video } from "lucide-react";

const RoomJoinCard = () => {
  const [roomCode, setRoomCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const { createRoom, joinRoom, isJoining } = useRoom();
  const navigate = useNavigate();

  const handleCreateRoom = async () => {
    setIsCreating(true);
    try {
      const roomId = await createRoom();
      if (roomId) {
        navigate(`/room/${roomId}`);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.trim()) {
      navigate(`/room/${roomCode.trim()}`);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-md animate-fade-in">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="bg-study-700 text-white rounded-md p-1.5">
            <Video size={20} />
          </div>
          <CardTitle className="text-xl font-semibold">Study Rooms</CardTitle>
        </div>
        <p className="text-muted-foreground text-sm">
          Join an existing room with a code or create a new study room
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleJoinRoom} className="flex gap-2">
          <Input
            placeholder="Enter room code..."
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            className="flex-1"
          />
          <Button 
            type="submit" 
            disabled={!roomCode.trim() || isJoining}
            className="bg-study-600 hover:bg-study-700 gap-1"
          >
            Join
            <ArrowRight size={16} />
          </Button>
        </form>
      </CardContent>
      <CardFooter className="pt-0">
        <Button
          variant="outline" 
          className="w-full"
          onClick={handleCreateRoom}
          disabled={isCreating}
        >
          {isCreating ? "Creating..." : "Create New Room"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default RoomJoinCard;
