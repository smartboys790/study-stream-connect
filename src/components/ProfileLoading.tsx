
import React from "react";
import Header from "@/components/Header";
import { Loader2 } from "lucide-react";

const ProfileLoading = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading profile...</span>
      </div>
    </div>
  );
};

export default ProfileLoading;
