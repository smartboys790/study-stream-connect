
import React, { useState } from "react";
import Header from "@/components/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileInfo from "@/components/profile/ProfileInfo";
import ProfileStats from "@/components/profile/ProfileStats";
import ProfileBadges from "@/components/profile/ProfileBadges";
import ProfilePosts from "@/components/profile/ProfilePosts";
import ProfileInterests from "@/components/profile/ProfileInterests";
import ProfileEdit from "@/components/profile/ProfileEdit";
import { ProfileWithStats } from "@/types/profile";

interface ProfileContentProps {
  profile: ProfileWithStats;
  isCurrentUser: boolean;
  onFollow: () => void;
  onUpdate: (updatedProfile: Partial<ProfileWithStats>) => Promise<void> | void; // Updated type to accept both void and Promise<void>
}

const ProfileContent = ({ 
  profile, 
  isCurrentUser, 
  onFollow, 
  onUpdate 
}: ProfileContentProps) => {
  const [activeTab, setActiveTab] = useState("info");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container max-w-6xl mx-auto px-4 py-6">
        <ProfileHeader 
          profile={profile} 
          isCurrentUser={isCurrentUser} 
          onFollow={onFollow} 
        />
        
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid grid-cols-2 md:grid-cols-6 w-full">
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
            <TabsTrigger value="interests">Interests</TabsTrigger>
            <TabsTrigger value="badges">Badges</TabsTrigger>
            <TabsTrigger value="posts">Posts</TabsTrigger>
            {isCurrentUser && (
              <TabsTrigger id="edit-tab" value="edit">Edit Profile</TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="info" className="mt-6">
            <ProfileInfo profile={profile} />
          </TabsContent>
          
          <TabsContent value="stats" className="mt-6">
            <ProfileStats profile={profile} />
          </TabsContent>
          
          <TabsContent value="interests" className="mt-6">
            <ProfileInterests 
              profile={profile} 
              isCurrentUser={isCurrentUser} 
              onUpdate={onUpdate} 
            />
          </TabsContent>
          
          <TabsContent value="badges" className="mt-6">
            <ProfileBadges profile={profile} />
          </TabsContent>
          
          <TabsContent value="posts" className="mt-6">
            <ProfilePosts profile={profile} />
          </TabsContent>
          
          {isCurrentUser && (
            <TabsContent value="edit" className="mt-6">
              <ProfileEdit profile={profile} onUpdate={onUpdate} />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
};

export default ProfileContent;
