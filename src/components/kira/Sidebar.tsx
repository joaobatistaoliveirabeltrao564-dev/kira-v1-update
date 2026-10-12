import type { Doc, Id } from "@/convex/_generated/dataModel";
import { getTool } from "@/lib/kira";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Wrench,
  LogOut,
  MessageSquarePlus,
  Moon,
  Settings,
  Sun,
  Trash2,
} from "lucide-react";
import logo from "@/assets/logo.svg";

function formatWhen(updatedAt: number): string {
  const diff = Date.now() - updatedAt;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ontem";
  if (days < 7) return `${days} dias`;
  return new Date(updatedAt).toLocaleDateString("pt-BR");
}

export function Sidebar({
  conversations,
  activeId,
  activeTool,
  theme,
  onSelect,
  onNew,
  onDelete,
  onOpenTools,
  onOpenSettings,
  onToggleTheme,
  onSignOut,
  className,
}: {
  conversations: Doc<"conversations">[] | undefined;
  activeId: Id<"conversations"> | null;
  activeTool: string;
  theme: "light" | "dark";
  onSelect: (id: Id<"conversations">) => void;
  onNew: () => void;
  onDelete: (id: Id<"conversations">) => void;
  onOpenTools: () => void;
  onOpenSettings: () => void;
  onToggleTheme: () => void;
  onSignOut: () => void;
  className?: string;
}) {
  const tool = getTool(activeTool);
  return (
    <aside
      className={cn(
        "flex h-full w-72 shrink-0 flex-col border-r border-border/60 bg-sidebar text-sidebar-foreground",
        className,
      )}
    >
      <div className="flex items-center gap-2.5 px-4 pt-[max(0.9rem,env(safe-area-inset-top))] pb-3">
        <img src={logo} alt="Kira" className="size-8 rounded-xl" />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold tracking-tight">Kira</p>
          <p className="truncate text-[11px] text-muted-foreground">
            sua assistente amiga
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 px-3">
        <Button
          type="button"
          onClick={onNew}
          className="cursor-pointer justify-start gap-2"
          size="sm"
        >
          <MessageSquarePlus className="size-4" />
          Novo chat
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onOpenTools}
          className="cursor-pointer justify-start gap-2"
          size="sm"
        >
          <span aria-hidden>{tool.emoji}</span>
          <span className="flex-1 truncate text-left">{tool.name}</span>
          <Wrench className="size-3.5 text-muted-foreground" />
        </Button>
      </div>

      <div className="mt-4 flex-1 overflow-y-auto px-3 pb-2">
        <p className="px-1 pb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          Conversas
        </p>
        {conversations === undefined ? (
          <p className="px-1 text-xs text-muted-foreground">carregando…</p>
        ) : conversations.length === 0 ? (
          <p className="px-1 text-xs leading-5 text-muted-foreground">
            Nenhuma conversa ainda. Manda sua primeira mensagem pra mim! 💬
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {conversations.map((conversation) => (
              <li
                key={conversation._id}
                className={cn(
                  "group flex items-center gap-1 rounded-lg px-2 transition-colors",
                  conversation._id === activeId
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent/60",
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect(conversation._id)}
                  className="min-w-0 flex-1 cursor-pointer truncate py-1.5 text-left text-sm"
                  title={conversation.title}
                >
                  {conversation.title}
                </button>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {formatWhen(conversation.updatedAt)}
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onDelete(conversation._id)}
                      className="cursor-pointer rounded-md p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100"
                      title="Apagar conversa"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Apagar conversa</TooltipContent>
                </Tooltip>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center gap-1 border-t border-border/60 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onToggleTheme}
          className="size-8 cursor-pointer text-muted-foreground"
          title="Alternar tema"
        >
          {theme === "dark" ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onOpenSettings}
          className="size-8 cursor-pointer text-muted-foreground"
          title="Configurações"
        >
          <Settings className="size-4" />
        </Button>
        <div className="flex-1" />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onSignOut}
          className="size-8 cursor-pointer text-muted-foreground"
          title="Sair"
        >
          <LogOut className="size-4" />
        </Button>
      </div>
    </aside>
  );
}
