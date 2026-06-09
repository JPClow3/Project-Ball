import type { Match } from "@project-ball/shared";
import type { OutcomeTotalsUsd } from "./betting";
import { getMatchPoolSnapshot, outcomeLabels } from "./betting";
import { tournamentConfig } from "./tournament";

export type MatchViewModel = Match & {
  readonly competition: string;
  readonly groupLabel: string;
  readonly venue: string;
  readonly homeFlagCode: string;
  readonly awayFlagCode: string;
  readonly homeCountry: string;
  readonly awayCountry: string;
  readonly homeForm: readonly string[];
  readonly awayForm: readonly string[];
  readonly outcomeTotalsUsd: OutcomeTotalsUsd;
  readonly supporterCount: number;
};

export { outcomeLabels };

type FixtureSeed = readonly [
  fifaId: string,
  group: string,
  kickoffIso: string,
  venue: string,
  homeTeam: string,
  homeFlagCode: string,
  awayTeam: string,
  awayFlagCode: string
];

// Fixture data mirrored from FIFA's 2026 World Cup calendar.
// Knockout fixtures are omitted because their opponents are not real teams yet.
const worldCup2026GroupFixtures = [
  ["400021443", "Grupo A", "2026-06-11T19:00:00Z", "Mexico City Stadium, Mexico City", "Mexico", "mx", "South Africa", "za"],
  ["400021441", "Grupo A", "2026-06-12T02:00:00Z", "Guadalajara Stadium, Guadalajara", "Korea Republic", "kr", "Czechia", "cz"],
  ["400021449", "Grupo B", "2026-06-12T19:00:00Z", "Toronto Stadium, Toronto", "Canada", "ca", "Bosnia and Herzegovina", "ba"],
  ["400021458", "Grupo D", "2026-06-13T01:00:00Z", "Los Angeles Stadium, Los Angeles", "USA", "us", "Paraguay", "py"],
  ["400021453", "Grupo C", "2026-06-14T01:00:00Z", "Boston Stadium, Boston", "Haiti", "ht", "Scotland", "gb-sct"],
  ["400021463", "Grupo D", "2026-06-14T04:00:00Z", "BC Place Vancouver, Vancouver", "Australia", "au", "Türkiye", "tr"],
  ["400021456", "Grupo C", "2026-06-13T22:00:00Z", "New York/New Jersey Stadium, New Jersey", "Brazil", "br", "Morocco", "ma"],
  ["400021447", "Grupo B", "2026-06-13T19:00:00Z", "San Francisco Bay Area Stadium, San Francisco Bay Area", "Qatar", "qa", "Switzerland", "ch"],
  ["400021467", "Grupo E", "2026-06-14T23:00:00Z", "Philadelphia Stadium, Philadelphia", "Côte d'Ivoire", "ci", "Ecuador", "ec"],
  ["400021464", "Grupo E", "2026-06-14T17:00:00Z", "Houston Stadium, Houston", "Germany", "de", "Curaçao", "cw"],
  ["400021470", "Grupo F", "2026-06-14T20:00:00Z", "Dallas Stadium, Dallas", "Netherlands", "nl", "Japan", "jp"],
  ["400021474", "Grupo F", "2026-06-15T02:00:00Z", "Monterrey Stadium, Monterrey", "Sweden", "se", "Tunisia", "tn"],
  ["400021486", "Grupo H", "2026-06-15T22:00:00Z", "Miami Stadium, Miami", "Saudi Arabia", "sa", "Uruguay", "uy"],
  ["400021482", "Grupo H", "2026-06-15T16:00:00Z", "Atlanta Stadium, Atlanta", "Spain", "es", "Cabo Verde", "cv"],
  ["400021476", "Grupo G", "2026-06-16T01:00:00Z", "Los Angeles Stadium, Los Angeles", "IR Iran", "ir", "New Zealand", "nz"],
  ["400021478", "Grupo G", "2026-06-15T19:00:00Z", "Seattle Stadium, Seattle", "Belgium", "be", "Egypt", "eg"],
  ["400021490", "Grupo I", "2026-06-16T19:00:00Z", "New York/New Jersey Stadium, New Jersey", "France", "fr", "Senegal", "sn"],
  ["400021488", "Grupo I", "2026-06-16T22:00:00Z", "Boston Stadium, Boston", "Iraq", "iq", "Norway", "no"],
  ["400021496", "Grupo J", "2026-06-17T01:00:00Z", "Kansas City Stadium, Kansas City", "Argentina", "ar", "Algeria", "dz"],
  ["400021498", "Grupo J", "2026-06-17T04:00:00Z", "San Francisco Bay Area Stadium, San Francisco Bay Area", "Austria", "at", "Jordan", "jo"],
  ["400021510", "Grupo L", "2026-06-17T23:00:00Z", "Toronto Stadium, Toronto", "Ghana", "gh", "Panama", "pa"],
  ["400021507", "Grupo L", "2026-06-17T20:00:00Z", "Dallas Stadium, Dallas", "England", "gb-eng", "Croatia", "hr"],
  ["400021502", "Grupo K", "2026-06-17T17:00:00Z", "Houston Stadium, Houston", "Portugal", "pt", "Congo DR", "cd"],
  ["400021504", "Grupo K", "2026-06-18T02:00:00Z", "Mexico City Stadium, Mexico City", "Uzbekistan", "uz", "Colombia", "co"],
  ["400021440", "Grupo A", "2026-06-18T16:00:00Z", "Atlanta Stadium, Atlanta", "Czechia", "cz", "South Africa", "za"],
  ["400021446", "Grupo B", "2026-06-18T19:00:00Z", "Los Angeles Stadium, Los Angeles", "Switzerland", "ch", "Bosnia and Herzegovina", "ba"],
  ["400021450", "Grupo B", "2026-06-18T22:00:00Z", "BC Place Vancouver, Vancouver", "Canada", "ca", "Qatar", "qa"],
  ["400021442", "Grupo A", "2026-06-19T01:00:00Z", "Guadalajara Stadium, Guadalajara", "Mexico", "mx", "Korea Republic", "kr"],
  ["400021457", "Grupo C", "2026-06-20T00:30:00Z", "Philadelphia Stadium, Philadelphia", "Brazil", "br", "Haiti", "ht"],
  ["400021454", "Grupo C", "2026-06-19T22:00:00Z", "Boston Stadium, Boston", "Scotland", "gb-sct", "Morocco", "ma"],
  ["400021460", "Grupo D", "2026-06-20T03:00:00Z", "San Francisco Bay Area Stadium, San Francisco Bay Area", "Türkiye", "tr", "Paraguay", "py"],
  ["400021462", "Grupo D", "2026-06-19T19:00:00Z", "Seattle Stadium, Seattle", "USA", "us", "Australia", "au"],
  ["400021469", "Grupo E", "2026-06-20T20:00:00Z", "Toronto Stadium, Toronto", "Germany", "de", "Côte d'Ivoire", "ci"],
  ["400021465", "Grupo E", "2026-06-21T00:00:00Z", "Kansas City Stadium, Kansas City", "Ecuador", "ec", "Curaçao", "cw"],
  ["400021472", "Grupo F", "2026-06-20T17:00:00Z", "Houston Stadium, Houston", "Netherlands", "nl", "Sweden", "se"],
  ["400021475", "Grupo F", "2026-06-21T04:00:00Z", "Monterrey Stadium, Monterrey", "Tunisia", "tn", "Japan", "jp"],
  ["400021487", "Grupo H", "2026-06-21T22:00:00Z", "Miami Stadium, Miami", "Uruguay", "uy", "Cabo Verde", "cv"],
  ["400021483", "Grupo H", "2026-06-21T16:00:00Z", "Atlanta Stadium, Atlanta", "Spain", "es", "Saudi Arabia", "sa"],
  ["400021477", "Grupo G", "2026-06-21T19:00:00Z", "Los Angeles Stadium, Los Angeles", "Belgium", "be", "IR Iran", "ir"],
  ["400021480", "Grupo G", "2026-06-22T01:00:00Z", "BC Place Vancouver, Vancouver", "New Zealand", "nz", "Egypt", "eg"],
  ["400021491", "Grupo I", "2026-06-23T00:00:00Z", "New York/New Jersey Stadium, New Jersey", "Norway", "no", "Senegal", "sn"],
  ["400021492", "Grupo I", "2026-06-22T21:00:00Z", "Philadelphia Stadium, Philadelphia", "France", "fr", "Iraq", "iq"],
  ["400021494", "Grupo J", "2026-06-22T17:00:00Z", "Dallas Stadium, Dallas", "Argentina", "ar", "Austria", "at"],
  ["400021499", "Grupo J", "2026-06-23T03:00:00Z", "San Francisco Bay Area Stadium, San Francisco Bay Area", "Jordan", "jo", "Algeria", "dz"],
  ["400021506", "Grupo L", "2026-06-23T20:00:00Z", "Boston Stadium, Boston", "England", "gb-eng", "Ghana", "gh"],
  ["400021511", "Grupo L", "2026-06-23T23:00:00Z", "Toronto Stadium, Toronto", "Panama", "pa", "Croatia", "hr"],
  ["400021503", "Grupo K", "2026-06-23T17:00:00Z", "Houston Stadium, Houston", "Portugal", "pt", "Uzbekistan", "uz"],
  ["400021501", "Grupo K", "2026-06-24T02:00:00Z", "Guadalajara Stadium, Guadalajara", "Colombia", "co", "Congo DR", "cd"],
  ["400021455", "Grupo C", "2026-06-24T22:00:00Z", "Miami Stadium, Miami", "Scotland", "gb-sct", "Brazil", "br"],
  ["400021452", "Grupo C", "2026-06-24T22:00:00Z", "Atlanta Stadium, Atlanta", "Morocco", "ma", "Haiti", "ht"],
  ["400021451", "Grupo B", "2026-06-24T19:00:00Z", "BC Place Vancouver, Vancouver", "Switzerland", "ch", "Canada", "ca"],
  ["400021448", "Grupo B", "2026-06-24T19:00:00Z", "Seattle Stadium, Seattle", "Bosnia and Herzegovina", "ba", "Qatar", "qa"],
  ["400021444", "Grupo A", "2026-06-25T01:00:00Z", "Mexico City Stadium, Mexico City", "Czechia", "cz", "Mexico", "mx"],
  ["400021445", "Grupo A", "2026-06-25T01:00:00Z", "Monterrey Stadium, Monterrey", "South Africa", "za", "Korea Republic", "kr"],
  ["400021468", "Grupo E", "2026-06-25T20:00:00Z", "Philadelphia Stadium, Philadelphia", "Curaçao", "cw", "Côte d'Ivoire", "ci"],
  ["400021466", "Grupo E", "2026-06-25T20:00:00Z", "New York/New Jersey Stadium, New Jersey", "Ecuador", "ec", "Germany", "de"],
  ["400021471", "Grupo F", "2026-06-25T23:00:00Z", "Dallas Stadium, Dallas", "Japan", "jp", "Sweden", "se"],
  ["400021473", "Grupo F", "2026-06-25T23:00:00Z", "Kansas City Stadium, Kansas City", "Tunisia", "tn", "Netherlands", "nl"],
  ["400021459", "Grupo D", "2026-06-26T02:00:00Z", "Los Angeles Stadium, Los Angeles", "Türkiye", "tr", "USA", "us"],
  ["400021461", "Grupo D", "2026-06-26T02:00:00Z", "San Francisco Bay Area Stadium, San Francisco Bay Area", "Paraguay", "py", "Australia", "au"],
  ["400021489", "Grupo I", "2026-06-26T19:00:00Z", "Boston Stadium, Boston", "Norway", "no", "France", "fr"],
  ["400021493", "Grupo I", "2026-06-26T19:00:00Z", "Toronto Stadium, Toronto", "Senegal", "sn", "Iraq", "iq"],
  ["400021479", "Grupo G", "2026-06-27T03:00:00Z", "Seattle Stadium, Seattle", "Egypt", "eg", "IR Iran", "ir"],
  ["400021481", "Grupo G", "2026-06-27T03:00:00Z", "BC Place Vancouver, Vancouver", "New Zealand", "nz", "Belgium", "be"],
  ["400021485", "Grupo H", "2026-06-27T00:00:00Z", "Houston Stadium, Houston", "Cabo Verde", "cv", "Saudi Arabia", "sa"],
  ["400021484", "Grupo H", "2026-06-27T00:00:00Z", "Guadalajara Stadium, Guadalajara", "Uruguay", "uy", "Spain", "es"],
  ["400021508", "Grupo L", "2026-06-27T21:00:00Z", "New York/New Jersey Stadium, New Jersey", "Panama", "pa", "England", "gb-eng"],
  ["400021509", "Grupo L", "2026-06-27T21:00:00Z", "Philadelphia Stadium, Philadelphia", "Croatia", "hr", "Ghana", "gh"],
  ["400021497", "Grupo J", "2026-06-28T02:00:00Z", "Kansas City Stadium, Kansas City", "Algeria", "dz", "Austria", "at"],
  ["400021495", "Grupo J", "2026-06-28T02:00:00Z", "Dallas Stadium, Dallas", "Jordan", "jo", "Argentina", "ar"],
  ["400021505", "Grupo K", "2026-06-27T23:30:00Z", "Miami Stadium, Miami", "Colombia", "co", "Portugal", "pt"],
  ["400021500", "Grupo K", "2026-06-27T23:30:00Z", "Atlanta Stadium, Atlanta", "Congo DR", "cd", "Uzbekistan", "uz"]
] as const satisfies readonly FixtureSeed[];

