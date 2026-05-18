import type { Order } from "@/types";

type PrintOptions = {
  tableNumber?: string;
};

function orderTypeLabel(order: Order) {
  if (order.orderType === "initial") return "Initial Order";
  if (order.orderType === "additional") return "Additional Order";
  return "Modified Order";
}

export async function printOrderSlip(
  order: Order,
  options?: PrintOptions,
): Promise<void> {
  const date = new Date(order.updatedAt);
  const lines = [
    "ClubX POS Order Slip",
    options?.tableNumber ? `Table Number: ${options.tableNumber}` : "Table Number: N/A",
    `Order #${order.orderNumber}`,
    `Order Type: ${orderTypeLabel(order)}`,
    `Ordered By: ${order.orderedBy.name || "Counter"}`,
    `Order Date: ${date.toLocaleDateString("en-US")}`,
    `Order Time: ${date.toLocaleTimeString("en-US")}`,
    "",
    "Menu Items",
    ...order.items.map(
      (item) => `- ${item.menuName} / Quantity: ${item.quantity}`,
    ),
  ];

  console.info(lines.join("\n"));
}
