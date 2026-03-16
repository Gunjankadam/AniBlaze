import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Menu, X, Heart, Clock, User, LogOut, List } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const Navbar = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout, isLoading } = useAuth();
  const initial = user?.email?.[0]?.toUpperCase() ?? "";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setMobileOpen(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setMobileOpen(false);
  };

  const links = [
    { to: "/", label: "Home" },
    { to: "/trending", label: "Trending" },
    { to: "/popular", label: "Popular" },
    { to: "/upcoming", label: "Upcoming" },
  ];

  return (
    <nav className="glass-nav fixed top-0 left-0 right-0 z-50">
      <div className="container mx-auto px-4 h-24 flex items-center justify-between gap-4">
        <Link to="/" className="flex-shrink-0 flex items-center h-full">
          <img
            src="/image/pixel_title.png"
            alt="AniBlaze"
            className="h-full max-h-[110%] w-auto object-contain py-2"
          />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <form onSubmit={handleSearch} className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search anime..."
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-muted/50 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
            />
          </form>

          <Link to="/favorites" className="p-2 text-muted-foreground hover:text-secondary transition-colors" aria-label="Favorites">
            <Heart className="h-5 w-5" />
          </Link>
          <Link to="/watch-later" className="p-2 text-muted-foreground hover:text-primary transition-colors" aria-label="Watch later">
            <List className="h-5 w-5" />
          </Link>
          <Link to="/history" className="p-2 text-muted-foreground hover:text-primary transition-colors" aria-label="History">
            <Clock className="h-5 w-5" />
          </Link>

          {!isLoading && (
            user ? (
              <div className="flex items-center gap-4">
                <Link
                  to="/profile"
                  className="flex items-center gap-3 px-4 py-2 rounded-full glass-card hover:border-primary/50 transition-all group"
                >
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/20 text-primary text-sm font-bold group-hover:bg-primary/30">
                    {initial || <User className="h-5 w-5" />}
                  </div>
                  <span className="text-sm font-bold text-foreground hidden lg:block tracking-wide">Profile</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all font-bold text-sm"
                >
                  <LogOut className="h-6 w-6" />
                  <span className="hidden lg:block">Sign Out</span>
                </button>
              </div>
            ) : (
              <Link 
                to="/auth" 
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                Sign In
              </Link>
            )
          )}
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden text-foreground"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden glass-nav border-t border-border/30 p-4 space-y-4 animate-fade-in">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search anime..."
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-muted/50 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </form>
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setMobileOpen(false)}
              className="block text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              {l.label}
            </Link>
          ))}
          <Link to="/watch-later" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            <List className="h-4 w-4" /> Watch later
          </Link>
          <Link to="/favorites" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-secondary transition-colors">
            <Heart className="h-4 w-4" /> Favorites
          </Link>
          <Link to="/history" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            <Clock className="h-4 w-4" /> History
          </Link>
          {!isLoading && (
            user ? (
              <>
                <Link
                  to="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  <User className="h-4 w-4" /> Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-destructive transition-colors"
                >
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              </>
            ) : (
              <Link to="/auth" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                <User className="h-4 w-4" /> Sign In
              </Link>
            )
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
