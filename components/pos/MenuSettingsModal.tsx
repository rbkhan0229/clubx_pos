"use client";

import { useEffect, useMemo, useState } from "react";
import { Lock, LockOpen, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { useAppStore } from "@/stores/useAppStore";
import { useMenuStore } from "@/stores/useMenuStore";
import type { MenuCategory, MenuItem } from "@/types";

type MenuSettingsModalProps = {
  open: boolean;
  sessionId: string;
  onClose: () => void;
};

const EMPTY_CATEGORIES: MenuCategory[] = [];
const EMPTY_ITEMS: MenuItem[] = [];

export function MenuSettingsModal({ open, sessionId, onClose }: MenuSettingsModalProps) {
  const language = useAppStore((state) => state.language);
  const t = getDictionary(language);
  const loadMenu = useMenuStore((state) => state.loadMenu);
  const categories = useMenuStore((state) => state.categoriesBySession[sessionId] ?? EMPTY_CATEGORIES);
  const items = useMenuStore((state) => state.itemsBySession[sessionId] ?? EMPTY_ITEMS);
  const locked = useMenuStore((state) => state.lockedBySession[sessionId] ?? true);
  const setMenuLocked = useMenuStore((state) => state.setMenuLocked);
  const addCategory = useMenuStore((state) => state.addCategory);
  const updateCategory = useMenuStore((state) => state.updateCategory);
  const deleteCategory = useMenuStore((state) => state.deleteCategory);
  const addMenuItem = useMenuStore((state) => state.addMenuItem);
  const updateMenuItem = useMenuStore((state) => state.updateMenuItem);
  const deleteMenuItem = useMenuStore((state) => state.deleteMenuItem);
  const validateMenuItemPrice = useMenuStore((state) => state.validateMenuItemPrice);
  const orderedCategories = useMemo(
    () => [...categories].sort((a, b) => a.order - b.order),
    [categories],
  );
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [unlockConfirmOpen, setUnlockConfirmOpen] = useState(false);

  useEffect(() => {
    if (open) loadMenu(sessionId);
  }, [loadMenu, open, sessionId]);

  useEffect(() => {
    if (!activeCategoryId && orderedCategories[0]) {
      setActiveCategoryId(orderedCategories[0].id);
    }
    if (
      activeCategoryId &&
      orderedCategories.length > 0 &&
      !orderedCategories.some((category) => category.id === activeCategoryId)
    ) {
      setActiveCategoryId(orderedCategories[0].id);
    }
  }, [activeCategoryId, orderedCategories]);

  const activeItems = items.filter((item) => item.categoryId === activeCategoryId);

  return (
    <Modal
      bodyClassName="flex-1 overflow-hidden"
      className="h-[94vh] max-h-[94vh] w-[calc(100vw-24px)] max-w-none p-6"
      onClose={onClose}
      open={open}
      title={t.menuSettings}
    >
      <div className="grid h-full gap-5 overflow-y-auto pr-1">
        <section className="grid gap-3">
          <div className="flex justify-end">
            <Button
              icon={locked ? <Lock size={17} /> : <LockOpen size={17} />}
              onClick={() => (locked ? setUnlockConfirmOpen(true) : setMenuLocked(sessionId, true))}
              variant="secondary"
            >
              {locked ? t.locked : t.unlocked}
            </Button>
          </div>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-black">{t.categories}</h3>
            <Button
              className="min-h-0 px-4 py-2"
              disabled={locked}
              icon={<Plus size={17} />}
              onClick={() => {
                const category = addCategory(sessionId, "");
                setActiveCategoryId(category.id);
              }}
            >
              {t.addCategory}
            </Button>
          </div>

          {orderedCategories.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-600">
              {t.noCategories}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {orderedCategories.map((category) => (
                <button
                  className={`rounded-2xl px-4 py-2 text-sm font-black transition ${
                    activeCategoryId === category.id
                      ? "bg-club-acid text-club-black"
                      : "bg-slate-100 text-slate-700 hover:bg-lime-50"
                  }`}
                  key={category.id}
                  onClick={() => setActiveCategoryId(category.id)}
                  type="button"
                >
                  {category.nameKo || t.categoryName}
                </button>
              ))}
            </div>
          )}
        </section>

        {activeCategoryId ? (
          <section className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            {orderedCategories
              .filter((category) => category.id === activeCategoryId)
              .map((category) => (
                <div className="grid gap-3" key={category.id}>
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <label className="grid gap-2 text-sm font-bold text-slate-600">
                      {t.categoryName}
                      <input
                        className="touch-target rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-club-green"
                        disabled={locked}
                        onChange={(event) =>
                          updateCategory(category.id, { nameKo: event.target.value })
                        }
                        value={category.nameKo}
                      />
                    </label>
                    <Button
                      className="self-end"
                      disabled={locked}
                      icon={<Trash2 size={17} />}
                      onClick={() => deleteCategory(category.id)}
                      variant="danger"
                    >
                      {t.delete}
                    </Button>
                  </div>
                  {!category.nameKo.trim() ? (
                    <p className="text-sm font-bold text-club-red">
                      {t.validationRequiredName}
                    </p>
                  ) : null}
                </div>
              ))}

            <div className="mt-2 flex items-center justify-between gap-3">
              <h3 className="text-base font-black">{t.menuItems}</h3>
              <Button
                className="min-h-0 px-4 py-2"
                disabled={locked}
                icon={<Plus size={17} />}
                onClick={() => addMenuItem(sessionId, activeCategoryId)}
              >
                {t.addMenuItem}
              </Button>
            </div>

            {activeItems.length === 0 ? (
              <p className="rounded-2xl bg-white p-4 text-sm font-bold text-slate-600">
                {t.noMenuItems}
              </p>
            ) : (
              <div className="grid gap-3">
                {activeItems.map((item) => {
                  const nameInvalid = !item.nameKo.trim();
                  const priceInvalid = !validateMenuItemPrice(item.price);

                  return (
                    <div
                      className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3"
                      key={item.id}
                    >
                      <div className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
                        <label className="grid gap-2 text-sm font-bold text-slate-600">
                          {t.menuName}
                          <input
                            className="touch-target rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-club-green"
                            disabled={locked}
                            onChange={(event) =>
                              updateMenuItem(item.id, { nameKo: event.target.value })
                            }
                            value={item.nameKo}
                          />
                        </label>
                        <label className="grid gap-2 text-sm font-bold text-slate-600">
                          {t.price}
                          <input
                            className="touch-target rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-club-green"
                            disabled={locked}
                            min={0}
                            onChange={(event) =>
                              updateMenuItem(item.id, {
                                price: Number(event.target.value),
                              })
                            }
                            type="number"
                            value={item.price || ""}
                          />
                        </label>
                        <Button
                          className="self-end"
                          disabled={locked}
                          icon={<Trash2 size={17} />}
                          onClick={() => deleteMenuItem(item.id)}
                          variant="secondary"
                        >
                          {t.delete}
                        </Button>
                      </div>
                      {nameInvalid ? (
                        <p className="text-sm font-bold text-club-red">
                          {t.validationRequiredName}
                        </p>
                      ) : null}
                      {priceInvalid ? (
                        <p className="text-sm font-bold text-club-red">
                          {t.validationPositivePrice}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : null}
      </div>
      <Modal
        onClose={() => setUnlockConfirmOpen(false)}
        open={unlockConfirmOpen}
        title={t.unlockMenuSettings}
      >
        <div className="grid gap-4">
          <p className="text-sm font-bold text-slate-600">{t.unlockMenuSettingsPrompt}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button onClick={() => setUnlockConfirmOpen(false)} variant="secondary">
              {t.cancel}
            </Button>
            <Button
              onClick={() => {
                setMenuLocked(sessionId, false);
                setUnlockConfirmOpen(false);
              }}
            >
              {t.unlock}
            </Button>
          </div>
        </div>
      </Modal>
    </Modal>
  );
}
