import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Search, Filter, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  created_at: string;
  user_id: string;
}

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error("Error loading payments:", error);
      toast({
        title: "Error",
        description: "Failed to load payments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    try {
      const csvContent = [
        ["Date", "Amount", "Currency", "Status", "Transaction ID"],
        ...payments.map((payment) => [
          format(new Date(payment.created_at), "MMM d, yyyy"),
          payment.amount.toString(),
          payment.currency,
          payment.status,
          payment.id.substring(0, 8),
        ]),
      ]
        .map((row) => row.join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payments_${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Payments exported to CSV successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export payments",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "default";
      case "pending":
        return "secondary";
      case "failed":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setMethodFilter("all");
    setMinAmount("");
    setMaxAmount("");
    setStartDate("");
    setEndDate("");
  };

  const filteredPayments = payments.filter((payment) => {
    // Search filter
    const matchesSearch = 
      payment.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.user_id.toLowerCase().includes(searchTerm.toLowerCase());

    // Status filter
    const matchesStatus = statusFilter === "all" || payment.status.toLowerCase() === statusFilter;

    // Payment method filter
    const matchesMethod = 
      methodFilter === "all" || 
      (payment.payment_method?.toLowerCase() === methodFilter);

    // Amount filter
    const amount = Number(payment.amount);
    const matchesMinAmount = !minAmount || amount >= Number(minAmount);
    const matchesMaxAmount = !maxAmount || amount <= Number(maxAmount);

    // Date filter
    const paymentDate = new Date(payment.created_at);
    const matchesStartDate = !startDate || paymentDate >= new Date(startDate);
    const matchesEndDate = !endDate || paymentDate <= new Date(endDate + "T23:59:59");

    return matchesSearch && matchesStatus && matchesMethod && 
           matchesMinAmount && matchesMaxAmount && 
           matchesStartDate && matchesEndDate;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading payments...</p>
        </div>
      </div>
    );
  }

  const totalRevenue = filteredPayments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const hasActiveFilters = searchTerm || statusFilter !== "all" || methodFilter !== "all" || 
                          minAmount || maxAmount || startDate || endDate;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Payments</h2>
          <p className="text-muted-foreground">View all payment transactions</p>
        </div>
        <Button onClick={exportToCSV}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Filters</CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Transaction ID, User ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Method Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method</label>
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Min Amount */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Min Amount</label>
              <Input
                type="number"
                placeholder="0.00"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>

            {/* Max Amount */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Amount</label>
              <Input
                type="number"
                placeholder="10000.00"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredPayments.length}</div>
            {hasActiveFilters && (
              <p className="text-xs text-muted-foreground mt-1">
                of {payments.length} total
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Successful</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredPayments.filter((p) => p.status === "completed").length}
            </div>
            {hasActiveFilters && (
              <p className="text-xs text-muted-foreground mt-1">
                of {payments.filter((p) => p.status === "completed").length} total
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Transactions ({filteredPayments.length}
            {hasActiveFilters && ` of ${payments.length}`})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="hidden md:table-cell">Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Transaction ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      {payments.length === 0 
                        ? "No payments found" 
                        : "No payments match your filters"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {format(new Date(payment.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {payment.currency} {Number(payment.amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {payment.payment_method || "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(payment.status)}>
                          {payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {payment.id.substring(0, 8)}...
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
