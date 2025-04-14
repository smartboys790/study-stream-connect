
import { ProfileWithStats } from "@/pages/Profile";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Trophy, Lock } from "lucide-react";

interface ProfileBadgesProps {
  profile: ProfileWithStats;
}

const ProfileBadges = ({ profile }: ProfileBadgesProps) => {
  // Organize badges by level
  const badgesByLevel: { [key: number]: typeof profile.badges } = {};
  
  profile.badges.forEach(badge => {
    if (!badgesByLevel[badge.level]) {
      badgesByLevel[badge.level] = [];
    }
    badgesByLevel[badge.level].push(badge);
  });
  
  // List of all possible levels
  const allLevels = [1, 2, 3, 4, 5];
  
  // Define locked badges (these would normally come from backend)
  const lockedBadges = [
    { 
      id: "locked-1", 
      name: "10 Day Streak", 
      description: "Complete a 10-day study streak", 
      level: 3 
    },
    { 
      id: "locked-2", 
      name: "100 Hour Club", 
      description: "Complete 100 hours of studying", 
      level: 4 
    },
    { 
      id: "locked-3", 
      name: "Group Master", 
      description: "Join 50 group study sessions", 
      level: 5 
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="mr-2 h-5 w-5" />
            Achievements & Badges
          </CardTitle>
          <CardDescription>
            Badges earned through studying and participation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {allLevels.map(level => (
              <div key={level}>
                <h3 className="mb-3 font-medium flex items-center">
                  <span className={`mr-2 px-2 py-0.5 rounded-full text-xs ${
                    level === 1 ? "bg-green-100 text-green-800" :
                    level === 2 ? "bg-blue-100 text-blue-800" :
                    level === 3 ? "bg-purple-100 text-purple-800" :
                    level === 4 ? "bg-amber-100 text-amber-800" :
                    "bg-red-100 text-red-800"
                  }`}>
                    Level {level}
                  </span>
                  <span>
                    {level === 1 ? "Beginner" :
                     level === 2 ? "Intermediate" :
                     level === 3 ? "Advanced" :
                     level === 4 ? "Expert" :
                     "Master"}
                  </span>
                </h3>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {/* Display earned badges for this level */}
                  {badgesByLevel[level]?.map(badge => (
                    <div 
                      key={badge.id}
                      className="border rounded-lg p-3 text-center space-y-2 hover:bg-accent/50 transition-colors"
                    >
                      <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
                        {badge.icon_url ? (
                          <img src={badge.icon_url} alt={badge.name} className="w-8 h-8" />
                        ) : (
                          <Trophy className="w-6 h-6" />
                        )}
                      </div>
                      <h4 className="font-medium text-sm">{badge.name}</h4>
                      <p className="text-xs text-muted-foreground">{badge.description}</p>
                    </div>
                  ))}
                  
                  {/* Display locked badges for this level */}
                  {lockedBadges
                    .filter(badge => badge.level === level)
                    .map(badge => (
                      <div 
                        key={badge.id}
                        className="border rounded-lg p-3 text-center space-y-2 bg-muted/50"
                      >
                        <div className="w-12 h-12 bg-muted text-muted-foreground rounded-full flex items-center justify-center mx-auto">
                          <Lock className="w-5 h-5" />
                        </div>
                        <h4 className="font-medium text-sm text-muted-foreground">{badge.name}</h4>
                        <p className="text-xs text-muted-foreground">{badge.description}</p>
                      </div>
                    ))
                  }
                  
                  {/* If there are no badges for this level */}
                  {(!badgesByLevel[level] || badgesByLevel[level].length === 0) && 
                   lockedBadges.filter(badge => badge.level === level).length === 0 && (
                    <div className="border rounded-lg p-3 text-center col-span-full">
                      <p className="text-sm text-muted-foreground">
                        No badges earned at this level yet
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileBadges;
