
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  username?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is stored in localStorage
    const storedUser = localStorage.getItem("studystream_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      // For demo purposes using Supabase Auth
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      // Fetch the user profile after successful login
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData?.user) throw new Error("User data not found");
      
      // Fetch the profile data from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userData.user.id)
        .single();
      
      if (profileError) {
        console.error("Error fetching profile:", profileError);
        // If profile doesn't exist, create one
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([
            {
              id: userData.user.id,
              username: email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, ''),
              display_name: email.split('@')[0],
              avatar_url: `https://avatar.vercel.sh/${email}?size=128`
            }
          ]);
          
        if (insertError) throw insertError;
        
        // Fetch the newly created profile
        const { data: newProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userData.user.id)
          .single();
          
        if (newProfile) {
          const mockUser = {
            id: userData.user.id,
            name: newProfile.display_name || email.split('@')[0],
            email: userData.user.email || email,
            avatar: newProfile.avatar_url,
            username: newProfile.username
          };
          
          setUser(mockUser);
          localStorage.setItem("studystream_user", JSON.stringify(mockUser));
        }
      } else if (profileData) {
        // Profile exists, use it
        const mockUser = {
          id: userData.user.id,
          name: profileData.display_name || email.split('@')[0],
          email: userData.user.email || email,
          avatar: profileData.avatar_url,
          username: profileData.username
        };
        
        setUser(mockUser);
        localStorage.setItem("studystream_user", JSON.stringify(mockUser));
      }
      
      toast.success("Login successful!");
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Failed to login. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    try {
      setIsLoading(true);
      
      // Create a username from the email
      const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Sign up with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            username,
            avatar_url: `https://avatar.vercel.sh/${email}?size=128`
          }
        }
      });
      
      if (error) throw error;
      
      if (data.user) {
        // Our database trigger will create the profile
        const mockUser = {
          id: data.user.id,
          name,
          email,
          avatar: `https://avatar.vercel.sh/${email}?size=128`,
          username
        };
        
        setUser(mockUser);
        localStorage.setItem("studystream_user", JSON.stringify(mockUser));
        toast.success("Account created successfully!");
      }
    } catch (error) {
      console.error("Signup error:", error);
      toast.error("Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      localStorage.removeItem("studystream_user");
      toast.success("Logged out successfully!");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout. Please try again.");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
