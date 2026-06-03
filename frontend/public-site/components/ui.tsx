import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="mx-auto mb-12 max-w-3xl text-center">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-600">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-black tracking-tight text-stone-900 sm:text-4xl lg:text-5xl">{title}</h2>
      <p className="mt-4 text-lg leading-8 text-stone-600">{text}</p>
    </div>
  );
}

export function PageIntro({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <section className="relative overflow-hidden border-b border-orange-100 bg-gradient-to-br from-orange-50 via-white to-amber-50 py-16 lg:py-20">
      <div className="absolute left-1/2 top-0 h-64 w-[40rem] -translate-x-1/2 rounded-full bg-orange-200/30 blur-3xl" />
      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-orange-600">{eyebrow}</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-stone-900 sm:text-5xl lg:text-6xl">{title}</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-stone-600">{text}</p>
      </div>
    </section>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-orange-100 bg-white p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-11 w-full rounded-xl border border-orange-200 bg-white px-4 text-sm text-stone-900 placeholder:text-stone-400 transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 ${props.className ?? ""}`}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-xl border border-orange-200 bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 ${props.className ?? ""}`}
    />
  );
}

export function Select({ children, className, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select
      {...props}
      className={`h-11 w-full rounded-xl border border-orange-200 bg-white px-4 text-sm text-stone-900 transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 ${className ?? ""}`}
    >
      {children}
    </select>
  );
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: {
  children: ReactNode;
  variant?: "primary" | "outline" | "ghost" | "white";
  size?: "sm" | "md" | "lg";
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = "inline-flex items-center justify-center font-bold transition focus:outline-none focus:ring-2 focus:ring-orange-300 disabled:opacity-50 disabled:pointer-events-none cursor-pointer";
  const variants = {
    primary: "bg-orange-600 text-white hover:bg-orange-700 shadow-lg shadow-orange-200",
    outline: "border-2 border-stone-900 bg-white text-stone-900 hover:bg-stone-50",
    ghost: "text-stone-700 hover:bg-orange-50 hover:text-orange-700",
    white: "border-2 border-white bg-transparent text-white hover:bg-white/10",
  };
  const sizes = {
    sm: "h-9 rounded-lg px-4 text-sm",
    md: "h-11 rounded-xl px-6 text-sm",
    lg: "h-14 rounded-2xl px-8 text-base",
  };

  return (
    <button {...props} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </button>
  );
}
