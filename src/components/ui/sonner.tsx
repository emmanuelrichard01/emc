import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

/* Toasts float, so they are the one place besides the palette and the dock
   that casts a shadow: a square slip of the lighter stock, a hairline ring,
   reading type. */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:!rounded-none group-[.toaster]:bg-popover group-[.toaster]:text-foreground group-[.toaster]:border-0 group-[.toaster]:shadow-[0_0_0_1px_hsl(var(--border)),0_18px_48px_-16px_rgba(0,0,0,0.8)] group-[.toaster]:font-sans group-[.toaster]:text-[14px]",
          title: "group-[.toast]:font-medium group-[.toast]:tracking-[-0.005em]",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-[13px] group-[.toast]:leading-relaxed",
          actionButton:
            "group-[.toast]:!rounded-none group-[.toast]:bg-foreground group-[.toast]:text-background group-[.toast]:font-medium",
          cancelButton:
            "group-[.toast]:!rounded-none group-[.toast]:bg-transparent group-[.toast]:text-muted-foreground group-[.toast]:shadow-[inset_0_0_0_1px_hsl(var(--border))]",
          success: "group-[.toaster]:[&_[data-icon]]:text-status-ok",
          error: "group-[.toaster]:[&_[data-icon]]:text-status-error",
          warning: "group-[.toaster]:[&_[data-icon]]:text-status-warn",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
