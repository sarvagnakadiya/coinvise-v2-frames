import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}

export function Button({
  children,
  className = "",
  variant = "primary",
  ...props
}: ButtonProps) {
  const variantClasses = {
    primary: "bg-blue-500 hover:bg-blue-600",
    secondary: "bg-gray-500 hover:bg-gray-600",
  };

  return (
    <button
      className={`px-4 py-2 rounded-lg font-medium 
        bg-purple-600 text-white
        hover:bg-purple-700 
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors
        ${variantClasses[variant]}
        ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
