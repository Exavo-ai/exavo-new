import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Receipt, 
  ExternalLink, 
  Calendar, 
  DollarSign, 
  RefreshCw, 
  XCircle, 
  CreditCard, 
  RotateCw, 
  Pause, 
  Play,
  AlertTriangle,
  ArrowUpDown
} from "lucide-react";
import { format } from "date-fns";
import { ChangePlanDialog } from "./ChangePlanDialog";

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
  paused_at?: string | null;
  resume_at?: string | null;
  cancel_at_period_end?: boolean;
}

interface CurrentPackage {
  id: string;
  package_name: string;
  monthly_fee: number;
}

interface ProjectBillingTabProps {
  projectId: string;
  serviceId: string | null;
  paymentModel: "one_time" | "subscription" | null;
  invoices: Invoice[];
  subscription?: Subscription | null;
  monthlyFee?: number;
  currentPackage?: CurrentPackage | null;
  onCancelSubscription?: () => Promise<boolean>;
  cancellingSubscription?: boolean;
  onPauseSubscription?: () => Promise<boolean>;
  pausingSubscription?: boolean;
  onResumeSubscription?: () => Promise<boolean>;
  resumingSubscription?: boolean;
  onOpenBillingPortal?: () => Promise<boolean>;
  onResubscribe?: () => Promise<boolean>;
  onRefetch?: () => void;
}

