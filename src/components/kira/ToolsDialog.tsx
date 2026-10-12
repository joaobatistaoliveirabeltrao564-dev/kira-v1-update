import { KIRA_TOOLS, getTool } from "@/lib/kira";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check } from "lucide-react";

export function ToolsDialog({
  open,
  onOpenChange,
  activeTool,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTool: string;
  onSelect: (toolId: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="tracking-tight font-bold">
            Ferramentas da Kira
          </DialogTitle>
          <DialogDescription>
            Cada ferramenta é um modo de conversa especializado — sem trocar o
            sistema de IA, só o meu jeito de ajudar. Modo atual:{" "}
            <span className="font-medium text-foreground">
              {getTool(activeTool).emoji} {getTool(activeTool).name}
            </span>
            .
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 sm:grid-cols-2">
          {KIRA_TOOLS.map((tool) => {
            const isActive = tool.id === activeTool;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => {
                  onSelect(tool.id);
                  onOpenChange(false);
                }}
                className={cn(
                  "relative flex cursor-pointer flex-col gap-1 rounded-xl border p-3 text-left transition-colors",
                  isActive
                    ? "border-primary/70 bg-primary/10"
                    : "border-border/70 bg-card hover:border-primary/40 hover:bg-accent",
                )}
              >
                <span className="text-lg" aria-hidden>
                  {tool.emoji}
                </span>
                <span className="text-sm font-semibold">{tool.name}</span>
                <span className="text-xs leading-5 text-muted-foreground">
                  {tool.description}
                </span>
                {isActive && (
                  <Check className="absolute top-3 right-3 size-4 text-primary" />
                )}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
