/**
 * EmptyHistoryState Component
 * 
 * Reusable empty state for history tabs.
 */

import { memo, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

interface EmptyHistoryStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyHistoryState = memo(function EmptyHistoryState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyHistoryStateProps) {
  return (
    <Card className="p-12 text-center border-dashed">
      <Icon className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Card>
  );
});
