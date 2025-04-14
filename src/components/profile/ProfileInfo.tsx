
import { ProfileWithStats } from "@/pages/Profile";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Calendar, Clock, Trophy, User, Award, Heart } from "lucide-react";
import { format } from "date-fns";

interface ProfileInfoProps {
  profile: ProfileWithStats;
}

const ProfileInfo = ({ profile }: ProfileInfoProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="mr-2 h-5 w-5" />
            Profile Summary
          </CardTitle>
          <CardDescription>Basic information about {profile.display_name || profile.username}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Display Name</h3>
                <p>{profile.display_name || '-'}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Username</h3>
                <p>@{profile.username}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Pronouns</h3>
                <p>{profile.pronouns || '-'}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Country</h3>
                <p>{profile.country || '-'}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-start">
                <Calendar className="h-5 w-5 mr-2 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Joined</h3>
                  <p>{profile.join_date ? format(new Date(profile.join_date), 'PPP') : '-'}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Clock className="h-5 w-5 mr-2 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Last Active</h3>
                  <p>{profile.last_seen ? format(new Date(profile.last_seen), 'PPP') : '-'}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Trophy className="h-5 w-5 mr-2 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Current Streak</h3>
                  <p>{profile.stats?.current_streak || 0} days</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Award className="h-5 w-5 mr-2 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Badges</h3>
                  <p>{profile.badges.length} earned</p>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Bio</h3>
            <p className="text-pretty">{profile.bio || 'No bio provided.'}</p>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">{profile.follower_count}</CardTitle>
            <CardDescription>Followers</CardDescription>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">{profile.following_count}</CardTitle>
            <CardDescription>Following</CardDescription>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">{profile.stats?.total_hours || 0}</CardTitle>
            <CardDescription>Study Hours</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
};

export default ProfileInfo;
