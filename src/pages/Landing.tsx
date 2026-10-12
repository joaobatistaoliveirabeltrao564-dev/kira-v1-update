import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { KIRA_TOOLS } from "@/lib/kira";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";
import {
  ArrowRight,
  Camera,
  Mic,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  Wrench,
} from "lucide-react";
import logo from "@/assets/logo.svg";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.55, ease: "easeOut" as const },
};

const FEATURES = [
  {
    icon: Sparkles,
    title: "Conversa de verdade",
    text: "Respostas reais de um modelo de IA, em português, com memória da conversa — nada de respostas prontas de mentira.",
  },
  {
    icon: Camera,
    title: "Eu leio suas fotos",
    text: "Manda um print de erro, uma foto de documento ou um desenho: eu explico o que tem nele, em linguagem simples.",
  },
  {
    icon: Mic,
    title: "Fala comigo",
    text: "Toque no microfone e fale — eu transcrevo, respondo e ainda posso ler minhas respostas em voz alta.",
  },
  {
    icon: Wrench,
    title: "12 ferramentas",
    text: "Professora, programadora, tradutora, escritora, organizadora… troco de modo com um toque, sem complicação.",
  },
  {
    icon: Sparkles,
    title: "Eu me reprogramo",
    text: "Diga “a partir de agora sempre responda com exemplos” e eu altero o meu próprio script — fica salvo pra sempre.",
  },
  {
    icon: ShieldCheck,
    title: "Segura e privada",
    text: "Chaves de API nunca chegam ao seu celular ou ao código público. Cada um vê só as suas conversas.",
  },
];

