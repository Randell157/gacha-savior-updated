"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Genshin from "@/components/Genshin";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useGenshinData } from "@/hooks/useGenshinData";
import { parseGoodText } from "@/lib/genshin/parseGood";

export default function DashboardPage() {
  const { user, username, loading, error: authError } = useAuth();
  const { data: genshinData, loadError, save } = useGenshinData();
  const router = useRouter();
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileWarnings, setFileWarnings] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const result = parseGoodText(await file.text());
    if (result.ok) {
      save(result.data);
      setFileError(null);
      setFileWarnings(result.warnings);
    } else {
      setFileError(result.error);
      setFileWarnings([]);
    }
  };

  const errorMessage =
    fileError ??
    (loadError ? `Your saved data couldn't be loaded: ${loadError} Please upload a new file.` : null);

  if (loading) {
    return null;
  }

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        {authError}
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <div className="min-h-screen bg-gradient-to-b from-indigo-100 to-purple-100">
          <header className="bg-white shadow">
            <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
              <h1 className="text-3xl font-bold text-indigo-900">
                Dashboard
              </h1>
            </div>
          </header>
          <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg px-4 py-8 sm:p-8 lg:p-10">
            <p className="text-xl text-gray-700 sm:text-lg mb-6">
              Hello, {username || "User"}!
            </p>
            {genshinData && (
              <Genshin key={user.uid} data={genshinData} userId={user.uid} />
            )}
            <div className="pt-8 mt-8 border-t border-gray-200 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
              <p className="text-xl">
                {genshinData
                  ? "Data uploaded. Would you like to reupload the data?"
                  : "Please import your Genshin JSON file (GOOD format). You can export it with Inventory Kamera or Irminsul."}
              </p>
              <div>
                <Input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="mb-4"
                />
              </div>
              {errorMessage && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}
              {fileWarnings.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Uploaded with some data skipped</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-5">
                      {fileWarnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
