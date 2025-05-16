import React from "react";
import { ProfileWithStats } from "@/types/profile";
import { Badge } from "@/components/ui/badge";

interface ProfileBadgesProps {
  profile: ProfileWithStats;
}

const ProfileBadges = ({ profile }: ProfileBadgesProps) => {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Badges</h3>
      <div className="flex flex-wrap gap-2">
        {profile.badges && profile.badges.length > 0 ? (
          profile.badges.map((badge) => (
            <Badge key={badge.id}>
              {badge.name} {badge.level > 1 ? `(Level ${badge.level})` : ""}
            </Badge>
          ))
        ) : (
          <p className="text-muted-foreground">No badges earned yet.</p>
        )}
      </div>
    </div>
  );
};

export default ProfileBadges;
