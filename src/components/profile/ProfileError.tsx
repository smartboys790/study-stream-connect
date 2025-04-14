
import React from "react";
import Header from "@/components/Header";
import { useNavigate } from "react-router-dom";

interface ProfileErrorProps {
  errorMessage: string | null;
}

const ProfileError = ({ errorMessage }: ProfileErrorProps) => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center flex-col">
        <h2 className="text-2xl font-bold mb-4">Profile Not Found</h2>
        <p className="text-muted-foreground mb-4">
          {errorMessage || "The requested profile could not be found."}
        </p>
        <button 
          onClick={() => navigate("/dashboard")} 
          className="px-4 py-2 bg-primary text-white rounded-md"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
};

export default ProfileError;
