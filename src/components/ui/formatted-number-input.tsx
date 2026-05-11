import * as React from "react";
import { Input } from "@/components/ui/input";

interface FormattedNumberInputProps extends Omit<React.ComponentProps<typeof Input>, "onChange" | "value"> {
  onChange?: (value: string) => void;
  value?: string;
  name: string;
}

export function FormattedNumberInput({ onChange, value, name, ...props }: FormattedNumberInputProps) {
  const [internalValue, setInternalValue] = React.useState<string>(value || "");

  // Convert raw number back to comma format for display
  const displayValue = internalValue ? Number(internalValue).toLocaleString("en-US") : "";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove all non-digit characters
    let raw = e.target.value.replace(/\D/g, "");
    setInternalValue(raw);
    if (onChange) onChange(raw);
  };

  return (
    <>
      <Input
        {...props}
        type="text" // keep as text for commas
        value={displayValue}
        onChange={handleChange}
      />
      <input type="hidden" name={name} value={internalValue} />
    </>
  );
}
