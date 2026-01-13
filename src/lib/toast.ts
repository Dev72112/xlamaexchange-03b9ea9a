import { toast as sonnerToast, ExternalToast } from "sonner";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, Loader2 } from "lucide-react";
import { createElement } from "react";

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

interface ToastOptions extends ExternalToast {
  /** Custom icon to display */
  icon?: React.ReactNode;
}

/**
 * Centralized toast notification system with consistent styling
 */
export const toast = {
  /**
   * Success toast - for completed actions
   */
  success: (message: string, options?: ToastOptions) => {
    return sonnerToast.success(message, {
      icon: options?.icon || createElement(CheckCircle2, { className: "w-4 h-4 text-green-500" }),
      className: "toast-success",
      ...options,
    });
  },

  /**
   * Error toast - for failed actions
   */
  error: (message: string, options?: ToastOptions) => {
    return sonnerToast.error(message, {
      icon: options?.icon || createElement(AlertCircle, { className: "w-4 h-4 text-red-500" }),
      className: "toast-error",
      duration: 5000, // Errors show longer
      ...options,
    });
  },

  /**
   * Warning toast - for cautions
   */
  warning: (message: string, options?: ToastOptions) => {
    return sonnerToast.warning(message, {
      icon: options?.icon || createElement(AlertTriangle, { className: "w-4 h-4 text-yellow-500" }),
      className: "toast-warning",
      duration: 4000,
      ...options,
    });
  },

  /**
   * Info toast - for general information
   */
  info: (message: string, options?: ToastOptions) => {
    return sonnerToast.info(message, {
      icon: options?.icon || createElement(Info, { className: "w-4 h-4 text-blue-500" }),
      className: "toast-info",
      ...options,
    });
  },

  /**
   * Loading toast - for async operations
   * Returns the toast ID for later dismissal
   */
  loading: (message: string, options?: ToastOptions) => {
    return sonnerToast.loading(message, {
      icon: options?.icon || createElement(Loader2, { className: "w-4 h-4 text-primary animate-spin" }),
      className: "toast-loading",
      ...options,
    });
  },

  /**
   * Promise toast - automatically shows loading, success, or error
   */
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    }
  ) => {
    return sonnerToast.promise(promise, messages);
  },

  /**
   * Dismiss a specific toast or all toasts
   */
  dismiss: (toastId?: string | number) => {
    return sonnerToast.dismiss(toastId);
  },

  /**
   * Custom toast with full control
   */
  custom: (message: string, options?: ToastOptions) => {
    return sonnerToast(message, options);
  },

  /**
   * Transaction success toast with explorer link
   */
  txSuccess: (message: string, txHash?: string, explorerUrl?: string) => {
    return sonnerToast.success(message, {
      icon: createElement(CheckCircle2, { className: "w-4 h-4 text-green-500" }),
      className: "toast-success",
      duration: 6000,
      action: explorerUrl && txHash
        ? {
            label: "View TX",
            onClick: () => window.open(explorerUrl, "_blank"),
          }
        : undefined,
    });
  },

  /**
   * Transaction error toast with retry option
   */
  txError: (message: string, onRetry?: () => void) => {
    return sonnerToast.error(message, {
      icon: createElement(AlertCircle, { className: "w-4 h-4 text-red-500" }),
      className: "toast-error",
      duration: 8000,
      action: onRetry
        ? {
            label: "Retry",
            onClick: onRetry,
          }
        : undefined,
    });
  },
};

export default toast;
