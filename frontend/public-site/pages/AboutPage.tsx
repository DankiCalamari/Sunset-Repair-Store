import { BriefcaseBusiness, CheckCircle2, Heart, Home, Mail, MapPin, Phone, ShieldCheck, Truck } from "lucide-react";
import { PageIntro, SectionHeading } from "../components/ui";

const values = [
  { icon: ShieldCheck, title: "Trust", text: "Clear explanations, honest pricing, and quote approvals before repair work proceeds." },
  { icon: Heart, title: "Community", text: "Built for Mildura, Irymple, Merbein, Red Cliffs, Nichols Point, Wentworth and wider Sunraysia." },
  { icon: Mail, title: "Connected", text: "Email, SMS, messages, invoices, quotes, and warranty claims stay attached to each repair ticket." },
];

const audiences = [
  { icon: Home, title: "Homes & families", text: "Convenient help without packing everyone into the car." },
  { icon: BriefcaseBusiness, title: "Businesses", text: "On-site support for teams, devices and urgent interruptions." },
  { icon: Truck, title: "Farms & properties", text: "Scheduled visits and practical pickup options by arrangement." },
  { icon: Phone, title: "Seniors", text: "Friendly, patient support to stay connected and confident." },
];

export function AboutPage() {
  return (
    <>
      <PageIntro
        eyebrow="About us"
        title="Local mobile technology repair for Sunraysia"
        text="Sunset Country Repairs helps homes, businesses, farmers, seniors, and families stay connected without the hassle of visiting a repair shop."
      />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-2xl bg-[#1c1815] p-8 text-white shadow-xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Our mission</p>
            <h2 className="mt-4 text-3xl font-black leading-tight">Convenience, reliability, community, and trust.</h2>
            <p className="mt-5 text-base leading-7 text-stone-300">
              Regional life is busy. Whether you are running a business, managing a farm, caring for family, or helping a senior stay online, our mobile repair model keeps technology support practical and local.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3">
              {audiences.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-xl bg-white/10 p-4 ring-1 ring-white/10">
                  <Icon className="h-6 w-6 text-amber-300" />
                  <p className="mt-2 text-sm font-black">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-stone-400">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {values.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-stone-600">{text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-orange-100 bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Service area"
            title="Proudly serving the Sunraysia region"
            text="We provide mobile repair services across Mildura and surrounding towns."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {["Mildura", "Irymple", "Merbein", "Red Cliffs", "Nichols Point", "Wentworth"].map((town) => (
              <div key={town} className="flex items-center gap-3 rounded-xl border border-orange-100 bg-[#fff8f0] p-4">
                <MapPin className="h-5 w-5 text-orange-600" />
                <span className="font-bold">{town}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="What we repair"
          title="Phones, tablets, laptops and more"
          text="Professional repair services for the devices that keep you connected."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Mobile Phones", items: ["Screen replacements", "Battery issues", "Charging ports", "Software problems", "Water damage"] },
            { title: "Tablets", items: ["Cracked screens", "Charging issues", "Performance problems", "Software updates", "Setup help"] },
            { title: "Laptops", items: ["Hardware repairs", "Virus removal", "Data recovery", "Performance upgrades", "Software support"] },
            { title: "Other Devices", items: ["Gaming consoles", "Smart watches", "Accessories", "Setup & training", "General tech support"] },
          ].map(({ title, items }) => (
            <div key={title} className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-black">{title}</h3>
              <ul className="mt-3 space-y-2">
                {items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-stone-600">
                    <CheckCircle2 className="h-4 w-4 text-orange-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-orange-100 bg-gradient-to-br from-orange-600 to-amber-500 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-black text-white sm:text-4xl">Ready to get started?</h2>
          <p className="mt-4 text-lg text-white/90">Book a mobile repair today and experience the convenience of tech support that comes to you.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a href="/book" className="inline-flex h-14 items-center justify-center rounded-2xl border-2 border-white px-8 text-base font-bold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50">
              Book a Mobile Repair
            </a>
            <a href="/track" className="inline-flex h-14 items-center justify-center rounded-2xl px-8 text-base font-bold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50">
              Track My Repair
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
