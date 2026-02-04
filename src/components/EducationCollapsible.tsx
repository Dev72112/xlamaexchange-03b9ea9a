/**
 * Reusable Education Collapsible Component
 * 
 * Shows step-by-step guides and tips for features across the app.
 * Used on wallet-gated pages for both connected and disconnected states.
 */

import { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { HelpCircle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EducationStep {
  icon: React.ElementType;
  title: string;
  description: string;
}

interface EducationCollapsibleProps {
  title: string;
  icon?: React.ElementType;
  steps: EducationStep[];
  tips?: string[];
  defaultOpen?: boolean;
  className?: string;
}

export const EducationCollapsible = memo(function EducationCollapsible({
  title,
  icon: Icon = HelpCircle,
  steps,
  tips,
  defaultOpen = false,
  className,
}: EducationCollapsibleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between h-11 glass-subtle hover:bg-secondary/50">
          <span className="flex items-center gap-2 text-sm">
            <Icon className="w-4 h-4 text-primary" />
            {title}
          </span>
          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3 pb-1 animate-in slide-in-from-top-2 duration-200">
        <div className="grid gap-3 sm:grid-cols-2">
          {steps.map((step, index) => (
            <Card key={step.title} className="relative glass border-border/50 overflow-visible">
              {/* Step number badge */}
              <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-xs shadow-sm z-10">
                {index + 1}
              </div>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <step.icon className="w-4 h-4 text-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm leading-tight">{step.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {tips && tips.length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-xs font-medium text-primary mb-2 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-primary" />
              Tips
            </p>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              {tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary shrink-0">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
});
