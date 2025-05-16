import React, { useState } from "react";
import { toast } from "sonner";
import { ProfileWithStats } from "@/types/profile";
import { Button } from "@/components/ui/button";

import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter 
} from "@/components/ui/card";
import { 
  Edit, 
  Save, 
  User, 
  AtSign, 
  FileText, 
  MapPin, 
  MessageSquare 
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileEditProps {
  profile: ProfileWithStats;
  onUpdate: (updatedProfile: Partial<ProfileWithStats>) => void;
}

const ProfileEdit = ({ profile, onUpdate }: ProfileEditProps) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    username: profile.username,
    display_name: profile.display_name || "",
    bio: profile.bio || "",
    pronouns: profile.pronouns || "",
    country: profile.country || ""
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = "Username can only contain letters, numbers, and underscores";
    }
    
    if (!formData.display_name.trim()) {
      newErrors.display_name = "Display name is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !user) return;
    
    try {
      setLoading(true);
      
      // Check if username is unique (if changed)
      if (formData.username !== profile.username) {
        const { data: existingUser, error: checkError } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', formData.username)
          .not('id', 'eq', user.id)
          .maybeSingle();
          
        if (checkError) throw checkError;
        
        if (existingUser) {
          setErrors({ username: "This username is already taken" });
          return;
        }
      }
      
      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          username: formData.username,
          display_name: formData.display_name,
          bio: formData.bio,
          pronouns: formData.pronouns,
          country: formData.country,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
        
      if (error) throw error;
      
      // Update local state
      onUpdate({
        username: formData.username,
        display_name: formData.display_name,
        bio: formData.bio,
        pronouns: formData.pronouns,
        country: formData.country
      });
      
      toast.success("Profile updated successfully");
    } catch (err) {
      console.error("Error updating profile:", err);
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Edit className="mr-2 h-5 w-5" />
          Edit Profile
        </CardTitle>
        <CardDescription>
          Update your profile information
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AtSign className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="username">Username</Label>
              </div>
              <Input 
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="your_username"
                className={errors.username ? "border-destructive" : ""}
              />
              {errors.username && (
                <p className="text-xs text-destructive">{errors.username}</p>
              )}
              <p className="text-xs text-muted-foreground">
                This will be used in your profile URL: /profile/{formData.username}
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="display_name">Display Name</Label>
              </div>
              <Input 
                id="display_name"
                name="display_name"
                value={formData.display_name}
                onChange={handleChange}
                placeholder="Your Name"
                className={errors.display_name ? "border-destructive" : ""}
              />
              {errors.display_name && (
                <p className="text-xs text-destructive">{errors.display_name}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="pronouns">Pronouns</Label>
              </div>
              <Input 
                id="pronouns"
                name="pronouns"
                value={formData.pronouns}
                onChange={handleChange}
                placeholder="e.g. he/him, she/her, they/them"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="country">Country</Label>
              </div>
              <Input 
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                placeholder="Your Country"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="bio">Bio</Label>
            </div>
            <Textarea 
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Tell others about yourself..."
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              Write a short bio to introduce yourself to other users
            </p>
          </div>
        </CardContent>
        
        <CardFooter className="border-t pt-4 flex justify-between">
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <span className="mr-2">Saving...</span>
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default ProfileEdit;
