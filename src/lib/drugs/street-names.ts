/**
 * Search-only street and slang names, keyed by catalog id.
 *
 * Kept out of Drug.aliases on purpose. Aliases feed the OpenFDA label partner scan and the alias
 * teaching cards, and no label says "molly". A name here finds the row in search and in the API
 * resolver, and nothing else reads it. Search matches a street name only exactly, and an official
 * name, brand or alias always ranks above it.
 *
 * Source: NIDA, "Commonly Used Drugs Charts", the "Also called" list of each drug
 * (https://nida.nih.gov/research-topics/commonly-used-drugs-charts, read 2026-11-12). The owner
 * asked for Booze, Acid and K by name; Booze is not on the NIDA chart.
 *
 * Left out on purpose (street-names.test.ts holds the rules):
 * - one- and two-letter names (E, X, G, H, OC, MS, U4), except the owner's K;
 * - names that are already an alias or brand on the shelf (Coke, Crack, Ice, Crystal, Smack,
 *   Roofies, Tranq, N-Bomb, Bath Salts);
 * - names that begin another row's name, brand or alias, so a clinician typing that prefix would
 *   lose the row they meant (Pot: potassium; Tina: Tinactin; Joint), except the owner's Acid and K;
 * - Vitamin K (phytonadione), 30s and 40s (pressed pills are mostly fentanyl, not oxycodone), and
 *   names that NIDA lists for two drugs or that are ordinary words (Skittles, Smoke, Skunk, Dope,
 *   Poison, Mushrooms, Beans, Juice).
 */

/** Names the owner asked for. They may begin another row's name, so search shows that row below. */
export const OWNER_NAMED_STREET_NAMES: readonly string[] = ["K", "Acid", "Booze"];

export const STREET_NAMES: Record<string, readonly string[]> = {
  mdma: ["Molly", "Ecstasy", "XTC", "Adam", "Hug Drug"],
  ketamine: ["K", "Special K", "Super K", "Jet K", "Kit Kat", "Cat Valium", "Cat Tranquilizer"],
  lsd: ["Acid", "Blotter Acid", "Window Pane", "Mellow Yellow"],
  ethanol: ["Booze"],
  psilocybin: ["Shrooms", "Magic Mushrooms"],
  dronabinol: ["Weed", "Ganja", "Mary Jane", "Reefer", "Hash", "Grass", "Blunt"],
  heroin: ["Black Tar", "Big H", "Chiva", "Hell Dust"],
  fentanyl: [
    "Murder 8",
    "Tango & Cash",
    "Tango and Cash",
    "Jackpot",
    "Dance Fever",
    "Goodfellas",
    "Great Bear",
    "He-Man",
    "King Ivory",
  ],
  oxycodone: ["Roxy", "Hillbilly Heroin"],
  hydrocodone: ["Vikes", "Watsons"],
  hydromorphone: ["Dillies"],
  morphine: ["Mister Blue", "Dreamer"],
  codeine: ["Lean", "Captain Cody", "Cody"],
  dextromethorphan: ["Robo", "Triple C"],
  methamphetamine: ["Glass", "Crank", "Shards", "Yaba", "Shabu"],
  amphetamine: ["Speed", "Bennies", "Black Beauties"],
  methylphenidate: ["Vitamin R", "Kiddie Coke", "Kiddie Cocaine", "Rittys", "Study Buddies"],
  "sodium-oxybate": ["Liquid Ecstasy", "Georgia Home Boy", "Grievous Bodily Harm"],
  pcp: ["Angel Dust"],
  flunitrazepam: ["Forget Me Pill"],
  tianeptine: ["Gas Station Heroin"],
  kratom: ["Ketum", "Biak"],
  mescaline: ["Peyote"],
  dmt: ["Businessman's Trip"],
  "nitrous-oxide": ["Whippets"],
  "u-47700": ["Pinky"],
  salvinorin: ["Diviner's Sage", "Sally-D"],
};
