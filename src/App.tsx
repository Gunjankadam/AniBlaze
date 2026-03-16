import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "@/components/Navbar";
import HomePage from "@/pages/HomePage";
import AnimeDetailsPage from "@/pages/AnimeDetailsPage";
import WatchPage from "@/pages/WatchPage";
import SearchPage from "@/pages/SearchPage";
import CategoryPage from "@/pages/CategoryPage";
import AuthPage from "@/pages/AuthPage";
import FavoritesPage from "@/pages/FavoritesPage";
import HistoryPage from "@/pages/HistoryPage";
import WatchLaterPage from "@/pages/WatchLaterPage";
import ProfilePage from "@/pages/ProfilePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/anime/:id" element={<AnimeDetailsPage />} />
          <Route path="/watch/:id/:episode" element={<WatchPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/trending" element={<CategoryPage category="trending" />} />
          <Route path="/popular" element={<CategoryPage category="popular" />} />
          <Route path="/upcoming" element={<CategoryPage category="upcoming" />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/watch-later" element={<WatchLaterPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
