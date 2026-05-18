export type Mode = "counter" | "handy";

export type Language = "ko" | "en";

export type BusinessSession = {
  id: string;
  name: string;
  createdAt: string;
  lastAccessedAt: string | null;
};

export type SortKey = "name" | "createdAt" | "lastAccessedAt";

export type SortDirection = "asc" | "desc";

export type TableStatus = "empty" | "occupied" | "cleaning";

export type TableSize = 1 | 2 | 3;

export type Table = {
  id: string;
  sessionId: string;
  number: string;
  status: TableStatus;
  size: TableSize;
  minCapacity: number;
  maxCapacity: number;
  x: number;
  y: number;
  mergedGroupId?: string;
  originalPosition?: {
    x: number;
    y: number;
  };
};

export type TableMergeGroup = {
  id: string;
  sessionId: string;
  tableIds: string[];
  label: string;
  originalPositions: Record<string, { x: number; y: number }>;
  createdAt: string;
};

export type MenuCategory = {
  id: string;
  sessionId: string;
  nameKo: string;
  nameEn?: string;
  order: number;
};

export type MenuItem = {
  id: string;
  sessionId: string;
  categoryId: string;
  nameKo: string;
  nameEn?: string;
  price: number;
  isActive: boolean;
};

export type Guest = {
  id: string;
  name: string;
  phone?: string;
  username?: string;
  checkedIn: boolean;
};

export type PartyCardType = "reservation" | "waiting" | "walkIn";

export type PartyCard = {
  id: string;
  sessionId: string;
  type: PartyCardType;
  code: string;
  reservationTime?: string;
  waitingOrder?: number;
  guests: Guest[];
  tableCount: number;
  status: "waiting" | "seated" | "completed" | "overdue";
  sourceId?: string;
  mappedTableIds?: string[];
};

export type ReservationSource = {
  id: string;
  sessionId: string;
  eventId: string;
  eventName: string;
  date: string;
  importedAt: string;
  reservationCount: number;
};

export type WaitingSite = {
  id: string;
  sessionId: string;
  createdAt: string;
  urlPath: string;
};

export type Visit = {
  id: string;
  sessionId: string;
  tableIds: string[];
  partyCardIds: string[];
  sourceType: "reservation" | "waiting" | "walkIn" | "joined";
  sourceId?: string;
  visitCode: string;
  startedAt: string;
  expectedEndAt: string;
  status: "active" | "paid" | "cleaning" | "completed";
  isJoined?: boolean;
  joinedAt?: string;
};

export type JoinRecord = {
  id: string;
  sessionId: string;
  targetVisitId: string;
  sourceVisitId?: string;
  targetTableIds: string[];
  sourceTableIds?: string[];
  movedPartyCardId?: string;
  addedPartyCardId: string;
  joinedAt: string;
  targetTableLabel: string;
  sourceTableLabel?: string;
  targetPreJoinOrderIds: string[];
  sourcePreJoinOrderIds?: string[];
  afterJoinOrderIds: string[];
};

export type OrderSegment = {
  id: string;
  sessionId: string;
  visitId: string;
  label: string;
  tableLabel: string;
  type: "preJoin" | "afterJoin";
  sourceVisitId?: string;
  orderIds: string[];
  createdAt: string;
};

export type TimeAdjustmentLog = {
  id: string;
  visitId: string;
  minutes: number;
  messageKo: string;
  messageEn: string;
  createdAt: string;
};

export type Order = {
  id: string;
  sessionId: string;
  visitId: string;
  segmentId?: string;
  orderNumber: number;
  orderedBy: {
    type: "counter" | "handy";
    name: string;
  };
  orderType: "initial" | "additional" | "modified";
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
};

export type OrderItem = {
  id: string;
  menuItemId: string;
  menuName: string;
  unitPrice: number;
  quantity: number;
  serviceQuantity: number;
  cancelledQuantity: number;
  paidQuantity: number;
};

export type PaymentStatus = "paid" | "cancelled";

export type Payment = {
  id: string;
  sessionId: string;
  visitId: string;
  tableLabel: string;
  segmentId?: string;
  segmentLabel?: string;
  paidAt: string;
  items: PaymentItem[];
  totalAmount: number;
  discountAmount: number;
  status: PaymentStatus;
  isPrepaid: boolean;
};

export type PaymentItem = {
  menuItemId?: string;
  menuName: string;
  unitPrice: number;
  quantity: number;
  amount: number;
  discountAmount?: number;
};

export type StaffDevice = {
  id: string;
  sessionId: string;
  activationCode: string;
  staffName: string;
  deviceName?: string;
  connectedAt: string;
  status: "active" | "kicked";
};

export type SidebarTab =
  | "reservation"
  | "waiting"
  | "reservationSource"
  | "handyDevice";

export type TableEditMode = "idle" | "add" | "move" | "delete" | "number";
