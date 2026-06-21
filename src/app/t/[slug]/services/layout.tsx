import { ServicesTabs } from "./services-tabs";

export default async function ServicesLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <div className="flex flex-col gap-4">
      <ServicesTabs slug={slug} />
      {children}
    </div>
  );
}
