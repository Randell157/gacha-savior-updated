import { Button } from "@/components/ui/button";
import PageShell from "@/components/PageShell";
import { DetailRow, DetailRows } from "@/components/DetailRows";

export default function ContactPage() {
  const googleFormsUrl = "https://forms.gle/7Wh2EEq3xt5XqNdW6";

  return (
    <PageShell title="Contact" panel="flush">
      <div className="px-4 py-5 sm:px-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">
          Want to improve the website?
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-slate-400">
          Here&apos;s how to reach me: use the contact form or send an email.
        </p>
      </div>
      <DetailRows>
        <DetailRow label="Contact form">
          <p className="mb-4">
            Open the form below to send me a message. I&apos;ll get back to you
            as soon as I can.
          </p>
          <Button asChild className="w-full sm:w-auto">
            <a href={googleFormsUrl} target="_blank" rel="noopener noreferrer">
              Open contact form
            </a>
          </Button>
        </DetailRow>
        <DetailRow label="Email">gachasaviorapp@gmail.com</DetailRow>
      </DetailRows>
    </PageShell>
  );
}
