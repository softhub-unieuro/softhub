import { memo } from 'react';
import { SidebarNavLink } from './SidebarNavLink';

interface SidebarGroupsProps {
    grupos: any[];
    currentPath: string;
    projetoAtivoId: string | null;
    aoNavegar?: () => void;
}

export const SidebarGroups = memo(({ grupos, currentPath, projetoAtivoId, aoNavegar }: SidebarGroupsProps) => {
    return (
        <nav className="flex-1 relative z-10 scroll-suave flex flex-col overflow-y-auto overflow-x-hidden pt-4 pb-8 touch-pan-y overscroll-contain">
            {grupos.map((grupo, i) => (
                <div key={grupo.label}>
                    <div className={`flex items-center gap-3 px-6 ${i === 0 ? 'mt-0.5 mb-0.5' : 'mt-3 mb-0.5'}`}>
                        <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] shrink-0">
                            {grupo.label}
                        </span>
                        <div className="flex-1 h-px bg-border/30" />
                    </div>

                    <div className="flex flex-col">
                        {grupo.links.map((link: any) => (
                            <SidebarNavLink 
                                key={link.path} 
                                link={link} 
                                ativo={currentPath.startsWith(link.path)}
                                projetoAtivoId={projetoAtivoId}
                                onNavegar={aoNavegar}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </nav>
    );
});
