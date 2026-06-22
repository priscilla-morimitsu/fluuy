"use client";

import { Check, CreditCard, Package, Plus, StickyNote, Tag, Trash2, Truck, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { AffixInput, Field } from "@/components/ui/field";
import { FormStepPanel, FormSteps, type FormStep } from "@/components/ui/form-steps";
import { Textarea } from "@/components/ui/textarea";
import { actionError, actionOk } from "@/lib/admin/action-result";
import {
  computeOrderTotals,
  ORDER_CHANNELS,
  ORDER_FULFILLMENT_TYPES,
  ORDER_PAYMENT_METHODS,
  ORDER_PAYMENT_STATUSES,
} from "@/lib/validations/order";
import type { TemplateField } from "@/lib/validations/template";

import { createOrderAction, updateOrderAction, type OrderActionResult } from "./actions";
import type { OrderCatalogOption } from "./data";
import {
  fmtBRL,
  ORDER_CHANNEL_LABELS,
  ORDER_FULFILLMENT_LABELS,
  ORDER_ITEM_TYPE_LABELS,
  ORDER_PAYMENT_METHOD_LABELS,
  ORDER_PAYMENT_STATUS_LABELS,
} from "./labels";

type ItemType = "product" | "service" | "offer_plan" | "custom";

type ItemRow = {
  key: string;
  itemType: ItemType;
  refId: string;
  name: string;
  quantity: string;
  unitPrice: string;
  discountValue: string;
  scheduledStartAt: string;
};

export type OrderFormInitial = {
  id: string;
  customerId: string;
  source: string;
  channel: string;
  fulfillmentType: string | null;
  discountType: string | null;
  discountValue: string | null;
  deliveryFee: string | null;
  paymentMethod: string | null;
  paymentStatus: string;
  amountPaid: string;
  customerNotes: string | null;
  internalNotes: string | null;
  customData: Record<string, unknown>;
  items: {
    itemType: string;
    productId: string | null;
    serviceId: string | null;
    offerPlanId: string | null;
    name: string;
    quantity: string;
    unitPrice: string;
    discountValue: string | null;
    scheduledStartAt: Date | null;
  }[];
  address: {
    type: string;
    zipCode: string | null;
    street: string | null;
    number: string | null;
    complement: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    reference: string | null;
  } | null;
};

const STATUS_CREATE_OPTIONS = [
  { value: "draft", label: "Rascunho" },
  { value: "pending_confirmation", label: "Aguardando confirmação" },
  { value: "confirmed", label: "Confirmado" },
];
const ADDRESS_FULFILLMENTS = new Set(["delivery", "pickup", "at_location", "at_home"]);

const STEPS: FormStep[] = [
  { id: "cliente", label: "Cliente", icon: User },
  { id: "itens", label: "Itens", icon: Package },
  { id: "entrega", label: "Entrega", icon: Truck },
  { id: "valores", label: "Valores", icon: CreditCard },
  { id: "obs", label: "Observações", icon: StickyNote },
];

let keySeq = 0;
const newKey = () => `i${keySeq++}`;

function toLocalInput(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Two-column responsive grid matching the FormDrawer field layout. */
function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="@container">
      <div className="grid grid-cols-1 gap-4 @[440px]:grid-cols-2">{children}</div>
    </div>
  );
}

