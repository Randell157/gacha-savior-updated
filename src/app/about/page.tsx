import Image from "next/image";
import PageShell from "@/components/PageShell";
import { DetailRow, DetailRows } from "@/components/DetailRows";

export default function AboutPage() {
  return (
    <PageShell title="About Gacha Savior" panel="flush">
      <div className="px-4 py-5 sm:px-6 flex items-center">
        <div className="flex-shrink-0 mr-4">
          <div className="h-32 w-32 rounded-full overflow-hidden bg-gray-200 dark:bg-slate-700">
            <Image
              src="/Pfp.jpg"
              alt="Creator's picture"
              width={128}
              height={128}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">
            Hello! I&apos;m Randell
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-slate-400">
            Undergraduate Student
          </p>
        </div>
      </div>
      <DetailRows>
        <DetailRow label="Who am I">
          My name is Randell Lapid. I&apos;m currently a senior undergraduate for
          CSUF.
        </DetailRow>
        <DetailRow label="Languages I know">
          <ul className="list-disc pl-5 space-y-1">
            <li>C++</li>
            <li>Java</li>
            <li>Python</li>
            <li>HTML/CSS/Javascript</li>
            <li>
              Utilizing Next.js for the website framework of the website, along
              with firebase as a database.
            </li>
          </ul>
        </DetailRow>
        <DetailRow label="Why make the website?">
          I play a little too many gacha games out there. These include Genshin
          Impact, Honkai Star Rail, Zenless Zone Zero, Wuthering Waves, and many
          more. I wanted to have an easy way for players like myself to organize
          and display their account information from these games, like the
          characters, weapons, talent levels, and other equipment like artifacts.
        </DetailRow>
      </DetailRows>
    </PageShell>
  );
}