export default function Landing() {
  const { isAuthenticated, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const goApp = () => navigate(isAuthenticated ? "/dashboard" : "/auth?returnTo=/dashboard");

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* Aurora de fundo */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="aurora-orb aurora-orb-1" />
        <div className="aurora-orb aurora-orb-2" />
        <div className="aurora-orb aurora-orb-3" />
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-lg">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex cursor-pointer items-center gap-2.5"
          >
            <img src={logo} alt="Kira" className="size-9 rounded-xl" />
            <span className="text-lg font-bold tracking-tight">Kira</span>
          </button>
          <nav className="ml-6 hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#recursos" className="transition-colors hover:text-foreground">
              Recursos
            </a>
            <a href="#ferramentas" className="transition-colors hover:text-foreground">
              Ferramentas
            </a>
            <a href="#como-funciona" className="transition-colors hover:text-foreground">
              Como funciona
            </a>
          </nav>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="size-9 cursor-pointer text-muted-foreground"
            title="Alternar tema"
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
          <Button
            onClick={goApp}
            disabled={isLoading}
            className="cursor-pointer gap-2"
          >
            {isAuthenticated ? "Abrir app" : "Entrar"}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto w-full max-w-6xl px-4 pt-16 pb-20 sm:px-6 sm:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="size-3.5" />
              Assistente amiga com IA de verdade
            </span>
            <h1 className="mt-5 text-4xl leading-[1.1] font-bold tracking-tight sm:text-5xl">
              Oi, eu sou a{" "}
              <span className="kira-gradient-text">Kira</span> — sua
              assistente que conversa, vê e ouve.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
              Tira dúvida de estudo, manda foto de um erro, fala no microfone
              ou me dá ordens pra eu mudar o meu próprio jeito de responder.
              Tudo em português, no celular ou no computador.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                onClick={goApp}
                disabled={isLoading}
                className="cursor-pointer gap-2 rounded-full px-6"
              >
                {isAuthenticated ? "Continuar conversando" : "Começar agora"}
                <ArrowRight className="size-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/auth?returnTo=/dashboard")}
                className="cursor-pointer rounded-full px-6"
              >
                Entrar com e-mail
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Funciona como app no Android: toque em “Adicionar à tela inicial”
              e abra a Kira como um aplicativo.
            </p>
          </motion.div>

          {/* Mock do chat */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
            className="relative mx-auto w-full max-w-md"
          >
            <div className="absolute inset-0 -z-10 rounded-[2rem] bg-primary/20 blur-3xl" />
            <div className="rounded-3xl border border-border/70 bg-card/80 p-4 backdrop-blur">
              <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                <img src={logo} alt="" className="size-8 rounded-xl" />
                <div>
                  <p className="text-sm font-bold">Kira</p>
                  <p className="text-[11px] text-primary">● online e pronta</p>
                </div>
              </div>
              <div className="flex flex-col gap-3 pt-3 pb-1">
                <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm text-primary-foreground">
                  Manda uma foto do erro que tá dando no meu app
                </div>
                <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-muted px-3.5 py-2 text-sm">
                  Vi aqui 👀 seu <code className="rounded bg-background px-1 font-mono text-[12px]">useEffect</code> tá
                  dependendo de uma variável que muda a cada render. Assim ele
                  entra em loop. Quer que eu te explique passo a passo e já
                  escreva o código corrigido? ✨
                </div>
                <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm text-primary-foreground">
                  Quero! E a partir de agora sempre responda com exemplos
                </div>
                <div className="flex items-center gap-1.5 pl-1 text-xs text-muted-foreground">
                  <span className="flex gap-1">
                    <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.2s]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.1s]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-primary" />
                  </span>
                  A Kira está pensando…
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Recursos */}
      <section id="recursos" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Uma assistente que realmente te ajuda
          </h2>
          <p className="mt-3 text-muted-foreground">
            Nada de menus infinitos: você conversa, e eu faço o resto.
          </p>
        </motion.div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <motion.div
              key={feature.title}
              {...fadeUp}
              className="rounded-2xl border border-border/70 bg-card p-5 transition-colors hover:border-primary/50"
            >
              <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <feature.icon className="size-5" />
              </div>
              <h3 className="font-semibold tracking-tight">{feature.title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                {feature.text}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Ferramentas */}
      <section id="ferramentas" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            12 ferramentas num só chat
          </h2>
          <p className="mt-3 text-muted-foreground">
            Escolha um modo e eu me comporto como a especialista certa pra
            cada tarefa.
          </p>
        </motion.div>
        <div className="mt-10 flex flex-wrap justify-center gap-2.5">
          {KIRA_TOOLS.map((tool, index) => (
            <motion.span
              key={tool.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.4) }}
              className="flex items-center gap-2 rounded-full border border-border/70 bg-card px-4 py-2 text-sm transition-colors hover:border-primary/50 hover:bg-accent"
              title={tool.description}
            >
              <span aria-hidden>{tool.emoji}</span>
              {tool.name}
            </motion.span>
          ))}
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Como funciona
          </h2>
        </motion.div>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {[
            {
              step: "1",
              title: "Entre",
              text: "Acesse com e-mail (código de verificação) ou continue como convidado.",
            },
            {
              step: "2",
              title: "Converse do seu jeito",
              text: "Digite, fale no microfone, manda foto ou vídeo — eu respondo na hora, com streaming.",
            },
            {
              step: "3",
              title: "Me dê ordens",
              text: "Peça “a partir de agora…” e eu atualizo o meu próprio script. Use /cmd ajuda pra ver os comandos.",
            },
          ].map((item) => (
            <motion.div key={item.step} {...fadeUp} className="text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-xl font-bold text-primary">
                {item.step}
              </div>
              <h3 className="mt-4 font-semibold tracking-tight">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                {item.text}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <motion.div
          {...fadeUp}
          className="relative overflow-hidden rounded-3xl border border-border/70 bg-card p-8 text-center sm:p-12"
        >
          <div className="absolute inset-0 -z-10 aurora-orb aurora-orb-2 opacity-60" />
          <img src={logo} alt="Kira" className="mx-auto size-14 rounded-2xl" />
          <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
            Bora conversar com a Kira?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            Abra o app e comece agora — leva menos de um minuto.
          </p>
          <Button
            size="lg"
            onClick={goApp}
            disabled={isLoading}
            className="mt-6 cursor-pointer gap-2 rounded-full px-8"
          >
            {isAuthenticated ? "Abrir meu chat" : "Começar grátis"}
            <ArrowRight className="size-4" />
          </Button>
        </motion.div>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-2 px-4 text-center sm:px-6">
          <div className="flex items-center gap-2">
            <img src={logo} alt="" className="size-6 rounded-lg" />
            <span className="text-sm font-semibold">Kira</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Sua assistente amiga · Feita com IA de verdade, cuidado de verdade.
          </p>
        </div>
      </footer>
    </div>
  );
}
