import { useState, useEffect } from "react";
import { DataTable } from "@/components/portal/DataTable";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Eye, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useTeam } from "@/contexts/TeamContext";
import { useAuth } from "@/contexts/AuthContext";

interface Invoice {
  id: string;
  number: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  period_start: number;
  period_end: number;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  customer_email: string;
  customer_name: string | null;
  lines: Array<{
    description: string;
    amount: number;
    quantity: number;
  }>;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { canManageBilling, currentUserRole } = useTeam();
  const { user } = useAuth();

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke("get-invoices", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (error) throw error;
      setInvoices(data?.invoices || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load invoices",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getStatusBadgeStatus = (status: string): 'Active' | 'Pending' | 'Inactive' => {
    if (status === 'paid') return 'Active';
    if (status === 'open') return 'Pending';
    return 'Inactive'; // for void, uncollectible, etc.
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setViewDialogOpen(true);
  };

  const handleDownloadPDF = (invoice: Invoice) => {
    if (invoice.invoice_pdf) {
      window.open(invoice.invoice_pdf, '_blank');
    } else {
      toast({
        title: "PDF Unavailable",
        description: "This invoice doesn't have a PDF available",
        variant: "destructive",
      });
    }
  };

  const columns = [
    {
      header: 'Invoice #',
      accessor: ((invoice: Invoice) => invoice.number || invoice.id) as any,
      className: 'font-mono text-sm',
    },
    {
      header: 'Date',
      accessor: ((invoice: Invoice) => formatDate(invoice.created)) as any,
      className: 'text-muted-foreground',
    },
    {
      header: 'Period',
      accessor: ((invoice: Invoice) => (
        `${formatDate(invoice.period_start)} - ${formatDate(invoice.period_end)}`
      )) as any,
      className: 'text-muted-foreground text-sm',
    },
    {
      header: 'Amount',
      accessor: ((invoice: Invoice) => formatAmount(invoice.amount, invoice.currency)) as any,
      className: 'font-semibold',
    },
    {
      header: 'Status',
      accessor: ((invoice: Invoice) => (
        <StatusBadge status={getStatusBadgeStatus(invoice.status)} />
      )) as any,
    },
    {
      header: 'Actions',
      accessor: ((invoice: Invoice) => (
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => handleViewInvoice(invoice)}
          >
            <Eye className="w-4 h-4 mr-2" />
            View
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => handleDownloadPDF(invoice)}
            disabled={!invoice.invoice_pdf}
          >
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
      )) as any,
    },
  ];

  // Show loading while invoices are loading
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading invoices...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-muted-foreground">View and download your billing invoices</p>
        </div>
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No invoices found</p>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          data={invoices}
          columns={columns}
          searchPlaceholder="Search invoices..."
        />
      )}

      {/* Invoice Detail Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-6">
              {/* Header with Logo */}
              <div className="flex items-start justify-between">
                <div>
                  <img 
                    src="/assets/exavo-logo.png" 
                    alt="Exavo AI" 
                    className="h-8 mb-4"
                  />
                  <h3 className="text-lg font-bold">Exavo AI</h3>
                  <p className="text-sm text-muted-foreground">
                    AI-Powered Business Solutions
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Invoice</p>
                  <p className="font-mono font-semibold">{selectedInvoice.number || selectedInvoice.id}</p>
                </div>
              </div>

              <Separator />

              {/* Invoice Details */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium mb-1">Bill To:</p>
                  <p className="text-sm">{selectedInvoice.customer_name || selectedInvoice.customer_email}</p>
                  <p className="text-sm text-muted-foreground">{selectedInvoice.customer_email}</p>
                </div>
                <div className="text-right">
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Issue Date:</span>
                      <span className="font-medium">{formatDate(selectedInvoice.created)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Period:</span>
                      <span className="font-medium">
                        {formatDate(selectedInvoice.period_start)} - {formatDate(selectedInvoice.period_end)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      <StatusBadge status={getStatusBadgeStatus(selectedInvoice.status)} />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Line Items */}
              <div>
                <h4 className="font-semibold mb-4">Items</h4>
                <div className="space-y-2">
                  {selectedInvoice.lines.map((line, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{line.description}</p>
                        <p className="text-sm text-muted-foreground">Quantity: {line.quantity}</p>
                      </div>
                      <p className="font-semibold">
                        {formatAmount(line.amount, selectedInvoice.currency)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Total */}
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total</span>
                <span>{formatAmount(selectedInvoice.amount, selectedInvoice.currency)}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                {selectedInvoice.hosted_invoice_url && (
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => window.open(selectedInvoice.hosted_invoice_url!, '_blank')}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View on Stripe
                  </Button>
                )}
                {selectedInvoice.invoice_pdf && (
                  <Button 
                    variant="default" 
                    className="flex-1"
                    onClick={() => handleDownloadPDF(selectedInvoice)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
