
import Header from "@/components/Header";
import RoomJoinCard from "@/components/RoomJoinCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar, Clock, LucideIcon, Users, VideoIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Mock recent rooms for demo purposes
  const recentRooms = [
    {
      id: "room-1",
      name: "Math Study Group",
      participants: 4,
      lastJoined: "2 days ago",
      scheduled: "Thursdays at 7PM",
      icon: Calendar,
    },
    {
      id: "room-2",
      name: "Physics Lab Prep",
      participants: 3,
      lastJoined: "1 week ago",
      scheduled: "Mondays at 6PM",
      icon: VideoIcon,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold">
            Welcome, {user?.name}!
          </h1>
          <p className="text-muted-foreground">
            Join a study room or create a new one
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xl">Quick Join</CardTitle>
                <CardDescription>
                  Enter a room code or create a new room
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RoomJoinCard />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xl">Recent Rooms</CardTitle>
                <CardDescription>
                  Your recently joined study rooms
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentRooms.length > 0 ? (
                  <div className="space-y-3">
                    {recentRooms.map((room) => (
                      <RecentRoomCard
                        key={room.id}
                        room={room}
                        onJoin={() => navigate(`/room/${room.id}`)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <p>You haven't joined any rooms yet.</p>
                    <p className="text-sm mt-1">Create or join a room to get started!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xl">Study Stats</CardTitle>
                <CardDescription>
                  Your study activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Study time this week</span>
                    </div>
                    <span className="font-medium">4h 32m</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Study sessions</span>
                    </div>
                    <span className="font-medium">8</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <VideoIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Rooms joined</span>
                    </div>
                    <span className="font-medium">3</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xl">Upcoming Sessions</CardTitle>
                <CardDescription>
                  Your scheduled study sessions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 rounded-md border border-border flex justify-between items-center">
                    <div>
                      <p className="font-medium">Math Study Group</p>
                      <p className="text-sm text-muted-foreground">Thursday, 7:00 PM</p>
                    </div>
                    <Button size="sm" variant="outline">Join</Button>
                  </div>
                  <div className="p-3 rounded-md border border-border flex justify-between items-center">
                    <div>
                      <p className="font-medium">Physics Lab Prep</p>
                      <p className="text-sm text-muted-foreground">Monday, 6:00 PM</p>
                    </div>
                    <Button size="sm" variant="outline">Join</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

interface RecentRoomCardProps {
  room: {
    id: string;
    name: string;
    participants: number;
    lastJoined: string;
    scheduled: string;
    icon: LucideIcon;
  };
  onJoin: () => void;
}

const RecentRoomCard = ({ room, onJoin }: RecentRoomCardProps) => {
  const Icon = room.icon;
  
  return (
    <div className="p-4 rounded-md border border-border hover:border-study-300 transition-colors flex justify-between items-center">
      <div className="flex items-center gap-3">
        <div className="bg-secondary rounded-md p-2">
          <Icon className="h-5 w-5 text-study-600" />
        </div>
        <div>
          <h3 className="font-medium">{room.name}</h3>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>{room.participants} participants</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{room.lastJoined}</span>
            </div>
          </div>
        </div>
      </div>
      <Button onClick={onJoin} size="sm" className="bg-study-600 hover:bg-study-700">
        Join
      </Button>
    </div>
  );
};

export default Dashboard;
