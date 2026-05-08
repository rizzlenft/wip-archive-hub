import { createElement, lazy, Suspense, forwardRef } from "react";
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

const App = forwardRef<HTMLDivElement>((_props, ref) =>
  createElement(
    "div",
    { ref, className: "contents" },
    createElement(
      HelmetProvider,
      null,
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(
          TooltipProvider,
          null,
          createElement(Toaster),
          createElement(Sonner),
          createElement(
            BrowserRouter,
            {
              future: {
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              },
            },
            createElement(
              Suspense,
              { fallback: createElement(PageLoader) },
              createElement(
                Routes,
                null,
                createElement(Route, { path: "/login", element: createElement(LoginPage) }),
                createElement(Route, { path: "/", element: createElement(Index) }),
                createElement(Route, {
                  path: "/events",
                  element: createElement(ProtectedRoute, null, createElement(EventsPage)),
                }),
                createElement(Route, { path: "/episodes", element: createElement(Episodes) }),
                createElement(Route, { path: "/guests", element: createElement(Guests) }),
                createElement(Route, { path: "/merch", element: createElement(Merch) }),
                createElement(Route, { path: "/newsletter", element: createElement(Newsletter) }),
                createElement(Route, { path: "/admin/newsletter", element: createElement(AdminNewsletter) }),
                createElement(Route, { path: "*", element: createElement(NotFound) }),
              ),
            ),
          ),
        ),
      ),
    ),
  ),
);

App.displayName = "App";

export default App;
