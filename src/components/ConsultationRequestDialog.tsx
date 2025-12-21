import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ConsultationRequestForm } from "./ConsultationRequestForm";
import { MessageSquare, Calendar } from "lucide-react";
import { useState } from "react";

interface ConsultationRequestDialogProps {
  trigger?: React.ReactNode;
}

export function ConsultationRequestDialog({ trigger }: ConsultationRequestDialogProps) {
  const [open, setOpen] = useState(false);

  const handleBookMeeting = () => {
    window.open("https://calendly.com/exavoai-info", "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <MessageSquare className="w-4 h-4 mr-2" />
            Request Consultation
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Request a Consultation</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Button 
            variant="outline" 
            onClick={handleBookMeeting}
            className="w-full gap-2"
          >
            <Calendar className="w-4 h-4" />
            Book a Meeting
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or fill the form</span>
            </div>
          </div>
          <ConsultationRequestForm onSuccess={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
