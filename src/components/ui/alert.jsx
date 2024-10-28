"use client"

import * as React from "react"
import { cva } from "class-variance-authority"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-black/20 backdrop-blur-lg border-white/20",
        success: "bg-black/20 backdrop-blur-lg border-green-500/20",
        destructive: "bg-black/20 backdrop-blur-lg border-red-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef(({ className, variant, onClose, children, ...props }, ref) => {
  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 5000); // 50 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  if (!isVisible) return null;

  return (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant }), "pr-10", className)}
      {...props}
    >
      {children}
      <button
        onClick={() => {
          setIsVisible(false);
          onClose?.();
        }}
        className="absolute right-2 top-2 w-6 h-6 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center"
      >
        <span className="relative left-[-14px]">
          <X className="h-4 w-4 text-white/70 hover:text-white" />
        </span>
      </button>
    </div>
  );
});

Alert.displayName = "Alert";




const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
