import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, PartyPopper, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface ReviewSubmissionCardProps {
  deliveryId: string;
  projectId: string;
  projectName: string;
  serviceId?: string | null;
  serviceName?: string | null;
  onSubmitted?: () => void;
  onSkip?: () => void;
}

export function ReviewSubmissionCard({
  deliveryId,
  projectId,
  projectName,
  serviceId,
  serviceName,
  onSubmitted,
  onSkip,
}: ReviewSubmissionCardProps) {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!user || rating === 0 || !comment.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a rating and comment.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("reviews").insert({
        delivery_id: deliveryId,
        project_id: projectId,
        service_id: serviceId || null,
        service_type: serviceName || null,
        client_id: user.id,
        client_name: userProfile?.full_name || userProfile?.email || "Anonymous",
        client_company: null,
        rating,
        comment: comment.trim(),
        status: "pending",
        show_on_home: false,
        priority: 0,
      });

      if (error) throw error;

      toast({
        title: "Thank you for your feedback!",
        description: "Your review has been submitted and is pending approval.",
      });
      setSubmitted(true);
      onSubmitted?.();
    } catch (error: any) {
      console.error("Error submitting review:", error);
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    setDismissed(true);
    onSkip?.();
  };

  if (dismissed || submitted) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <PartyPopper className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">🎉 Project Approved!</CardTitle>
              <CardDescription>
                We'd really appreciate your feedback. It helps us improve and showcase real client success.
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSkip} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Star Rating */}
        <div>
          <label className="text-sm font-medium mb-2 block">How would you rate your experience?</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={cn(
                    "w-8 h-8 transition-colors",
                    (hoveredRating || rating) >= star
                      ? "fill-primary text-primary"
                      : "text-muted-foreground"
                  )}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div>
          <label className="text-sm font-medium mb-2 block">Tell us about your experience</label>
          <Textarea
            placeholder="Share your thoughts about the project, delivery, and working with our team..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            className="resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={handleSubmit}
            disabled={submitting || rating === 0 || !comment.trim()}
          >
            {submitting ? "Submitting..." : "Submit Review"}
          </Button>
          <Button variant="ghost" onClick={handleSkip}>
            Skip for now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
