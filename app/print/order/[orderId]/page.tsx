import { PrintOrderClient } from "@/app/print/order/[orderId]/PrintOrderClient";

type PrintOrderPageProps = {
  params: Promise<{
    orderId: string;
  }>;
  searchParams: Promise<{
    sessionId?: string;
    visitId?: string;
    table?: string;
  }>;
};

export default async function PrintOrderPage({ params, searchParams }: PrintOrderPageProps) {
  const { orderId } = await params;
  const { sessionId = "", visitId, table } = await searchParams;
  return (
    <PrintOrderClient
      orderId={orderId}
      sessionId={sessionId}
      tableLabel={table}
      visitId={visitId}
    />
  );
}
