import { requirePageAccess } from "@/lib/page-access";
import PageContent from "./page-content";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePageAccess(`/patients/${encodeURIComponent(id)}`);
  return <PageContent />;
}
