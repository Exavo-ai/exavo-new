import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserPlus, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface GuestAuthPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinueAsGuest: () => void;
}

export function GuestAuthPrompt({ open, onOpenChange, onContinueAsGuest }: GuestAuthPromptProps) {
  const navigate = useNavigate();

  const handleSignIn = () => {
    onOpenChange(false);
    navigate('/login');
  };

  const handleRegister = () => {
    onOpenChange(false);
    navigate('/register');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">
            Continue to Checkout
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            Sign in for a faster experience or continue as a guest
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-4">
          <Button 
            className="w-full h-12" 
            onClick={handleSignIn}
          >
            <LogIn className="w-4 h-4 mr-2" />
            Sign In
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full h-12"
            onClick={handleRegister}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Create Account
          </Button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Button 
            variant="secondary" 
            className="w-full h-12"
            onClick={onContinueAsGuest}
          >
            Continue as Guest
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
