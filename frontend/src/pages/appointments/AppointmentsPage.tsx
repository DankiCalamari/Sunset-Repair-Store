import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { appointmentsApi, customersApi } from "@/lib/api";

const statuses = ["scheduled", "confirmed", "completed", "cancelled", "no_show"];

function formatWhen(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AppointmentsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [serviceTypeId, setServiceTypeId] = useState("");
  const [scheduledStart, setScheduledStart] = useState("");
  const [notes, setNotes] = useState("");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["appointments"],
    queryFn: () => appointmentsApi.list(),
  });
  const { data: serviceTypes } = useQuery({
    queryKey: ["service-types"],
    queryFn: appointmentsApi.serviceTypes,
  });
  const { data: customers } = useQuery({
    queryKey: ["customers-list"],
    queryFn: () => customersApi.list(),
    enabled: showCreate,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      appointmentsApi.create({
        service_type_id: serviceTypeId,
        scheduled_start: new Date(scheduledStart).toISOString(),
        ...(customerId ? { customer_id: customerId } : { customer_name: customerName }),
        ...(notes ? { notes } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      setShowCreate(false);
      setCustomerId("");
      setCustomerName("");
      setServiceTypeId("");
      setScheduledStart("");
      setNotes("");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => appointmentsApi.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Appointments</h2>
          <p className="text-muted-foreground">Service bookings and customer visits</p>
        </div>
        <Button variant="accent" onClick={() => setShowCreate(true)}>
          <CalendarPlus className="mr-2 h-4 w-4" />
          New appointment
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Schedule ({data?.total ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && <p className="px-6 pb-4 text-sm text-muted-foreground">Loading...</p>}
          {data?.items.length === 0 && (
            <p className="px-6 pb-6 text-sm text-muted-foreground">No appointments booked yet.</p>
          )}
          {data?.items.map((appointment) => (
            <div key={appointment.id} className="grid gap-3 border-b px-6 py-4 md:grid-cols-[1fr_auto_auto] md:items-center">
              <div>
                <p className="font-medium">{appointment.customer_name}</p>
                <p className="text-sm text-muted-foreground">
                  {appointment.service_type_name} · {formatWhen(appointment.scheduled_start)}
                </p>
                {appointment.notes && <p className="mt-1 text-sm text-muted-foreground">{appointment.notes}</p>}
              </div>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium capitalize">
                {appointment.status.replace(/_/g, " ")}
              </span>
              <select
                className="h-9 rounded-md border border-border bg-card px-3 text-sm"
                value={appointment.status}
                onChange={(e) => updateMutation.mutate({ id: appointment.id, status: e.target.value })}
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </CardContent>
      </Card>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>New appointment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <select
                className="flex h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                value={serviceTypeId}
                onChange={(e) => setServiceTypeId(e.target.value)}
              >
                <option value="">Select service...</option>
                {serviceTypes?.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} ({service.duration_minutes} min)
                  </option>
                ))}
              </select>
              <Input type="datetime-local" value={scheduledStart} onChange={(e) => setScheduledStart(e.target.value)} />
              <select
                className="flex h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                value={customerId}
                onChange={(e) => {
                  setCustomerId(e.target.value);
                  setCustomerName("");
                }}
              >
                <option value="">Walk-in / new customer</option>
                {customers?.items.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
              {!customerId && (
                <Input placeholder="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              )}
              <Input placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
                <Button
                  variant="accent"
                  disabled={!serviceTypeId || !scheduledStart || (!customerId && !customerName) || createMutation.isPending}
                  onClick={() => createMutation.mutate()}
                >
                  Book appointment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
