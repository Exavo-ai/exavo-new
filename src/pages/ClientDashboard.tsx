import { Navigate, Route, Routes } from "react-router-dom";
import { PortalLayout } from "@/components/portal/PortalLayout";
import DashboardPage from "./portal/Dashboard";
import ClientsPage from "./portal/crm/Clients";
import LeadsPage from "./portal/crm/Leads";
import ConversationsPage from "./portal/Conversations";
import SubscriptionsPage from "./portal/Subscriptions";
import TicketsPage from "./portal/Tickets";
import TicketDetailPage from "./portal/TicketDetail";
import OrdersPage from "./portal/Orders";
import AIToolsPage from "./portal/AITools";
import TeamPage from "./portal/Team";
import SettingsPage from "./portal/Settings";
import MyServicesPage from "./portal/MyServices";
import ActiveToolsPage from "./portal/ActiveTools";
import PurchaseHistoryPage from "./portal/PurchaseHistory";
import AutomationsPage from "./portal/Automations";
import WorkflowsPage from "./portal/Workflows";
import FormsPage from "./portal/Forms";
import InvoicesPage from "./portal/Invoices";
import ProposalsPage from "./portal/Proposals";
import IntegrationsPage from "./portal/Integrations";
import FilesPage from "./portal/Files";
import WorkspaceConfigPage from "./portal/WorkspaceConfig";
import BrowseServicesPage from "./portal/BrowseServices";
import WorkspacePage from "./portal/Workspace";

const ClientDashboard = () => {
  return (
    <PortalLayout>
      <Routes>
        <Route index element={<DashboardPage />} />
        <Route path="workspace" element={<WorkspacePage />} />
        <Route path="services/browse" element={<BrowseServicesPage />} />
        <Route path="my-services" element={<MyServicesPage />} />
        <Route path="active-tools" element={<ActiveToolsPage />} />
        <Route path="purchase-history" element={<PurchaseHistoryPage />} />
        <Route path="ai-tools" element={<AIToolsPage />} />
        <Route path="automations" element={<AutomationsPage />} />
        <Route path="workflows" element={<WorkflowsPage />} />
        <Route path="crm/leads" element={<LeadsPage />} />
        <Route path="crm/clients" element={<ClientsPage />} />
        <Route path="crm/conversations" element={<ConversationsPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="forms" element={<FormsPage />} />
        <Route path="subscriptions" element={<SubscriptionsPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="proposals" element={<ProposalsPage />} />
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="tickets/:ticketId" element={<TicketDetailPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="integrations" element={<IntegrationsPage />} />
        <Route path="files" element={<FilesPage />} />
        <Route path="workspace-config" element={<WorkspaceConfigPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/client" replace />} />
      </Routes>
    </PortalLayout>
  );
};

export default ClientDashboard;