const teamNamesPtBr = {
  Algeria: "Argélia",
  Argentina: "Argentina",
  Australia: "Austrália",
  Austria: "Áustria",
  Belgium: "Bélgica",
  "Bosnia and Herzegovina": "Bósnia e Herzegovina",
  Brazil: "Brasil",
  "Cabo Verde": "Cabo Verde",
  Canada: "Canadá",
  Colombia: "Colômbia",
  "Congo DR": "RD Congo",
  Croatia: "Croácia",
  Curaçao: "Curaçao",
  Czechia: "Tchéquia",
  "Côte d'Ivoire": "Costa do Marfim",
  Ecuador: "Equador",
  Egypt: "Egito",
  England: "Inglaterra",
  France: "França",
  Germany: "Alemanha",
  Ghana: "Gana",
  Haiti: "Haiti",
  "IR Iran": "Irã",
  Iraq: "Iraque",
  Japan: "Japão",
  Jordan: "Jordânia",
  "Korea Republic": "Coreia do Sul",
  Mexico: "México",
  Morocco: "Marrocos",
  Netherlands: "Holanda",
  "New Zealand": "Nova Zelândia",
  Norway: "Noruega",
  Panama: "Panamá",
  Paraguay: "Paraguai",
  Portugal: "Portugal",
  Qatar: "Catar",
  "Saudi Arabia": "Arábia Saudita",
  Scotland: "Escócia",
  Senegal: "Senegal",
  "South Africa": "África do Sul",
  Spain: "Espanha",
  Sweden: "Suécia",
  Switzerland: "Suíça",
  Tunisia: "Tunísia",
  Türkiye: "Turquia",
  Uruguay: "Uruguai",
  USA: "Estados Unidos",
  Uzbekistan: "Uzbequistão"
} as const satisfies Record<string, string>;

