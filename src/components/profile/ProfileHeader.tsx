
import { useRef, useState } from "react";
import { ProfileWithStats } from "@/pages/Profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  Edit, 
  UserPlus, 
  UserMinus, 
  Users, 
  Camera, 
  Calendar, 
  MapPin,
  Upload
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileHeaderProps {
  profile: ProfileWithStats;
  isCurrentUser: boolean;
  onFollow: () => void;
}

const ProfileHeader = ({ profile, isCurrentUser, onFollow }: ProfileHeaderProps) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    if (isCurrentUser) {
      avatarInputRef.current?.click();
    }
  };

  const handleBannerClick = () => {
    if (isCurrentUser) {
      bannerInputRef.current?.click();
    }
  };
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const uploadImage = async (file: File, type: 'avatar' | 'banner') => {
    if (!user || !file) return null;
    
    try {
      setUploading(true);
      
      // Create a unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${type}s/${user.id}/${fileName}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file);
        
      if (uploadError) {
        throw uploadError;
      }
      
      // Get the public URL
      const { data } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);
      
      // Update the profile
      const updateField = type === 'avatar' ? 'avatar_url' : 'banner_url';
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ [updateField]: data.publicUrl })
        .eq('id', user.id);
        
      if (updateError) {
        throw updateError;
      }
      
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} updated successfully`);
      return data.publicUrl;
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      toast.error(`Failed to upload ${type}`);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const url = await uploadImage(file, 'avatar');
    if (url) {
      // Update local state instead of reloading the page
      window.location.reload();
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const url = await uploadImage(file, 'banner');
    if (url) {
      // Update local state instead of reloading the page
      window.location.reload();
    }
  };

  return (
    <div className="rounded-lg overflow-hidden bg-card border border-border">
      {/* Banner */}
      <div 
        className={cn(
          "h-40 md:h-64 relative bg-gradient-to-r from-primary/20 to-secondary/20",
          isCurrentUser && "cursor-pointer group"
        )}
        onClick={isCurrentUser ? handleBannerClick : undefined}
      >
        {profile.banner_url ? (
          <img 
            src={profile.banner_url} 
            alt="Profile banner" 
            className="w-full h-full object-cover"
          />
        ) : null}
        
        {isCurrentUser && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="w-8 h-8 text-white" />
            <span className="ml-2 text-white font-medium">Upload Banner</span>
          </div>
        )}
        
        <input 
          type="file" 
          ref={bannerInputRef} 
          onChange={handleBannerUpload}
          accept="image/*" 
          className="hidden" 
        />
      </div>
      
      {/* Profile info */}
      <div className="px-4 md:px-8 pb-6 pt-20 md:pt-24 relative">
        {/* Avatar */}
        <div 
          className={cn(
            "absolute -top-16 left-6 md:left-8 rounded-full border-4 border-background",
            isCurrentUser && "cursor-pointer group"
          )}
          onClick={isCurrentUser ? handleAvatarClick : undefined}
        >
          <Avatar className="w-32 h-32">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="text-3xl">
              {getInitials(profile.display_name || profile.username)}
            </AvatarFallback>
          </Avatar>
          
          {isCurrentUser && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
              <Camera className="w-6 h-6 text-white" />
            </div>
          )}
          
          <input 
            type="file" 
            ref={avatarInputRef} 
            onChange={handleAvatarUpload}
            accept="image/*" 
            className="hidden" 
          />
        </div>
        
        {/* Action buttons */}
        <div className="flex justify-end gap-2 mb-4">
          {isCurrentUser ? (
            <Button onClick={() => document.getElementById('edit-tab')?.click()}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          ) : (
            <Button onClick={onFollow} variant={profile.is_following ? "outline" : "default"}>
              {profile.is_following ? (
                <>
                  <UserMinus className="mr-2 h-4 w-4" />
                  Unfollow
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Follow
                </>
              )}
            </Button>
          )}
        </div>
        
        {/* Profile info */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            {profile.display_name || profile.username}
            {profile.pronouns && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({profile.pronouns})
              </span>
            )}
          </h1>
          
          <p className="text-muted-foreground">@{profile.username}</p>
          
          {profile.bio && (
            <p className="mt-4 text-pretty">{profile.bio}</p>
          )}
          
          <div className="mt-4 flex flex-wrap gap-y-2 gap-x-4 text-sm text-muted-foreground">
            <div className="flex items-center">
              <Users className="mr-1 h-4 w-4" />
              <span>{profile.follower_count} followers · {profile.following_count} following</span>
            </div>
            
            {profile.join_date && (
              <div className="flex items-center">
                <Calendar className="mr-1 h-4 w-4" />
                <span>Joined {formatDistanceToNow(new Date(profile.join_date), { addSuffix: true })}</span>
              </div>
            )}
            
            {profile.country && (
              <div className="flex items-center">
                <MapPin className="mr-1 h-4 w-4" />
                <span>{profile.country}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
