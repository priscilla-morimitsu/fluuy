import {
  Building2,
  Calendar,
  ClipboardList,
  CreditCard,
  FileText,
  Heart,
  Info,
  MapPin,
  Mail,
  Package,
  PawPrint,
  Phone,
  Settings,
  Star,
  Stethoscope,
  Tag,
  User,
  type LucideIcon,
} from "lucide-react";

/**
 * Curated icon set selectable for template steps. The template stores the icon
 * by NAME (a stable string); the builder and runtime resolve it back to the
 * component here. Unknown/absent names fall back to {@link DEFAULT_STEP_ICON}.
 */
export const STEP_ICONS = {
  info: Info,
  user: User,
  mapPin: MapPin,
  fileText: FileText,
  clipboard: ClipboardList,
  heart: Heart,
  pawPrint: PawPrint,
  calendar: Calendar,
  phone: Phone,
  mail: Mail,
  building: Building2,
  tag: Tag,
  star: Star,
  package: Package,
  stethoscope: Stethoscope,
  creditCard: CreditCard,
  settings: Settings,
} as const satisfies Record<string, LucideIcon>;

export type StepIconName = keyof typeof STEP_ICONS;

export const STEP_ICON_NAMES = Object.keys(STEP_ICONS) as StepIconName[];

export const DEFAULT_STEP_ICON: LucideIcon = Info;

/** Resolves a stored icon name to its component, falling back when unknown. */
export function resolveStepIcon(name: string | undefined): LucideIcon {
  return (name && (STEP_ICONS as Record<string, LucideIcon>)[name]) || DEFAULT_STEP_ICON;
}
