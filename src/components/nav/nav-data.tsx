import {
  BadgeDollarSign,
  BadgePercent,
  BookOpenText,
  Bot,
  Boxes,
  BriefcaseBusiness,
  Building2,
  Cable,
  CalendarDays,
  ChartNoAxesCombined,
  FileCode2,
  Layers3,
  LayoutDashboard,
  MessageCircle,
  Package,
  Puzzle,
  Settings,
  ShieldCheck,
  Smartphone,
  ShoppingBag,
  ShoppingCart,
  Store,
  Truck,
  UserCog,
  UserPlus,
  Users,
  Workflow,
} from "lucide-react";

import type { NavItem, NavNode } from "./nav-types";

/**
 * Tenant navigation — groups (ACOMPANHE / CADASTRE / PERSONALIZE) with items,
 * submenus, badge counters and visibility rules. Exact transcription of the
 * Fluuy sidebar spec. `[tenantSlug]` is substituted at render time.
 */
export const tenantMenu: NavNode[] = [
  {
    id: "group_acompanhe",
    type: "group",
    label: "ACOMPANHE",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/t/[tenantSlug]", scope: "tenant", allowedRoles: ["tenant_owner", "tenant_manager", "tenant_operator", "tenant_viewer"] },
      { id: "conversations", label: "Conversas", icon: MessageCircle, href: "/t/[tenantSlug]/conversations", scope: "tenant", featureKey: "conversation_history", badge: true, allowedRoles: ["tenant_owner", "tenant_manager", "tenant_operator", "tenant_viewer"] },
      { id: "appointments", label: "Agenda", icon: CalendarDays, href: "/t/[tenantSlug]/appointments", scope: "tenant", featureKey: "appointment_request", badge: true, allowedRoles: ["tenant_owner", "tenant_manager", "tenant_operator", "tenant_viewer"] },
      { id: "orders", label: "Pedidos", icon: ShoppingCart, href: "/t/[tenantSlug]/orders", scope: "tenant", featureKey: "product_order_request", badge: true, allowedRoles: ["tenant_owner", "tenant_manager", "tenant_operator", "tenant_viewer"] },
      {
        id: "sales", label: "Vendas", icon: ShoppingBag, scope: "tenant", allowedRoles: ["tenant_owner", "tenant_manager", "tenant_operator", "tenant_viewer"],
        children: [
          { id: "deliveries", label: "Entregas", icon: Truck, href: "/t/[tenantSlug]/deliveries", featureKey: "delivery_management" },
          { id: "sales_report", label: "Relatórios", icon: ChartNoAxesCombined, href: "/t/[tenantSlug]/reports", featureKey: "basic_dashboard" },
        ],
      },
    ],
  },
  {
    id: "group_cadastre",
    type: "group",
    label: "CADASTRE",
    items: [
      { id: "customers", label: "Clientes", icon: Users, href: "/t/[tenantSlug]/customers", scope: "tenant", featureKey: "customer_management", badge: true, allowedRoles: ["tenant_owner", "tenant_manager", "tenant_operator", "tenant_viewer"] },
      { id: "collaborators", label: "Colaboradores", icon: UserCog, href: "/t/[tenantSlug]/collaborators", scope: "tenant", featureKey: "collaborator_management", allowedRoles: ["tenant_owner", "tenant_manager"] },
      {
        id: "catalog", label: "Catálogo", icon: Boxes, scope: "tenant", allowedRoles: ["tenant_owner", "tenant_manager", "tenant_operator", "tenant_viewer"],
        children: [
          { id: "products", label: "Produtos", icon: Package, href: "/t/[tenantSlug]/products", featureKey: "product_catalog" },
          { id: "services", label: "Serviços", icon: BriefcaseBusiness, href: "/t/[tenantSlug]/services", featureKey: "service_catalog" },
          { id: "plans", label: "Planos e Pacotes", icon: BadgePercent, href: "/t/[tenantSlug]/plans", featureKey: "plans_catalog" },
        ],
      },
    ],
  },
  {
    id: "group_personalize",
    type: "group",
    label: "PERSONALIZE",
    items: [
      {
        id: "automation", label: "Automação", icon: Bot, scope: "tenant", allowedRoles: ["tenant_owner", "tenant_manager"],
        children: [
          { id: "ai_agent", label: "Agente IA", icon: Bot, href: "/t/[tenantSlug]/agents", featureKey: "agent_configuration" },
          { id: "workflows", label: "Workflows", icon: Workflow, href: "/t/[tenantSlug]/workflows", featureKey: "tenant_workflows" },
          { id: "knowledge_base", label: "Base de conhecimento", icon: BookOpenText, href: "/t/[tenantSlug]/knowledge-base", featureKey: "knowledge_base" },
        ],
      },
      {
        id: "whatsapp", label: "WhatsApp", icon: Smartphone, scope: "tenant", featureKey: "whatsapp_integration", allowedRoles: ["tenant_owner", "tenant_manager"],
        children: [
          { id: "whatsapp_overview", label: "Visão geral", icon: MessageCircle, href: "/t/[tenantSlug]/whatsapp", featureKey: "whatsapp_integration" },
          { id: "whatsapp_numbers", label: "Números", icon: Smartphone, href: "/t/[tenantSlug]/whatsapp/numbers", featureKey: "whatsapp_integration" },
          { id: "whatsapp_templates", label: "Templates", icon: FileCode2, href: "/t/[tenantSlug]/whatsapp/templates", featureKey: "whatsapp_integration" },
          { id: "whatsapp_logs", label: "Logs", icon: BookOpenText, href: "/t/[tenantSlug]/whatsapp/logs", featureKey: "whatsapp_integration" },
        ],
      },
      {
        id: "settings", label: "Configurações", icon: Settings, scope: "tenant", allowedRoles: ["tenant_owner", "tenant_manager"],
        children: [
          { id: "business_settings", label: "Meu negócio", icon: Store, href: "/t/[tenantSlug]/settings" },
          { id: "integrations", label: "Integrações", icon: Cable, href: "/t/[tenantSlug]/integrations" },
          { id: "users_permissions", label: "Usuários", icon: ShieldCheck, href: "/t/[tenantSlug]/users", allowedRoles: ["tenant_owner"] },
        ],
      },
    ],
  },
];

