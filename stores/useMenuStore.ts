"use client";

import { create } from "zustand";
import type { MenuCategory, MenuItem } from "@/types";

type MenuState = {
  categoriesBySession: Record<string, MenuCategory[]>;
  itemsBySession: Record<string, MenuItem[]>;
  loadMenu: (sessionId: string) => void;
  addCategory: (sessionId: string, nameKo?: string) => MenuCategory;
  updateCategory: (categoryId: string, updates: Partial<MenuCategory>) => void;
  deleteCategory: (categoryId: string) => void;
  reorderCategory: (sessionId: string, categoryId: string, direction: "up" | "down") => void;
  addMenuItem: (sessionId: string, categoryId: string) => MenuItem;
  updateMenuItem: (itemId: string, updates: Partial<MenuItem>) => void;
  deleteMenuItem: (itemId: string) => void;
  getItemsByCategory: (sessionId: string, categoryId: string) => MenuItem[];
  validateMenuItemPrice: (price: number) => boolean;
};

const categoriesKey = (sessionId: string) => `clubx-pos:menu-categories:${sessionId}`;
const itemsKey = (sessionId: string) => `clubx-pos:menu-items:${sessionId}`;

function saveMenu(sessionId: string, categories: MenuCategory[], items: MenuItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(categoriesKey(sessionId), JSON.stringify(categories));
  window.localStorage.setItem(itemsKey(sessionId), JSON.stringify(items));
}

function findSessionForCategory(
  categoriesBySession: Record<string, MenuCategory[]>,
  categoryId: string,
) {
  return Object.keys(categoriesBySession).find((sessionId) =>
    categoriesBySession[sessionId].some((category) => category.id === categoryId),
  );
}

function findSessionForItem(itemsBySession: Record<string, MenuItem[]>, itemId: string) {
  return Object.keys(itemsBySession).find((sessionId) =>
    itemsBySession[sessionId].some((item) => item.id === itemId),
  );
}

export const useMenuStore = create<MenuState>((set, get) => ({
  categoriesBySession: {},
  itemsBySession: {},
  loadMenu: (sessionId) => {
    if (typeof window === "undefined") return;

    const rawCategories = window.localStorage.getItem(categoriesKey(sessionId));
    const rawItems = window.localStorage.getItem(itemsKey(sessionId));
    set((state) => ({
      categoriesBySession: {
        ...state.categoriesBySession,
        [sessionId]: rawCategories ? (JSON.parse(rawCategories) as MenuCategory[]) : [],
      },
      itemsBySession: {
        ...state.itemsBySession,
        [sessionId]: rawItems ? (JSON.parse(rawItems) as MenuItem[]) : [],
      },
    }));
  },
  addCategory: (sessionId, nameKo = "") => {
    const current = get().categoriesBySession[sessionId] ?? [];
    const category: MenuCategory = {
      id: `cat-${sessionId}-${Date.now()}`,
      sessionId,
      nameKo,
      order: current.length,
    };
    const nextCategories = [...current, category];
    const items = get().itemsBySession[sessionId] ?? [];
    saveMenu(sessionId, nextCategories, items);
    set((state) => ({
      categoriesBySession: {
        ...state.categoriesBySession,
        [sessionId]: nextCategories,
      },
    }));
    return category;
  },
  updateCategory: (categoryId, updates) => {
    const state = get();
    const sessionId = findSessionForCategory(state.categoriesBySession, categoryId);
    if (!sessionId) return;

    const nextCategories = state.categoriesBySession[sessionId].map((category) =>
      category.id === categoryId ? { ...category, ...updates } : category,
    );
    const items = state.itemsBySession[sessionId] ?? [];
    saveMenu(sessionId, nextCategories, items);
    set((current) => ({
      categoriesBySession: {
        ...current.categoriesBySession,
        [sessionId]: nextCategories,
      },
    }));
  },
  deleteCategory: (categoryId) => {
    const state = get();
    const sessionId = findSessionForCategory(state.categoriesBySession, categoryId);
    if (!sessionId) return;

    const nextCategories = state.categoriesBySession[sessionId]
      .filter((category) => category.id !== categoryId)
      .map((category, order) => ({ ...category, order }));
    const nextItems = (state.itemsBySession[sessionId] ?? []).filter(
      (item) => item.categoryId !== categoryId,
    );
    saveMenu(sessionId, nextCategories, nextItems);
    set((current) => ({
      categoriesBySession: {
        ...current.categoriesBySession,
        [sessionId]: nextCategories,
      },
      itemsBySession: {
        ...current.itemsBySession,
        [sessionId]: nextItems,
      },
    }));
  },
  reorderCategory: (sessionId, categoryId, direction) => {
    const categories = [...(get().categoriesBySession[sessionId] ?? [])].sort(
      (a, b) => a.order - b.order,
    );
    const index = categories.findIndex((category) => category.id === categoryId);
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || nextIndex < 0 || nextIndex >= categories.length) return;

    [categories[index], categories[nextIndex]] = [categories[nextIndex], categories[index]];
    const nextCategories = categories.map((category, order) => ({ ...category, order }));
    const items = get().itemsBySession[sessionId] ?? [];
    saveMenu(sessionId, nextCategories, items);
    set((state) => ({
      categoriesBySession: {
        ...state.categoriesBySession,
        [sessionId]: nextCategories,
      },
    }));
  },
  addMenuItem: (sessionId, categoryId) => {
    const current = get().itemsBySession[sessionId] ?? [];
    const item: MenuItem = {
      id: `item-${sessionId}-${Date.now()}`,
      sessionId,
      categoryId,
      nameKo: "",
      price: 0,
      isActive: true,
    };
    const nextItems = [...current, item];
    const categories = get().categoriesBySession[sessionId] ?? [];
    saveMenu(sessionId, categories, nextItems);
    set((state) => ({
      itemsBySession: {
        ...state.itemsBySession,
        [sessionId]: nextItems,
      },
    }));
    return item;
  },
  updateMenuItem: (itemId, updates) => {
    const state = get();
    const sessionId = findSessionForItem(state.itemsBySession, itemId);
    if (!sessionId) return;

    const nextItems = state.itemsBySession[sessionId].map((item) =>
      item.id === itemId ? { ...item, ...updates } : item,
    );
    const categories = state.categoriesBySession[sessionId] ?? [];
    saveMenu(sessionId, categories, nextItems);
    set((current) => ({
      itemsBySession: {
        ...current.itemsBySession,
        [sessionId]: nextItems,
      },
    }));
  },
  deleteMenuItem: (itemId) => {
    const state = get();
    const sessionId = findSessionForItem(state.itemsBySession, itemId);
    if (!sessionId) return;

    const nextItems = state.itemsBySession[sessionId].filter((item) => item.id !== itemId);
    const categories = state.categoriesBySession[sessionId] ?? [];
    saveMenu(sessionId, categories, nextItems);
    set((current) => ({
      itemsBySession: {
        ...current.itemsBySession,
        [sessionId]: nextItems,
      },
    }));
  },
  getItemsByCategory: (sessionId, categoryId) =>
    (get().itemsBySession[sessionId] ?? []).filter(
      (item) => item.categoryId === categoryId && item.isActive,
    ),
  validateMenuItemPrice: (price) => Number.isFinite(price) && price > 0,
}));
