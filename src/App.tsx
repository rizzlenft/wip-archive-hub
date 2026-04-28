import { lazy, Suspense, forwardRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import Index from "./pages/Index";
import { ProtectedRoute } from "@/auth/ProtectedRoute";

// Lazy-loaded routes for code splitting
const Episodes = lazy(() => import("./pages/Episodes"));
const Guests = lazy(() => import("./pages/Guests"));
const Merch = lazy(() => import("./pages/Merch"));
const Newsletter = lazy(() => import("./pages/Newsletter"));
const AdminNewsletter = lazy(() => import("./pages/AdminNewsletter"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const EventsPage = lazy(() => import("./pages/EventsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center text-muted-foreground">
    Loading…
  </div>
);

const App = forwardRef<HTMLDivElement>((_props, ref) => (
  <div ref={ref} className="contents">
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
          <Suspense fallback={<PageLoader />}>
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
          </Suspense>
        </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </div>
));

App.displayName = "App";

export default App;
