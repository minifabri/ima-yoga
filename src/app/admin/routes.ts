// Mappa tra le vecchie chiavi di `view` e le nuove rotte sotto /admin,
// usata da MoreMenu/MobileHub (che lavorano ancora per "key") e da chi deve
// navigare in modo programmatico (es. il tap su una lezione futura nella hub
// mobile, che salta dritto al Calendario con la data giusta).
export const ADMIN_ROUTE_BY_KEY: Record<string, string> = {
  home: "/admin",
  calendar: "/admin/calendario",
  clients: "/admin/clienti",
  payments: "/admin/pagamenti",
  events: "/admin/eventi",
  earnings: "/admin/guadagni",
  tools: "/admin/strumenti",
  sequences: "/admin/sequenze",
  "pose-catalog": "/admin/catalogo",
  notices: "/admin/avvisi",
  worklog: "/admin/registro",
  stats: "/admin/statistiche",
  settings: "/admin/impostazioni",
};
