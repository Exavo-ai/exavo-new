import { useEffect, useState } from 'react';
import zxcvbn from 'zxcvbn';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface PasswordStrengthMeterProps {
  password: string;
  userInputs?: string[];
}

export const PasswordStrengthMeter = ({ password, userInputs = [] }: PasswordStrengthMeterProps) => {
  const [strength, setStrength] = useState<zxcvbn.ZXCVBNResult | null>(null);

  useEffect(() => {
    if (password) {
      const result = zxcvbn(password, userInputs);
      setStrength(result);
    } else {
      setStrength(null);
    }
  }, [password, userInputs]);

  if (!password || !strength) return null;

  const getStrengthColor = (score: number) => {
    switch (score) {
      case 0:
      case 1:
        return 'hsl(var(--destructive))';
      case 2:
        return 'hsl(var(--warning))';
      case 3:
        return 'hsl(var(--chart-2))';
      case 4:
        return 'hsl(var(--success))';
      default:
        return 'hsl(var(--muted))';
    }
  };

  const getStrengthLabel = (score: number) => {
    switch (score) {
      case 0:
        return 'Very Weak';
      case 1:
        return 'Weak';
      case 2:
        return 'Fair';
      case 3:
        return 'Good';
      case 4:
        return 'Strong';
      default:
        return '';
    }
  };

  const getStrengthIcon = (score: number) => {
    if (score <= 1) return <XCircle className="w-4 h-4" />;
    if (score <= 2) return <AlertCircle className="w-4 h-4" />;
    return <CheckCircle2 className="w-4 h-4" />;
  };

  const requirements = [
    { met: password.length >= 8, label: 'At least 8 characters' },
    { met: /[A-Z]/.test(password), label: 'One uppercase letter' },
    { met: /[a-z]/.test(password), label: 'One lowercase letter' },
    { met: /[0-9]/.test(password), label: 'One number' },
  ];

  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center gap-2">
        <Progress 
          value={(strength.score / 4) * 100} 
          className="h-2 flex-1"
          style={{
            '--progress-background': getStrengthColor(strength.score)
          } as React.CSSProperties}
        />
        <div 
          className="flex items-center gap-1 text-xs font-medium"
          style={{ color: getStrengthColor(strength.score) }}
        >
          {getStrengthIcon(strength.score)}
          <span>{getStrengthLabel(strength.score)}</span>
        </div>
      </div>

      {strength.score < 3 && (
        <div className="space-y-1">
          {requirements.map((req, index) => (
            <div 
              key={index}
              className={`text-xs flex items-center gap-1 ${
                req.met ? 'text-success' : 'text-muted-foreground'
              }`}
            >
              {req.met ? (
                <CheckCircle2 className="w-3 h-3" />
              ) : (
                <XCircle className="w-3 h-3" />
              )}
              <span>{req.label}</span>
            </div>
          ))}
        </div>
      )}

      {strength.feedback.warning && (
        <p className="text-xs text-warning">{strength.feedback.warning}</p>
      )}
      
      {strength.feedback.suggestions.length > 0 && strength.score < 3 && (
        <div className="space-y-1">
          {strength.feedback.suggestions.map((suggestion, index) => (
            <p key={index} className="text-xs text-muted-foreground">
              💡 {suggestion}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};
