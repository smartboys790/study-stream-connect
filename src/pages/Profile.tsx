
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

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        
        // If no username provided, redirect to the current user's profile
        if (!username && isAuthenticated && user) {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', user.id)
            .single();
            
          if (userProfile?.username) {
            navigate(`/profile/${userProfile.username}`, { replace: true });
            return;
          }
        }
        
        if (!username) {
          setError("Profile not found");
          setLoading(false);
          return;
        }
        
        // Fetch the profile by username
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .single();
          
        if (profileError || !profileData) {
          setError("Profile not found");
          setLoading(false);
          return;
        }
        
        // Check if this is the current user's profile
        setIsCurrentUser(isAuthenticated && user?.id === profileData.id);
        
        // Fetch user stats
        const { data: statsData } = await supabase
          .from('user_stats')
          .select('current_streak, best_streak, total_hours, rank, rank_position')
          .eq('profile_id', profileData.id)
          .single();
          
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
          const { data: followData } = await supabase
            .from('followers')
            .select('*')
            .eq('follower_id', user.id)
            .eq('following_id', profileData.id)
            .single();
            
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
          stats: statsData || null,
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
      if (profile.is_following) {
        // Unfollow
        await supabase
          .from('followers')
          .delete()
          .eq('follower_id', user.id)
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
            follower_id: user.id,
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
              <TabsTrigger value="edit">Edit Profile</TabsTrigger>
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
      </main>
    </div>
  );
};

export default Profile;
