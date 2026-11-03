import type { FullConfig } from "@playwright/test";
import { EMULATOR_PROJECT } from "./helpers";

/** Whether something answers at the URL within the time given. */
async function answers(url: string, withinMs: number) {
  const until = Date.now() + withinMs;
  while (Date.now() < until) {
    try {
      await fetch(url);
      return true;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  return false;
}

/**
 * Refuses to run unless the emulators are up (Playwright waits for Firestore,
 * and Auth can be a moment behind), then visits each route once so the dev
 * server has compiled them before the tests start timing anything.
 */
export default async function globalSetup(config: FullConfig) {
  for (const [name, url] of [
    ["Auth", "http://127.0.0.1:9099/"],
    ["Firestore", "http://127.0.0.1:8080/"],
  ]) {
    if (!(await answers(url, 30_000))) {
      throw new Error(
        `The ${name} emulator isn't running. Playwright starts the emulators for project ${EMULATOR_PROJECT} from playwright.config.ts; check that ports 8080 and 9099 were free.`
      );
    }
  }

  const baseURL = config.projects[0].use.baseURL!;
  const routes = [
    "/",
    "/login",
    "/create-account",
    "/about",
    "/contact",
    "/features",
    "/dashboard",
    "/profile",
    "/genshin",
    "/genshin/characters",
    "/genshin/characters/Aino",
    "/genshin/weapons",
    "/genshin/artifacts",
  ];
  for (const route of routes) {
    await fetch(baseURL + route);
  }
}
