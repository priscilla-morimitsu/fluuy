"use client";

import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmActionDialog } from "@/components/crud/confirm-action-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { AffixInput, Field } from "@/components/ui/field";
import { ALLOWED_TRANSITIONS, ORDER_PAYMENT_METHODS, type OrderStatus } from "@/lib/validations/order";

import { registerManualPaymentAction, updateOrderStatusAction, type OrderActionResult } from "./actions";
import type { OrderDetail } from "./data";
import {
  fmtBRL,
  ORDER_FULFILLMENT_LABELS,
  ORDER_ITEM_TYPE_LABELS,
  ORDER_PAYMENT_METHOD_LABELS,
  ORDER_PAYMENT_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  orderStatusVariant,
  paymentStatusVariant,
} from "./labels";

const dtFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

function notify(res: OrderActionResult, ok: string) {
  if (res && "error" in res) toast.error(res.error);
  else if (res && "ok" in res) toast.success(ok);
}

export default function OrderDetail({
  slug,
  order,
  canWrite,
  canManagePayment,
}: {
  slug: string;
  order: OrderDetail;
  canWrite: boolean;
  canManagePayment: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("pix");

  const transitions = ALLOWED_TRANSITIONS[order.status as OrderStatus] ?? [];
  const nonCancel = transitions.filter((t) => t !== "cancelled");

  const changeStatus = (target: string) =>
    startTransition(async () => notify(await updateOrderStatusAction(slug, order.id, target), "Status atualizado."));

  const registerPayment = () =>
    startTransition(async () => {
      const res = await registerManualPaymentAction(slug, order.id, payAmount, payMethod);
      notify(res, "Pagamento registrado.");
      if (res && "ok" in res) setPayAmount("");
    });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link href={`/t/${slug}/orders`} className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Pedidos
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-mono text-xl font-semibold">{order.orderCode}</h2>
          <Badge variant={orderStatusVariant(order.status)}>{ORDER_STATUS_LABELS[order.status] ?? order.status}</Badge>
          <Badge variant={paymentStatusVariant(order.paymentStatus)}>{ORDER_PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}</Badge>
          {order.createdByAgent && <Badge variant="secondary">Criado por IA</Badge>}
          {canWrite && (
            <Button variant="secondary" size="sm" className="ml-auto" render={<Link href={`/t/${slug}/orders/${order.id}/edit`} />}>
              <Pencil /> Editar
            </Button>
          )}
        </div>
      </div>

      {canWrite && (nonCancel.length > 0 || transitions.includes("cancelled")) && (
        <div className="glass flex flex-wrap items-center gap-2 rounded-xl border border-(--glass-border) p-3">
          <span className="mr-2 text-sm font-medium">Mudar status:</span>
          {nonCancel.map((t) => (
            <Button key={t} size="sm" variant="secondary" disabled={pending} onClick={() => changeStatus(t)}>
              {ORDER_STATUS_LABELS[t]}
            </Button>
          ))}
          {transitions.includes("cancelled") && (
            <Button size="sm" variant="destructive" disabled={pending} onClick={() => setCancelOpen(true)}>
              Cancelar pedido
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="glass flex flex-col gap-1 rounded-xl border border-(--glass-border) p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase">Cliente</span>
          <span className="font-medium">{order.customer.name}</span>
          <span className="text-sm text-muted-foreground">{order.customer.phone}</span>
          {order.customer.email && <span className="text-sm text-muted-foreground">{order.customer.email}</span>}
        </div>
        <div className="glass flex flex-col gap-1 rounded-xl border border-(--glass-border) p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase">Atendimento</span>
          <span className="font-medium">{order.fulfillmentType ? ORDER_FULFILLMENT_LABELS[order.fulfillmentType] : "—"}</span>
          {order.addresses[0] && (
            <span className="text-sm text-muted-foreground">
              {[order.addresses[0].street, order.addresses[0].number, order.addresses[0].city].filter(Boolean).join(", ")}
            </span>
          )}
        </div>
        <div className="glass flex flex-col gap-1 rounded-xl border border-(--glass-border) p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase">Pagamento</span>
          <span className="font-medium">{fmtBRL(order.amountPaid)} pago de {fmtBRL(order.total)}</span>
          {order.paymentMethod && <span className="text-sm text-muted-foreground">{ORDER_PAYMENT_METHOD_LABELS[order.paymentMethod]}</span>}
        </div>
      </div>

      <section className="glass overflow-hidden rounded-xl border border-(--glass-border)">
        <table className="w-full text-sm">
          <thead className="border-b border-(--glass-border) text-left text-xs text-muted-foreground uppercase">
            <tr>
              <th className="px-3 py-2 font-medium">Item</th>
              <th className="px-3 py-2 font-medium">Tipo</th>
              <th className="px-3 py-2 font-medium">Qtd</th>
              <th className="px-3 py-2 font-medium">Unitário</th>
              <th className="px-3 py-2 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it) => (
              <tr key={it.id} className="border-b border-(--glass-border) last:border-0">
                <td className="px-3 py-2 font-medium">{it.name}</td>
                <td className="px-3 py-2">{ORDER_ITEM_TYPE_LABELS[it.itemType] ?? it.itemType}</td>
                <td className="px-3 py-2 tabular-nums">{it.quantity}</td>
                <td className="px-3 py-2 tabular-nums">{fmtBRL(it.unitPrice)}</td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">{fmtBRL(it.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-(--glass-border)">
              <td colSpan={4} className="px-3 py-1.5 text-right text-muted-foreground">Subtotal</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{fmtBRL(order.subtotal)}</td>
            </tr>
            {order.discountValue && (
              <tr>
                <td colSpan={4} className="px-3 py-1.5 text-right text-muted-foreground">Desconto ({order.discountType === "percentage" ? `${order.discountValue}%` : "fixo"})</td>
                <td className="px-3 py-1.5 text-right tabular-nums">−{fmtBRL(order.discountValue)}</td>
              </tr>
            )}
            {order.deliveryFee && (
              <tr>
                <td colSpan={4} className="px-3 py-1.5 text-right text-muted-foreground">Taxa de entrega</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{fmtBRL(order.deliveryFee)}</td>
              </tr>
            )}
            <tr className="border-t border-(--glass-border)">
              <td colSpan={4} className="px-3 py-2 text-right font-semibold">Total</td>
              <td className="px-3 py-2 text-right font-semibold tabular-nums">{fmtBRL(order.total)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      {(order.customerNotes || order.internalNotes) && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {order.customerNotes && (
            <div className="glass rounded-xl border border-(--glass-border) p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase">Observações do cliente</p>
              <p className="mt-1 text-sm">{order.customerNotes}</p>
            </div>
          )}
          {order.internalNotes && (
            <div className="glass rounded-xl border border-(--glass-border) p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase">Notas internas</p>
              <p className="mt-1 text-sm">{order.internalNotes}</p>
            </div>
          )}
        </div>
      )}

      {canManagePayment && (
        <section className="glass flex flex-col gap-3 rounded-xl border border-(--glass-border) p-4">
          <h3 className="text-sm font-semibold">Registrar pagamento manual</h3>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Valor" className="w-40">
              <AffixInput prefix="R$" type="number" min={0} step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
            </Field>
            <Field label="Forma" className="w-48">
              <Combobox value={payMethod} onValueChange={setPayMethod} options={ORDER_PAYMENT_METHODS.map((m) => ({ value: m, label: ORDER_PAYMENT_METHOD_LABELS[m] }))} />
            </Field>
            <Button type="button" disabled={pending || !payAmount} onClick={registerPayment}>
              Registrar
            </Button>
          </div>
          {order.payments.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm">
              {order.payments.map((p) => (
                <li key={p.id} className="flex justify-between text-muted-foreground">
                  <span>{ORDER_PAYMENT_METHOD_LABELS[p.method] ?? p.method} · {p.provider}</span>
                  <span className="tabular-nums">{fmtBRL(p.amountPaid)}{p.paidAt ? ` · ${dtFmt.format(p.paidAt)}` : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Histórico de status</h3>
        <ol className="flex flex-col gap-1 text-sm text-muted-foreground">
          {order.statusHistory.map((h) => (
            <li key={h.id} className="flex flex-wrap items-center gap-2">
              <span className="tabular-nums">{dtFmt.format(h.createdAt)}</span>
              <span>
                {h.fromStatus ? `${ORDER_STATUS_LABELS[h.fromStatus]} → ` : ""}
                <span className="font-medium text-foreground">{ORDER_STATUS_LABELS[h.toStatus] ?? h.toStatus}</span>
              </span>
              {h.changedByAgent && <Badge variant="secondary">IA</Badge>}
              {h.reason && <span>· {h.reason}</span>}
            </li>
          ))}
        </ol>
      </section>

      <ConfirmActionDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancelar pedido"
        description={`O pedido ${order.orderCode} será cancelado. Esta ação registra o histórico e não pode ser desfeita.`}
        destructive
        confirmLabel="Cancelar pedido"
        onConfirm={async () => notify(await updateOrderStatusAction(slug, order.id, "cancelled"), "Pedido cancelado.")}
      />
    </div>
  );
}
