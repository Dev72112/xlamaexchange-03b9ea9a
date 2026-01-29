/**
 * EmptyState Component
 * Consistent empty/placeholder states across the app
 */

import { memo, ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { motion } from 'framer-motion';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'ghost';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  children?: ReactNode;
  compact?: boolean;
}

export const EmptyState = memo(function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  children,
  compact = false,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-6 px-4" : "py-12 px-6",
        className
      )}
    >
      {Icon && (
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
          className={cn(
            "flex items-center justify-center rounded-full bg-muted mb-4",
            compact ? "w-10 h-10" : "w-14 h-14"
          )}
        >
          <Icon className={cn(
            "text-muted-foreground",
            compact ? "w-5 h-5" : "w-7 h-7"
          )} />
        </motion.div>
      )}
      
      <h3 className={cn(
        "font-semibold text-foreground mb-1",
        compact ? "text-base" : "text-lg"
      )}>
        {title}
      </h3>
      
      {description && (
        <p className={cn(
          "text-muted-foreground max-w-sm",
          compact ? "text-xs" : "text-sm"
        )}>
          {description}
        </p>
      )}
      
      {children}
      
      {(action || secondaryAction) && (
        <div className={cn(
          "flex items-center gap-3",
          compact ? "mt-3" : "mt-5"
        )}>
          {action && (
            <Button
              variant={action.variant || 'default'}
              size={compact ? 'sm' : 'default'}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="ghost"
              size={compact ? 'sm' : 'default'}
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
});

/**
 * Connect Wallet Empty State - specialized version
 */
export interface ConnectWalletEmptyStateProps {
  title?: string;
  description?: string;
  onConnect: () => void;
  className?: string;
  compact?: boolean;
}

export const ConnectWalletEmptyState = memo(function ConnectWalletEmptyState({
  title = "Connect Your Wallet",
  description = "Connect a wallet to access this feature.",
  onConnect,
  className,
  compact = false,
}: ConnectWalletEmptyStateProps) {
  return (
    <EmptyState
      title={title}
      description={description}
      action={{
        label: "Connect Wallet",
        onClick: onConnect,
      }}
      className={className}
      compact={compact}
    />
  );
});
