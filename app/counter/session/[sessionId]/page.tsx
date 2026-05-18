import { PosWorkspace } from "@/components/pos/PosWorkspace";

type CounterSessionPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function CounterSessionPage({ params }: CounterSessionPageProps) {
  const { sessionId } = await params;

  return <PosWorkspace sessionId={sessionId} />;
}
