
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogIn, LogOut, User, Video } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Header = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isRoomPage = location.pathname.includes("/room/");

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  };

  return (
    <header className="w-full py-3 px-4 md:px-6 flex items-center justify-between bg-background/80 backdrop-blur-sm border-b border-border sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <Link to="/" className="flex items-center gap-2">
          <div className="bg-study-700 text-white rounded-md p-1.5">
            <Video size={20} />
          </div>
          <span className="font-semibold text-lg hidden sm:inline">
            StudyStream
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        {isAuthenticated ? (
          <>
            {!isRoomPage && (
              <Button variant="outline" onClick={() => navigate("/dashboard")}>
                Dashboard
              </Button>
            )}
            <div className="flex items-center gap-2 ml-2">
              <Avatar className="h-8 w-8 border border-border">
                <AvatarImage src={user?.avatar} alt={user?.name} />
                <AvatarFallback>
                  {user?.name ? getInitials(user.name) : "U"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden md:inline">
                {user?.name}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                aria-label="Logout"
              >
                <LogOut size={18} />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/login")}
              className="flex items-center gap-1.5"
            >
              <LogIn size={16} />
              <span>Log In</span>
            </Button>
            <Button
              onClick={() => navigate("/signup")}
              className="flex items-center gap-1.5 bg-study-600 hover:bg-study-700"
            >
              <User size={16} />
              <span>Sign Up</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
