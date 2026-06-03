import { useState } from "react";
import { CheckCircle2, MapPin } from "lucide-react";
import { PageIntro, SectionHeading } from "../components/ui";

const locations = [
  { name: "Mildura", description: "Main service hub. Full mobile call-out, pickup and delivery coverage." },
  { name: "Irymple", description: "Regular service area with scheduled call-out availability." },
  { name: "Merbein", description: "Scheduled visits and pickup routes by arrangement." },
  { name: "Red Cliffs", description: "Mobile call-outs and pickup services available." },
  { name: "Nichols Point", description: "Service coverage with flexible scheduling." },
  { name: "Wentworth", description: "Regional appointments available by arrangement." },
];

const mapMarkers = [
  { name: "Mildura", left: "50%", top: "42%" },
  { name: "Irymple", left: "60%", top: "53%" },
  { name: "Red Cliffs", left: "67%", top: "69%" },
  { name: "Merbein", left: "34%", top: "34%" },
  { name: "Nichols Point", left: "58%", top: "36%" },
  { name: "Wentworth", left: "22%", top: "58%" },
];

export function ServiceAreaPage() {
  const [selected, setSelected] = useState("Mildura");
  const selectedLocation = locations.find((l) => l.name === selected);

  return (
    <>
      <PageIntro
        eyebrow="Service area"
        title="Mobile repairs across Mildura and Sunraysia"
        text="We schedule call-outs, pickup and delivery, business visits, and regional appointments based on technician availability and travel distance."
      />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Map */}
          <div className="relative min-h-[480px] overflow-hidden rounded-2xl border border-orange-100 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 shadow-sm">
            <div className="absolute inset-8 rounded-[2rem] border-2 border-dashed border-orange-200" />
            <div className="absolute bottom-12 left-10 right-10 h-14 rotate-[-3deg] rounded-full bg-sky-100/70" />
            <div className="absolute left-16 top-28 h-36 w-28 rounded-full border-8 border-green-200/60" />
            <div className="absolute bottom-28 right-20 h-28 w-40 rounded-full border-8 border-amber-200/70" />

            {mapMarkers.map(({ name, left, top }) => (
              <button
                key={name}
                type="button"
                onClick={() => setSelected(name)}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full p-2 shadow-lg transition hover:scale-110 ${
                  selected === name ? "bg-orange-600 text-white" : "bg-white text-orange-700"
                }`}
                style={{ left, top }}
              >
                <MapPin className="h-6 w-6" />
                <span className="sr-only">{name}</span>
              </button>
            ))}

            <div className="absolute left-5 top-5 max-w-xs rounded-xl bg-white/95 p-4 shadow-lg backdrop-blur">
              <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Selected</p>
              <p className="mt-1 text-2xl font-black text-orange-700">{selected}</p>
              {selectedLocation && <p className="mt-1 text-xs leading-5 text-stone-600">{selectedLocation.description}</p>}
            </div>
          </div>

          {/* Location list */}
          <div className="space-y-3">
            {locations.map(({ name, description }) => (
              <button
                key={name}
                type="button"
                onClick={() => setSelected(name)}
                className={`w-full rounded-xl border p-4 text-left transition ${
                  selected === name
                    ? "border-orange-400 bg-orange-50 shadow-md"
                    : "border-orange-100 bg-white hover:bg-orange-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <MapPin className={`h-5 w-5 ${selected === name ? "text-orange-600" : "text-stone-400"}`} />
                  <p className="font-black">{name}</p>
                </div>
                <p className="mt-1.5 pl-8 text-sm leading-5 text-stone-600">{description}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-orange-100 bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Coverage"
            text="Availability depends on route planning, technician schedules and booking volume. Contact us to confirm service for your area."
            title="Service availability"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {locations.map(({ name }) => (
              <div key={name} className="flex items-center gap-3 rounded-xl border border-orange-100 bg-[#fff8f0] p-4">
                <CheckCircle2 className="h-5 w-5 text-orange-600" />
                <span className="font-bold">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
