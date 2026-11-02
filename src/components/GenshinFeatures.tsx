"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Genshin from "@/components/Genshin";
import { useAuth } from "@/contexts/AuthContext";
import { SAMPLE_GENSHIN_DATA, SAMPLE_SHOWCASE } from "@/lib/genshin/sampleData";

const features = [
  {
    title: "Character Overview",
    description: "View your Genshin Impact characters",
    details: [
      "Display total number of owned characters",
      "List top 5 characters by level",
      "Show character equipped weapons and artifacts",
    ],
  },
  {
    title: "Weapons Overview",
    description: "Keep track of your weapons obtained",
    details: [
      "Display total number of weapons in inventory",
      "List top 5 weapons by level",
      "Display weapon refinement levels",
    ],
  },
  {
    title: "Artifacts",
    description: "Organize and analyze your artifacts",
    details: ["Show total number of owned artifacts"],
  },
  {
    title: "Materials",
    description: "Display your materials and resources collected",
    details: [
      "Display total count of materials",
      "List top materials by quantity",
    ],
  },
];

export default function Features() {
  const [showcase, setShowcase] = useState(SAMPLE_SHOWCASE);
  const { user } = useAuth();

  return (
    <>
      <div className="max-w-7xl mx-auto py-12 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-slate-900 shadow overflow-hidden sm:rounded-lg mb-8">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">
              Genshin Impact Dashboard Features
            </h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-2">
              {features.map((feature, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {feature.title}
                    </CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc pl-5 space-y-1">
                      {feature.details.map((detail, detailIndex) => (
                        <li key={detailIndex}>{detail}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
              Dashboard Preview Sample
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400 mb-6">
              This is the real dashboard with a made-up account. Try changing the
              showcase slots.{" "}
              {user
                ? "The count cards open your own pages."
                : "Create an account to see your own data."}
            </p>
            <Genshin
              data={SAMPLE_GENSHIN_DATA}
              showcase={showcase}
              onShowcaseChange={setShowcase}
              preview
              viewAllToSignUp={!user}
            />
          </div>
        </div>
      </div>
    </>
  );
}
