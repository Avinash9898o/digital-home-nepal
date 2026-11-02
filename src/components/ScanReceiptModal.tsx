import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  Camera,
  CheckCircle2,
  ImagePlus,
  Loader2,
  RefreshCw,
  RotateCcw,
  ScanLine,
  SwitchCamera,
  X,
} from 'lucide-react';
import { useHome } from '../context/HomeContext';
import {
  CURRENCY_META,
  FINANCE_CATEGORY_LABELS,
  formatCurrency,
  formatMonthYear,
  getTodayISO,
  PAYMENT_METHOD_LABELS,
  t,
} from '../i18n/translations';
import { FinanceCategory, FinanceType, PaymentMethod } from '../types';

const ALL_CATEGORIES = Object.keys(FINANCE_CATEGORY_LABELS) as FinanceCategory[];
const ALL_PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];

interface ScannedLineItem {
  name: string;
  amount: number;
}

interface ScanReceiptResponse {
  isReadableReceipt: boolean;
  summary: string;
  merchant: string;
  title: string;
  totalAmount: number;
  type: string;
  category: string;
  date: string;
  paymentMethod: string;
  note: string;
  lineItems?: ScannedLineItem[];
}

interface ScanReceiptModalProps {
  open: boolean;
  onClose: () => void;
}

