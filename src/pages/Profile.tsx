
import React from "react";
import { useParams } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import ProfileLoading from "@/components/profile/ProfileLoading";
import ProfileError from "@/components/profile/ProfileError";
import ProfileContent from "@/components/profile/ProfileContent";

const Profile = () => {
  const { username } = useParams<{ username: string }>();
  const { 
    profile, 
    loading, 
    error, 
    isCurrentUser, 
    handleFollow, 
    updateProfile 
  } = useProfile(username);
  
  if (loading) {
    return <ProfileLoading />;
  }
  
  if (error || !profile) {
    return <ProfileError errorMessage={error} />;
  }
  
  return (
    <ProfileContent 
      profile={profile}
      isCurrentUser={isCurrentUser}
      onFollow={handleFollow}
      onUpdate={updateProfile}
    />
  );
};

export default Profile;
