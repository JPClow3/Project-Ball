export const supportedLanguages = ["pt-BR", "en"] as const;
export type Language = typeof supportedLanguages[number];

export function getLanguageFromAccept(accept: string | null): Language {
  if (!accept) return "pt-BR";
  
  // Basic accept-language parsing
  const langs = accept.split(",").map(l => l.split(";")[0].trim().toLowerCase());
  for (const l of langs) {
    if (l.startsWith("en")) return "en";
    if (l.startsWith("pt")) return "pt-BR";
  }
  
  return "pt-BR";
}

export const translations = {
  "pt-BR": {
    "nav.matches": "Partidas",
    "nav.picks": "Palpites",
    "nav.about": "Sobre",
    "nav.support": "Suporte",
    "nav.login": "Login",
    "nav.wallet": "Carteira",
    "hero.kicker": "Project Ball",
    "hero.title": "Futebol sem enrolação.",
    "hero.subtitle": "Escolha a partida, marque o time ou empate e confirme o valor. A tela existe para isso.",
    "hero.matches": "jogos",
    "hero.groups": "grupos",
    "hero.untilLock": "até travar",
    "hero.live": "Ao vivo",
    "hero.days": "dias",
    "hero.hours": "horas",
    "ticket.nextMatch": "Próxima partida",
    "ticket.lock": "Trava",
    "ticket.schedule": "Tabela",
    "ticket.pending": "Calendário pendente",
    "ticket.draw": "Empate",
    "rail.stage": "Fase de Grupos",
    "rail.title": "Partidas",
    "rail.desc": "Escolha um grupo, abra a partida e confirme seu palpite. Sem etapa escondida.",
    "filter.all": "Todos",
    "filter.today": "Hoje",
    "filter.brazil": "Brasil",
    "filter.soon": "Em breve",
    "filter.mine": "Meus palpites"
  },
  "en": {
    "nav.matches": "Matches",
    "nav.picks": "Picks",
    "nav.about": "About",
    "nav.support": "Support",
    "nav.login": "Login",
    "nav.wallet": "Wallet",
    "hero.kicker": "Project Ball",
    "hero.title": "Football without the fluff.",
    "hero.subtitle": "Choose the match, pick a team or draw, and confirm your amount. That's what this screen is for.",
    "hero.matches": "matches",
    "hero.groups": "groups",
    "hero.untilLock": "to lock",
    "hero.live": "Live",
    "hero.days": "days",
    "hero.hours": "hours",
    "ticket.nextMatch": "Next Match",
    "ticket.lock": "Lock",
    "ticket.schedule": "Schedule",
    "ticket.pending": "Pending Schedule",
    "ticket.draw": "Draw",
    "rail.stage": "Group Stage",
    "rail.title": "Matches",
    "rail.desc": "Choose a group, open the match and confirm your pick. No hidden steps.",
    "filter.all": "All",
    "filter.today": "Today",
    "filter.brazil": "Brazil",
    "filter.soon": "Soon",
    "filter.mine": "My Picks"
  }
} as const;

export function useTranslations(lang: Language) {
  return function t(key: keyof typeof translations["pt-BR"]) {
    return translations[lang][key] || translations["pt-BR"][key];
  };
}
