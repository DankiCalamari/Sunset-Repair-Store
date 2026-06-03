import { Link } from "react-router-dom";
import {
  ArrowRight,
  BriefcaseBusiness,
  Car,
  CalendarDays,
  CheckCircle2,
  Clock,
  Home,
  Laptop,
  MessageCircle,
  Phone,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tablet,
  Truck,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Button, Card, SectionHeading } from "../components/ui";

const serviceAreas = ["Mildura", "Irymple", "Merbein", "Red Cliffs", "Nichols Point", "Wentworth"];

const whyCards: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Truck, title: "Mobile Service", text: "No shop visit. We come to homes, workplaces, farms and businesses." },
  { icon: Car, title: "Pickup & Delivery", text: "Convenient collection and return options across local service routes." },
  { icon: Clock, title: "Fast Turnaround", text: "Clear scheduling and useful updates from booking through return." },
  { icon: ShieldCheck, title: "Honest Pricing", text: "Approve quotes before repair work starts." },
  { icon: Users, title: "Local & Trusted", text: "Support for families, seniors, farmers and local teams." },
];

const serviceCards: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Smartphone, title: "Phones", text: "Screens, batteries, charging ports, setup and fault diagnosis." },
  { icon: Tablet, title: "Tablets", text: "iPads, Android tablets, cracked screens and software issues." },
  { icon: Laptop, title: "Laptops", text: "Hardware checks, performance, data support and software help." },
  { icon: BriefcaseBusiness, title: "Business Visits", text: "On-site technology support and scheduled repair visits." },
];

const processCards: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: CalendarDays, title: "1. Book", text: "Choose your preferred time, address, device and service type." },
  { icon: Wrench, title: "2. Diagnose", text: "A technician checks the issue and records it against your ticket." },
  { icon: MessageCircle, title: "3. Approve", text: "Review quotes, ask questions and approve work online." },
  { icon: Truck, title: "4. Return", text: "Your tested device is returned by appointment or delivery." },
];

export function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-orange-50/80 via-white to-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,#fed7aa_60%,transparent_100%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-28">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-orange-700 shadow-sm backdrop-blur">
              <Sparkles className="h-4 w-4" />
              Mildura mobile repair
            </div>

            <h1 className="mt-6 text-5xl font-black leading-[1.05] tracking-tight text-[#1c1815] sm:text-6xl lg:text-7xl">
              We Come
              <br />
              To You.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-stone-600">
              Professional phone, tablet, laptop and device repairs delivered directly to your home, workplace, farm, or business — no shop visit required.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/book">
                  Book a Mobile Repair <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/track">Track My Repair</Link>
              </Button>
              <Button asChild variant="ghost" size="lg">
                <Link to="/service-area">Service Area</Link>
              </Button>
            </div>

            <div className="mt-10 flex flex-wrap gap-4 rounded-2xl border border-orange-100 bg-white/70 p-5 backdrop-blur">
              {serviceAreas.map((area) => (
                <span key={area} className="flex items-center gap-1.5 text-sm font-bold text-stone-700">
                  <CheckCircle2 className="h-4 w-4 text-orange-500" />
                  {area}
                </span>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-[3rem] bg-gradient-to-br from-orange-200/40 to-amber-200/40 blur-2xl" />
            <div className="relative overflow-hidden rounded-3xl border border-orange-100 bg-white p-5 shadow-2xl shadow-orange-200/50">
              <div className="rounded-2xl bg-gradient-to-br from-[#1c1815] to-orange-800 p-5 text-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Mobile service unit</p>
                    <h2 className="mt-2 text-2xl font-black">On the road today</h2>
                    <p className="mt-2 text-sm leading-5 text-white/70">Technician visits and pickup routes across Sunraysia.</p>
                  </div>
                  <Car className="h-12 w-12 shrink-0 text-amber-300" />
                </div>
                <div className="mt-6 grid grid-cols-3 gap-2">
                  {serviceCards.slice(0, 3).map(({ icon: Icon, title }) => (
                    <div key={title} className="rounded-xl bg-white/10 p-3 ring-1 ring-white/10">
                      <Icon className="h-5 w-5 text-amber-300" />
                      <p className="mt-2 text-xs font-bold">{title}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-orange-100 bg-orange-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-orange-700">Next stop</p>
                  <p className="mt-1 text-sm font-black">Your place</p>
                </div>
                <div className="rounded-xl border border-orange-100 bg-white p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Available</p>
                  <p className="mt-1 text-sm font-black">By appointment</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Why choose us"
          title="A repair service built around your day"
          text="No shop visit required. We make repairs practical for busy homes, workplaces and regional customers."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {whyCards.map(({ icon: Icon, title, text }) => (
            <Card key={title} className="transition hover:-translate-y-1 hover:shadow-lg hover:shadow-orange-100">
              <Icon className="h-8 w-8 text-orange-600" />
              <h3 className="mt-4 text-lg font-black">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">{text}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="border-t border-orange-100 bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Repairs & support"
            title="Phones, tablets, laptops and everyday tech"
            text="Modern mobile repair service for devices that keep homes, farms and businesses connected."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {serviceCards.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-orange-100 bg-[#fff8f0] p-5 transition hover:shadow-md">
                <Icon className="h-9 w-9 text-orange-600" />
                <h3 className="mt-4 text-xl font-black">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="How it works"
          title="Book, approve, repair, return"
          text="Every booking connects into the repair management system, so updates and communication stay organised."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {processCards.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1c1815] text-amber-300">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-xl font-black">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-orange-100 bg-gradient-to-br from-orange-600 to-amber-500 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-black text-white sm:text-4xl">Ready to get your device fixed?</h2>
          <p className="mt-4 text-lg text-white/90">Book a mobile repair today and we will come to you.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
              <Link to="/book">Book a Mobile Repair</Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="text-white hover:bg-white/10">
              <Link to="/track">Track My Repair</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
