import * as React from "react"
import { cn } from "../../lib/utils"
import { X } from "lucide-react"

const SheetContext = React.createContext({ open: false, onOpenChange: () => {} })

function Sheet({ open, onOpenChange, children }) {
  return (
    <SheetContext.Provider value={{ open, onOpenChange }}>
      {children}
    </SheetContext.Provider>
  )
}

function SheetContent({ className, children, side = "left", ...props }) {
  const { open, onOpenChange } = React.useContext(SheetContext)

  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onOpenChange(false)
    }
    if (open) {
      document.addEventListener("keydown", handleEscape)
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = ""
    }
  }, [open, onOpenChange])

  if (!open) return null

  const sideClasses = {
    left: "left-0 data-[state=open]:slide-in-from-left-full data-[state=closed]:slide-out-to-left-full",
    right: "right-0 data-[state=open]:slide-in-from-right-full data-[state=closed]:slide-out-to-right-full",
  }

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        data-state={open ? "open" : "closed"}
        onClick={() => onOpenChange(false)}
      />
      <div
        className={cn(
          "fixed inset-y-0 z-50 w-72 max-w-full bg-background shadow-lg",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "duration-300",
          sideClasses[side],
          className
        )}
        data-state={open ? "open" : "closed"}
        {...props}
      >
        {children}
      </div>
    </div>
  )
}

export { Sheet, SheetContent }
