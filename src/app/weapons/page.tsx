"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useGenshinData } from "@/hooks/useGenshinData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Header from "@/components/header";
import Footer from "@/components/footer";
import RequireAuth from "@/components/RequireAuth";
import { formatWeaponDisplayName } from "@/lib/utils";

export default function WeaponsPage() {
  return (
    <RequireAuth>
      <Weapons />
    </RequireAuth>
  );
}

function Weapons() {
  const { data: genshinData } = useGenshinData();
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const weapons = genshinData?.weapons ?? [];

  const handleImageError = (weaponKey: string) => {
    setImageErrors((prev) => new Set(prev).add(weaponKey));
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <div className="min-h-screen bg-gradient-to-b from-indigo-100 to-purple-100">
          <header className="bg-white shadow">
            <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
              <h1 className="text-3xl font-bold text-indigo-900">All Weapons</h1>
            </div>
          </header>
          <div className="max-w-7xl mx-auto py-12 sm:px-6 lg:px-8">
            <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
        {weapons.length === 0 && (
          <p className="text-gray-600">
            No weapons yet. Upload your data on the dashboard to see them here.
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {weapons.map((weapon, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-4">
                  <div className="relative w-12 h-12">
                    <Image
                      src={
                        imageErrors.has(weapon.key)
                          ? "/placeholder.svg"
                          : `/weapon-icons/${weapon.key.replace(
                              /\s+/g,
                              "_"
                            )}.png`
                      }
                      alt={formatWeaponDisplayName(weapon.key)}
                      fill
                      sizes="48px"
                      className="rounded-md object-contain"
                      onError={() => handleImageError(weapon.key)}
                    />
                  </div>
                  <span>{formatWeaponDisplayName(weapon.key)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>Level: {weapon.level}</p>
                <p>Refinement: {weapon.refinement}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-8">
          <Button asChild>
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}