import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { MessageSquare } from "lucide-react";

interface ConsultationRequestFormProps {
  onSuccess?: () => void;
}

export function ConsultationRequestForm({ onSuccess }: ConsultationRequestFormProps) {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    subject: "",
    message: "",
  });

  const isGuest = !user;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    const subject = formData.subject.trim();
    const message = formData.message.trim();
    const fullName = isGuest ? formData.fullName.trim() : (userProfile?.full_name || user?.email || "");
    const email = isGuest ? formData.email.trim() : (userProfile?.email || user?.email || "");
    
    if (!subject || !message) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (isGuest && (!fullName || !email)) {
      toast({
        title: "Error",
        description: "Please fill in your name and email",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation for guests
    if (isGuest) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        toast({
          title: "Error",
          description: "Please enter a valid email address",
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.from("leads").insert({
        user_id: user?.id || null,
        full_name: fullName,
        email: email,
        subject: subject,
        message: message,
        status: "new",
      });

      if (error) throw error;

      toast({
        title: "Request Submitted!",
        description: isGuest 
          ? "Thank you! We'll review your request and reply to your email soon."
          : "Thank you! You can track the status of your consultation request in your dashboard.",
      });

      // Reset form
      setFormData({
        fullName: "",
        email: "",
        subject: "",
        message: "",
      });

      onSuccess?.();
    } catch (error: any) {
      console.error("Consultation request error:", error);
      toast({
        title: "Error",
        description: "Failed to submit request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {isGuest && (
        <>
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="John Doe"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={isLoading}
              required
            />
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="subject">Subject *</Label>
        <Input
          id="subject"
          type="text"
          placeholder="What do you need help with?"
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          disabled={isLoading}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Message *</Label>
        <Textarea
          id="message"
          placeholder="Tell us more about your project or question..."
          className="min-h-[120px]"
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          disabled={isLoading}
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        <MessageSquare className="w-4 h-4 mr-2" />
        {isLoading ? "Submitting..." : "Request Consultation"}
      </Button>

      {isGuest && (
        <p className="text-xs text-muted-foreground text-center">
          We'll respond to your email within 1-2 business days.
        </p>
      )}
    </form>
  );
}
