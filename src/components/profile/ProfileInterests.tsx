
import { useState, useEffect } from "react";
import { ProfileWithStats } from "@/pages/Profile";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  CardFooter 
} from "@/components/ui/card";
import { 
  Heart, 
  Plus, 
  Trash, 
  Sparkles 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";

interface Interest {
  id: string;
  name: string;
}

interface ProfileInterestsProps {
  profile: ProfileWithStats;
  isCurrentUser: boolean;
  onUpdate: (updatedProfile: Partial<ProfileWithStats>) => void;
}

const ProfileInterests = ({ profile, isCurrentUser, onUpdate }: ProfileInterestsProps) => {
  const { user } = useAuth();
  const [interests, setInterests] = useState<Interest[]>(profile.interests);
  const [availableInterests, setAvailableInterests] = useState<Interest[]>([]);
  const [selectedInterestId, setSelectedInterestId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const fetchAvailableInterests = async () => {
      try {
        const { data, error } = await supabase
          .from('interests')
          .select('id, name')
          .order('name');
          
        if (error) throw error;
        
        // Filter out already selected interests
        const selectedIds = new Set(interests.map(i => i.id));
        const available = data.filter(interest => !selectedIds.has(interest.id));
        setAvailableInterests(available);
      } catch (err) {
        console.error("Error fetching interests:", err);
        toast.error("Failed to load available interests");
      }
    };
    
    fetchAvailableInterests();
  }, [interests]);
  
  const addInterest = async () => {
    if (!selectedInterestId || !user) return;
    
    try {
      setLoading(true);
      
      // Insert the interest association
      const { error } = await supabase
        .from('user_interests')
        .insert({
          profile_id: user.id,
          interest_id: selectedInterestId
        });
        
      if (error) throw error;
      
      // Find the interest in availableInterests
      const interestToAdd = availableInterests.find(i => i.id === selectedInterestId);
      if (interestToAdd) {
        const updatedInterests = [...interests, interestToAdd];
        setInterests(updatedInterests);
        onUpdate({ interests: updatedInterests });
        setSelectedInterestId("");
        toast.success("Interest added successfully");
      }
    } catch (err) {
      console.error("Error adding interest:", err);
      toast.error("Failed to add interest");
    } finally {
      setLoading(false);
    }
  };
  
  const removeInterest = async (interestId: string) => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Delete the interest association
      const { error } = await supabase
        .from('user_interests')
        .delete()
        .eq('profile_id', user.id)
        .eq('interest_id', interestId);
        
      if (error) throw error;
      
      // Update local state
      const updatedInterests = interests.filter(i => i.id !== interestId);
      setInterests(updatedInterests);
      onUpdate({ interests: updatedInterests });
      toast.success("Interest removed successfully");
    } catch (err) {
      console.error("Error removing interest:", err);
      toast.error("Failed to remove interest");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Heart className="mr-2 h-5 w-5" />
          Interests
        </CardTitle>
        <CardDescription>
          Topics and activities that {isCurrentUser ? "you're" : profile.display_name || profile.username + " is"} interested in
        </CardDescription>
      </CardHeader>
      <CardContent>
        {interests.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {interests.map(interest => (
              <div 
                key={interest.id}
                className="bg-primary/10 text-primary rounded-full px-3 py-1.5 text-sm flex items-center"
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                <span>{interest.name}</span>
                {isCurrentUser && (
                  <button 
                    onClick={() => removeInterest(interest.id)}
                    className="ml-2 text-primary/70 hover:text-primary"
                    disabled={loading}
                  >
                    <Trash className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">
            No interests added yet.
          </p>
        )}
      </CardContent>
      
      {isCurrentUser && (
        <CardFooter className="border-t pt-4 flex flex-col items-stretch sm:flex-row sm:items-center gap-2">
          <Select value={selectedInterestId} onValueChange={setSelectedInterestId}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Select interest" />
            </SelectTrigger>
            <SelectContent>
              {availableInterests.length > 0 ? (
                availableInterests.map(interest => (
                  <SelectItem key={interest.id} value={interest.id}>
                    {interest.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-more" disabled>
                  No more interests available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          
          <Button 
            onClick={addInterest} 
            disabled={!selectedInterestId || loading}
            className="w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Interest
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default ProfileInterests;
