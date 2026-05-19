import type {
  BusinessSession,
  MenuCategory,
  MenuItem,
  Order,
  PartyCard,
  Payment,
  StaffDevice,
  Table,
  TableMergeGroup,
  TimeAdjustmentLog,
  Visit,
} from "@/types";
import type {
  PosBusinessSessionCreateDto,
  PosBusinessSessionUpdateDto,
  PosLocalMenuSnapshot,
  PosOrderCreateDto,
  PosOrderUpdateDto,
  PosPartyCardCreateDto,
  PosPartyCardUpdateDto,
  PosPaymentCreateDto,
  PosQrOrderRegistrationCreateDto,
  PosQrOrderRegistrationDto,
  PosStaffDeviceCreateDto,
  PosTableCreateDto,
  PosTableMergeGroupCreateDto,
  PosTableUpdateDto,
  PosVisitCreateDto,
  PosVisitUpdateDto,
} from "@/types/posApi";

export type PosRepositoryMode = "local" | "server";

export type PosSessionsRepository = {
  list(): Promise<BusinessSession[]>;
  create(payload: PosBusinessSessionCreateDto): Promise<BusinessSession>;
  get(sessionId: string): Promise<BusinessSession | null>;
  update(sessionId: string, payload: PosBusinessSessionUpdateDto): Promise<BusinessSession>;
  close(sessionId: string): Promise<BusinessSession>;
};

export type PosTablesRepository = {
  list(sessionId: string): Promise<Table[]>;
  create(sessionId: string, payload: PosTableCreateDto): Promise<Table>;
  update(tableId: string, payload: PosTableUpdateDto): Promise<Table>;
  delete(tableId: string): Promise<void>;
};

export type PosMergeGroupsRepository = {
  list(sessionId: string): Promise<TableMergeGroup[]>;
  create(sessionId: string, payload: PosTableMergeGroupCreateDto): Promise<TableMergeGroup>;
  split(groupId: string): Promise<void>;
};

export type PosMenuRepository = {
  getSnapshot(sessionId: string): Promise<PosLocalMenuSnapshot>;
  saveSnapshot(sessionId: string, snapshot: PosLocalMenuSnapshot): Promise<PosLocalMenuSnapshot>;
  listCategories(sessionId: string): Promise<MenuCategory[]>;
  listItems(sessionId: string): Promise<MenuItem[]>;
};

export type PosPartyCardsRepository = {
  list(sessionId: string): Promise<PartyCard[]>;
  create(sessionId: string, payload: PosPartyCardCreateDto): Promise<PartyCard>;
  update(partyCardId: string, payload: PosPartyCardUpdateDto): Promise<PartyCard>;
};

export type PosVisitsRepository = {
  list(sessionId: string): Promise<Visit[]>;
  create(sessionId: string, payload: PosVisitCreateDto): Promise<Visit>;
  update(visitId: string, payload: PosVisitUpdateDto): Promise<Visit>;
};

export type PosOrdersRepository = {
  list(sessionId: string): Promise<Order[]>;
  create(sessionId: string, payload: PosOrderCreateDto): Promise<Order>;
  update(orderId: string, payload: PosOrderUpdateDto): Promise<Order>;
};

export type PosPaymentsRepository = {
  list(sessionId: string): Promise<Payment[]>;
  create(sessionId: string, payload: PosPaymentCreateDto): Promise<Payment>;
  cancel(paymentId: string): Promise<Payment>;
  restore(paymentId: string): Promise<Payment>;
};

export type PosDevicesRepository = {
  list(sessionId: string): Promise<StaffDevice[]>;
  create(sessionId: string, payload: PosStaffDeviceCreateDto): Promise<StaffDevice>;
  delete(deviceId: string): Promise<void>;
};

export type PosQrFallbackRepository = {
  createRegistration(
    sessionId: string,
    payload: PosQrOrderRegistrationCreateDto,
  ): Promise<PosQrOrderRegistrationDto>;
  listRegisteredKeys(sessionId: string): Promise<string[]>;
};

export type PosTimeLogsRepository = {
  listByVisit(visitId: string): Promise<TimeAdjustmentLog[]>;
  listBySession(sessionId: string): Promise<Record<string, TimeAdjustmentLog[]>>;
};

export type PosRepositories = {
  sessions: PosSessionsRepository;
  tables: PosTablesRepository;
  mergeGroups: PosMergeGroupsRepository;
  menu: PosMenuRepository;
  partyCards: PosPartyCardsRepository;
  visits: PosVisitsRepository;
  orders: PosOrdersRepository;
  payments: PosPaymentsRepository;
  devices: PosDevicesRepository;
  qrFallback: PosQrFallbackRepository;
  timeLogs: PosTimeLogsRepository;
};
