
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileInfo from "@/components/profile/ProfileInfo";
import ProfileStats from "@/components/profile/ProfileStats";
import ProfileBadges from "@/components/profile/ProfileBadges";
import ProfilePosts from "@/components/profile/ProfilePosts";
import ProfileInterests from "@/components/profile/ProfileInterests";
import ProfileEdit from "@/components/profile/ProfileEdit";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { v4 as uuidv4 } from 'uuid';

export type ProfileWithStats = {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  pronouns: string | null;
  status: string | null;
  last_seen: string | null;
  join_date: string | null;
  country: string | null;
  created_at: string | null;
  stats: {
    current_streak: number | null;
    best_streak: number | null;
    total_hours: number | null;
    rank: string | null;
    rank_position: number | null;
  } | null;
  follower_count: number;
  following_count: number;
  is_following: boolean;
  interests: { id: string; name: string }[];
  badges: { id: string; name: string; description: string | null; level: number; icon_url: string | null }[];
};

const Profile = () => {
  const { username } = useParams<{ username: string }>();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<ProfileWithStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const [activeTab, setActiveTab] = useState("info");

  // Helper function to get a valid UUID
  const getValidUuid = (id: string): string => {
    if (id && id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return id;
    }
    
    // Check if we have a stored mapping
    const idMappings = JSON.parse(localStorage.getItem('id_mappings') || '{}');
    if (idMappings[id]) {
      return idMappings[id];
    }
    
    // Generate a new UUID if needed
    return uuidv4();
  };

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
              
              // Use the inserted profile instead of trying to reassign
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
  
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading profile...</span>
        </div>
      </div>
    );
  }
  
  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center flex-col">
          <h2 className="text-2xl font-bold mb-4">Profile Not Found</h2>
          <p className="text-muted-foreground mb-4">{error || "The requested profile could not be found."}</p>
          <button 
            onClick={() => navigate("/dashboard")} 
            className="px-4 py-2 bg-primary text-white rounded-md"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container max-w-6xl mx-auto px-4 py-6">
        {profile ? (
          <>
            <ProfileHeader 
              profile={profile} 
              isCurrentUser={isCurrentUser} 
              onFollow={handleFollow} 
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
                <ProfileInterests profile={profile} isCurrentUser={isCurrentUser} onUpdate={updateProfile} />
              </TabsContent>
              
              <TabsContent value="badges" className="mt-6">
                <ProfileBadges profile={profile} />
              </TabsContent>
              
              <TabsContent value="posts" className="mt-6">
                <ProfilePosts profile={profile} />
              </TabsContent>
              
              {isCurrentUser && (
                <TabsContent value="edit" className="mt-6">
                  <ProfileEdit profile={profile} onUpdate={updateProfile} />
                </TabsContent>
              )}
            </Tabs>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col">
            <h2 className="text-2xl font-bold mb-4">Profile Not Found</h2>
            <p className="text-muted-foreground mb-4">{error || "The requested profile could not be found."}</p>
            <button 
              onClick={() => navigate("/dashboard")} 
              className="px-4 py-2 bg-primary text-white rounded-md"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Profile;
