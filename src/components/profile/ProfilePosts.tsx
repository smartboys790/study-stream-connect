import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { ProfileWithStats } from "@/types/profile";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Heart, MessageSquare } from "lucide-react";

interface Post {
  id: string;
  content: string;
  author_id: string;
  created_at: string;
  likes: number;
  comments: number;
  liked_by_user: boolean;
}

const ProfilePosts = ({ profile }: { profile: ProfileWithStats }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/posts/profile/${profile.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch posts: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        setPosts(data);
      } catch (e: any) {
        setError(e.message || "Failed to fetch posts");
        toast.error(e.message || "Failed to fetch posts");
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [profile.id, token]);

  const handleLike = async (postId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/posts/${postId}/like`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to like post: ${response.statusText}`);
      }

      const updatedPost = await response.json();

      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId ? { ...post, ...updatedPost } : post
        )
      );
    } catch (e: any) {
      toast.error(e.message || "Failed to like post");
    }
  };

  if (loading) {
    return <Card>
      <CardContent>
        Loading posts...
      </CardContent>
    </Card>;
  }

  if (error) {
    return <Card>
      <CardContent>
        Error: {error}
      </CardContent>
    </Card>;
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <Card key={post.id}>
          <CardHeader>
            <div className="font-semibold">
              {profile.display_name} @{profile.username}
            </div>
            <div className="text-sm text-muted-foreground">
              {new Date(post.created_at).toLocaleDateString()}
            </div>
          </CardHeader>
          <CardContent>
            <p>{post.content}</p>
            <div className="mt-4 flex justify-between items-center">
              <button
                onClick={() => handleLike(post.id)}
                className="flex items-center space-x-2 text-muted-foreground hover:text-primary transition-colors"
              >
                <Heart
                  className={`h-5 w-5 ${post.liked_by_user ? "fill-primary text-primary" : ""
                    }`}
                />
                <span>{post.likes} Likes</span>
              </button>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <MessageSquare className="h-5 w-5" />
                <span>{post.comments} Comments</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      {posts.length === 0 && <Card><CardContent>No posts yet.</CardContent></Card>}
    </div>
  );
};

export default ProfilePosts;
