import { FormEvent, useState } from "react";
import {
  BriefcaseBusiness,
  CalendarDays,
  Car,
  CheckCircle2,
  Clock,
  Home,
  Mail,
  Phone,
  ShieldCheck,
  Truck,
  Users,
} from "lucide-react";
import { Button, Input, PageIntro, Select, Textarea } from "../components/ui";
import { publicWebsiteApi } from "../api";

const serviceTypes = ["Home Visit", "Business Visit", "Pickup & Delivery", "Mail-In Repair"];

const features = [
  { icon: Truck, title: "Mobile call-outs", text: "We travel to your location across Sunraysia." },
  { icon: BriefcaseBusiness, title: "Business visits", text: "On-site support for workplaces and teams." },
  { icon: Car, title: "Pickup & delivery", text: "We can collect and return your device." },
  { icon: Clock, title: "Scheduled appointments", text: "Book a time that works for you." },
  { icon: ShieldCheck, title: "Quote approval", text: "Review and approve before work starts." },
  { icon: Home, title: "No shop visit", text: "Repairs come to your doorstep." },
];

export function BookingPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    const form = new FormData(event.currentTarget);

    try {
      const response = await publicWebsiteApi.createBooking({
        name: String(form.get("name") || ""),
        phone: String(form.get("phone") || ""),
        email: String(form.get("email") || "") || undefined,
        address: String(form.get("address") || ""),
        suburb: String(form.get("suburb") || ""),
        device_type: String(form.get("device_type") || ""),
        brand: String(form.get("brand") || ""),
        model: String(form.get("model") || ""),
        issue_description: String(form.get("issue_description") || ""),
        preferred_date: String(form.get("preferred_date") || ""),
        preferred_time: String(form.get("preferred_time") || ""),
        service_type: String(form.get("service_type") || ""),
      });

      event.currentTarget.reset();
      setMessage(`Booking confirmed! Your repair ticket is ${response.ticket_number}. We will contact you shortly to confirm the appointment.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <PageIntro
        eyebrow="Online booking"
        title="Book a mobile repair"
        text="Tell us where you are and what needs fixing. Your booking creates a customer, device, and repair ticket in our system."
      />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          {/* Sidebar */}
          <aside className="space-y-6">
            <div className="rounded-2xl bg-[#1c1815] p-6 text-white shadow-xl">
              <h2 className="text-2xl font-black">We come to you</h2>
              <p className="mt-3 text-sm leading-6 text-stone-300">
                No need to visit a shop. Choose your service type, preferred time and device details.
              </p>
              <div className="mt-6 space-y-2">
                {serviceTypes.map((type) => (
                  <div key={type} className="flex items-center gap-3 rounded-xl bg-white/10 p-3 ring-1 ring-white/10">
                    <CheckCircle2 className="h-4 w-4 text-amber-300" />
                    <span className="text-sm font-bold">{type}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {features.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-xl border border-orange-100 bg-white p-4">
                  <Icon className="h-6 w-6 text-orange-600" />
                  <p className="mt-2 text-sm font-black">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-stone-500">{text}</p>
                </div>
              ))}
            </div>
          </aside>

          {/* Form */}
          <form onSubmit={submitBooking} className="space-y-5 rounded-2xl border border-orange-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="space-y-4">
              <h3 className="text-lg font-black text-stone-900">Contact details</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-stone-700">Name *</label>
                  <Input name="name" required placeholder="Your full name" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-stone-700">Phone *</label>
                  <Input name="phone" type="tel" required placeholder="04xx xxx xxx" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-bold text-stone-700">Email</label>
                <Input name="email" type="email" placeholder="you@example.com" />
              </div>
            </div>

            <div className="space-y-4 border-t border-orange-100 pt-4">
              <h3 className="text-lg font-black text-stone-900">Location</h3>
              <div>
                <label className="mb-1.5 block text-sm font-bold text-stone-700">Address *</label>
                <Input name="address" required placeholder="Street address" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-bold text-stone-700">Suburb *</label>
                <Input name="suburb" required placeholder="Mildura, Irymple, Merbein..." />
              </div>
            </div>

            <div className="space-y-4 border-t border-orange-100 pt-4">
              <h3 className="text-lg font-black text-stone-900">Device details</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-stone-700">Device Type *</label>
                  <Select name="device_type" required>
                    <option value="">Select device</option>
                    <option>Mobile Phone</option>
                    <option>Tablet</option>
                    <option>Laptop</option>
                    <option>Desktop or Tech Device</option>
                  </Select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-stone-700">Brand *</label>
                  <Input name="brand" required placeholder="Apple, Samsung, HP..." />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-bold text-stone-700">Model *</label>
                <Input name="model" required placeholder="iPhone 14, Galaxy S23..." />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-bold text-stone-700">Issue Description *</label>
                <Textarea name="issue_description" required rows={4} placeholder="Tell us what is happening with the device..." />
              </div>
            </div>

            <div className="space-y-4 border-t border-orange-100 pt-4">
              <h3 className="text-lg font-black text-stone-900">Appointment</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-stone-700">Preferred Date *</label>
                  <Input name="preferred_date" type="date" required />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-stone-700">Preferred Time *</label>
                  <Input name="preferred_time" type="time" required />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-bold text-stone-700">Service Type *</label>
                <Select name="service_type" required>
                  <option value="">Choose service type</option>
                  {serviceTypes.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="border-t border-orange-100 pt-4">
              <Button type="submit" disabled={isSubmitting} size="lg" className="w-full">
                {isSubmitting ? "Creating booking..." : "Book a Mobile Repair"}
              </Button>
              {message && (
                <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-800">
                  {message}
                </div>
              )}
              {error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">
                  {error}
                </div>
              )}
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
