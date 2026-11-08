import { PAIR_DISCLAIMER, SITE_URL } from "./pair-copy";

// Kept apart from sources.ts: the route's head is in every page's entry bundle, and sources.ts pulls in the catalog and label data.
export const SOURCES_PATH = "/sources";
export const SOURCES_URL = `${SITE_URL}${SOURCES_PATH}`;
export const SOURCES_TITLE = "Sources: FDA label library and interaction table index | FirstPass";
export const SOURCES_DESCRIPTION = `Every FDA label excerpt FirstPass has saved, with the DailyMed set ID, SPL version and check date, plus an index of the FDA CYP and transporter table rows it uses. ${PAIR_DISCLAIMER}`;
