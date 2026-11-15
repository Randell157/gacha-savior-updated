import { Bug, Mail, MessageCircle } from "lucide-react";
import PageShell from "@/components/PageShell";
import CopyButton from "@/components/CopyButton";
import SocialLinks from "@/components/SocialLinks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const FORM_URL = "https://forms.gle/7Wh2EEq3xt5XqNdW6";
const EMAIL = "gachasaviorapp@gmail.com";
const ISSUES_URL = "https://github.com/Randell157/gacha-savior-updated/issues";

/** The Contact page: three ways to get in touch as cards (option B from .mockups/about-contact.html). */
export default function ContactPage() {
  return (
    <PageShell title="Contact" panel="none">
      <div className="max-w-7xl mx-auto space-y-4 px-4 py-4 sm:py-12 sm:px-6 lg:px-8">
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
            Questions, ideas or found a bug?
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Pick whichever is easiest. I&apos;ll get back to you as soon as I can.
          </p>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <ContactCard icon={MessageCircle} title="Contact form" text="Send me a message. You don't need an account.">
            <Button asChild>
              <a href={FORM_URL} target="_blank" rel="noopener noreferrer">
                Open contact form
              </a>
            </Button>
          </ContactCard>

          <ContactCard icon={Mail} title="Email" text={<span className="break-all font-mono text-gray-900 dark:text-slate-100">{EMAIL}</span>}>
            <CopyButton text={EMAIL} label="Copy email" />
          </ContactCard>

          <ContactCard
            icon={Bug}
            title="Bugs and feature requests"
            text="Have a GitHub account? Open an issue and you'll get updates as I work on it."
          >
            <Button asChild variant="outline" className="gap-2">
              <a href={ISSUES_URL} target="_blank" rel="noopener noreferrer">
                Open an issue on GitHub
              </a>
            </Button>
          </ContactCard>
        </div>

        <Card className="flex flex-wrap items-center gap-x-4 gap-y-2 border-dashed border-gray-300 bg-transparent px-5 py-4 shadow-none dark:border-slate-600">
          <span className="text-sm text-gray-600 dark:text-slate-400">Also find me on</span>
          <div className="flex flex-wrap gap-2">
            <SocialLinks />
          </div>
        </Card>
      </div>
    </PageShell>
  );
}

function ContactCard({
  icon: Icon,
  title,
  text,
  children,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  text: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <Icon className="h-6 w-6 text-indigo-600 dark:text-indigo-300" aria-hidden />
        <CardTitle className="pt-2 text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col items-start gap-4">
        <CardDescription className="flex-1">{text}</CardDescription>
        {children}
      </CardContent>
    </Card>
  );
}
