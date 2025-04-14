
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ProfileWithStats } from "@/types/profile";
import { getValidUuid } from "@/utils/uuid";

export function useProfile(username: string | undefined) {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<ProfileWithStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCurrentUser, setIsCurrentUser] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        
        // If no username provided, redirect to the current user's profile
        if (!username && isAuthenticated && user) {
          navigate(`/profile/${user.username || user.id}`, { replace: true });
          return;
        }
        
        if (!username) {
          setError("Profile not found");
          setLoading(false);
          return;
        }
        
        // Fetch the profile by username
        let { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .maybeSingle();
          
        if (profileError || !profileData) {
          // If not found by username, try by user ID (for backward compatibility)
          // For user ID lookups, make sure we have a valid UUID
          const validUserId = getValidUuid(username);
          
          console.log("Looking up by id:", validUserId);
          
          const { data: profileByIdData, error: profileByIdError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', validUserId)
            .maybeSingle();
            
          if (profileByIdError || !profileByIdData) {
            // If current user is logged in but profile not found, create one
            if (isAuthenticated && user && (user.username === username || user.id === username)) {
              console.log("Creating profile for current user");
              
              const validUuid = getValidUuid(user.id);
              
              // Create a new profile for the current user
              const { error: insertError, data: insertedProfile } = await supabase
                .from('profiles')
                .upsert({
                  id: validUuid,
                  username: user.username || username,
                  display_name: user.name,
                  avatar_url: user.avatar,
                  join_date: new Date().toISOString()
                })
                .select()
                .single();
                
              if (insertError || !insertedProfile) {
                setError("Failed to create profile. Please try again later.");
                console.error("Profile creation error:", insertError);
                setLoading(false);
                return;
              }
              
              // Use the inserted profile
              profileData = insertedProfile;
              
              // Also create user stats
              await supabase
                .from('user_stats')
                .upsert({
                  profile_id: validUuid,
                  current_streak: 0,
                  best_streak: 0,
                  total_hours: 0
                });
            } else {
              setError("Profile not found");
              setLoading(false);
              return;
            }
          } else {
            // Use the profile found by ID
            profileData = profileByIdData;
          }
        }
        
        // Check if this is the current user's profile
        setIsCurrentUser(isAuthenticated && user?.id === profileData.id);
        
        // Fetch user stats
        const { data: statsData } = await supabase
          .from('user_stats')
          .select('current_streak, best_streak, total_hours, rank, rank_position')
          .eq('profile_id', profileData.id)
          .maybeSingle();
          
        // If no stats found, create them
        if (!statsData && isCurrentUser) {
          // Create user stats
          await supabase
            .from('user_stats')
            .upsert({
              profile_id: profileData.id,
              current_streak: 0,
              best_streak: 0,
              total_hours: 0
            });
        }
          
        // Fetch follower count
        const { count: followerCount } = await supabase
          .from('followers')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', profileData.id);
          
        // Fetch following count
        const { count: followingCount } = await supabase
          .from('followers')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', profileData.id);
          
        // Check if the current user is following this profile
        let isFollowing = false;
        if (isAuthenticated && user) {
          const validUserId = getValidUuid(user.id);
          const { data: followData } = await supabase
            .from('followers')
            .select('*')
            .eq('follower_id', validUserId)
            .eq('following_id', profileData.id)
            .maybeSingle();
            
          isFollowing = !!followData;
        }
        
        // Fetch user interests
        const { data: interestsData } = await supabase
          .from('user_interests')
          .select('interests:interest_id(id, name)')
          .eq('profile_id', profileData.id);
          
        const interests = interestsData?.map(item => item.interests) || [];
        
        // Fetch user badges
        const { data: badgesData } = await supabase
          .from('user_badges')
          .select('badges:badge_id(id, name, description, level, icon_url)')
          .eq('profile_id', profileData.id);
          
        const badges = badgesData?.map(item => item.badges) || [];
        
        setProfile({
          ...profileData,
          stats: statsData || {
            current_streak: 0,
            best_streak: 0,
            total_hours: 0,
            rank: 'Beginner',
            rank_position: null
          },
          follower_count: followerCount || 0,
          following_count: followingCount || 0,
          is_following: isFollowing,
          interests,
          badges
        });
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [username, user, isAuthenticated, navigate]);
  
  const handleFollow = async () => {
    if (!isAuthenticated) {
      toast.error("Please login to follow users");
      return;
    }
    
    if (!profile || !user) return;
    
    try {
      const validUserId = getValidUuid(user.id);
      
      if (profile.is_following) {
        // Unfollow
        await supabase
          .from('followers')
          .delete()
          .eq('follower_id', validUserId)
          .eq('following_id', profile.id);
          
        setProfile({
          ...profile,
          follower_count: profile.follower_count - 1,
          is_following: false
        });
        
        toast.success(`Unfollowed ${profile.display_name || profile.username}`);
      } else {
        // Follow
        await supabase
          .from('followers')
          .insert({
            follower_id: validUserId,
            following_id: profile.id
          });
          
        setProfile({
          ...profile,
          follower_count: profile.follower_count + 1,
          is_following: true
        });
        
        toast.success(`Following ${profile.display_name || profile.username}`);
      }
    } catch (err) {
      console.error("Error updating follow status:", err);
      toast.error("Failed to update follow status");
    }
  };
  
  const updateProfile = (updatedProfile: Partial<ProfileWithStats>) => {
    if (!profile) return;
    setProfile({ ...profile, ...updatedProfile });
  };

  return {
    profile,
    loading,
    error,
    isCurrentUser,
    handleFollow,
    updateProfile
  };
}
