import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function Button({ children, className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`px-4 py-2 rounded-lg font-medium 
        bg-purple-600 text-white
        hover:bg-purple-700 
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors
        ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
