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
// E-commerce pages
import OrdersManager from "./pages/admin/OrdersManager";
import TemplatesManager from "./pages/admin/TemplatesManager";
import ProductsManager from "./pages/admin/ProductsManager";
import Shop from "./pages/customer/Shop";
import Checkout from "./pages/customer/Checkout";
import MyOrders from "./pages/customer/MyOrders";
import ArtCustomizer from "./pages/customer/ArtCustomizer";
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
            {/* E-commerce routes */}
            <Route path="/loja" element={<Shop />} />
            <Route path="/loja/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
            <Route path="/meus-pedidos" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
            <Route path="/arte/:templateId" element={<ProtectedRoute><ArtCustomizer /></ProtectedRoute>} />
            <Route path="/arte/:templateId/:artId" element={<ProtectedRoute><ArtCustomizer /></ProtectedRoute>} />
            {/* Admin e-commerce routes */}
            <Route path="/admin/pedidos" element={<ProtectedRoute><OrdersManager /></ProtectedRoute>} />
            <Route path="/admin/templates" element={<ProtectedRoute><TemplatesManager /></ProtectedRoute>} />
            <Route path="/admin/produtos" element={<ProtectedRoute><ProductsManager /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
