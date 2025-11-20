import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PaymentMethod {
  id: string;
  card_last4: string;
  card_brand: string;
  exp_month: string;
  exp_year: string;
  is_default: boolean;
}

export function PaymentMethodsDialog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [addingCard, setAddingCard] = useState(false);
  const [cardData, setCardData] = useState({
    number: "",
    expMonth: "",
    expYear: "",
    cvc: "",
  });

  const loadPaymentMethods = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      setMethods(data || []);
    } catch (error) {
      console.error("Error loading payment methods:", error);
    }
  };

  const handleAddCard = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // In production, this would integrate with Stripe/payment processor
      const last4 = cardData.number.slice(-4);
      
      const { error } = await supabase.from("payment_methods").insert({
        user_id: user.id,
        card_last4: last4,
        card_brand: "visa", // Would be detected by payment processor
        exp_month: cardData.expMonth,
        exp_year: cardData.expYear,
        is_default: methods.length === 0,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment method added successfully",
      });

      setCardData({ number: "", expMonth: "", expYear: "", cvc: "" });
      setAddingCard(false);
      loadPaymentMethods();
    } catch (error) {
      console.error("Error adding payment method:", error);
      toast({
        title: "Error",
        description: "Failed to add payment method",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCard = async (id: string) => {
    try {
      const { error } = await supabase
        .from("payment_methods")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment method removed",
      });

      loadPaymentMethods();
    } catch (error) {
      console.error("Error deleting payment method:", error);
      toast({
        title: "Error",
        description: "Failed to remove payment method",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" onClick={loadPaymentMethods}>
          <CreditCard className="w-4 h-4 mr-2" />
          Payment Methods
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Payment Methods</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {methods.length === 0 && !addingCard && (
            <p className="text-center text-muted-foreground py-8">
              No payment methods added yet
            </p>
          )}

          {methods.map((method) => (
            <div
              key={method.id}
              className="flex items-center justify-between p-4 border border-border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {method.card_brand.toUpperCase()} •••• {method.card_last4}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Expires {method.exp_month}/{method.exp_year}
                  </p>
                </div>
                {method.is_default && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    Default
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteCard(method.id)}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ))}

          {addingCard && (
            <div className="space-y-4 p-4 border border-border rounded-lg">
              <div className="space-y-2">
                <Label>Card Number</Label>
                <Input
                  placeholder="1234 5678 9012 3456"
                  value={cardData.number}
                  onChange={(e) => setCardData({ ...cardData, number: e.target.value })}
                  maxLength={16}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Exp Month</Label>
                  <Input
                    placeholder="MM"
                    value={cardData.expMonth}
                    onChange={(e) => setCardData({ ...cardData, expMonth: e.target.value })}
                    maxLength={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Exp Year</Label>
                  <Input
                    placeholder="YY"
                    value={cardData.expYear}
                    onChange={(e) => setCardData({ ...cardData, expYear: e.target.value })}
                    maxLength={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CVC</Label>
                  <Input
                    placeholder="123"
                    value={cardData.cvc}
                    onChange={(e) => setCardData({ ...cardData, cvc: e.target.value })}
                    maxLength={3}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddCard} disabled={loading}>
                  Add Card
                </Button>
                <Button variant="outline" onClick={() => setAddingCard(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {!addingCard && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setAddingCard(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Payment Method
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
