import { Card, CardContent, CardHeader} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, DollarSign, CreditCard } from "lucide-react";

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Order {
  id: string;
  service_id: string | null;
  appointment_id: string | null;
  status: string;
  amount: number;
  currency: string;
  payment_status: string;
  payment_method_id: string | null;
  created_at: string;
  updated_at: string;
  services?: { name: string } | null;
  appointments?: { full_name: string } | null;
}

export default function OrdersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentDialog, setPaymentDialog] = useState<{ open: boolean; order: Order | null }>({
    open: false,
    order: null,
  });

  useEffect(() => {
    loadOrders();
  }, [user]);

  const loadOrders = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          services(name),
          appointments(full_name)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error loading orders:", error);
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = async () => {
    if (!paymentDialog.order) return;

    try {
      const { error } = await supabase
        .from("orders")
        .update({ payment_status: "paid" })
        .eq("id", paymentDialog.order.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment processed successfully",
      });

      // Create notification
      await supabase.from("notifications").insert({
        user_id: user!.id,
        title: "Payment Successful",
        message: `Payment of ${paymentDialog.order.amount} ${paymentDialog.order.currency} processed successfully`,
      });

      setPaymentDialog({ open: false, order: null });
      loadOrders();
    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "Error",
        description: "Failed to process payment",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      "in progress": "secondary",
      completed: "default",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status.toLowerCase()] || "outline"}>{status}</Badge>;
  };

  const getPaymentStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      unpaid: "destructive",
      paid: "default",
      pending: "secondary",
      refunded: "outline",
    };
    return <Badge variant={variants[status.toLowerCase()] || "outline"}>{status}</Badge>;
  };

  const filteredOrders = orders.filter((order) =>
    (order.services?.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (order.appointments?.full_name?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-12">Loading orders...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Orders</h1>
        <p className="text-muted-foreground">Track and manage your service orders</p>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchTerm ? "No orders found matching your search" : "No orders yet"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service/Request</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {order.services?.name || order.appointments?.full_name || "N/A"}
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                      {order.amount} {order.currency}
                    </TableCell>
                    <TableCell>{getPaymentStatusBadge(order.payment_status)}</TableCell>
                    <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {order.payment_status === "unpaid" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPaymentDialog({ open: true, order })}
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Pay Now
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog
        open={paymentDialog.open}
        onOpenChange={(open) => setPaymentDialog({ open, order: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
          </DialogHeader>
          {paymentDialog.order && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span className="text-lg font-bold">
                    {paymentDialog.order.amount} {paymentDialog.order.currency}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Service</span>
                  <span className="text-sm font-medium">
                    {paymentDialog.order.services?.name ||
                      paymentDialog.order.appointments?.full_name ||
                      "N/A"}
                  </span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                In production, this would integrate with your payment processor.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialog({ open: false, order: null })}>
              Cancel
            </Button>
            <Button onClick={handlePayNow}>
              <DollarSign className="w-4 h-4 mr-2" />
              Pay Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
