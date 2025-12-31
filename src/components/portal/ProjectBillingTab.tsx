import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Receipt, ExternalLink, Calendar, DollarSign, RefreshCw, XCircle } from "lucide-react";
import { format } from "date-fns";

interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  pdf_url?: string | null;
  hosted_invoice_url?: string | null;
  stripe_receipt_url?: string | null;
  description?: string | null;
}

interface Subscription {
  id: string;
  status: string;
  next_renewal_date: string | null;
  stripe_subscription_id: string | null;
}

interface ProjectBillingTabProps {
  paymentModel: "one_time" | "subscription" | null;
  invoices: Invoice[];
  subscription?: Subscription | null;
  monthlyFee?: number;
  onCancelSubscription?: () => void;
  cancellingSubscription?: boolean;
}

export function ProjectBillingTab({
  paymentModel,
  invoices,
  subscription,
  monthlyFee = 0,
  onCancelSubscription,
  cancellingSubscription = false,
}: ProjectBillingTabProps) {
  const isSubscription = paymentModel === "subscription";
  const isActive = subscription?.status === "active";
  const isCanceled = subscription?.status === "canceled";

  return (
    <div className="space-y-6">
      {/* Subscription Info Card - Only for subscription projects */}
      {isSubscription && subscription && (
        <Card className={isCanceled ? "border-destructive/50" : "border-primary/20"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Subscription Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                <Badge variant={isActive ? "default" : isCanceled ? "destructive" : "secondary"}>
                  {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Monthly Fee</p>
                <p className="font-medium flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  {monthlyFee.toFixed(2)} USD
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  {isCanceled ? "Access Until" : "Next Renewal"}
                </p>
                <p className="font-medium flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {subscription.next_renewal_date
                    ? format(new Date(subscription.next_renewal_date), "MMM d, yyyy")
                    : "N/A"}
                </p>
              </div>
            </div>

            {isActive && onCancelSubscription && (
              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={onCancelSubscription}
                  disabled={cancellingSubscription}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  {cancellingSubscription ? "Cancelling..." : "Cancel Subscription"}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Cancelling will stop future renewals. Access continues until the current period ends.
                </p>
              </div>
            )}

            {isCanceled && (
              <div className="p-3 bg-destructive/10 rounded-lg">
                <p className="text-sm text-destructive">
                  This subscription has been canceled. Access will continue until{" "}
                  {subscription.next_renewal_date
                    ? format(new Date(subscription.next_renewal_date), "MMM d, yyyy")
                    : "the end of the current period"}.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Invoices Card - For both payment models */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            {isSubscription ? "Billing History" : "Invoices"}
          </CardTitle>
          <CardDescription>
            {isSubscription
              ? "Monthly invoices and payment history"
              : "Payment history for this project"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No invoices yet.</p>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">
                      {invoice.currency} {invoice.amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(invoice.created_at), "MMM d, yyyy")}
                      {invoice.description && ` • ${invoice.description}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        invoice.status === "paid"
                          ? "default"
                          : invoice.status === "pending"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {invoice.status}
                    </Badge>
                    {(invoice.pdf_url || invoice.hosted_invoice_url || invoice.stripe_receipt_url) && (
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={invoice.stripe_receipt_url || invoice.pdf_url || invoice.hosted_invoice_url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          View Receipt
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}