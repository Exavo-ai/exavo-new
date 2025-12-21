import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ConsultationRequestForm } from "./ConsultationRequestForm";
import { MessageSquare } from "lucide-react";
import { useState } from "react";

interface ConsultationRequestDialogProps {
  trigger?: React.ReactNode;
}

export function ConsultationRequestDialog({ trigger }: ConsultationRequestDialogProps) {
  const [open, setOpen] = useState(false);

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
        <ConsultationRequestForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
