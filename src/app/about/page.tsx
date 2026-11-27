import Image from "next/image";
import Link from "next/link";
import { CodeXml, Gamepad2, GraduationCap, Sparkles } from "lucide-react";
import PageShell from "@/components/PageShell";
import SocialLinks from "@/components/SocialLinks";
import GameIcon from "@/components/GameIcon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GAMES } from "@/lib/games";

const REPO_URL = "https://github.com/Randell157/gacha-savior-updated";

const BUILT_WITH = ["TypeScript", "React", "Next.js", "Tailwind CSS", "Firebase"];
const ALSO_KNOW = ["C++", "Java", "Python"];

const STORY = [
  { title: "CS capstone at CSUF", text: "The first version, with characters, weapons and artifacts." },
  { title: "Rebuilt as a personal project", text: "A new design and wish history." },
  { title: "Version 1.0, November 2026", text: "Live, with the code public on GitHub." },
  { title: "Version 1.1, November 2026", text: "Team showcases, build cards and the material planner, plus security fixes." },
  { title: "Version 1.2, November 2026", text: "Today's farming list, artifact cleanup, notes and tags, quick search and the year in review." },
];

const PLANNED_GAMES = GAMES.filter((game) => !game.href);

/** The About page: an intro card, then cards (option B from .mockups/about-contact.html). */
export default function AboutPage() {
  return (
    <PageShell title="About Gacha Savior" panel="none">
      <div className="max-w-7xl mx-auto grid grid-cols-1 gap-4 px-4 py-4 sm:py-12 sm:px-6 lg:px-8 md:grid-cols-2">
        <Card className="md:col-span-2 flex flex-wrap items-center gap-6 p-6">
          <Image
            src="/Pfp.jpg"
            alt="Randell's picture"
            width={128}
            height={128}
            className="h-32 w-32 shrink-0 rounded-full bg-gray-200 dark:bg-slate-700 object-cover"
          />
          <div className="min-w-0 flex-[1_1_16rem]">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">Hi, I&apos;m Randell</h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-slate-400">
              B.S. in Computer Science, Cal State Fullerton
            </p>
            <p className="mt-3 text-sm text-gray-600 dark:text-slate-400">
              I&apos;m Randell Lapid. I build Gacha Savior in my free time.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <SocialLinks />
              <Button asChild variant="outline" className="gap-2">
                <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
                  <CodeXml className="h-4 w-4" aria-hidden />
                  Site&apos;s source code
                </a>
              </Button>
            </div>
          </div>
        </Card>

        <AboutCard icon={Gamepad2} title="Why I made it">
          <p>
            I play more gacha games than I probably should: Genshin Impact, Honkai: Star Rail, Zenless
            Zone Zero, Wuthering Waves and more. I wanted one place to see what&apos;s on an account at a
            glance.
          </p>
          <p>
            Today that means your characters, weapons and artifacts, a material planner for what&apos;s
            left to farm, and a wish history that keeps your pulls after the game&apos;s six-month limit.
          </p>
        </AboutCard>

        <AboutCard icon={GraduationCap} title="How it started">
          <ol className="mt-1 border-l-2 border-gray-200 dark:border-slate-700">
            {STORY.map((step) => (
              <li
                key={step.title}
                className="relative pb-3 pl-4 last:pb-0 before:absolute before:-left-[6px] before:top-1.5 before:h-2.5 before:w-2.5 before:rounded-full before:bg-indigo-600 dark:before:bg-indigo-400"
              >
                <span className="block font-medium text-gray-900 dark:text-slate-100">{step.title}</span>
                {step.text}
              </li>
            ))}
          </ol>
        </AboutCard>

        <AboutCard icon={CodeXml} title="Built with">
          <Tags items={BUILT_WITH} />
          <p className="!mb-1 !mt-3 text-gray-500 dark:text-slate-400">I also know</p>
          <Tags items={ALSO_KNOW} plain />
        </AboutCard>

        <AboutCard icon={Sparkles} title="Get in touch">
          <p>
            Ideas, bugs or just want to say hi? The{" "}
            <Link
              href="/contact"
              className="font-medium text-indigo-600 dark:text-indigo-400 underline underline-offset-2"
            >
              Contact
            </Link>{" "}
            page has a form, my email and a place to report issues.
          </p>
        </AboutCard>

        {/* Not built yet, so it's dashed and grey like "More games soon" on Features. */}
        <Card className="md:col-span-2 flex items-center gap-4 border-dashed border-gray-300 bg-transparent px-5 py-4 shadow-none dark:border-slate-600">
          <div className="flex shrink-0 gap-2">
            {PLANNED_GAMES.map((game) => (
              <GameIcon key={game.id} game={game} size={28} className="grayscale" />
            ))}
          </div>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            <span className="font-semibold text-gray-700 dark:text-slate-300">What&apos;s next:</span>{" "}
            I&apos;m planning to add Honkai: Star Rail and Zenless Zone Zero.
          </p>
        </Card>
      </div>
    </PageShell>
  );
}

function AboutCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Icon className="h-6 w-6 text-indigo-600 dark:text-indigo-300" aria-hidden />
        <CardTitle className="pt-2 text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-gray-600 dark:text-slate-400">{children}</CardContent>
    </Card>
  );
}

function Tags({ items, plain = false }: { items: string[]; plain?: boolean }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li
          key={item}
          className={
            plain
              ? "rounded-full border border-gray-200 dark:border-slate-700 px-2.5 py-0.5 text-gray-600 dark:text-slate-300"
              : "rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-0.5 font-medium text-indigo-800 dark:text-indigo-200"
          }
        >
          {item}
        </li>
      ))}
    </ul>
  );
}
