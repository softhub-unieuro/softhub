import * as React from "react";
import { cn } from "@/utilitarios/formatadores";

const TabsContext = React.createContext<any>(null);

export const Tabs = ({ children, value, onValueChange }: any) => {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className="w-full">{children}</div>
    </TabsContext.Provider>
  );
};

export const TabsList = ({ children, className }: any) => {
  return (
    <div className={cn("flex items-center p-1 bg-slate-100 rounded-xl mb-8", className)}>
      {children}
    </div>
  );
};

export const TabsTrigger = ({ children, value, className }: any) => {
  const context = React.useContext(TabsContext);
  const isActive = context.value === value;

  return (
    <button
      onClick={() => context.onValueChange(value)}
      className={cn(
        "flex-1 px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all transform duration-300",
        isActive ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/50",
        className
      )}
    >
      {children}
    </button>
  );
};

export const TabsContent = ({ children, value }: any) => {
  const context = React.useContext(TabsContext);
  if (context.value !== value) return null;
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      {children}
    </div>
  );
};
