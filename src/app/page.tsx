import Image from "next/image";

import { ButtonLink } from "@/components/ui/button";

const features = [
  { title: "Search and scan", text: "Find any product in the USDA database by name or barcode." },
  { title: "Health score", text: "An A to E grade for every product, based on its nutrients." },
  { title: "AI analysis", text: "A plain-language breakdown checked against your allergies and diet." },
  { title: "Compare and swap", text: "Put products side by side and find healthier alternatives." },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-10 px-4 py-16 text-center">
      <div className="flex flex-col items-center gap-4">
        <Image
          src="/logo.png"
          alt="Conscious Carts frog logo"
          width={112}
          height={112}
          priority
          className="rounded-full"
        />
        <h1 className="font-display text-5xl text-primary">Conscious Carts</h1>
        <p className="max-w-xl text-lg text-muted">
          Know what you eat before it hits your cart.
        </p>
        <ButtonLink href="/sign-in" className="mt-2 px-6">
          Get started
        </ButtonLink>
      </div>

      <ul className="grid w-full gap-3 text-left sm:grid-cols-2">
        {features.map((feature) => (
          <li key={feature.title} className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="font-semibold">{feature.title}</h2>
            <p className="mt-1 text-sm text-muted">{feature.text}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
