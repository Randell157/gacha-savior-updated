import { setRememberedTabState } from "@/hooks/useRememberedState";

// The Artifacts page's filter values that other places set (quick search).

/** The set filter's "every set" value */
export const ALL_SETS = "__all__";
/** The main stat filter's "any main stat" value */
export const ANY_MAIN_STAT = "__any__";

/**
 * Sets the Artifacts page to show every piece of one set: the All view, that
 * set, and every other filter cleared, so the list is never empty because of
 * a filter left on from before. `setId` is from `artifactSetId`.
 */
export function showArtifactSet(setId: string) {
  setRememberedTabState({
    "artifacts:show": "all",
    "artifacts:set": setId,
    "artifacts:slot": null,
    "artifacts:mainStat": ANY_MAIN_STAT,
    "artifacts:score": null,
    "artifacts:lock": null,
    "artifacts:rarity": null,
  });
}
