
import React from "react";
import { ProfileWithStats } from "@/types/profile";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from "@/components/ui/card";
import { Award, Clock, Flame, Medal, TrendingUp } from "lucide-react";

interface ProfileStatsProps {
  profile: ProfileWithStats;
}

const ProfileStats = ({ profile }: ProfileStatsProps) => {
  const stats = profile.stats || {
    current_streak: 0,
    best_streak: 0,
    total_hours: 0,
    rank: null,
    rank_position: null
  };
  
  const progressToNextRank = 75; // This would be calculated based on actual rank progress
  
  // Calculate streak progress
  const streakProgress = stats.best_streak ? Math.min(100, (stats.current_streak / stats.best_streak) * 100) : 0;
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-3xl font-bold">{stats.current_streak || 0}</CardTitle>
                <CardDescription>Current Streak</CardDescription>
              </div>
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                <Flame className="h-6 w-6" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Current</span>
                <span>Best: {stats.best_streak || 0}</span>
              </div>
              <Progress value={streakProgress} />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-3xl font-bold">{stats.total_hours || 0}</CardTitle>
                <CardDescription>Total Study Hours</CardDescription>
              </div>
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                <Clock className="h-6 w-6" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Lifetime hours</span>
                <span>Last 7 days: 12</span>
              </div>
              <Progress value={65} />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-3xl font-bold">{stats.rank || "Novice"}</CardTitle>
                <CardDescription>Current Rank</CardDescription>
              </div>
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                <Award className="h-6 w-6" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress to next rank</span>
                <span>{progressToNextRank}%</span>
              </div>
              <Progress value={progressToNextRank} />
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5" />
              Study Activity
            </CardTitle>
            <CardDescription>Weekly study hours distribution</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">Activity chart would be displayed here</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Medal className="mr-2 h-5 w-5" />
              Leaderboard Position
            </CardTitle>
            <CardDescription>Your ranking among all users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.rank_position ? (
                <div className="flex items-center justify-center h-[200px]">
                  <div className="text-center">
                    <div className="text-6xl font-bold text-primary">
                      #{stats.rank_position}
                    </div>
                    <p className="text-muted-foreground mt-2">
                      Top {Math.round((stats.rank_position / 1000) * 100)}% of all users
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[200px]">
                  <p className="text-muted-foreground">
                    Complete more study sessions to get ranked!
                  </p>
                </div>
              )}
              
              <div className="space-y-2 pt-4 border-t">
                <h4 className="font-medium">How to improve your rank:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Join daily study sessions</li>
                  <li>• Increase your streak</li>
                  <li>• Earn badges by achieving milestones</li>
                  <li>• Participate in group study rooms</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileStats;
