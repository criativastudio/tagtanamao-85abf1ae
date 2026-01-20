import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ActivateProduct from "./pages/ActivateProduct";
import PublicPetPage from "./pages/PublicPetPage";
import PublicBioPage from "./pages/PublicBioPage";
import BioEditor from "./pages/BioEditor";
import PetTagsManager from "./pages/PetTagsManager";
import DisplaysManager from "./pages/DisplaysManager";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/activate"
              element={
                <ProtectedRoute>
                  <ActivateProduct />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/tags"
              element={
                <ProtectedRoute>
                  <PetTagsManager />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/displays"
              element={
                <ProtectedRoute>
                  <DisplaysManager />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/bio"
              element={
                <ProtectedRoute>
                  <BioEditor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/bio/:id"
              element={
                <ProtectedRoute>
                  <BioEditor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/pet/:qrCode" element={<PublicPetPage />} />
            <Route path="/bio/:slug" element={<PublicBioPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
