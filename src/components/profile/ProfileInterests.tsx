import React, { useState } from "react";
import { toast } from "sonner";
import { ProfileWithStats } from "@/types/profile";
import { Badge } from "@/components/ui/badge";

interface ProfileInterestsProps {
  profile: ProfileWithStats;
  isCurrentUser: boolean;
  onUpdate: (profile: Partial<ProfileWithStats>) => Promise<void>;
}

const ProfileInterests = ({ profile, isCurrentUser, onUpdate }: ProfileInterestsProps) => {
  const [editing, setEditing] = useState(false);
  const [interests, setInterests] = useState(profile.interests || []);
  const [newInterest, setNewInterest] = useState("");

  const handleAddInterest = async () => {
    if (!newInterest.trim()) return;

    const newInterestObj = { id: newInterest.trim().toLowerCase().replace(/\s+/g, '-'), name: newInterest.trim() };
    const updatedInterests = [...interests, newInterestObj];

    try {
      await onUpdate({ interests: updatedInterests });
      setInterests(updatedInterests);
      setNewInterest("");
      toast.success("Interest added successfully!");
    } catch (error) {
      toast.error("Failed to add interest.");
    }
  };

  const handleRemoveInterest = async (interestToRemove: { id: string; name: string }) => {
    const updatedInterests = interests.filter(interest => interest.id !== interestToRemove.id);

    try {
      await onUpdate({ interests: updatedInterests });
      setInterests(updatedInterests);
      toast.success("Interest removed successfully!");
    } catch (error) {
      toast.error("Failed to remove interest.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Interests</h3>
        {isCurrentUser && (
          <button onClick={() => setEditing(!editing)} className="text-sm text-gray-500 hover:text-gray-700">
            {editing ? "Close" : "Edit"}
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Add new interest"
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              className="border rounded px-2 py-1 w-full"
            />
            <button onClick={handleAddInterest} className="bg-primary text-primary-foreground rounded px-4 py-1 hover:bg-primary/80">
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {interests.map((interest) => (
              <div key={interest.id} className="flex items-center space-x-1 bg-gray-100 rounded-full px-3 py-1 text-sm">
                <span>{interest.name}</span>
                <button onClick={() => handleRemoveInterest(interest)} className="text-gray-500 hover:text-gray-700">
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {interests.map((interest) => (
            <Badge key={interest.id}>{interest.name}</Badge>
          ))}
          {interests.length === 0 && <p className="text-gray-500">No interests added yet.</p>}
        </div>
      )}
    </div>
  );
};

export default ProfileInterests;
