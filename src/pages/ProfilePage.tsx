import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Heart, Clock, List, LogOut, User } from "lucide-react";

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen pt-32">
      <div className="container mx-auto px-4 max-w-xl">
        <div className="glass-card p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="h-7 w-7 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-display font-bold text-foreground">Profile</h1>
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              to="/favorites"
              className="flex items-center gap-3 px-4 py-3 rounded-xl glass-card hover:border-secondary/40 transition-all"
            >
              <Heart className="h-5 w-5 text-secondary" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Favorites</p>
                <p className="text-xs text-muted-foreground">Your saved shows</p>
              </div>
            </Link>

            <Link
              to="/watch-later"
              className="flex items-center gap-3 px-4 py-3 rounded-xl glass-card hover:border-primary/40 transition-all"
            >
              <List className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Watch later</p>
                <p className="text-xs text-muted-foreground">Shows queued to watch</p>
              </div>
            </Link>

            <Link
              to="/history"
              className="flex items-center gap-3 px-4 py-3 rounded-xl glass-card hover:border-primary/40 transition-all"
            >
              <Clock className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">History</p>
                <p className="text-xs text-muted-foreground">Continue watching where you left off</p>
              </div>
            </Link>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-destructive border border-destructive/40 hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

