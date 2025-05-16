import React from "react";
import { ProfileWithStats } from "@/types/profile";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";

interface ProfileInfoProps {
  profile: ProfileWithStats;
}

const ProfileInfo = ({ profile }: ProfileInfoProps) => {
  return (
    <Card>
      <CardContent className="grid gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">About</h2>
          <p className="text-sm text-muted-foreground">{profile.bio || "No bio available."}</p>
        </div>

        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <span className="font-semibold">Username:</span>
              <span className="ml-1">{profile.username}</span>
            </div>
            <div>
              <span className="font-semibold">Display Name:</span>
              <span className="ml-1">{profile.display_name}</span>
            </div>
            {profile.country && (
              <div>
                <span className="font-semibold">Country:</span>
                <span className="ml-1">{profile.country}</span>
              </div>
            )}
            {profile.join_date && (
              <div>
                <span className="font-semibold">Joined:</span>
                <span className="ml-1">{format(new Date(profile.join_date), "MMM d, yyyy")}</span>
              </div>
            )}
          </div>
        </div>

        {profile.status && (
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Status</h2>
            <p className="text-sm">{profile.status}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProfileInfo;
