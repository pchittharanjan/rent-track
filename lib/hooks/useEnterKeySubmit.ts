import { KeyboardEvent } from "react";

/**
 * Hook to handle Enter key submission for forms
 * Returns an onKeyDown handler that submits the form when Enter is pressed
 */
export function useEnterKeySubmit(
  onSubmit: () => void,
  disabled?: boolean
) {
  return (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !disabled && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      // Don't submit if user is in a textarea (allow Enter for new lines)
      const target = e.target as HTMLElement;
      if (target.tagName === "TEXTAREA") {
        return;
      }
      
      e.preventDefault();
      onSubmit();
    }
  };
}