export const ScanReceiptModal: React.FC<ScanReceiptModalProps> = ({ open, onClose }) => {
  const { data, addFinance } = useHome();

  const lang = data.settings.language;
  const currency = data.settings.currency;
  const currencySymbol = CURRENCY_META[currency].symbol;
  const monthlyBudget = data.settings.monthlyBudget;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Camera & capture state
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);

  // AI parsing state
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanSummary, setScanSummary] = useState('');
  const [lineItems, setLineItems] = useState<ScannedLineItem[]>([]);

  // Editable FinanceRecord fields populated from receipt scan
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<FinanceType>('expense');
  const [category, setCategory] = useState<FinanceCategory>('Food');
  const [date, setDate] = useState(getTodayISO());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [note, setNote] = useState('');
  const [formErr, setFormErr] = useState('');

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  const startCameraStream = useCallback(
    async (preferredFacing: 'environment' | 'user') => {
      stopCameraStream();
      setCameraError('');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          t(
            lang,
            'यस ब्राउजरमा प्रत्यक्ष क्यामेरा उपलब्ध छैन। तलबाट रसिदको फोटो अपलोड गर्नुहोस्।',
            'Live camera access is unavailable in this browser. Please upload a receipt photo below.'
          )
        );
        return;
      }

      setCameraStarting(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: preferredFacing },
            width: { ideal: 1600 },
            height: { ideal: 1200 },
          },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {
            // Autoplay handled by muted + playsInline
          });
        }
        setCameraActive(true);
      } catch (err) {
        const errName = err instanceof DOMException ? err.name : '';
        if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
          setCameraError(
            t(
              lang,
              'क्यामेरा अनुमति अस्वीकृत भयो। ब्राउजरमा क्यामेरा अनुमति दिनुहोस् वा तलबाट रसिदको फोटो छान्नुहोस्।',
              'Camera permission was denied. Allow camera access in your browser or choose a receipt photo below.'
            )
          );
        } else {
          setCameraError(
            t(
              lang,
              'क्यामेरा खोल्न सकिएन। कृपया तलबाट रसिद वा बिलको फोटो छान्नुहोस्।',
              'Could not start camera on this device. Please select a receipt photo below.'
            )
          );
        }
      } finally {
        setCameraStarting(false);
      }
    },
    [lang, stopCameraStream]
  );

  // Initialize & clean up when modal opens/closes
  useEffect(() => {
    if (open) {
      setCapturedDataUrl(null);
      setScanError('');
      setScanSummary('');
      setLineItems([]);
      setTitle('');
      setAmount('');
      setType('expense');
      setCategory('Food');
      setDate(getTodayISO());
      setPaymentMethod('Cash');
      setNote('');
      setFormErr('');
      startCameraStream('environment');
    } else {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [open, startCameraStream, stopCameraStream]);

  const parseReceiptImage = async (dataUrl: string) => {
    setScanning(true);
    setScanError('');
    setScanSummary('');
    setFormErr('');

    try {
      const mimeMatch = dataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

      const res = await fetch('/api/ai/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: dataUrl,
          mimeType,
          language: lang,
          todayISO: getTodayISO(),
          currency,
        }),
      });

      const json = (await res.json()) as ScanReceiptResponse & { error?: string };
      if (!res.ok) {
        throw new Error(
          json.error ||
            t(lang, 'रसिद विश्लेषण गर्न सकिएन।', 'Failed to parse receipt image.')
        );
      }

      if (!json.isReadableReceipt) {
        setScanError(
          json.summary ||
            t(
              lang,
              'फोटोमा स्पष्ट बिल वा रसिद भेटिएन। कृपया प्रष्ट फोटो खिच्नुहोस् वा विवरण आफैँ भर्नुहोस्।',
              'No clear receipt or bill was detected in the photo. Retake a clearer shot or fill in the details below.'
            )
        );
        return;
      }

      const safeType: FinanceType = json.type === 'income' ? 'income' : 'expense';
      const safeCategory: FinanceCategory = ALL_CATEGORIES.includes(
        json.category as FinanceCategory
      )
        ? (json.category as FinanceCategory)
        : safeType === 'income'
          ? 'Salary'
          : 'Shopping';

      const safeMethod: PaymentMethod = ALL_PAYMENT_METHODS.includes(
        json.paymentMethod as PaymentMethod
      )
        ? (json.paymentMethod as PaymentMethod)
        : 'Cash';

      const safeDate =
        typeof json.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(json.date)
          ? json.date
          : getTodayISO();

      setTitle((json.title || json.merchant || '').trim());
      setAmount(json.totalAmount > 0 ? String(json.totalAmount) : '');
      setType(safeType);
      setCategory(safeCategory);
      setDate(safeDate);
      setPaymentMethod(safeMethod);
      setNote((json.note || '').trim());
      setScanSummary(json.summary || '');
      setLineItems(
        Array.isArray(json.lineItems)
          ? json.lineItems.filter((li) => li && li.name && Number(li.amount) >= 0)
          : []
      );
    } catch (err) {
      setScanError(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
    }
  };

  const handleCaptureFrame = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;

    const maxSide = 1440;
    const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    stopCameraStream();
    setCapturedDataUrl(dataUrl);
    parseReceiptImage(dataUrl);
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const rawUrl = String(reader.result || '');
      const img = new Image();
      img.onload = () => {
        const maxSide = 1440;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressedUrl = canvas.toDataURL('image/jpeg', 0.85);
          stopCameraStream();
          setCapturedDataUrl(compressedUrl);
          parseReceiptImage(compressedUrl);
        } else {
          stopCameraStream();
          setCapturedDataUrl(rawUrl);
          parseReceiptImage(rawUrl);
        }
      };
      img.onerror = () => {
        setScanError(
          t(lang, 'चुनिएको फाइल पढ्न सकिएन।', 'Could not read the selected image file.')
        );
      };
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSwitchCamera = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    startCameraStream(next);
  };

  const handleRetake = () => {
    setCapturedDataUrl(null);
    setScanError('');
    setScanSummary('');
    setLineItems([]);
    setFormErr('');
    startCameraStream(facingMode);
  };

  // Live >80% Monthly Budget Warning Projection
  const modalProjection = useMemo(() => {
    if (type !== 'expense' || monthlyBudget <= 0) return null;
    const entered = Number(amount);
    if (!amount || Number.isNaN(entered) || entered <= 0) return null;
    const targetYm = (date || getTodayISO()).slice(0, 7);
    const otherExpenses = data.finances
      .filter((f) => f.type === 'expense' && f.date.startsWith(targetYm))
      .reduce((s, f) => s + f.amount, 0);
    const projectedTotal = otherExpenses + entered;
    if (projectedTotal <= monthlyBudget * 0.8) return null;
    const projRaw = (projectedTotal / monthlyBudget) * 100;
    const projectedPct =
      Math.round(projRaw) <= 80 ? projRaw.toFixed(1) : String(Math.round(projRaw));
    return {
      targetYm,
      projectedTotal,
      projectedPct,
      isOverBudget: projectedTotal > monthlyBudget,
      diff: Math.abs(monthlyBudget - projectedTotal),
    };
  }, [type, amount, date, data.finances, monthlyBudget]);

  // Live >=80% Per-Category Monthly Limit Projection
  const modalCategoryProjection = useMemo(() => {
    if (type !== 'expense') return null;
    const catLimit = data.settings.categoryBudgets?.[category];
    if (!catLimit || catLimit <= 0) return null;
    const entered = Number(amount);
    if (!amount || Number.isNaN(entered) || entered <= 0) return null;
    const targetYm = (date || getTodayISO()).slice(0, 7);
    const otherCatExpenses = data.finances
      .filter(
        (f) =>
          f.type === 'expense' &&
          f.category === category &&
          f.date.startsWith(targetYm)
      )
      .reduce((s, f) => s + f.amount, 0);
    const projectedSpent = otherCatExpenses + entered;
    if (projectedSpent < catLimit * 0.8) return null;
    const projRaw = (projectedSpent / catLimit) * 100;
    const projectedPct =
      projRaw < 100 && Math.round(projRaw) === 100
        ? projRaw.toFixed(1)
        : projRaw > 80 && Math.round(projRaw) <= 80
          ? projRaw.toFixed(1)
          : String(Math.round(projRaw));
    return {
      category,
      targetYm,
      catLimit,
      projectedSpent,
      projectedPct,
      isExceeded: projectedSpent > catLimit,
      diff: Math.abs(catLimit - projectedSpent),
    };
  }, [type, category, amount, date, data.finances, data.settings.categoryBudgets]);

  const handleSaveParsedRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormErr(t(lang, 'कृपया विवरण वा पसलको नाम लेख्नुहोस्।', 'Please enter a title.'));
      return;
    }
    const num = Number(amount);
    if (!amount || Number.isNaN(num) || num <= 0) {
      setFormErr(
        t(lang, 'कृपया मान्य रकम राख्नुहोस्।', 'Please enter a valid positive amount.')
      );
      return;
    }
    if (!date) {
      setFormErr(t(lang, 'कृपया मिति छान्नुहोस्।', 'Please select a date.'));
      return;
    }

    addFinance({
      title: title.trim(),
      amount: num,
      type,
      category,
      date,
      paymentMethod,
      note: note.trim(),
    });
    stopCameraStream();
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scan-receipt-title"
    >
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-stone-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ScanLine className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3
                id="scan-receipt-title"
                className="text-base font-bold text-slate-900 dark:text-white truncate"
              >
                {t(lang, 'रसिद / बिल स्क्यान गर्नुहोस्', 'Scan Receipt or Utility Bill')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {t(
                  lang,
                  'क्यामेराबाट रसिद खिच्नुहोस् — रकम र विधा स्वतः पहिचान हुन्छ',
                  'Capture a receipt with your camera to auto-extract amount and category'
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
            aria-label={t(lang, 'बन्द गर्नुहोस्', 'Close')}
            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hidden file input for gallery / mobile OS camera fallback */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelected}
          className="hidden"
        />

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* STAGE 1: LIVE CAMERA VIEWFINDER */}
          {!capturedDataUrl ? (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-[4/3] flex items-center justify-center border border-slate-800">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                />

                {/* Clean Viewfinder Corner Guides */}
                {cameraActive && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-6 border border-white/25 rounded-xl"
                  >
                    <span className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg" />
                    <span className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg" />
                    <span className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg" />
                    <span className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-2 border-r-2 border-emerald-400 rounded-br-lg" />
                  </div>
                )}

                {cameraStarting && (
                  <div className="text-center space-y-2 px-6 text-slate-200">
                    <Loader2 className="w-7 h-7 animate-spin text-emerald-400 mx-auto" />
                    <p className="text-xs sm:text-sm">
                      {t(lang, 'क्यामेरा सुरु हुँदैछ...', 'Starting camera...')}
                    </p>
                  </div>
                )}

                {!cameraStarting && !cameraActive && (
                  <div className="text-center space-y-3 px-6 max-w-md">
                    <Camera className="w-9 h-9 text-slate-400 mx-auto" />
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {cameraError ||
                        t(
                          lang,
                          'रसिद स्क्यान गर्न क्यामेरा खोल्नुहोस् वा फोटो छान्नुहोस्।',
                          'Start your camera or select a receipt photo to scan.'
                        )}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => startCameraStream(facingMode)}
                        className="min-h-[40px] px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>{t(lang, 'पुनः प्रयास गर्नुहोस्', 'Retry Camera')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="min-h-[40px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <ImagePlus className="w-4 h-4" />
                        <span>{t(lang, 'रसिदको फोटो छान्नुहोस्', 'Select Receipt Photo')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Camera Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSwitchCamera}
                    disabled={!cameraActive && cameraStarting}
                    className="min-h-[42px] px-3.5 py-2 rounded-xl border border-stone-300 dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <SwitchCamera className="w-4 h-4" />
                    <span>{t(lang, 'क्यामेरा बदल्नुहोस्', 'Flip Camera')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="min-h-[42px] px-3.5 py-2 rounded-xl border border-stone-300 dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <ImagePlus className="w-4 h-4" />
                    <span>{t(lang, 'ग्यालरीबाट फोटो', 'Upload Photo')}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCaptureFrame}
                  disabled={!cameraActive}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-40 text-white text-xs sm:text-sm font-bold inline-flex items-center gap-2 shadow-xs cursor-pointer whitespace-nowrap"
                >
                  <Camera className="w-4 h-4" />
                  <span>{t(lang, 'फोटो खिच्नुहोस् र पढ्नुहोस्', 'Capture & Scan Receipt')}</span>
                </button>
              </div>
            </div>
          ) : (
            /* STAGE 2: RECEIPT PREVIEW + AI PARSED FORM */
            <div className="space-y-5">
              {/* Receipt Image Thumbnail & Retake Strip */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-slate-800">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 shrink-0">
                    <img
                      src={capturedDataUrl}
                      alt={t(lang, 'खिचिएको रसिद फोटो', 'Captured receipt preview')}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    {scanning ? (
                      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        <span>
                          {t(
                            lang,
                            'रसिद पढ्दै र रकम/विधा छुट्याउँदैछ...',
                            'Reading receipt & extracting amount and category...'
                          )}
                        </span>
                      </div>
                    ) : scanError ? (
                      <div className="text-sm font-semibold text-rose-700 dark:text-rose-400">
                        {t(lang, 'पुनः जाँच आवश्यक', 'Needs Review')}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span className="truncate">
                          {scanSummary ||
                            t(
                              lang,
                              'रसिद सफलतापूर्वक पढियो — विवरण जाँच गरी सुरक्षित गर्नुहोस्',
                              'Receipt parsed — verify details below and save'
                            )}
                        </span>
                      </div>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t(
                        lang,
                        'खातामा राख्नुअघि तपाईं रकम वा विधा सच्याउन सक्नुहुन्छ।',
                        'You can adjust any extracted field before saving to Home Finance.'
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => parseReceiptImage(capturedDataUrl)}
                    disabled={scanning}
                    className="min-h-[38px] px-3 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
                    <span>{t(lang, 'पुनः स्क्यान', 'Re-scan')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRetake}
                    disabled={scanning}
                    className="min-h-[38px] px-3 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t(lang, 'अर्को फोटो', 'Retake')}</span>
                  </button>
                </div>
              </div>

              {scanError && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{scanError}</span>
                </div>
              )}

              {/* Detected Line Items Breakdown (clean unboxed metadata) */}
              {!scanning && lineItems.length > 0 && (
                <div className="space-y-2 pb-4 border-b border-stone-100 dark:border-slate-800">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    {t(lang, 'रसिदमा देखिएका मुख्य सामानहरू', 'Detected Receipt Items')}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                    {lineItems.slice(0, 6).map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 text-slate-700 dark:text-slate-300"
                      >
                        <span className="truncate">{item.name}</span>
                        <span className="font-mono tabular-nums text-slate-900 dark:text-white shrink-0">
                          {formatCurrency(item.amount, currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Parsed Finance Form */}
              <form onSubmit={handleSaveParsedRecord} className="space-y-4">
                {formErr && (
                  <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs font-medium text-rose-700 dark:text-rose-300">
                    {formErr}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-stone-100 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setType('expense')}
                    className={`py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                      type === 'expense'
                        ? 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {t(lang, 'खर्च (Expense)', 'Expense')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('income')}
                    className={`py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                      type === 'income'
                        ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {t(lang, 'आम्दानी (Income)', 'Income')}
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t(lang, 'शीर्षक / पसल वा संस्था *', 'Title / Merchant *')}
                  </label>
                  <input
                    type="text"
                    value={title}
                    disabled={scanning}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t(
                      lang,
                      'उदा: भाटभटेनी सुपरमार्केट किनमेल',
                      'e.g., Bhatbhateni Supermarket Groceries'
                    )}
                    className="w-full h-11 px-3.5 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white disabled:opacity-60"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {t(
                        lang,
                        `कुल रकम (${currencySymbol}) *`,
                        `Total Amount (${currencySymbol}) *`
                      )}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={amount}
                      disabled={scanning}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tabular-nums text-slate-900 dark:text-white disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {t(lang, 'मिति *', 'Date *')}
                    </label>
                    <input
                      type="date"
                      value={date}
                      disabled={scanning}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono text-slate-900 dark:text-white disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Live >80% Budget Threshold Preview */}
                {modalProjection && (
                  <div
                    role="status"
                    className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs leading-relaxed tabular-nums ${
                      modalProjection.isOverBudget
                        ? 'border-rose-200 dark:border-rose-800/80 bg-rose-50/80 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300'
                        : 'border-amber-200 dark:border-amber-800/80 bg-amber-50/80 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      {modalProjection.isOverBudget
                        ? t(
                            lang,
                            `चेतावनी: यो रसिद थप्दा ${formatMonthYear(modalProjection.targetYm, lang)} को कुल खर्च ${formatCurrency(modalProjection.projectedTotal, currency)} (${modalProjection.projectedPct}%) पुग्नेछ र मासिक बजेट ${formatCurrency(modalProjection.diff, currency)} ले नाघ्नेछ।`,
                            `Alert: Saving this receipt brings ${formatMonthYear(modalProjection.targetYm, lang)} spending to ${formatCurrency(modalProjection.projectedTotal, currency)} (${modalProjection.projectedPct}%), exceeding your budget by ${formatCurrency(modalProjection.diff, currency)}.`
                          )
                        : t(
                            lang,
                            `सावधानी: यो रसिद थप्दा ${formatMonthYear(modalProjection.targetYm, lang)} को मासिक बजेटको ${modalProjection.projectedPct}% प्रयोग हुनेछ (८०% सीमा पार · ${formatCurrency(modalProjection.diff, currency)} बाँकी)।`,
                            `Heads up: Saving this receipt brings ${formatMonthYear(modalProjection.targetYm, lang)} spending to ${modalProjection.projectedPct}% (above 80% threshold · ${formatCurrency(modalProjection.diff, currency)} remaining).`
                          )}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {t(lang, 'स्वतः पहिचान गरिएको विधा', 'Auto-Detected Category')}
                    </label>
                    <select
                      value={category}
                      disabled={scanning}
                      onChange={(e) => setCategory(e.target.value as FinanceCategory)}
                      className="w-full h-11 px-3 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white disabled:opacity-60"
                    >
                      {ALL_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {FINANCE_CATEGORY_LABELS[c][lang]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {t(lang, 'भुक्तानी माध्यम', 'Payment Method')}
                    </label>
                    <select
                      value={paymentMethod}
                      disabled={scanning}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full h-11 px-3 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white disabled:opacity-60"
                    >
                      {ALL_PAYMENT_METHODS.map((pm) => (
                        <option key={pm} value={pm}>
                          {PAYMENT_METHOD_LABELS[pm][lang]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Live Per-Category Budget Limit Alert */}
                {modalCategoryProjection && (
                  <div
                    role="status"
                    aria-live="polite"
                    className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs leading-relaxed tabular-nums ${
                      modalCategoryProjection.isExceeded
                        ? 'border-rose-200 dark:border-rose-800/80 bg-rose-50/80 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300'
                        : 'border-amber-200 dark:border-amber-800/80 bg-amber-50/80 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                    }`}
                  >
                    <BellRing className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      {modalCategoryProjection.isExceeded
                        ? t(
                            lang,
                            `विधा सीमा नाघ्यो (${FINANCE_CATEGORY_LABELS[modalCategoryProjection.category].ne}): यो रसिदपछि मासिक विधा खर्च ${formatCurrency(modalCategoryProjection.projectedSpent, currency)} (${modalCategoryProjection.projectedPct}%) पुगी ${formatCurrency(modalCategoryProjection.diff, currency)} बढी हुनेछ।`,
                            `Category limit exceeded (${FINANCE_CATEGORY_LABELS[modalCategoryProjection.category].en}): Saving brings monthly category spend to ${formatCurrency(modalCategoryProjection.projectedSpent, currency)} (${modalCategoryProjection.projectedPct}%), ${formatCurrency(modalCategoryProjection.diff, currency)} over limit.`
                          )
                        : t(
                            lang,
                            `विधा सीमा नजिक (${FINANCE_CATEGORY_LABELS[modalCategoryProjection.category].ne}): यो रसिदपछि मासिक विधा बजेटको ${modalCategoryProjection.projectedPct}% प्रयोग हुनेछ (${formatCurrency(modalCategoryProjection.diff, currency)} बाँकी)।`,
                            `Nearing ${FINANCE_CATEGORY_LABELS[modalCategoryProjection.category].en} limit: Saving brings monthly category spend to ${modalCategoryProjection.projectedPct}% (${formatCurrency(modalCategoryProjection.diff, currency)} remaining).`
                          )}
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t(lang, 'रसिद विवरण / टिपोट', 'Extracted Receipt Memo')}
                  </label>
                  <textarea
                    rows={2}
                    value={note}
                    disabled={scanning}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={t(
                      lang,
                      'रसिद नं. र मुख्य सामानहरूको विवरण...',
                      'Invoice number and itemized summary...'
                    )}
                    className="w-full p-3 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white disabled:opacity-60"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      stopCameraStream();
                      onClose();
                    }}
                    className="min-h-[42px] px-4 py-2 rounded-lg border border-stone-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-stone-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    {t(lang, 'रद्द गर्नुहोस्', 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={scanning}
                    className="min-h-[42px] px-5 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-sm font-semibold text-white cursor-pointer"
                  >
                    {t(lang, 'खर्च खातामा सुरक्षित गर्नुहोस्', 'Save to Finance Ledger')}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
