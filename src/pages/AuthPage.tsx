import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Mail, Lock, LogIn, UserPlus } from "lucide-react";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const { user, isLoading, login, signup, verifyEmail } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) {
      navigate("/");
    }
  }, [user, isLoading, navigate]);

  if (isLoading || user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (isLogin) {
        if (!email.trim() || !password.trim()) {
          setError("Please fill in all fields");
          return;
        }
        await login(email, password);
        navigate("/");
      } else if (!verifying) {
        if (!email.trim() || !password.trim()) {
          setError("Please fill in all fields");
          return;
        }
        await signup(email, password);
        setVerifying(true);
      } else {
        if (!email.trim() || !otp.trim()) {
          setError("Please enter the code we emailed you");
          return;
        }
        await verifyEmail(email, otp);
        navigate("/");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen pt-36 flex items-center justify-center px-4">
      <div className="glass-card p-8 w-full max-w-md space-y-6">
        <div className="text-center">
          <img src="/image/pixel_title.png" alt="AniBlaze" className="h-32 w-auto mx-auto mb-4 scale-125" />
          <h1 className="text-3xl font-display font-bold gradient-text">
            {isLogin ? "Welcome Back" : verifying ? "Verify Email" : "Create Account"}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {isLogin
              ? "Sign in to your account"
              : verifying
              ? "Enter the 6-digit code we sent to your email"
              : "Join AnimeStream today"}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email is always needed */}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full pl-10 pr-4 py-3 rounded-lg bg-muted/50 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
              disabled={isLogin ? false : verifying}
            />
          </div>

          {/* Password only for login and initial signup step */}
          {(!verifying || isLogin) && (
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-muted/50 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
              />
            </div>
          )}

          {/* OTP field only for signup verification */}
          {!isLogin && verifying && (
            <div className="relative">
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="6-digit verification code"
                className="w-full px-4 py-3 rounded-lg bg-muted/50 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 tracking-[0.3em] text-center"
                maxLength={6}
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors neon-glow flex items-center justify-center gap-2"
          >
            {isLogin ? <LogIn className="h-4 w-4" /> : verifying ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {isLogin ? "Sign In" : verifying ? "Verify Email" : "Sign Up"}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
              setVerifying(false);
              setOtp("");
            }}
            className="text-primary hover:underline font-medium"
          >
            {isLogin ? "Sign Up" : "Sign In"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
