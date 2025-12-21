import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Activity, Ticket, CreditCard, FileText, Package } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface UserActivityTabProps {
  userId: string;
  userName: string;
}

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
}

interface Order {
  id: string;
  title: string | null;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
}

interface Appointment {
  id: string;
  full_name: string;
  status: string;
  appointment_date: string;
  created_at: string;
}

export function UserActivityTab({ userId, userName }: UserActivityTabProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivity();
  }, [userId]);

  const loadActivity = async () => {
    try {
      setLoading(true);

      // Load all activity data in parallel
      const [ticketsRes, paymentsRes, ordersRes, appointmentsRes] = await Promise.all([
        supabase
          .from("tickets")
          .select("id, subject, status, priority, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("payments")
          .select("id, amount, currency, status, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("orders")
          .select("id, title, amount, currency, status, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("appointments")
          .select("id, full_name, status, appointment_date, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      setTickets(ticketsRes.data || []);
      setPayments(paymentsRes.data || []);
      setOrders(ordersRes.data || []);
      setAppointments(appointmentsRes.data || []);
    } catch (error) {
      console.error("Error loading activity:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      open: "default",
      pending: "secondary",
      completed: "outline",
      paid: "outline",
      confirmed: "outline",
      cancelled: "destructive",
      closed: "secondary",
    };
    return variants[status] || "secondary";
  };

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Recent Tickets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Ticket className="h-5 w-5" />
            Recent Tickets ({tickets.length})
          </CardTitle>
          <CardDescription>Support tickets created by this user</CardDescription>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">No tickets found</p>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{ticket.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(ticket.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  <Badge variant={getStatusBadge(ticket.status)} className="capitalize ml-2">
                    {ticket.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5" />
            Recent Payments ({payments.length})
          </CardTitle>
          <CardDescription>Payment history for this user</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">No payments found</p>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium">
                      {formatCurrency(payment.amount, payment.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(payment.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  <Badge variant={getStatusBadge(payment.status)} className="capitalize">
                    {payment.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5" />
            Recent Orders ({orders.length})
          </CardTitle>
          <CardDescription>Service orders placed by this user</CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">No orders found</p>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{order.title || "Order"}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(order.amount, order.currency)} •{" "}
                      {format(new Date(order.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  <Badge variant={getStatusBadge(order.status)} className="capitalize ml-2">
                    {order.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Appointments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Recent Bookings ({appointments.length})
          </CardTitle>
          <CardDescription>Service bookings made by this user</CardDescription>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">No bookings found</p>
          ) : (
            <div className="space-y-3">
              {appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium">Booking</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(appointment.appointment_date), "MMM d, yyyy")}
                    </p>
                  </div>
                  <Badge variant={getStatusBadge(appointment.status)} className="capitalize">
                    {appointment.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
