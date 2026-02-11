import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import About from "./pages/About";
import Services from "./pages/Services";
import ServiceDetail from "./pages/ServiceDetail";
import ServiceBySlug from "./pages/ServiceBySlug";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import CaseStudy from "./pages/CaseStudy";
import CaseStudiesPage from "./pages/CaseStudies";

import Contact from "./pages/Contact";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PasswordReset from "./pages/PasswordReset";
import UpdatePassword from "./pages/UpdatePassword";
import AcceptInvitation from "./pages/AcceptInvitation";
import Booking from "./pages/Booking";
import { AdminLayout } from "@/components/admin/AdminLayout";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminUsers from "@/pages/admin/Users";
import AdminUserDetail from "@/pages/admin/UserDetail";
import AdminServices from "@/pages/admin/Services";
import AdminWork from "@/pages/admin/Work";
import AdminPayments from "@/pages/admin/Payments";
import AdminTickets from "@/pages/admin/Tickets";
import AdminLeads from "@/pages/admin/Leads";
import AdminSettings from "@/pages/admin/Settings";
import AdminProjectDetail from "@/pages/admin/ProjectDetail";
import AdminApprovals from "@/pages/admin/Approvals";
import AdminBlog from "@/pages/admin/Blog";
import AdminReviews from "@/pages/admin/Reviews";
import AdminCaseStudies from "@/pages/admin/CaseStudies";
import ClientDashboard from "./pages/ClientDashboard";
import PaymentSuccess from "./pages/PaymentSuccess";
import Analytics from "./pages/Analytics";
import Landing from "./pages/Landing";
import FAQ from "./pages/FAQ";

import NotFound from "./pages/NotFound";
import ChatWidget from "./components/ChatWidget";
import SEO from "./components/SEO";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <SEO />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/about" element={<About />} />
        <Route path="/services" element={<Services />} />
        <Route path="/services/:id" element={<ServiceDetail />} />
        <Route path="/s/:slug" element={<ServiceBySlug />} /> {/* Legacy slug route - kept for backward compatibility */}
        <Route path="/contact" element={<Contact />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/case-studies" element={<CaseStudiesPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/client/invite/accept" element={<AcceptInvitation />} />
        <Route path="/password-reset" element={<PasswordReset />} />
              <Route path="/update-password" element={<UpdatePassword />} />
              <Route
                path="/booking"
                element={
                  <ProtectedRoute>
                    <Booking />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requireRole="admin">
                    <AdminLayout>
                      <AdminDashboard />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute requireRole="admin">
                    <AdminLayout>
                      <AdminUsers />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users/:userId"
                element={
                  <ProtectedRoute requireRole="admin">
                    <AdminLayout>
                      <AdminUserDetail />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/services"
                element={
                  <ProtectedRoute requireRole="admin">
                    <AdminLayout>
                      <AdminServices />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/work"
                element={
                  <ProtectedRoute requireRole="admin">
                    <AdminLayout>
                      <AdminWork />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/payments"
                element={
                  <ProtectedRoute requireRole="admin">
                    <AdminLayout>
                      <AdminPayments />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/tickets"
                element={
                  <ProtectedRoute requireRole="admin">
                    <AdminLayout>
                      <AdminTickets />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/leads"
                element={
                  <ProtectedRoute requireRole="admin">
                    <AdminLayout>
                      <AdminLeads />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute requireRole="admin">
                    <AdminLayout>
                      <AdminSettings />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/projects/:projectId"
                element={
                  <ProtectedRoute requireRole="admin">
                    <AdminLayout>
                      <AdminProjectDetail />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/approvals"
                element={
                  <ProtectedRoute requireRole="admin">
                    <AdminLayout>
                      <AdminApprovals />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/blog"
                element={
                  <ProtectedRoute requireRole="admin">
                    <AdminLayout>
                      <AdminBlog />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/reviews"
                element={
                  <ProtectedRoute requireRole="admin">
                    <AdminReviews />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/case-studies"
                element={
                  <ProtectedRoute requireRole="admin">
                    <AdminCaseStudies />
                  </ProtectedRoute>
                }
              />
              <Route path="/case-study/:id" element={<CaseStudy />} />
              <Route
                path="/client/*"
                element={
                  <ProtectedRoute requireRole="client">
                    <ClientDashboard />
                  </ProtectedRoute>
                }
              />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
            </Routes>
            <ChatWidget />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
