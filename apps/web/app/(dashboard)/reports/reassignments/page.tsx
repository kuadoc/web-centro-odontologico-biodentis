import { requirePageAccess } from "@/lib/page-access";
import ReportContent from "./report-content";

export default async function Page() {
  await requirePageAccess("/reports/reassignments");
  return <ReportContent />;
}
