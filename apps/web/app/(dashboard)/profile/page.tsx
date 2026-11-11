import { requirePageAccess } from "@/lib/page-access";
import PageContent from "./page-content";

export default async function Page() {
  await requirePageAccess("/profile");
  return <PageContent />;
}
