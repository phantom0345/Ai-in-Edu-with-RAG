import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
}

const Button: React.FC<ButtonProps> = ({
    children,
    className = '',
    variant = 'primary',
    size = 'md',
    ...props
}) => {

    // Base styles
    const baseStyles = "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

    // Variants
    const variants = {
        primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm focus:ring-indigo-500",
        secondary: "bg-indigo-100 text-indigo-700 hover:bg-indigo-200 focus:ring-indigo-500",
        outline: "border-2 border-slate-200 text-slate-700 hover:border-indigo-500 hover:text-indigo-600 bg-transparent",
        ghost: "bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900",
    };

    // Sizes
    const sizes = {
        sm: "px-3 py-1.5 text-xs",
        md: "px-5 py-2.5 text-sm",
        lg: "px-6 py-3.5 text-base",
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;
