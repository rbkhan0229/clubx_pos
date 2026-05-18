import { WaitingSiteClient } from "@/components/waiting/WaitingSiteClient";

export default async function WaitingSitePage({
  params,
}: {
  params: Promise<{ waitingSiteId: string }>;
}) {
  const { waitingSiteId } = await params;
  return <WaitingSiteClient waitingSiteId={waitingSiteId} />;
}
