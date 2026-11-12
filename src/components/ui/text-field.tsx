import { useId, type InputHTMLAttributes } from "react";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function TextField({ label, error, className = "", ...props }: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={
          "min-h-11 rounded-xl border bg-surface px-3.5 text-base outline-none transition " +
          "focus:border-primary focus:ring-2 focus:ring-primary/25 " +
          (error ? "border-danger" : "border-border")
        }
        {...props}
      />
      {error ? (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
