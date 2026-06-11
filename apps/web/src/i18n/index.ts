const supportedLanguages = ["pt-BR", "en"] as const;
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
    "nav.ranking": "Classificação",
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
    "match.open": "Aberto",
    "match.locked": "Travado",
    "match.wins": "vence",
    "match.pickFirst": "Escolha um palpite primeiro",
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
    "filter.mine": "Meus palpites",
    "ranking.title": "Classificação",
    "ranking.desc": "Veja quem são os melhores apostadores baseado em precisão e ganhos estimados.",
    "ranking.competition": "Competição",
    "ranking.sectionTitle": "Melhores apostadores",
    "ranking.tableLabel": "Tabela de classificação",
    "ranking.database": "Base de dados",
    "ranking.demoMode": "Modo demonstração",
    "ranking.rank": "#",
    "ranking.bettor": "Apostador",
    "ranking.accuracy": "Precisão",
    "ranking.winnings": "Ganhos",
    "ranking.score": "Pontuação",
    "ranking.bet": "aposta",
    "ranking.bets": "apostas",
    "ranking.noData": "Nenhum dado ainda",
    "ranking.noDataDesc": "A classificação será atualizada após as primeiras partidas serem resolvidas.",
    "ranking.noDb": "Base de dados indisponível",
    "ranking.noDbDesc": "Aguardando conexão com a base de dados para exibir a classificação.",
    "ranking.howItWorks": "Como funciona",
    "ranking.scoringTitle": "Cálculo da pontuação",
    "ranking.accuracyDesc": "Porcentagem de palpites corretos em relação ao total de apostas.",
    "ranking.winningsDesc": "Valor total estimado ganho, normalizado em relação ao melhor desempenho.",
    "ranking.combinedDesc": "Fórmula: (precisão × 0.6) + (ganhos normalizados × 0.4)."
  },
  "en": {
    "nav.matches": "Matches",
    "nav.picks": "Picks",
    "nav.ranking": "Leaderboard",
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
    "match.open": "Open",
    "match.locked": "Locked",
    "match.wins": "wins",
    "match.pickFirst": "Choose a pick first",
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
    "filter.mine": "My Picks",
    "ranking.title": "Leaderboard",
    "ranking.desc": "See who the top bettors are based on accuracy and estimated winnings.",
    "ranking.competition": "Competition",
    "ranking.sectionTitle": "Top Bettors",
    "ranking.tableLabel": "Leaderboard Table",
    "ranking.database": "Database",
    "ranking.demoMode": "Demo Mode",
    "ranking.rank": "#",
    "ranking.bettor": "Bettor",
    "ranking.accuracy": "Accuracy",
    "ranking.winnings": "Winnings",
    "ranking.score": "Score",
    "ranking.bet": "bet",
    "ranking.bets": "bets",
    "ranking.noData": "No data yet",
    "ranking.noDataDesc": "Leaderboard will be updated after the first matches are resolved.",
    "ranking.noDb": "Database unavailable",
    "ranking.noDbDesc": "Waiting for database connection to display leaderboard.",
    "ranking.howItWorks": "How it works",
    "ranking.scoringTitle": "Score calculation",
    "ranking.accuracyDesc": "Percentage of correct predictions relative to total bets.",
    "ranking.winningsDesc": "Total estimated winnings, normalized relative to best performance.",
    "ranking.combinedDesc": "Formula: (accuracy × 0.6) + (normalized winnings × 0.4)."
  }
} as const;

export function useTranslations(lang: Language) {
  return function t(key: keyof typeof translations["pt-BR"]) {
    return translations[lang][key] || translations["pt-BR"][key];
  };
}