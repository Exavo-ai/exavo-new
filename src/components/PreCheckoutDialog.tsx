import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface PreCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (notes: string) => void;
  isLoading?: boolean;
  packageName?: string;
  language?: 'en' | 'ar';
}

export function PreCheckoutDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
  packageName = '',
  language = 'en',
}: PreCheckoutDialogProps) {
  const [notes, setNotes] = useState("");

  const handleConfirm = () => {
    onConfirm(notes.trim());
  };

  const handleClose = () => {
    if (!isLoading) {
      setNotes("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {language === 'ar' ? 'قبل الدفع' : 'Before Payment'}
          </DialogTitle>
          <DialogDescription>
            {packageName && (
              <span className="font-medium text-foreground">{packageName}</span>
            )}
            {language === 'ar'
              ? ' - أضف أي ملاحظات أو متطلبات لمشروعك (اختياري).'
              : ' — Add any notes or requirements for your project (optional).'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Label htmlFor="pre-checkout-notes" className="text-sm font-medium">
            {language === 'ar' ? 'ملاحظات / متطلبات (اختياري)' : 'Notes / Requirements (optional)'}
          </Label>
          <Textarea
            id="pre-checkout-notes"
            placeholder={
              language === 'ar'
                ? 'أخبرنا عن مشروعك، ميزات محددة، مواعيد نهائية، أو أي متطلبات أخرى...'
                : 'Tell us about your project, specific features, deadlines, or any other requirements...'
            }
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 500))}
            className="mt-2 min-h-[120px] resize-none"
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground mt-1 text-right">
            {notes.length}/500
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {language === 'ar' ? 'المتابعة إلى الدفع' : 'Continue to Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
