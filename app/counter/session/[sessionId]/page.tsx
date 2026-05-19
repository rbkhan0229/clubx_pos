import { PosWorkspace } from "@/components/pos/PosWorkspace";
import { SafeSection } from "@/components/common/SafeSection";

type CounterSessionPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function CounterSessionPage({ params }: CounterSessionPageProps) {
  const { sessionId } = await params;

  return (
    <SafeSection label="POS Workspace">
      <PosWorkspace sessionId={sessionId} />
    </SafeSection>
  );
}
