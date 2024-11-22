import React, { ButtonHTMLAttributes, FC, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  svgIcon: ReactNode; // Accepts any valid React node (e.g., JSX or string)
  className?: string; // Optional className for additional styling
}

const SvgButton: FC<ButtonProps> = ({ svgIcon, onClick, className = "", ...props }) => {
  return (
    <button
      className={`w-8 h-8 bg-white rounded-md shadow-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 flex justify-center items-center ${className}`}
      onClick={onClick}
      {...props} // Spread the rest of the props
    >
      {svgIcon}
    </button>
  );
};

export default SvgButton;