/**
 * Platform-admin navigation — flat items with two submenus. Every item is
 * platformAdminOnly.
 */
export const platformAdminMenu: NavNode[] = [
  { id: "admin_dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/admin", scope: "platform", platformAdminOnly: true },
  { id: "admin_tenants", label: "Tenants", icon: Building2, href: "/admin/tenants", scope: "platform", platformAdminOnly: true },
  {
    id: "admin_niches_templates", label: "Nichos e Templates", icon: Layers3, scope: "platform", platformAdminOnly: true,
    children: [
      { id: "admin_niches", label: "Nichos", icon: Layers3, href: "/admin/niches" },
      { id: "admin_templates", label: "Templates", icon: FileCode2, href: "/admin/templates" },
    ],
  },
  {
    id: "admin_features_plans", label: "Features e Planos", icon: Puzzle, scope: "platform", platformAdminOnly: true,
    children: [
      { id: "admin_features", label: "Features", icon: Puzzle, href: "/admin/features" },
      { id: "admin_billing_plans", label: "Planos comerciais", icon: BadgeDollarSign, href: "/admin/billing-plans" },
    ],
  },
  { id: "admin_leads", label: "Leads", icon: UserPlus, href: "/admin/leads", scope: "platform", platformAdminOnly: true },
  { id: "admin_settings", label: "Configurações", icon: Settings, href: "/admin/settings", scope: "platform", platformAdminOnly: true },
];

export type { NavItem, NavNode };
