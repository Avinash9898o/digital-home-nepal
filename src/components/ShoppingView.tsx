import React, { useEffect, useState } from 'react';
import {
  Check,
  Edit2,
  FolderPlus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import { useHome } from '../context/HomeContext';
import {
  CURRENCY_META,
  formatCurrency,
  SHOPPING_CATEGORY_LABELS,
  t,
} from '../i18n/translations';
import { ShoppingCategory, ShoppingItem } from '../types';

const SHOP_CATEGORIES = Object.keys(SHOPPING_CATEGORY_LABELS) as ShoppingCategory[];

export const ShoppingView: React.FC = () => {
  const {
    data,
    addShoppingList,
    updateShoppingList,
    deleteShoppingList,
    addShoppingItem,
    updateShoppingItem,
    toggleShoppingItem,
    deleteShoppingItem,
    clearPurchasedItems,
    requestConfirm,
  } = useHome();

  const lang = data.settings.language;
  const currency = data.settings.currency;
  const currencySymbol = CURRENCY_META[currency].symbol;

  const [selectedListId, setSelectedListId] = useState<string>(
    data.shoppingLists[0]?.id || ''
  );
  const [catFilter, setCatFilter] = useState<'all' | ShoppingCategory>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'purchased'>('all');

  // List Modal State
  const [listModalOpen, setListModalOpen] = useState(false);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [listName, setListName] = useState('');
  const [listBudget, setListBudget] = useState('6000');
  const [listErr, setListErr] = useState('');

  // Item Modal State
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [product, setProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [category, setCategory] = useState<ShoppingCategory>('groceries');
  const [itemErr, setItemErr] = useState('');

  useEffect(() => {
    if (
      data.shoppingLists.length > 0 &&
      !data.shoppingLists.some((l) => l.id === selectedListId)
    ) {
      setSelectedListId(data.shoppingLists[0].id);
    }
  }, [data.shoppingLists, selectedListId]);

  const activeList = data.shoppingLists.find((l) => l.id === selectedListId) || null;

  const totalEstimated = activeList
    ? activeList.items.reduce((s, i) => s + i.estimatedPrice, 0)
    : 0;
  const purchasedTotal = activeList
    ? activeList.items
        .filter((i) => i.purchased)
        .reduce((s, i) => s + i.estimatedPrice, 0)
    : 0;
  const remainingBudget = activeList ? activeList.budget - totalEstimated : 0;
  const purchasedCount = activeList
    ? activeList.items.filter((i) => i.purchased).length
    : 0;

  const filteredItems = activeList
    ? activeList.items.filter((item) => {
        if (catFilter !== 'all' && item.category !== catFilter) return false;
        if (statusFilter === 'pending' && item.purchased) return false;
        if (statusFilter === 'purchased' && !item.purchased) return false;
        return true;
      })
    : [];

  const openCreateListModal = () => {
    setEditingListId(null);
    setListName('');
    setListBudget('6000');
    setListErr('');
    setListModalOpen(true);
  };

  const openEditListModal = () => {
    if (!activeList) return;
    setEditingListId(activeList.id);
    setListName(activeList.name);
    setListBudget(String(activeList.budget));
    setListErr('');
    setListModalOpen(true);
  };

  const handleSaveList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!listName.trim()) {
      setListErr(t(lang, 'कृपया सूचीको नाम लेख्नुहोस्।', 'Please enter a list name.'));
      return;
    }
    const num = Number(listBudget);
    if (Number.isNaN(num) || num < 0) {
      setListErr(t(lang, 'कृपया मान्य बजेट रकम राख्नुहोस्।', 'Please enter a valid budget.'));
      return;
    }
    if (editingListId) {
      updateShoppingList(editingListId, listName.trim(), num);
    } else {
      const newId = addShoppingList(listName.trim(), num);
      setSelectedListId(newId);
    }
    setListModalOpen(false);
  };

  const openAddItemModal = () => {
    setEditingItem(null);
    setProduct('');
    setQuantity(lang === 'ne' ? '१ केजी' : '1 kg');
    setEstimatedPrice('');
    setCategory('groceries');
    setItemErr('');
    setItemModalOpen(true);
  };

  const openEditItemModal = (item: ShoppingItem) => {
    setEditingItem(item);
    setProduct(item.product);
    setQuantity(item.quantity);
    setEstimatedPrice(String(item.estimatedPrice));
    setCategory(item.category);
    setItemErr('');
    setItemModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeList) return;
    if (!product.trim()) {
      setItemErr(t(lang, 'कृपया सामानको नाम लेख्नुहोस्।', 'Please enter product name.'));
      return;
    }
    const price = Number(estimatedPrice || '0');
    if (Number.isNaN(price) || price < 0) {
      setItemErr(t(lang, 'कृपया मान्य अनुमानित मूल्य राख्नुहोस्।', 'Please enter a valid price.'));
      return;
    }

    const payload = {
      product: product.trim(),
      quantity: quantity.trim() || '1',
      estimatedPrice: price,
      category,
      purchased: editingItem ? editingItem.purchased : false,
    };

    if (editingItem) {
      updateShoppingItem(activeList.id, editingItem.id, payload);
    } else {
      addShoppingItem(activeList.id, payload);
    }
    setItemModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {t(lang, 'स्मार्ट किनमेल सूची', 'Smart Shopping Lists')}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t(
              lang,
              'भान्सा रासन, तरकारी र चाडपर्वका सामानहरूको अनुमानित बजेटसहितको सूची',
              'Organize multiple shopping lists, track estimated prices, and monitor remaining shopping budget'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={openCreateListModal}
            className="min-h-[42px] px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
            <span>{t(lang, 'नयाँ सूची बनाउनुहोस्', 'New List')}</span>
          </button>
          {activeList && (
            <button
              type="button"
              onClick={openAddItemModal}
              className="min-h-[42px] px-4 py-2 rounded-lg bg-slate-900 dark:bg-emerald-600 hover:opacity-90 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t(lang, 'सामान थप्नुहोस्', 'Add Item')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Shopping Lists Selector Tabs */}
      {data.shoppingLists.length === 0 ? (
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
          <ShoppingBag className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {t(lang, 'कुनै किनमेल सूची छैन', 'No Shopping Lists Yet')}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {t(
              lang,
              'भान्सा वा बजार किनमेलका लागि पहिलो सूची तयार गर्नुहोस्।',
              'Create your first list for weekly groceries or festival preparations.'
            )}
          </p>
          <button
            type="button"
            onClick={openCreateListModal}
            className="min-h-[42px] px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold cursor-pointer"
          >
            {t(lang, 'पहिलो सूची बनाउनुहोस्', 'Create First List')}
          </button>
        </section>
      ) : (
        <>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {data.shoppingLists.map((list) => {
              const isSelected = list.id === activeList?.id;
              const unpurchased = list.items.filter((i) => !i.purchased).length;
              return (
                <button
                  key={list.id}
                  type="button"
                  onClick={() => setSelectedListId(list.id)}
                  className={`min-h-[42px] px-4 py-2 rounded-xl border text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 dark:bg-emerald-600 dark:border-emerald-600'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-stone-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{list.name}</span>
                  <span className="font-mono text-xs opacity-75 tabular-nums">
                    ({unpurchased})
                  </span>
                </button>
              );
            })}
          </div>

          {activeList && (
            <>
              {/* Active List Budget Overview */}
              <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {activeList.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                      {purchasedCount}/{activeList.items.length}{' '}
                      {t(lang, 'सामान किनिसकियो', 'items purchased')} ·{' '}
                      {t(lang, 'खरिद रकम:', 'Purchased:')} {formatCurrency(purchasedTotal, currency)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={openEditListModal}
                      className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-stone-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>{t(lang, 'बजेट / नाम सम्पादन', 'Edit Budget')}</span>
                    </button>
                    {purchasedCount > 0 && (
                      <button
                        type="button"
                        onClick={() => clearPurchasedItems(activeList.id)}
                        className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-stone-50 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        {t(lang, 'किनिएका हटाउनुहोस्', 'Clear Purchased')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        requestConfirm({
                          title: t(lang, 'यो किनमेल सूची हटाउने हो?', 'Delete Shopping List?'),
                          message: `"${activeList.name}" ${t(
                            lang,
                            'र यसभित्रका सबै सामान हटाइनेछन्।',
                            'and all items inside it will be deleted.'
                          )}`,
                          confirmLabel: t(lang, 'सूची हटाउनुहोस्', 'Delete List'),
                          danger: true,
                          onConfirm: () => deleteShoppingList(activeList.id),
                        })
                      }
                      aria-label="Delete Shopping List"
                      className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {t(lang, 'तोकिएको किनमेल बजेट', 'Shopping Budget')}
                    </div>
                    <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                      {formatCurrency(activeList.budget, currency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {t(lang, 'अनुमानित जम्मा मूल्य', 'Estimated Total')}
                    </div>
                    <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                      {formatCurrency(totalEstimated, currency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {remainingBudget >= 0
                        ? t(lang, 'बाँकी किनमेल बजेट', 'Remaining Shopping Budget')
                        : t(lang, 'बजेट नाघेको रकम', 'Over Shopping Budget')}
                    </div>
                    <div
                      className={`text-xl font-bold font-mono tabular-nums mt-0.5 ${
                        remainingBudget >= 0
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {formatCurrency(Math.abs(remainingBudget), currency)}
                    </div>
                  </div>
                </div>
              </section>

              {/* Items Filter & Checklist */}
              <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                    {(['all', 'pending', 'purchased'] as const).map((sf) => (
                      <button
                        key={sf}
                        type="button"
                        onClick={() => setStatusFilter(sf)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                          statusFilter === sf
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {sf === 'all' && t(lang, 'सबै सामान', 'All Items')}
                        {sf === 'pending' && t(lang, 'किन्न बाँकी', 'To Buy')}
                        {sf === 'purchased' && t(lang, 'किनिसकेको', 'Purchased')}
                      </button>
                    ))}
                  </div>

                  <select
                    value={catFilter}
                    onChange={(e) => setCatFilter(e.target.value as 'all' | ShoppingCategory)}
                    className="h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200"
                  >
                    <option value="all">{t(lang, 'सबै समूह', 'All Categories')}</option>
                    {SHOP_CATEGORIES.map((sc) => (
                      <option key={sc} value={sc}>
                        {SHOPPING_CATEGORY_LABELS[sc][lang]}
                      </option>
                    ))}
                  </select>
                </div>

                {filteredItems.length === 0 ? (
                  <div className="py-10 text-center space-y-2">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {t(
                        lang,
                        'यस सूचीमा कुनै सामान छैन।',
                        'No items in this view.'
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={openAddItemModal}
                      className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      {t(lang, '+ सामान थप्नुहोस्', '+ Add Shopping Item')}
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredItems.map((item) => (
                      <div
                        key={item.id}
                        className="py-3.5 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => toggleShoppingItem(activeList.id, item.id)}
                            aria-label={t(lang, 'खरिद स्थिति बदल्नुहोस्', 'Toggle purchased')}
                            className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                              item.purchased
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-slate-300 dark:border-slate-600 hover:border-emerald-600'
                            }`}
                          >
                            {item.purchased && <Check className="w-4 h-4" />}
                          </button>

                          <div className="min-w-0">
                            <div
                              className={`text-sm font-semibold truncate ${
                                item.purchased
                                  ? 'line-through text-slate-400 dark:text-slate-500'
                                  : 'text-slate-900 dark:text-white'
                              }`}
                            >
                              {item.product}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {item.quantity} · {SHOPPING_CATEGORY_LABELS[item.category][lang]}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-sm font-mono font-semibold tabular-nums ${
                              item.purchased
                                ? 'text-slate-400 dark:text-slate-500'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {formatCurrency(item.estimatedPrice, currency)}
                          </span>

                          <button
                            type="button"
                            onClick={() => openEditItemModal(item)}
                            aria-label="Edit item"
                            className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteShoppingItem(activeList.id, item.id)}
                            aria-label="Delete item"
                            className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </>
      )}

      {/* Create / Edit List Modal */}
      {listModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingListId
                  ? t(lang, 'किनमेल सूची सम्पादन', 'Edit Shopping List')
                  : t(lang, 'नयाँ किनमेल सूची', 'Create Shopping List')}
              </h3>
              <button
                type="button"
                onClick={() => setListModalOpen(false)}
                className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveList} className="p-6 space-y-4">
              {listErr && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                  {listErr}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t(lang, 'सूचीको नाम *', 'List Name *')}
                </label>
                <input
                  type="text"
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  placeholder={t(
                    lang,
                    'उदा: मासिक रासन / चाडपर्व किनमेल',
                    'e.g., Monthly Groceries'
                  )}
                  className="w-full h-11 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t(lang, `किनमेल बजेट (${currencySymbol})`, `Target Budget (${currencySymbol})`)}
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={listBudget}
                  onChange={(e) => setListBudget(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tabular-nums text-slate-900 dark:text-white"
                />
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setListModalOpen(false)}
                  className="min-h-[42px] px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  {t(lang, 'रद्द', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="min-h-[42px] px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-sm font-semibold text-white cursor-pointer"
                >
                  {t(lang, 'सुरक्षित गर्नुहोस्', 'Save List')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Item Modal */}
      {itemModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingItem
                  ? t(lang, 'सामान सम्पादन गर्नुहोस्', 'Edit Shopping Item')
                  : t(lang, 'नयाँ सामान थप्नुहोस्', 'Add Shopping Item')}
              </h3>
              <button
                type="button"
                onClick={() => setItemModalOpen(false)}
                className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveItem} className="p-6 space-y-4">
              {itemErr && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                  {itemErr}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t(lang, 'सामानको नाम *', 'Product Name *')}
                </label>
                <input
                  type="text"
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  placeholder={t(lang, 'उदा: तोरीको तेल / चामल', 'e.g., Mustard Oil / Rice')}
                  className="w-full h-11 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t(lang, 'परिमाण', 'Quantity')}
                  </label>
                  <input
                    type="text"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder={t(lang, 'उदा: २ लिटर', 'e.g., 2 Liters')}
                    className="w-full h-11 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t(lang, `अनुमानित मूल्य (${currencySymbol})`, `Est. Price (${currencySymbol})`)}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={estimatedPrice}
                    onChange={(e) => setEstimatedPrice(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tabular-nums text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t(lang, 'समूह (Category)', 'Category')}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ShoppingCategory)}
                  className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                >
                  {SHOP_CATEGORIES.map((sc) => (
                    <option key={sc} value={sc}>
                      {SHOPPING_CATEGORY_LABELS[sc][lang]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setItemModalOpen(false)}
                  className="min-h-[42px] px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  {t(lang, 'रद्द', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="min-h-[42px] px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-sm font-semibold text-white cursor-pointer"
                >
                  {t(lang, 'सुरक्षित गर्नुहोस्', 'Save Item')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
