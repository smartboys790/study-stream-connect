
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useRoom } from "@/contexts/RoomContext";
import { ArrowRight, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const RoomJoinCard = () => {
  const [roomCode, setRoomCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const { createRoom } = useRoom();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleCreateRoom = async () => {
    if (!user) {
      toast.error("You must be logged in to create a room");
      return;
    }

    setIsCreating(true);
    try {
      // Create room in database
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .insert({
          name: `Study Room (${new Date().toLocaleDateString()})`,
          created_by: user.id
        })
        .select('id')
        .single();

      if (roomError || !roomData) {
        console.error("Error creating room:", roomError);
        toast.error("Failed to create room");
        return;
      }

      // Join as a participant
      const { error: participantError } = await supabase
        .from('room_participants')
        .insert({
          room_id: roomData.id,
          user_id: user.id,
          is_active: true
        });

      if (participantError) {
        console.error("Error joining as participant:", participantError);
        toast.error("Failed to join room as participant");
        return;
      }

      // Setup WebRTC room through RoomContext
      const roomId = roomData.id;
      if (roomId) {
        toast.success("Room created successfully!");
        navigate(`/room/${roomId}`);
      }
    } catch (error) {
      console.error("Error in room creation:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roomCode.trim() || !user) {
      return;
    }

    setIsJoining(true);
    try {
      // Verify the room exists
      const { data: roomExists, error: checkError } = await supabase
        .rpc('room_exists', { room_id: roomCode.trim() });

      if (checkError || !roomExists) {
        toast.error("Room not found or invalid room code");
        setIsJoining(false);
        return;
      }

      // Register as participant
      const { error: participantError } = await supabase
        .from('room_participants')
        .upsert({
          room_id: roomCode.trim(),
          user_id: user.id,
          is_active: true
        }, {
          onConflict: 'room_id,user_id'
        });

      if (participantError) {
        console.error("Error joining room:", participantError);
        toast.error("Failed to join room");
        setIsJoining(false);
        return;
      }

      // Navigate to room
      navigate(`/room/${roomCode.trim()}`);
    } catch (error) {
      console.error("Error joining room:", error);
      toast.error("An error occurred while joining room");
    } finally {
      setIsJoining(false);
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
            {isJoining ? "Joining..." : "Join"}
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