const venueNamesPtBr = {
  "Atlanta Stadium, Atlanta": "Estádio de Atlanta, Atlanta",
  "BC Place Vancouver, Vancouver": "BC Place, Vancouver",
  "Boston Stadium, Boston": "Estádio de Boston, Boston",
  "Dallas Stadium, Dallas": "Estádio de Dallas, Dallas",
  "Guadalajara Stadium, Guadalajara": "Estádio de Guadalajara, Guadalajara",
  "Houston Stadium, Houston": "Estádio de Houston, Houston",
  "Kansas City Stadium, Kansas City": "Estádio de Kansas City, Kansas City",
  "Los Angeles Stadium, Los Angeles": "Estádio de Los Angeles, Los Angeles",
  "Mexico City Stadium, Mexico City": "Estádio da Cidade do México, Cidade do México",
  "Miami Stadium, Miami": "Estádio de Miami, Miami",
  "Monterrey Stadium, Monterrey": "Estádio de Monterrey, Monterrey",
  "New York/New Jersey Stadium, New Jersey": "Estádio Nova York/Nova Jersey, Nova Jersey",
  "Philadelphia Stadium, Philadelphia": "Estádio da Filadélfia, Filadélfia",
  "San Francisco Bay Area Stadium, San Francisco Bay Area": "Estádio da Baía de São Francisco, Baía de São Francisco",
  "Seattle Stadium, Seattle": "Estádio de Seattle, Seattle",
  "Toronto Stadium, Toronto": "Estádio de Toronto, Toronto"
} as const satisfies Record<string, string>;

