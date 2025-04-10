
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import RoomJoinCard from "@/components/RoomJoinCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar, Clock, LucideIcon, Users, VideoIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Room {
  id: string;
  name: string;
  is_public: boolean;
  scheduled_time: string | null;
  participants: number;
  lastJoined?: string;
  icon: LucideIcon;
}

interface StudyStats {
  studyTimeThisWeek: string;
  studySessions: number;
  roomsJoined: number;
}

interface UpcomingSession {
  id: string;
  name: string;
  scheduled_time: string;
  is_active: boolean;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recentRooms, setRecentRooms] = useState<Room[]>([]);
  const [studyStats, setStudyStats] = useState<StudyStats>({
    studyTimeThisWeek: "0h 0m",
    studySessions: 0,
    roomsJoined: 0
  });
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchRecentRooms = async () => {
      try {
        // Get rooms the user has participated in
        const { data: participantData, error: participantError } = await supabase
          .from('room_participants')
          .select(`
            room_id,
            joined_at,
            rooms(id, name, is_public, scheduled_time)
          `)
          .eq('user_id', user.id)
          .eq('is_active', false) // Fetching historical data
          .order('joined_at', { ascending: false })
          .limit(5);

        if (participantError) {
          console.error("Error fetching participants:", participantError);
          return [];
        }

        // Get participant counts for each room
        const roomIds = participantData?.map(p => p.room_id) || [];
        const { data: countData, error: countError } = await supabase
          .from('room_participants')
          .select('room_id, count', { count: 'exact' })
          .in('room_id', roomIds)
          .eq('is_active', true)
          .group('room_id');

        if (countError) {
          console.error("Error fetching participant counts:", countError);
        }

        // Map the counts to each room
        const roomWithCounts = participantData?.map(item => {
          const room = item.rooms;
          if (!room) return null;
          
          const count = countData?.find(c => c.room_id === item.room_id)?.count || 0;
          const lastJoined = new Date(item.joined_at);
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - lastJoined.getTime());
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          
          let lastJoinedText = "Just now";
          if (diffDays > 0) {
            lastJoinedText = diffDays === 1 ? "Yesterday" : `${diffDays} days ago`;
          } else {
            const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
            if (diffHours > 0) {
              lastJoinedText = `${diffHours} hours ago`;
            } else {
              const diffMinutes = Math.floor(diffTime / (1000 * 60));
              lastJoinedText = `${diffMinutes} minutes ago`;
            }
          }

          // Determine icon based on room properties
          let icon: LucideIcon = VideoIcon;
          if (room.scheduled_time) {
            icon = Calendar;
          }

          return {
            id: room.id,
            name: room.name,
            is_public: room.is_public,
            scheduled_time: room.scheduled_time,
            participants: Number(count),
            lastJoined: lastJoinedText,
            icon
          };
        }).filter(Boolean) as Room[];

        return roomWithCounts || [];
      } catch (err) {
        console.error("Error fetching recent rooms:", err);
        return [];
      }
    };

    const fetchStudyStats = async () => {
      try {
        // Calculate time range for "this week"
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
        startOfWeek.setHours(0, 0, 0, 0);

        // Get study sessions from this week
        const { data: sessionData, error: sessionError } = await supabase
          .from('room_participants')
          .select(`
            joined_at,
            room_id
          `)
          .eq('user_id', user.id)
          .gte('joined_at', startOfWeek.toISOString());

        if (sessionError) {
          console.error("Error fetching session data:", sessionError);
          return {
            studyTimeThisWeek: "0h 0m",
            studySessions: 0,
            roomsJoined: 0
          };
        }

        if (!sessionData || sessionData.length === 0) {
          return {
            studyTimeThisWeek: "0h 0m",
            studySessions: 0,
            roomsJoined: 0
          };
        }

        // Calculate study time (assuming average 30min per session for demo)
        const totalMinutes = sessionData.length * 30;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const studyTimeThisWeek = `${hours}h ${minutes}m`;

        // Count unique study sessions
        const studySessions = sessionData.length;

        // Count unique rooms joined
        const uniqueRooms = new Set(sessionData.map(session => session.room_id)).size;

        return {
          studyTimeThisWeek,
          studySessions,
          roomsJoined: uniqueRooms
        };
      } catch (err) {
        console.error("Error calculating study stats:", err);
        return {
          studyTimeThisWeek: "0h 0m",
          studySessions: 0,
          roomsJoined: 0
        };
      }
    };

    const fetchUpcomingSessions = async () => {
      try {
        const now = new Date();
        
        // Get upcoming scheduled rooms
        const { data: upcomingData, error: upcomingError } = await supabase
          .from('rooms')
          .select(`
            id,
            name,
            scheduled_time,
            is_public
          `)
          .gte('scheduled_time', now.toISOString())
          .order('scheduled_time');

        if (upcomingError) {
          console.error("Error fetching upcoming sessions:", upcomingError);
          return [];
        }

        // Transform the data
        return upcomingData.map(room => {
          const scheduledTime = new Date(room.scheduled_time!);
          const isActive = scheduledTime <= now;
          
          return {
            id: room.id,
            name: room.name,
            scheduled_time: room.scheduled_time!,
            is_active: isActive
          };
        });
      } catch (err) {
        console.error("Error fetching upcoming sessions:", err);
        return [];
      }
    };

    const loadDashboardData = async () => {
      setLoading(true);
      
      const [roomsData, statsData, sessionsData] = await Promise.all([
        fetchRecentRooms(),
        fetchStudyStats(),
        fetchUpcomingSessions()
      ]);
      
      setRecentRooms(roomsData);
      setStudyStats(statsData);
      setUpcomingSessions(sessionsData);
      
      setLoading(false);
    };

    loadDashboardData();
  }, [user]);

  const handleJoinRoom = (roomId: string) => {
    navigate(`/room/${roomId}`);
  };

  const formatScheduledTime = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleString(undefined, {
      weekday: 'long',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getRemainingTime = (isoDate: string) => {
    const scheduledTime = new Date(isoDate);
    const now = new Date();
    
    if (scheduledTime <= now) {
      return null; // No remaining time, session is active
    }
    
    const diffMs = scheduledTime.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffDays > 0) {
      return `Starts in ${diffDays}d ${diffHours}h`;
    } else if (diffHours > 0) {
      return `Starts in ${diffHours}h ${diffMinutes}m`;
    } else {
      return `Starts in ${diffMinutes}m`;
    }
  };

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
                {loading ? (
                  <div className="py-4 flex justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-solid border-primary border-t-transparent"></div>
                  </div>
                ) : recentRooms.length > 0 ? (
                  <div className="space-y-3">
                    {recentRooms.map((room) => (
                      <RecentRoomCard
                        key={room.id}
                        room={room}
                        onJoin={() => handleJoinRoom(room.id)}
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
                  Your study activity this week
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="py-4 flex justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-solid border-primary border-t-transparent"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Study time this week</span>
                      </div>
                      <span className="font-medium">{studyStats.studyTimeThisWeek}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Study sessions</span>
                      </div>
                      <span className="font-medium">{studyStats.studySessions}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <VideoIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Rooms joined</span>
                      </div>
                      <span className="font-medium">{studyStats.roomsJoined}</span>
                    </div>
                  </div>
                )}
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
                {loading ? (
                  <div className="py-4 flex justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-solid border-primary border-t-transparent"></div>
                  </div>
                ) : upcomingSessions.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingSessions.map((session) => (
                      <div key={session.id} className="p-3 rounded-md border border-border flex justify-between items-center">
                        <div>
                          <p className="font-medium">{session.name}</p>
                          <p className="text-sm text-muted-foreground">{formatScheduledTime(session.scheduled_time)}</p>
                          {!session.is_active && (
                            <p className="text-xs text-amber-600 mt-1">
                              {getRemainingTime(session.scheduled_time)}
                            </p>
                          )}
                        </div>
                        <Button 
                          size="sm" 
                          variant={session.is_active ? "default" : "outline"}
                          onClick={() => handleJoinRoom(session.id)}
                          disabled={!session.is_active}
                        >
                          {session.is_active ? "Join" : "Scheduled"}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <p>No upcoming sessions scheduled.</p>
                    <p className="text-sm mt-1">Create a room with a scheduled time to see it here.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

interface RecentRoomCardProps {
  room: Room;
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
          {room.scheduled_time && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Calendar className="h-3 w-3" />
              <span>{new Date(room.scheduled_time).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
      <Button onClick={onJoin} size="sm" className="bg-study-600 hover:bg-study-700">
        Join
      </Button>
    </div>
  );
};

export default Dashboard;
