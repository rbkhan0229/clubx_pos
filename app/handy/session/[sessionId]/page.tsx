import { HandyWorkspace } from "@/components/handy/HandyWorkspace";

type HandySessionPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function HandySessionPage({ params }: HandySessionPageProps) {
  const { sessionId } = await params;
  return <HandyWorkspace sessionId={sessionId} />;
}
