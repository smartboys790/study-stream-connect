
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
