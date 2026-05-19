import { WaitingSiteClient } from "@/components/waiting/WaitingSiteClient";
import { SafeSection } from "@/components/common/SafeSection";

export default async function WaitingSitePage({
  params,
}: {
  params: Promise<{ waitingSiteId: string }>;
}) {
  const { waitingSiteId } = await params;
  return (
    <SafeSection label="Waiting Site">
      <WaitingSiteClient waitingSiteId={waitingSiteId} />
    </SafeSection>
  );
}
