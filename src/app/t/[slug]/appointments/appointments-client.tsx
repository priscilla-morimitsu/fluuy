"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parse,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, List } from "lucide-react";
import { useRouter } from "next/navigation";
import { parseAsString, useQueryState } from "nuqs";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ActiveFiltersBar, type ActiveFilter } from "@/components/crud/active-filters-bar";
import { FilterButton } from "@/components/crud/filter-button";
import { PageHeader } from "@/components/crud/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { APPOINTMENT_MODALITIES, APPOINTMENT_RESPONSIBLE_TYPES, APPOINTMENT_STATUSES } from "@/lib/validations/appointment";
import type { TemplateField } from "@/lib/validations/template";

import AppointmentForm, { type AppointmentOptions } from "./appointment-form";
import type { AppointmentListRow } from "./data";
import {
  APPOINTMENT_STATUS_LABELS,
  MODALITY_LABELS,
  RESPONSIBLE_LABELS,
  STATUS_CHIP,
  appointmentStatusVariant,
} from "./labels";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function AppointmentsClient({
  slug,
  month,
  appointments,
  options,
  templateFields,
  canWrite,
}: {
  slug: string;
  month: string;
  appointments: AppointmentListRow[];
  options: AppointmentOptions;
  templateFields: TemplateField[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const opts = parseAsString.withOptions({ shallow: false });
  const [, setMonth] = useQueryState("month", opts);
  const [status, setStatus] = useQueryState("status", opts);
  const [modality, setModality] = useQueryState("modality", opts);
  const [responsibleType, setResponsible] = useQueryState("responsibleType", opts);
  const [professionalId, setProfessionalId] = useQueryState("professionalId", opts);
  const [serviceId, setServiceId] = useQueryState("serviceId", opts);
  // View toggle is purely client-side (same data), so keep it shallow — no refetch.
  const [view, setView] = useQueryState("view", parseAsString.withDefault("calendar"));

  const [creating, setCreating] = useState(false);
  const [draftStart, setDraftStart] = useState<string | undefined>(undefined);

  const monthDate = useMemo(() => parse(`${month}-01`, "yyyy-MM-dd", new Date()), [month]);
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [monthDate]);

  const byDay = useMemo(() => {
    const map = new Map<string, AppointmentListRow[]>();
    for (const a of appointments) {
      const key = format(a.startAt, "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(a);
      map.set(key, list);
    }
    return map;
  }, [appointments]);

  const activeFilters: ActiveFilter[] = [];
  if (status) activeFilters.push({ key: "status", label: `Status: ${APPOINTMENT_STATUS_LABELS[status] ?? status}`, onRemove: () => setStatus(null) });
  if (modality) activeFilters.push({ key: "modality", label: `Modalidade: ${MODALITY_LABELS[modality] ?? modality}`, onRemove: () => setModality(null) });
  if (responsibleType) activeFilters.push({ key: "responsibleType", label: `Responsável: ${RESPONSIBLE_LABELS[responsibleType] ?? responsibleType}`, onRemove: () => setResponsible(null) });
  if (professionalId) {
    const p = options.professionals.find((x) => x.id === professionalId);
    activeFilters.push({ key: "professionalId", label: `Profissional: ${p?.name ?? professionalId}`, onRemove: () => setProfessionalId(null) });
  }
  if (serviceId) {
    const sv = options.services.find((x) => x.id === serviceId);
    activeFilters.push({ key: "serviceId", label: `Serviço: ${sv?.name ?? serviceId}`, onRemove: () => setServiceId(null) });
  }

  const clearAll = () => {
    setStatus(null);
    setModality(null);
    setResponsible(null);
    setProfessionalId(null);
    setServiceId(null);
  };

  const openCreate = (day?: Date) => {
    setDraftStart(day ? `${format(day, "yyyy-MM-dd")}T09:00` : undefined);
    setCreating(true);
  };

  const sortedList = useMemo(() => [...appointments].sort((a, b) => a.startAt.getTime() - b.startAt.getTime()), [appointments]);
  const filterCount = (status ? 1 : 0) + (modality ? 1 : 0) + (responsibleType ? 1 : 0) + (professionalId ? 1 : 0) + (serviceId ? 1 : 0);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Agenda"
        description="Agendamentos e horários dos serviços."
        action={canWrite ? <Button onClick={() => openCreate()}><CalendarPlus /> Novo agendamento</Button> : undefined}
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setMonth(format(addMonths(monthDate, -1), "yyyy-MM"))} aria-label="Mês anterior">
            <ChevronLeft />
          </Button>
          <span className="min-w-40 text-center font-medium capitalize">{format(monthDate, "MMMM yyyy", { locale: ptBR })}</span>
          <Button variant="ghost" size="sm" onClick={() => setMonth(format(addMonths(monthDate, 1), "yyyy-MM"))} aria-label="Próximo mês">
            <ChevronRight />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setMonth(format(new Date(), "yyyy-MM"))}>
            Hoje
          </Button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="inline-flex items-center rounded-xl border border-border bg-card p-0.5" role="group" aria-label="Visualização">
            <button
              type="button"
              onClick={() => setView("calendar")}
              aria-pressed={view === "calendar"}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
                view === "calendar" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <CalendarDays className="size-4" /> Calendário
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
                view === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <List className="size-4" /> Lista
            </button>
          </div>
          <FilterButton activeCount={filterCount} onClear={clearAll}>
            <div className="flex flex-col gap-2">
              <Label>Status</Label>
              <Combobox value={status ?? "all"} onValueChange={(v) => setStatus(v === "all" ? null : v)} options={[{ value: "all", label: "Todos" }, ...APPOINTMENT_STATUSES.map((sct) => ({ value: sct, label: APPOINTMENT_STATUS_LABELS[sct] }))]} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Modalidade</Label>
              <Combobox value={modality ?? "all"} onValueChange={(v) => setModality(v === "all" ? null : v)} options={[{ value: "all", label: "Todas" }, ...APPOINTMENT_MODALITIES.map((m) => ({ value: m, label: MODALITY_LABELS[m] }))]} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Responsável</Label>
              <Combobox value={responsibleType ?? "all"} onValueChange={(v) => setResponsible(v === "all" ? null : v)} options={[{ value: "all", label: "Todos" }, ...APPOINTMENT_RESPONSIBLE_TYPES.map((r) => ({ value: r, label: RESPONSIBLE_LABELS[r] }))]} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Profissional</Label>
              <Combobox value={professionalId ?? "all"} onValueChange={(v) => setProfessionalId(v === "all" ? null : v)} options={[{ value: "all", label: "Todos" }, ...options.professionals.map((p) => ({ value: p.id, label: p.name }))]} searchPlaceholder="Buscar…" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Serviço</Label>
              <Combobox value={serviceId ?? "all"} onValueChange={(v) => setServiceId(v === "all" ? null : v)} options={[{ value: "all", label: "Todos" }, ...options.services.map((sv) => ({ value: sv.id, label: sv.name }))]} searchPlaceholder="Buscar…" />
            </div>
          </FilterButton>
        </div>
      </div>

      {activeFilters.length > 0 && <ActiveFiltersBar filters={activeFilters} onClearAll={clearAll} />}

      {view === "calendar" && (
      <div className="glass overflow-hidden rounded-2xl border border-(--glass-border)">
        <div className="grid grid-cols-7 border-b border-(--glass-border) text-center text-xs font-medium text-muted-foreground">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-2">{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayAppts = byDay.get(key) ?? [];
            const inMonth = isSameMonth(day, monthDate);
            const isToday = isSameDay(day, new Date());
            return (
              <button
                key={key}
                type="button"
                onClick={() => canWrite && openCreate(day)}
                className={cn(
                  "flex min-h-24 flex-col gap-1 border-b border-r border-(--glass-border) p-1.5 text-left align-top",
                  !inMonth && "bg-muted/40 text-muted-foreground",
                  canWrite && "hover:bg-(--lime-50)",
                )}
              >
                <span className={cn("text-xs font-medium", isToday && "grid size-5 place-items-center rounded-full bg-foreground text-background")}>
                  {format(day, "d")}
                </span>
                <span className="flex flex-col gap-0.5">
                  {dayAppts.slice(0, 3).map((a) => (
                    <span
                      key={a.id}
                      role="link"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/t/${slug}/appointments/${a.id}`);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.stopPropagation();
                          router.push(`/t/${slug}/appointments/${a.id}`);
                        }
                      }}
                      className={cn("truncate rounded border px-1 py-0.5 text-[11px]", STATUS_CHIP[a.status] ?? "border-border bg-card")}
                      title={`${format(a.startAt, "HH:mm")} · ${a.customer.name} · ${a.service.name}`}
                    >
                      {format(a.startAt, "HH:mm")} {a.customer.name}
                    </span>
                  ))}
                  {dayAppts.length > 3 && <span className="text-[11px] text-muted-foreground">+{dayAppts.length - 3} mais</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      )}

      {view === "list" && (
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Agendamentos do mês ({sortedList.length})</h3>
        {sortedList.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            Nenhum agendamento neste mês.
          </p>
        ) : (
          <ul className="glass divide-y divide-(--glass-border) overflow-hidden rounded-xl border border-(--glass-border)">
            {sortedList.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => router.push(`/t/${slug}/appointments/${a.id}`)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted/40"
                >
                  <span className="w-28 shrink-0 tabular-nums text-muted-foreground">{format(a.startAt, "dd/MM HH:mm")}</span>
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{a.customer.name}</span>
                    <span className="text-muted-foreground"> · {a.service.name}</span>
                  </span>
                  <Badge variant={appointmentStatusVariant(a.status)}>{APPOINTMENT_STATUS_LABELS[a.status] ?? a.status}</Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      )}

      {canWrite && (
        <FormDrawer open={creating} onOpenChange={setCreating} title="Novo agendamento" description="Reserve um horário para um serviço." hideFooter contentScrolls={false}>
          <AppointmentForm
            slug={slug}
            options={options}
            templateFields={templateFields}
            defaultStartAt={draftStart}
            onCancel={() => setCreating(false)}
            onSuccess={() => {
              setCreating(false);
              toast.success("Agendamento criado.");
              router.refresh();
            }}
          />
        </FormDrawer>
      )}
    </div>
  );
}
