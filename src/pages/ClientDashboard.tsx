import { Navigate, Route, Routes } from "react-router-dom";
import { PortalLayout } from "@/components/portal/PortalLayout";
import DashboardPage from "./portal/Dashboard";
import ClientsPage from "./portal/crm/Clients";
import LeadsPage from "./portal/crm/Leads";
import SubscriptionsPage from "./portal/Subscriptions";
import TicketsPage from "./portal/Tickets";
import OrdersPage from "./portal/Orders";
import AIToolsPage from "./portal/AITools";
import TeamPage from "./portal/Team";
import SettingsPage from "./portal/Settings";

// Placeholder components for routes that weren't fully built yet
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="space-y-6">
    <div>
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="text-muted-foreground">This page is under construction</p>
    </div>
  </div>
);

const ClientDashboard = () => {
  return (
    <PortalLayout>
      <Routes>
        <Route index element={<DashboardPage />} />
        <Route path="my-services" element={<PlaceholderPage title="My Services" />} />
        <Route path="active-tools" element={<PlaceholderPage title="Active Tools" />} />
        <Route path="purchase-history" element={<PlaceholderPage title="Purchase History" />} />
        <Route path="ai-tools" element={<AIToolsPage />} />
        <Route path="automations" element={<PlaceholderPage title="Automations" />} />
        <Route path="workflows" element={<PlaceholderPage title="Workflows" />} />
        <Route path="crm/leads" element={<LeadsPage />} />
        <Route path="crm/clients" element={<ClientsPage />} />
        <Route path="crm/conversations" element={<PlaceholderPage title="Conversations" />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="forms" element={<PlaceholderPage title="Forms" />} />
        <Route path="subscriptions" element={<SubscriptionsPage />} />
        <Route path="invoices" element={<PlaceholderPage title="Invoices" />} />
        <Route path="proposals" element={<PlaceholderPage title="Proposals" />} />
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="integrations" element={<PlaceholderPage title="Integrations" />} />
        <Route path="files" element={<PlaceholderPage title="Files" />} />
        <Route path="workspace-config" element={<PlaceholderPage title="Workspace Config" />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/client" replace />} />
      </Routes>
    </PortalLayout>
  );
};

export default ClientDashboard;
