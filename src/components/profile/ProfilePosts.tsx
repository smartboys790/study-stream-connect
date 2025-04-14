
import { useEffect, useState } from "react";
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
  MessageSquare, 
  ThumbsUp, 
  MoreVertical, 
  Send 
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface Post {
  id: string;
  content: string;
  created_at: string;
  profile_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

interface ProfilePostsProps {
  profile: ProfileWithStats;
}

const ProfilePosts = ({ profile }: ProfilePostsProps) => {
  const { user, isAuthenticated } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  useEffect(() => {
    fetchPosts();
  }, [profile.id]);
  
  const fetchPosts = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          created_at,
          profile_id,
          profiles:profile_id (
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // Format the posts data
      const formattedPosts = data.map(post => ({
        id: post.id,
        content: post.content,
        created_at: post.created_at,
        profile_id: post.profile_id,
        username: post.profiles?.username || "",
        display_name: post.profiles?.display_name || "",
        avatar_url: post.profiles?.avatar_url || null
      }));
      
      setPosts(formattedPosts);
    } catch (err) {
      console.error("Error fetching posts:", err);
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
    }
  };
  
  const createPost = async () => {
    if (!newPost.trim() || !isAuthenticated || !user) return;
    
    try {
      setSubmitting(true);
      
      const { data, error } = await supabase
        .from('posts')
        .insert({
          profile_id: user.id,
          content: newPost.trim()
        })
        .select();
        
      if (error) throw error;
      
      // Create a formatted post object
      const createdPost: Post = {
        id: data[0].id,
        content: data[0].content,
        created_at: data[0].created_at,
        profile_id: data[0].profile_id,
        username: profile.username,
        display_name: profile.display_name || "",
        avatar_url: profile.avatar_url
      };
      
      // Update the posts list
      setPosts([createdPost, ...posts]);
      setNewPost("");
      toast.success("Post created successfully");
    } catch (err) {
      console.error("Error creating post:", err);
      toast.error("Failed to create post");
    } finally {
      setSubmitting(false);
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="mr-2 h-5 w-5" />
            Posts
          </CardTitle>
          <CardDescription>
            {isAuthenticated && user?.id === profile.id 
              ? "Share your thoughts and updates" 
              : `Posts shared by ${profile.display_name || profile.username}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAuthenticated && user?.id === profile.id && (
            <div className="space-y-2">
              <Textarea 
                placeholder="What's on your mind?" 
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                className="min-h-[100px]"
              />
              <div className="flex justify-end">
                <Button 
                  onClick={createPost} 
                  disabled={!newPost.trim() || submitting}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Post
                </Button>
              </div>
            </div>
          )}
          
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading posts...</p>
            </div>
          ) : posts.length > 0 ? (
            <div className="divide-y">
              {posts.map((post) => (
                <div key={post.id} className="py-4">
                  <div className="flex gap-3">
                    <Avatar>
                      <AvatarImage src={post.avatar_url || undefined} />
                      <AvatarFallback>{getInitials(post.display_name || post.username)}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <div>
                          <h4 className="font-medium">{post.display_name || post.username}</h4>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        
                        {isAuthenticated && user?.id === post.profile_id && (
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      <p className="mt-2 text-pretty">{post.content}</p>
                      
                      <div className="mt-3 flex gap-2">
                        <Button variant="ghost" size="sm" className="h-8 text-muted-foreground">
                          <ThumbsUp className="mr-1 h-4 w-4" />
                          <span>Like</span>
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 text-muted-foreground">
                          <MessageSquare className="mr-1 h-4 w-4" />
                          <span>Comment</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No posts yet.</p>
              {isAuthenticated && user?.id === profile.id && (
                <p className="mt-2">Share your first post with the community!</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePosts;
