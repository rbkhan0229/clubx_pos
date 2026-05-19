export type KubaInFlightMenuItem = {
  id: string;
  nameKo: string;
  nameEn: string;
  displayName: string;
  price: number;
  category: "food";
  isAvailable: true;
};

// TODO: Replace zero prices after the final on-site food prices are confirmed.
export const KUBA_IN_FLIGHT_MENU_ITEMS: KubaInFlightMenuItem[] = [
  {
    id: "kuba-food-pho",
    nameKo: "쌀국수",
    nameEn: "PHO",
    displayName: "PHO / 쌀국수",
    price: 0,
    category: "food",
    isAvailable: true,
  },
  {
    id: "kuba-food-pan-fried-dumplings",
    nameKo: "야끼교자",
    nameEn: "PAN-FRIED DUMPLINGS",
    displayName: "PAN-FRIED DUMPLINGS / 야끼교자",
    price: 0,
    category: "food",
    isAvailable: true,
  },
  {
    id: "kuba-food-sausage-fries",
    nameKo: "소시지 & 감자튀김",
    nameEn: "SAUSAGE & FRIES",
    displayName: "SAUSAGE & FRIES / 소시지 & 감자튀김",
    price: 0,
    category: "food",
    isAvailable: true,
  },
  {
    id: "kuba-food-tofu-kimchi",
    nameKo: "두부김치",
    nameEn: "TOFU & KIMCHI",
    displayName: "TOFU & KIMCHI / 두부김치",
    price: 0,
    category: "food",
    isAvailable: true,
  },
];
