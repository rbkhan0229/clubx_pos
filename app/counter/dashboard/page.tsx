import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { SafeSection } from "@/components/common/SafeSection";

export default function CounterDashboardPage() {
  return (
    <SafeSection label="Dashboard">
      <DashboardClient />
    </SafeSection>
  );
}
