
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useRoom } from "@/contexts/RoomContext";
import { ArrowRight, Calendar, Video, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

interface Room {
  id: string;
  name: string;
  is_public: boolean;
  scheduled_time: string | null;
}

const createRoomSchema = z.object({
  name: z.string().min(3, "Room name must be at least 3 characters"),
  isPublic: z.boolean().default(false),
  isScheduled: z.boolean().default(false),
  scheduledTime: z.string().optional(),
});

type CreateRoomForm = z.infer<typeof createRoomSchema>;

const RoomJoinCard = () => {
  const [roomCode, setRoomCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { createRoom } = useRoom();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const form = useForm<CreateRoomForm>({
    resolver: zodResolver(createRoomSchema),
    defaultValues: {
      name: `Study Room (${new Date().toLocaleDateString()})`,
      isPublic: false,
      isScheduled: false,
      scheduledTime: "",
    },
  });

  // Fetch available rooms on component mount
  useEffect(() => {
    const fetchRooms = async () => {
      setIsLoading(true);
      try {
        const { data: rooms, error } = await supabase
          .from('rooms')
          .select('id, name, is_public, scheduled_time')
          .order('name');

        if (error) {
          console.error("Error fetching rooms:", error);
          toast.error("Failed to load available rooms");
        } else {
          setAvailableRooms(rooms || []);
        }
      } catch (err) {
        console.error("Error in room fetch:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRooms();
  }, []);

  const handleCreateRoomSubmit = async (data: CreateRoomForm) => {
    if (!user && !isAuthenticated) {
      toast.error("You must be logged in to create a room");
      navigate("/login");
      return;
    }

    setIsCreating(true);
    try {
      // Prepare room data
      const roomData: any = {
        name: data.name,
        created_by: user.id,
        is_public: data.isPublic
      };

      // Add scheduled time if selected
      if (data.isScheduled && data.scheduledTime) {
        roomData.scheduled_time = new Date(data.scheduledTime).toISOString();
      }

      // Create room in database
      const { data: roomResult, error: roomError } = await supabase
        .from('rooms')
        .insert(roomData)
        .select('id')
        .single();

      if (roomError || !roomResult) {
        console.error("Error creating room:", roomError);
        toast.error("Failed to create room");
        return;
      }

      // Join as a participant
      const { error: participantError } = await supabase
        .from('room_participants')
        .insert({
          room_id: roomResult.id,
          user_id: user.id,
          is_active: true
        });

      if (participantError) {
        console.error("Error joining as participant:", participantError);
        toast.error("Failed to join room as participant");
        return;
      }

      // Setup WebRTC room through RoomContext
      const roomId = roomResult.id;
      if (roomId) {
        toast.success("Room created successfully!");
        setCreateDialogOpen(false);
        
        // Only navigate to room if it's not scheduled for future
        if (!data.isScheduled || !data.scheduledTime) {
          navigate(`/room/${roomId}`);
        } else {
          // If scheduled for future, just show success and stay on dashboard
          toast.success("Scheduled room created! It will appear in your upcoming sessions.");
        }
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
    
    if (!roomCode.trim()) {
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

      // Check if room requires authentication
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('is_public, scheduled_time')
        .eq('id', roomCode.trim())
        .single();

      if (roomError || !roomData) {
        toast.error("Error verifying room access");
        setIsJoining(false);
        return;
      }

      // Check if room is scheduled for future
      if (roomData.scheduled_time) {
        const scheduledTime = new Date(roomData.scheduled_time);
        const now = new Date();
        
        if (scheduledTime > now) {
          toast.error("This room is scheduled for a future time and is not active yet");
          setIsJoining(false);
          return;
        }
      }

      // If room is not public and user is not authenticated, redirect to login
      if (!roomData.is_public && !isAuthenticated) {
        toast.error("You must be logged in to join this room");
        navigate("/login");
        return;
      }

      // Register as participant if authenticated
      if (user) {
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

  const handleJoinExistingRoom = async (roomId: string, requiresAuth: boolean) => {
    if (requiresAuth && !isAuthenticated) {
      toast.error("You must be logged in to join this room");
      navigate("/login");
      return;
    }

    try {
      // Check if room is scheduled for future
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('scheduled_time')
        .eq('id', roomId)
        .single();

      if (roomError || !roomData) {
        toast.error("Error verifying room status");
        return;
      }

      // Check if room is scheduled for future
      if (roomData.scheduled_time) {
        const scheduledTime = new Date(roomData.scheduled_time);
        const now = new Date();
        
        if (scheduledTime > now) {
          toast.error("This room is scheduled for a future time and is not active yet");
          return;
        }
      }

      // Register as participant if authenticated
      if (user) {
        await supabase
          .from('room_participants')
          .upsert({
            room_id: roomId,
            user_id: user.id,
            is_active: true
          }, {
            onConflict: 'room_id,user_id'
          });
      }

      navigate(`/room/${roomId}`);
    } catch (error) {
      console.error("Error joining room:", error);
      toast.error("An error occurred while joining room");
    }
  };

  return (
    <>
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

          {isLoading ? (
            <div className="py-4 text-center">
              <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-current border-e-transparent"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading available rooms...</p>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Available Rooms:</h3>
              {availableRooms.length > 0 ? (
                <div className="space-y-2">
                  {availableRooms.map((room) => {
                    const isScheduledForFuture = room.scheduled_time ? 
                      new Date(room.scheduled_time) > new Date() : false;
                    
                    return (
                      <div key={room.id} className="flex justify-between items-center p-3 border rounded-md hover:bg-secondary/50 transition-colors">
                        <div>
                          <p className="font-medium">{room.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {room.is_public ? (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Public</span>
                            ) : (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Members</span>
                            )}
                            {room.scheduled_time && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock size={12} />
                                <span>{new Date(room.scheduled_time).toLocaleString()}</span>
                                {isScheduledForFuture && (
                                  <span className="text-xs text-amber-600">(Scheduled)</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => handleJoinExistingRoom(room.id, !room.is_public)}
                          className="bg-study-600 hover:bg-study-700"
                          disabled={isScheduledForFuture}
                        >
                          {isScheduledForFuture ? "Scheduled" : "Join"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">No rooms available</p>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-0">
          <Button
            variant="outline" 
            className="w-full"
            onClick={() => isAuthenticated ? setCreateDialogOpen(true) : navigate("/login")}
            disabled={isCreating || !isAuthenticated}
          >
            {isCreating ? "Creating..." : (isAuthenticated ? "Create New Room" : "Login to Create Room")}
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Study Room</DialogTitle>
            <DialogDescription>
              Create a new room for your study session. You can make it public or schedule it for later.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateRoomSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter room name" />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Public Room</FormLabel>
                      <FormDescription>
                        Anyone with the link can join this room without logging in
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="isScheduled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          if (!checked) {
                            form.setValue("scheduledTime", "");
                          } else {
                            // Set default to 1 hour from now
                            const oneHourLater = new Date();
                            oneHourLater.setHours(oneHourLater.getHours() + 1);
                            const dateTimeLocal = oneHourLater.toISOString().slice(0, 16);
                            form.setValue("scheduledTime", dateTimeLocal);
                          }
                        }}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Schedule for Later</FormLabel>
                      <FormDescription>
                        Set a specific time when this room will be active
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              {form.watch("isScheduled") && (
                <FormField
                  control={form.control}
                  name="scheduledTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scheduled Time</FormLabel>
                      <FormControl>
                        <Input 
                          type="datetime-local" 
                          {...field} 
                          min={new Date().toISOString().slice(0, 16)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button 
                  type="submit" 
                  disabled={isCreating}
                  className="bg-study-600 hover:bg-study-700"
                >
                  {isCreating ? "Creating..." : "Create Room"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RoomJoinCard;
