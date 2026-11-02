import { Button } from "@/components/ui/button";
import PageShell from "@/components/PageShell";
import { DetailRow, DetailRows } from "@/components/DetailRows";

export default function ContactPage() {
  const googleFormsUrl = "https://forms.gle/7Wh2EEq3xt5XqNdW6";

  return (
    <PageShell title="Contact Me" panel="flush">
      <div className="px-4 py-5 sm:px-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">
          Want to improve the website?
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-slate-400">
          Here&apos;s where you can contact me. Use the contact form or email
        </p>
      </div>
      <DetailRows>
        <DetailRow label="Contact Form">
          <p className="mb-4">
            Please click the button below to access our contact form. We&apos;ll
            get back to you as soon as possible!
          </p>
          <Button asChild className="w-full sm:w-auto">
            <a href={googleFormsUrl} target="_blank" rel="noopener noreferrer">
              Open Contact Form
            </a>
          </Button>
        </DetailRow>
        <DetailRow label="Email">gachasaviorapp@gmail.com</DetailRow>
      </DetailRows>
    </PageShell>
  );
}
