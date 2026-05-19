import { MobileOrderClient } from "@/app/mobile-order/[sessionId]/[visitId]/MobileOrderClient";

type MobileOrderPageProps = {
  params: Promise<{
    sessionId: string;
    visitId: string;
  }>;
};

export default async function MobileOrderPage({ params }: MobileOrderPageProps) {
  const { sessionId, visitId } = await params;
  return <MobileOrderClient sessionId={sessionId} visitId={visitId} />;
}
