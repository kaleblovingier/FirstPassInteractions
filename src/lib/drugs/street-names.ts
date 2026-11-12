/**
 * Search-only street and slang names, keyed by catalog id.
 *
 * Kept out of Drug.aliases on purpose. Aliases feed the OpenFDA label partner scan and the alias
 * teaching cards, and no label says "molly". A name here finds the row in search and in the API
 * resolver, and nothing else reads it.
 */
export const STREET_NAMES: Record<string, readonly string[]> = {};
