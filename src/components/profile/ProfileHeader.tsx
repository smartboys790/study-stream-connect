import React from "react";
import { Button } from "@/components/ui/button";
import { ProfileWithStats } from "@/types/profile";
import { Link } from "react-router-dom";

interface ProfileHeaderProps {
  profile: ProfileWithStats;
  isCurrentUser: boolean;
  onFollow: () => void;
}

const ProfileHeader = ({ profile, isCurrentUser, onFollow }: ProfileHeaderProps) => {
  return (
    <div className="bg-background p-4 rounded-lg shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{profile.display_name}</h2>
          <p className="text-muted-foreground">@{profile.username}</p>
        </div>
        <div>
          {isCurrentUser ? (
            <Link to="/profile/edit">
              <Button variant="outline">Edit Profile</Button>
            </Link>
          ) : (
            <Button onClick={onFollow}>
              {profile.is_following ? "Unfollow" : "Follow"}
            </Button>
          )}
        </div>
      </div>
      <p className="mt-2">{profile.bio || "No bio available."}</p>
    </div>
  );
};

export default ProfileHeader;
