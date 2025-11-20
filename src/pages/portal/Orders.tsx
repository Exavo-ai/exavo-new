import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, CreditCard, Calendar, Clock, AlertCircle, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface Order {
  id: string;
  user_id: string;
  service_id: string | null;
  appointment_id: string | null;
  status: string;
  amount: number;
  currency: string;
  payment_status: string;
  payment_method_id: string | null;
  created_at: string;
  updated_at: string;
  services?: {
    name: string;
    description: string;
  } | null;
  appointments?: {
    full_name: string;
    appointment_date: string;
    appointment_time: string;
  } | null;
}

interface Appointment {
  id: string;
  full_name: string;
  service_id: string | null;
  status: string;
  appointment_date: string;
  appointment_time: string;
  created_at: string;
  email: string;
  phone: string;
  notes: string | null;
}

const getStatusVariant = (status: string): "default" | "destructive" | "secondary" | "outline" => {
  switch (status.toLowerCase()) {
    case 'confirmed':
      return 'default';
    case 'pending':
      return 'secondary';
    case 'completed':
      return 'outline';
    case 'cancelled':
      return 'destructive';
    default:
      return 'secondary';
  }
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentDialog, setPaymentDialog] = useState<{ open: boolean; order: Order | null }>({
    open: false,
    order: null,
  });
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadOrdersAndAppointments();
    }

    // Set up real-time subscription for appointments
    const channel = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
        },
        () => {
          loadOrdersAndAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadOrdersAndAppointments = async () => {
    try {
      setError(null);
      
      // Load orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          services (
            name,
            description
          ),
          appointments (
            full_name,
            appointment_date,
            appointment_time
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Load appointments (service requests)
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (appointmentsError) throw appointmentsError;

      setOrders(ordersData || []);
      setAppointments(appointmentsData || []);
    } catch (error: any) {
      console.error("Error loading data:", error);
      setError(error.message || "Failed to load data");
      toast({
        title: "Error",
        description: "Failed to load orders and service requests",
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
      loadOrdersAndAppointments();
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
    };
    return <Badge variant={variants[status.toLowerCase()] || "secondary"}>{status}</Badge>;
  };

  const filteredOrders = orders.filter((order) => {
    const serviceName = order.services?.name || order.appointments?.full_name || "";
    return serviceName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredAppointments = appointments.filter((appointment) =>
    appointment.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
          <div>
            <p className="text-lg font-semibold">Error Loading Data</p>
            <p className="text-muted-foreground">{error}</p>
          </div>
          <Button onClick={loadOrdersAndAppointments}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Orders</h1>
          <p className="text-muted-foreground">View and manage your orders and service requests</p>
        </div>
        <Button onClick={() => navigate("/client/services/browse")}>
          Browse Services
        </Button>
      </div>

      <Tabs defaultValue="orders" className="space-y-6">
        <TabsList>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="requests">Service Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Orders</CardTitle>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <CreditCard className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Orders Yet</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    You haven't placed any orders yet. Browse our services to get started.
                  </p>
                  <Button onClick={() => navigate("/client/services/browse")}>
                    Browse Services
                  </Button>
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
                    {filteredOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No orders found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {order.services?.name || order.appointments?.full_name || "N/A"}
                              </p>
                              {order.appointments && (
                                <p className="text-sm text-muted-foreground">
                                  {new Date(order.appointments.appointment_date).toLocaleDateString()} at{" "}
                                  {order.appointments.appointment_time}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell>
                            {order.currency} {order.amount.toFixed(2)}
                          </TableCell>
                          <TableCell>{getPaymentStatusBadge(order.payment_status)}</TableCell>
                          <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            {order.payment_status === "unpaid" && (
                              <Button
                                size="sm"
                                onClick={() => setPaymentDialog({ open: true, order })}
                              >
                                <CreditCard className="w-4 h-4 mr-2" />
                                Pay Now
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          {appointments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Zap className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Service Requests Yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  You haven't requested any services yet. Browse our services to get started.
                </p>
                <Button onClick={() => navigate("/client/services/browse")}>
                  Browse Services
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAppointments.map((appointment) => (
                <Card key={appointment.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-gradient-hero flex items-center justify-center mb-4">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-lg">{appointment.full_name}</CardTitle>
                    <Badge variant={getStatusVariant(appointment.status)}>
                      {appointment.status}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Date</span>
                        <span className="font-medium">
                          {new Date(appointment.appointment_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Time</span>
                        <span className="font-medium">{appointment.appointment_time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Created:</span>
                        <span className="font-medium">
                          {new Date(appointment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {appointment.notes && (
                      <div className="pt-4 border-t">
                        <p className="text-sm text-muted-foreground">Notes:</p>
                        <p className="text-sm mt-1">{appointment.notes}</p>
                      </div>
                    )}
                    <div className="flex gap-2 pt-4 border-t">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => navigate("/client/tickets")}
                      >
                        Contact Support
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={paymentDialog.open} onOpenChange={(open) => setPaymentDialog({ open, order: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
            <DialogDescription>
              Complete payment for your order
            </DialogDescription>
          </DialogHeader>
          {paymentDialog.order && (
            <div className="space-y-4 py-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service:</span>
                <span className="font-medium">
                  {paymentDialog.order.services?.name || paymentDialog.order.appointments?.full_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium text-lg">
                  {paymentDialog.order.currency} {paymentDialog.order.amount.toFixed(2)}
                </span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialog({ open: false, order: null })}>
              Cancel
            </Button>
            <Button onClick={handlePayNow}>
              <CreditCard className="w-4 h-4 mr-2" />
              Pay Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
