import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { CartProvider } from "./hooks/useCart";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ActivateProduct from "./pages/ActivateProduct";
import NotFound from "./pages/NotFound";
import PublicPetPage from "./pages/PublicPetPage";
import PublicDisplayPage from "./pages/PublicDisplayPage";
import PublicBioPage from "./pages/PublicBioPage";
import BioEditor from "./pages/BioEditor";
import PetTagsManager from "./pages/PetTagsManager";
import PetTagEditor from "./pages/PetTagEditor";
import DisplaysManager from "./pages/DisplaysManager";
import MyProducts from "./pages/customer/MyProducts";
import Shop from "./pages/customer/Shop";
import Checkout from "./pages/customer/Checkout";
import ArtCustomizer from "./pages/customer/ArtCustomizer";
import MyOrders from "./pages/customer/MyOrders";
import UserSettings from "./pages/customer/UserSettings";
import ProductsManager from "./pages/admin/ProductsManager";
import OrdersManager from "./pages/admin/OrdersManager";
import TemplatesManager from "./pages/admin/TemplatesManager";
import CouponsManager from "./pages/admin/CouponsManager";
import RolesManager from "./pages/admin/RolesManager";
import ThankYou from "./pages/ThankYou";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <CartProvider>
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
                path="/dashboard/produtos"
                element={
                  <ProtectedRoute>
                    <MyProducts />
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
                path="/dashboard/tags/:id"
                element={
                  <ProtectedRoute>
                    <PetTagEditor />
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
              <Route path="/display/:qrCode" element={<PublicDisplayPage />} />
              <Route path="/bio/:slug" element={<PublicBioPage />} />
              {/* E-commerce routes */}
              <Route path="/loja" element={<Shop />} />
              <Route path="/loja/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
              <Route path="/obrigado" element={<ThankYou />} />
              <Route path="/meus-pedidos" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
              <Route path="/dashboard/configuracoes" element={<ProtectedRoute><UserSettings /></ProtectedRoute>} />
              <Route path="/arte/:templateId" element={<ProtectedRoute><ArtCustomizer /></ProtectedRoute>} />
              <Route path="/arte/:templateId/:artId" element={<ProtectedRoute><ArtCustomizer /></ProtectedRoute>} />
              {/* Admin routes */}
              <Route path="/admin/pedidos" element={<ProtectedRoute><OrdersManager /></ProtectedRoute>} />
              <Route path="/admin/templates" element={<ProtectedRoute><TemplatesManager /></ProtectedRoute>} />
              <Route path="/admin/produtos" element={<ProtectedRoute><ProductsManager /></ProtectedRoute>} />
              <Route path="/admin/cupons" element={<ProtectedRoute><CouponsManager /></ProtectedRoute>} />
              <Route path="/admin/funcoes" element={<ProtectedRoute><RolesManager /></ProtectedRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </CartProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
