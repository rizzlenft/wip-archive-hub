import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import Index from "./pages/Index";
import { ProtectedRoute } from "@/auth/ProtectedRoute";
import Episodes from "./pages/Episodes";
import Guests from "./pages/Guests";
import Merch from "./pages/Merch";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import EventsPage from "./pages/EventsPage";
import Newsletter from "./pages/Newsletter";
import AdminNewsletter from "./pages/AdminNewsletter";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Index />} />
            <Route
              path="/events"
              element={
                <ProtectedRoute>
                  <EventsPage />
                </ProtectedRoute>
              }
            />
            <Route path="/episodes" element={<Episodes />} />
            <Route path="/guests" element={<Guests />} />
            <Route path="/merch" element={<Merch />} />
            <Route path="/newsletter" element={<Newsletter />} />
            <Route path="/admin/newsletter" element={<AdminNewsletter />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
