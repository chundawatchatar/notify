import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { cn } from "../lib/utils";
import { Input, type InputProps } from "./input";

type PasswordInputProps = Omit<InputProps, "type">;

function PasswordInput({ className, disabled, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const VisibilityIcon = visible ? EyeOff : Eye;
  const visibilityLabel = visible ? "Hide password" : "Show password";

  return (
    <div className="relative" data-slot="password-input">
      <Input
        className={cn("pr-10", className)}
        disabled={disabled}
        type={visible ? "text" : "password"}
        {...props}
      />
      <button
        aria-label={visibilityLabel}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        data-slot="password-visibility-toggle"
        disabled={disabled}
        onClick={() => setVisible((current) => !current)}
        type="button"
      >
        <VisibilityIcon aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}

export type { PasswordInputProps };
export { PasswordInput };
