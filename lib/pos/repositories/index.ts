import { localPosRepositories } from "@/lib/pos/repositories/local";
import { serverPosRepositories } from "@/lib/pos/repositories/server";
import type { PosRepositories, PosRepositoryMode } from "@/lib/pos/repositories/types";

export type { PosRepositories, PosRepositoryMode } from "@/lib/pos/repositories/types";
export type {
  PosDevicesRepository,
  PosMenuRepository,
  PosMergeGroupsRepository,
  PosOrdersRepository,
  PosPartyCardsRepository,
  PosPaymentsRepository,
  PosQrFallbackRepository,
  PosSessionsRepository,
  PosTablesRepository,
  PosTimeLogsRepository,
  PosVisitsRepository,
} from "@/lib/pos/repositories/types";

export function getPosRepositoryMode(): PosRepositoryMode {
  const mode = process.env.NEXT_PUBLIC_POS_DATA_MODE;
  return mode === "server" ? "server" : "local";
}

export function getPosRepositories(): PosRepositories {
  return getPosRepositoryMode() === "server" ? serverPosRepositories : localPosRepositories;
}
