import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";
import { useReviews } from "@/hooks/useReviews";
import { Skeleton } from "@/components/ui/skeleton";

interface ServiceTestimonialsProps {
  serviceId: string;
  serviceName?: string;
}

export function ServiceTestimonials({ serviceId, serviceName }: ServiceTestimonialsProps) {
  const { reviews, loading } = useReviews({
    status: "approved",
    serviceId,
  });

  // Don't render section if no reviews (as per requirements)
  if (!loading && reviews.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <section className="mb-12">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-5 w-24 mb-3" />
              <Skeleton className="h-16 w-full mb-4" />
              <Skeleton className="h-4 w-32" />
            </Card>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="mb-12">
      <h2 className="text-2xl font-bold mb-6">
        Customer Testimonials
      </h2>
      <div className="grid md:grid-cols-2 gap-6">
        {reviews.map((review) => (
          <Card key={review.id} className="p-6">
            <div className="flex gap-1 mb-3">
              {[...Array(review.rating)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-primary text-primary" />
              ))}
            </div>
            <p className="text-muted-foreground mb-4 italic">
              "{review.comment}"
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">
                  {review.client_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium">{review.client_name}</p>
                {review.client_company && (
                  <p className="text-xs text-muted-foreground">{review.client_company}</p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
