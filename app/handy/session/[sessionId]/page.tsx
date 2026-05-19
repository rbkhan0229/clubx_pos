import { HandyWorkspace } from "@/components/handy/HandyWorkspace";
import { SafeSection } from "@/components/common/SafeSection";

type HandySessionPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function HandySessionPage({ params }: HandySessionPageProps) {
  const { sessionId } = await params;
  return (
    <SafeSection label="Handy Order Canvas">
      <HandyWorkspace sessionId={sessionId} />
    </SafeSection>
  );
}