export function ProjectBillingTab({
  projectId,
  serviceId,
  paymentModel,
  invoices,
  subscription,
  monthlyFee = 0,
  currentPackage,
  onCancelSubscription,
  cancellingSubscription = false,
  onPauseSubscription,
  pausingSubscription = false,
  onResumeSubscription,
  resumingSubscription = false,
  onOpenBillingPortal,
  onResubscribe,
  onRefetch,
}: ProjectBillingTabProps) {
  const [openingPortal, setOpeningPortal] = useState(false);
  const [resubscribing, setResubscribing] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [showChangePlanDialog, setShowChangePlanDialog] = useState(false);

  const isSubscription = paymentModel === "subscription";
  const isActive = subscription?.status === "active";
  const isPaused = subscription?.status === "paused";
  const isCanceled = subscription?.status === "canceled";
  const isPastDue = subscription?.status === "past_due";

  const handleOpenBillingPortal = async () => {
    if (!onOpenBillingPortal) return;
    setOpeningPortal(true);
    await onOpenBillingPortal();
    setOpeningPortal(false);
  };

  const handleResubscribe = async () => {
    if (!onResubscribe) return;
    setResubscribing(true);
    await onResubscribe();
    setResubscribing(false);
  };

  const handleCancelSubscription = async () => {
    if (!onCancelSubscription) return;
    setShowCancelDialog(false);
    await onCancelSubscription();
  };

  const handlePauseSubscription = async () => {
    if (!onPauseSubscription) return;
    setShowPauseDialog(false);
    await onPauseSubscription();
  };

  const handleResumeSubscription = async () => {
    if (!onResumeSubscription) return;
    await onResumeSubscription();
  };

  const getStatusBadgeVariant = () => {
    if (isActive) return "default";
    if (isPaused) return "secondary";
    if (isPastDue) return "destructive";
    if (isCanceled) return "destructive";
    return "secondary";
  };

  const getStatusLabel = () => {
    if (isPaused) return "Paused";
    if (isPastDue) return "Past Due";
    return subscription?.status ? subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1) : "Unknown";
  };

  return (
    <div className="space-y-6">
      {/* Subscription Info Card - Only for subscription projects */}
      {isSubscription && subscription && (
        <Card className={`${
          isCanceled || isPastDue ? "border-destructive/50" : 
          isPaused ? "border-yellow-500/50" : 
          "border-primary/20"
        }`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Subscription Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                <Badge variant={getStatusBadgeVariant()}>
                  {getStatusLabel()}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Current Plan</p>
                <p className="font-medium">
                  {currentPackage?.package_name || "Unknown"}
                </p>
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
                  {isCanceled ? "Access Until" : isPaused ? "Paused Since" : "Next Renewal"}
                </p>
                <p className="font-medium flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {isPaused && subscription.paused_at
                    ? format(new Date(subscription.paused_at), "MMM d, yyyy")
                    : subscription.next_renewal_date
                    ? format(new Date(subscription.next_renewal_date), "MMM d, yyyy")
                    : "N/A"}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-4 border-t flex flex-wrap gap-3">
              {/* Active subscription actions */}
              {isActive && (
                <>
                  {onOpenBillingPortal && (
                    <Button
                      variant="default"
                      onClick={handleOpenBillingPortal}
                      disabled={openingPortal}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      {openingPortal ? "Opening..." : "Manage Billing"}
                    </Button>
                  )}

                  {/* Change Plan button - only show if service has multiple packages */}
                  {serviceId && (
                    <Button
                      variant="outline"
                      onClick={() => setShowChangePlanDialog(true)}
                    >
                      <ArrowUpDown className="w-4 h-4 mr-2" />
                      Change Plan
                    </Button>
                  )}

                  {onPauseSubscription && (
                    <Button
                      variant="outline"
                      onClick={() => setShowPauseDialog(true)}
                      disabled={pausingSubscription}
                    >
                      <Pause className="w-4 h-4 mr-2" />
                      {pausingSubscription ? "Pausing..." : "Pause Subscription"}
                    </Button>
                  )}

                  {onCancelSubscription && (
                    <Button
                      variant="outline"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setShowCancelDialog(true)}
                      disabled={cancellingSubscription}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      {cancellingSubscription ? "Cancelling..." : "Cancel Subscription"}
                    </Button>
                  )}
                </>
              )}

              {/* Paused subscription actions */}
              {isPaused && onResumeSubscription && (
                <Button
                  variant="default"
                  onClick={handleResumeSubscription}
                  disabled={resumingSubscription}
                >
                  <Play className="w-4 h-4 mr-2" />
                  {resumingSubscription ? "Resuming..." : "Resume Subscription"}
                </Button>
              )}

              {/* Canceled subscription actions */}
              {isCanceled && onResubscribe && (
                <Button
                  variant="default"
                  onClick={handleResubscribe}
                  disabled={resubscribing}
                >
                  <RotateCw className="w-4 h-4 mr-2" />
                  {resubscribing ? "Processing..." : "Resubscribe"}
                </Button>
              )}

              {/* Past due actions */}
              {isPastDue && onOpenBillingPortal && (
                <Button
                  variant="default"
                  onClick={handleOpenBillingPortal}
                  disabled={openingPortal}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {openingPortal ? "Opening..." : "Update Payment Method"}
                </Button>
              )}
            </div>

            {/* Status-specific messages */}
            {isActive && (
              <p className="text-xs text-muted-foreground">
                Use "Manage Billing" to update payment method or view billing details in Stripe.
              </p>
            )}

            {isPaused && (
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  Your subscription is paused. No charges will be made until you resume.
                  {subscription.resume_at && (
                    <> Scheduled to resume on {format(new Date(subscription.resume_at), "MMM d, yyyy")}.</>
                  )}
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

            {isPastDue && (
              <div className="p-3 bg-destructive/10 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">
                  Your last payment failed. Please update your payment method to avoid service interruption.
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

      {/* Cancel Subscription Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your subscription? You will still have access until{" "}
              <strong>
                {subscription?.next_renewal_date
                  ? format(new Date(subscription.next_renewal_date), "MMMM d, yyyy")
                  : "the end of the current billing period"}
              </strong>
              . After that, you will lose access to this service.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Cancel Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pause Subscription Confirmation Dialog */}
      <AlertDialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pause Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Pausing your subscription will stop future billing until you resume. You can resume
              your subscription anytime from this page. During the pause, you may have limited access
              to some features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Active</AlertDialogCancel>
            <AlertDialogAction onClick={handlePauseSubscription}>
              Yes, Pause Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Plan Dialog */}
      {serviceId && (
        <ChangePlanDialog
          open={showChangePlanDialog}
          onOpenChange={setShowChangePlanDialog}
          projectId={projectId}
          serviceId={serviceId}
          currentPackageId={currentPackage?.id || null}
          currentMonthlyFee={monthlyFee}
          onPlanChanged={() => {
            onRefetch?.();
          }}
        />
      )}
    </div>
  );
}