function displayTeamName(teamName: string): string {
  return (teamNamesPtBr as Record<string, string>)[teamName] ?? teamName;
}

function displayVenueName(venue: string): string {
  return (venueNamesPtBr as Record<string, string>)[venue] ?? venue;
}

const hexRadix = 16;
const hexByteWidth = 2;
const bytes32HexLength = 64;

function toBytes32Hex(value: string): `0x${string}` {
  const hex = [...value]
    .map((character) => character.charCodeAt(0).toString(hexRadix).padStart(hexByteWidth, "0"))
    .join("");

  return `0x${hex.padEnd(bytes32HexLength, "0").slice(0, bytes32HexLength)}`;
}

function toMatchViewModel(fixture: FixtureSeed): MatchViewModel {
  const [
    fifaId,
    group,
    kickoffIso,
    venue,
    homeTeam,
    homeFlagCode,
    awayTeam,
    awayFlagCode
  ] = fixture;
  const poolSnapshot = getMatchPoolSnapshot(fifaId);
  const homeTeamLabel = displayTeamName(homeTeam);
  const awayTeamLabel = displayTeamName(awayTeam);

  return {
    id: `wc26-${fifaId}`,
    onchainId: toBytes32Hex(`wc26-${fifaId}`),
    homeTeam: homeTeamLabel,
    awayTeam: awayTeamLabel,
    kickoffIso,
    status: "open",
    poolUsd: poolSnapshot.poolUsd,
    competition: `${tournamentConfig.name} - ${group}`,
    groupLabel: group,
    venue: displayVenueName(venue),
    homeFlagCode,
    awayFlagCode,
    homeCountry: homeTeamLabel,
    awayCountry: awayTeamLabel,
    homeForm: [],
    awayForm: [],
    outcomeTotalsUsd: poolSnapshot.outcomeTotalsUsd,
    supporterCount: poolSnapshot.supporterCount
  };
}

export const matches: readonly MatchViewModel[] = [...worldCup2026GroupFixtures]
  .sort(([, , leftKickoffIso], [, , rightKickoffIso]) => new Date(leftKickoffIso).getTime() - new Date(rightKickoffIso).getTime())
  .map(toMatchViewModel);

export const featuredMatch = matches[0];