export default function OrderForm({
  slug,
  customers,
  catalog,
  templateFields,
  initial,
  onSuccess,
  onCancel,
}: {
  slug: string;
  customers: { id: string; name: string; phone: string }[];
  catalog: { products: OrderCatalogOption[]; services: OrderCatalogOption[]; offerPlans: OrderCatalogOption[] };
  templateFields: TemplateField[];
  initial?: OrderFormInitial;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const isEdit = Boolean(initial);
  const action = isEdit ? updateOrderAction.bind(null, slug, initial!.id) : createOrderAction.bind(null, slug);
  const [state, formAction, pending] = useActionState<OrderActionResult, FormData>(action, undefined);

  const [customerId, setCustomerId] = useState(initial?.customerId ?? "");
  const [channel, setChannel] = useState(initial?.channel ?? "panel");
  const [status, setStatus] = useState("draft");
  const [fulfillmentType, setFulfillmentType] = useState(initial?.fulfillmentType ?? "");
  const [discountType, setDiscountType] = useState(initial?.discountType ?? "");
  const [discountValue, setDiscountValue] = useState(initial?.discountValue ?? "");
  const [deliveryFee, setDeliveryFee] = useState(initial?.deliveryFee ?? "");
  const [paymentMethod, setPaymentMethod] = useState(initial?.paymentMethod ?? "");
  const [paymentStatus, setPaymentStatus] = useState(initial?.paymentStatus ?? "pending");
  const [amountPaid, setAmountPaid] = useState(initial?.amountPaid ?? "");
  const [customerNotes, setCustomerNotes] = useState(initial?.customerNotes ?? "");
  const [internalNotes, setInternalNotes] = useState(initial?.internalNotes ?? "");

  const [items, setItems] = useState<ItemRow[]>(
    initial?.items.map((it) => ({
      key: newKey(),
      itemType: it.itemType as ItemType,
      refId: it.productId ?? it.serviceId ?? it.offerPlanId ?? "",
      name: it.name,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      discountValue: it.discountValue ?? "",
      scheduledStartAt: toLocalInput(it.scheduledStartAt),
    })) ?? [{ key: newKey(), itemType: "product", refId: "", name: "", quantity: "1", unitPrice: "", discountValue: "", scheduledStartAt: "" }],
  );

  const [addr, setAddr] = useState({
    zipCode: initial?.address?.zipCode ?? "",
    street: initial?.address?.street ?? "",
    number: initial?.address?.number ?? "",
    complement: initial?.address?.complement ?? "",
    neighborhood: initial?.address?.neighborhood ?? "",
    city: initial?.address?.city ?? "",
    state: initial?.address?.state ?? "",
    reference: initial?.address?.reference ?? "",
  });

  useEffect(() => {
    if (!actionOk(state)) {
      const err = actionError(state);
      if (err) toast.error(err);
      return;
    }
    if (onSuccess) onSuccess();
    else {
      router.push(`/t/${slug}/orders`);
      router.refresh();
    }
  }, [state, slug, onSuccess, router]);

  const catalogFor = (type: ItemType): OrderCatalogOption[] =>
    type === "product" ? catalog.products : type === "service" ? catalog.services : type === "offer_plan" ? catalog.offerPlans : [];

  const updateItem = (key: string, patch: Partial<ItemRow>) =>
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));

  const totals = useMemo(
    () =>
      computeOrderTotals({
        items: items.map((it) => ({ quantity: Number(it.quantity) || 0, unitPrice: Number(it.unitPrice) || 0, discountValue: Number(it.discountValue) || 0 })),
        discountType: (discountType || null) as "fixed" | "percentage" | null,
        discountValue: Number(discountValue) || null,
        deliveryFee: Number(deliveryFee) || null,
      }),
    [items, discountType, discountValue, deliveryFee],
  );

  const showAddress = ADDRESS_FULFILLMENTS.has(fulfillmentType);

  const payload = useMemo(() => {
    const addressFilled = Object.values(addr).some((v) => v.trim() !== "");
    return {
      customerId: customerId || undefined,
      channel,
      ...(isEdit ? {} : { status }),
      fulfillmentType: fulfillmentType || null,
      discountType: discountType || null,
      discountValue: discountValue === "" ? null : Number(discountValue),
      deliveryFee: deliveryFee === "" ? null : Number(deliveryFee),
      paymentMethod: paymentMethod || null,
      paymentStatus,
      amountPaid: amountPaid === "" ? null : Number(amountPaid),
      customerNotes: customerNotes || null,
      internalNotes: internalNotes || null,
      items: items.map((it) => ({
        itemType: it.itemType,
        productId: it.itemType === "product" ? it.refId || null : null,
        serviceId: it.itemType === "service" ? it.refId || null : null,
        offerPlanId: it.itemType === "offer_plan" ? it.refId || null : null,
        name: it.name,
        quantity: Number(it.quantity) || 0,
        unitPrice: it.unitPrice === "" ? 0 : Number(it.unitPrice),
        discountValue: it.discountValue === "" ? null : Number(it.discountValue),
        scheduledStartAt: it.scheduledStartAt ? new Date(it.scheduledStartAt).toISOString() : null,
      })),
      address: showAddress && addressFilled ? { type: fulfillmentType, ...addr } : null,
    };
  }, [customerId, channel, isEdit, status, fulfillmentType, discountType, discountValue, deliveryFee, paymentMethod, paymentStatus, amountPaid, customerNotes, internalNotes, items, showAddress, addr]);

  /** Client-side pre-check for FormSteps: focus the first incomplete step. */
  const validate = (): HTMLElement | null => {
    if (!customerId) return document.getElementById("customerId");
    const hasItem = items.some((it) => (it.itemType === "custom" ? it.name.trim() !== "" : it.refId !== "") && Number(it.quantity) > 0);
    if (!hasItem) return document.getElementById("orderItemsAdd");
    return null;
  };

  // Confirm-before-save on edit: list the fields that changed vs. the original
  // order before the save proceeds (mirrors the FormDrawerForm reference). The
  // multi-step form submits via requestSubmit, so we gate it in onSubmit.
  const confirmedRef = useRef(false);
  const [changed, setChanged] = useState<string[] | null>(null);

  const computeChanged = (): string[] => {
    if (!initial) return [];
    const result: string[] = [];
    const customer = customers.find((c) => c.id === customerId);
    const initialCustomer = customers.find((c) => c.id === initial.customerId);
    if (customerId !== initial.customerId) result.push(`Cliente: ${initialCustomer?.name ?? "—"} → ${customer?.name ?? "—"}`);
    if (channel !== initial.channel) result.push("Canal");
    if ((fulfillmentType || "") !== (initial.fulfillmentType ?? "")) result.push("Forma de atendimento");
    if ((discountType || "") !== (initial.discountType ?? "")) result.push("Tipo de desconto");
    if (discountValue !== (initial.discountValue ?? "")) result.push("Valor do desconto");
    if (deliveryFee !== (initial.deliveryFee ?? "")) result.push("Taxa de entrega");
    if ((paymentMethod || "") !== (initial.paymentMethod ?? "")) result.push("Forma de pagamento");
    if (paymentStatus !== initial.paymentStatus) result.push("Status do pagamento");
    if (amountPaid !== initial.amountPaid) result.push("Valor pago");
    if (customerNotes !== (initial.customerNotes ?? "")) result.push("Observações do cliente");
    if (internalNotes !== (initial.internalNotes ?? "")) result.push("Notas internas");
    if (items.length !== initial.items.length) result.push("Itens");
    return result;
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    if (!isEdit || confirmedRef.current) {
      confirmedRef.current = false;
      return;
    }
    e.preventDefault();
    setChanged(computeChanged());
  };

  const confirmSave = () => {
    confirmedRef.current = true;
    setChanged(null);
    formRef.current?.requestSubmit();
  };

  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={formAction} onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />
      <FormSteps
        steps={STEPS}
        loading={pending}
        submitLabel={isEdit ? "Salvar alterações" : "Criar pedido"}
        onCancel={() => (onCancel ? onCancel() : router.push(`/t/${slug}/orders`))}
        validate={validate}
      >
        {actionError(state) && (
          <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {actionError(state)}
          </p>
        )}

        <FormStepPanel step="cliente" title="Cliente e origem">
          <Grid>
            <Field label="Cliente" htmlFor="customerId" required className="col-span-full">
              <Combobox
                id="customerId"
                value={customerId}
                onValueChange={setCustomerId}
                options={customers.map((c) => ({ value: c.id, label: c.name, description: c.phone }))}
                placeholder="Selecione o cliente…"
                searchPlaceholder="Buscar cliente…"
                emptyText="Nenhum cliente. Cadastre em Clientes primeiro."
              />
            </Field>
            <Field label="Canal" htmlFor="channel">
              <Combobox value={channel} onValueChange={setChannel} options={ORDER_CHANNELS.map((c) => ({ value: c, label: ORDER_CHANNEL_LABELS[c] }))} />
            </Field>
            {!isEdit && (
              <Field label="Status inicial" htmlFor="status">
                <Combobox value={status} onValueChange={setStatus} options={STATUS_CREATE_OPTIONS} />
              </Field>
            )}
          </Grid>
        </FormStepPanel>

        <FormStepPanel step="itens" title="Itens do pedido">
          <div className="mb-3 flex justify-end">
            <Button
              id="orderItemsAdd"
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setItems((p) => [...p, { key: newKey(), itemType: "product", refId: "", name: "", quantity: "1", unitPrice: "", discountValue: "", scheduledStartAt: "" }])}
            >
              <Plus /> Adicionar item
            </Button>
          </div>
          <div className="flex flex-col gap-3">
            {items.map((it) => {
              const options = catalogFor(it.itemType);
              return (
                <div key={it.key} className="glass flex flex-col gap-3 rounded-xl border border-(--glass-border) p-3">
                  <div className="grid grid-cols-1 gap-3 @[440px]:grid-cols-2">
                    <Field label="Tipo">
                      <Combobox
                        value={it.itemType}
                        onValueChange={(v) => updateItem(it.key, { itemType: v as ItemType, refId: "", name: v === "custom" ? it.name : "" })}
                        options={(["product", "service", "offer_plan", "custom"] as ItemType[]).map((t) => ({ value: t, label: ORDER_ITEM_TYPE_LABELS[t] }))}
                      />
                    </Field>
                    {it.itemType !== "custom" ? (
                      <Field label="Item do catálogo">
                        <Combobox
                          value={it.refId}
                          onValueChange={(v) => {
                            const opt = options.find((o) => o.id === v);
                            updateItem(it.key, { refId: v, name: opt?.name ?? it.name, unitPrice: opt?.price ?? it.unitPrice });
                          }}
                          options={options.map((o) => ({ value: o.id, label: o.name }))}
                          placeholder="Selecione…"
                          searchPlaceholder="Buscar…"
                          emptyText="Nada disponível."
                        />
                      </Field>
                    ) : (
                      <Field label="Descrição do item">
                        <AffixInput value={it.name} onChange={(e) => updateItem(it.key, { name: e.target.value })} placeholder="Item avulso" />
                      </Field>
                    )}
                    <Field label="Quantidade">
                      <AffixInput type="number" min={0} step="0.01" value={it.quantity} onChange={(e) => updateItem(it.key, { quantity: e.target.value })} />
                    </Field>
                    <Field label="Preço unitário">
                      <AffixInput prefix="R$" type="number" min={0} step="0.01" value={it.unitPrice} onChange={(e) => updateItem(it.key, { unitPrice: e.target.value })} />
                    </Field>
                    <Field label="Desconto (item)">
                      <AffixInput prefix="R$" type="number" min={0} step="0.01" value={it.discountValue} onChange={(e) => updateItem(it.key, { discountValue: e.target.value })} />
                    </Field>
                    {it.itemType === "service" && (
                      <Field label="Início agendado">
                        <AffixInput type="datetime-local" value={it.scheduledStartAt} onChange={(e) => updateItem(it.key, { scheduledStartAt: e.target.value })} />
                      </Field>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Subtotal do item: {fmtBRL(Math.max(0, (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0) - (Number(it.discountValue) || 0)))}
                    </span>
                    {items.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setItems((p) => p.filter((x) => x.key !== it.key))}>
                        <Trash2 /> Remover
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </FormStepPanel>

        <FormStepPanel step="entrega" title="Entrega / execução">
          <Grid>
            <Field label="Forma de atendimento" htmlFor="fulfillmentType" className="col-span-full">
              <Combobox
                value={fulfillmentType || "none"}
                onValueChange={(v) => setFulfillmentType(v === "none" ? "" : v)}
                options={[{ value: "none", label: "—" }, ...ORDER_FULFILLMENT_TYPES.map((f) => ({ value: f, label: ORDER_FULFILLMENT_LABELS[f] }))]}
              />
            </Field>
            {showAddress && (
              <>
                <Field label="CEP" htmlFor="zipCode">
                  <AffixInput value={addr.zipCode} onChange={(e) => setAddr({ ...addr, zipCode: e.target.value })} />
                </Field>
                <Field label="Rua" htmlFor="street">
                  <AffixInput value={addr.street} onChange={(e) => setAddr({ ...addr, street: e.target.value })} />
                </Field>
                <Field label="Número" htmlFor="number">
                  <AffixInput value={addr.number} onChange={(e) => setAddr({ ...addr, number: e.target.value })} />
                </Field>
                <Field label="Complemento" htmlFor="complement">
                  <AffixInput value={addr.complement} onChange={(e) => setAddr({ ...addr, complement: e.target.value })} />
                </Field>
                <Field label="Bairro" htmlFor="neighborhood">
                  <AffixInput value={addr.neighborhood} onChange={(e) => setAddr({ ...addr, neighborhood: e.target.value })} />
                </Field>
                <Field label="Cidade" htmlFor="city">
                  <AffixInput value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} />
                </Field>
                <Field label="UF" htmlFor="state">
                  <AffixInput maxLength={2} value={addr.state} onChange={(e) => setAddr({ ...addr, state: e.target.value.toUpperCase() })} />
                </Field>
                <Field label="Referência" htmlFor="reference">
                  <AffixInput value={addr.reference} onChange={(e) => setAddr({ ...addr, reference: e.target.value })} />
                </Field>
              </>
            )}
          </Grid>
        </FormStepPanel>

        <FormStepPanel step="valores" title="Valores e pagamento">
          <Grid>
            <Field label="Tipo de desconto" htmlFor="discountType">
              <Combobox
                value={discountType || "none"}
                onValueChange={(v) => setDiscountType(v === "none" ? "" : v)}
                options={[{ value: "none", label: "Sem desconto" }, { value: "fixed", label: "Valor fixo (R$)" }, { value: "percentage", label: "Percentual (%)" }]}
              />
            </Field>
            <Field label="Valor do desconto" htmlFor="discountValue">
              <AffixInput type="number" min={0} step="0.01" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} disabled={!discountType} />
            </Field>
            <Field label="Taxa de entrega" htmlFor="deliveryFee">
              <AffixInput prefix="R$" type="number" min={0} step="0.01" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} />
            </Field>
            <Field label="Forma de pagamento" htmlFor="paymentMethod">
              <Combobox
                value={paymentMethod || "none"}
                onValueChange={(v) => setPaymentMethod(v === "none" ? "" : v)}
                options={[{ value: "none", label: "—" }, ...ORDER_PAYMENT_METHODS.map((m) => ({ value: m, label: ORDER_PAYMENT_METHOD_LABELS[m] }))]}
              />
            </Field>
            <Field label="Status do pagamento" htmlFor="paymentStatus">
              <Combobox value={paymentStatus} onValueChange={setPaymentStatus} options={ORDER_PAYMENT_STATUSES.map((s) => ({ value: s, label: ORDER_PAYMENT_STATUS_LABELS[s] }))} />
            </Field>
            <Field label="Valor pago" htmlFor="amountPaid">
              <AffixInput prefix="R$" type="number" min={0} step="0.01" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} />
            </Field>
          </Grid>
          <div className="mt-4 flex items-center justify-between rounded-xl border border-(--glass-border) bg-muted/40 px-4 py-3">
            <span className="text-sm text-muted-foreground">Subtotal {fmtBRL(totals.subtotal)}</span>
            <span className="text-base font-semibold">Total {fmtBRL(totals.total)}</span>
          </div>
        </FormStepPanel>

        <FormStepPanel step="obs" title="Observações e campos do nicho">
          <Grid>
            <Field label="Observações do cliente" htmlFor="customerNotes" className="col-span-full">
              <Textarea value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)} rows={2} maxLength={2000} />
            </Field>
            <Field label="Notas internas" htmlFor="internalNotes" className="col-span-full" hint="Não exibidas para o cliente nem para a IA.">
              <Textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={2} maxLength={2000} />
            </Field>
            {templateFields.map((field) => {
              const name = `custom_${field.key}`;
              const value = initial?.customData?.[field.key];
              if (field.type === "boolean") {
                return (
                  <label key={field.key} className="col-span-full flex items-center gap-2 text-sm">
                    <input type="checkbox" name={name} defaultChecked={Boolean(value)} className="size-4" />
                    {field.label}
                  </label>
                );
              }
              if ((field.type === "select" || field.type === "multiselect") && field.options) {
                return (
                  <Field key={field.key} label={field.label} htmlFor={name} required={field.required} className="col-span-full">
                    <Combobox id={name} name={name} defaultValue={value != null ? String(value) : ""} options={field.options.map((o) => ({ value: o, label: o }))} placeholder="Selecione" emptyText="Sem opções." />
                  </Field>
                );
              }
              return (
                <Field key={field.key} label={field.label} htmlFor={name} required={field.required}>
                  <AffixInput id={name} name={name} leadIcon={<Tag />} type={field.type === "number" ? "number" : "text"} defaultValue={value != null ? String(value) : ""} required={field.required} />
                </Field>
              );
            })}
          </Grid>
        </FormStepPanel>
      </FormSteps>

      <AlertDialog open={changed !== null} onOpenChange={(open) => !open && setChanged(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alterações do pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              {changed && changed.length > 0
                ? "Você alterou os campos abaixo. Confirme para salvar as alterações."
                : "Confirme para salvar este pedido."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {changed && changed.length > 0 && (
            <ul className="flex flex-col gap-1 rounded-lg border border-border bg-muted/40 p-3 text-sm">
              {changed.map((label) => (
                <li key={label} className="flex items-center gap-2">
                  <Check className="size-3.5 text-success" aria-hidden />
                  {label}
                </li>
              ))}
            </ul>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmSave();
              }}
            >
              Salvar alterações
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
