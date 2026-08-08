import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type CurrencyCode = string;

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  locale: string;
  flag?: string;
}

export const CURRENCIES: Currency[] = [
  // Most common / defaults
  { code: "USD", symbol: "$",     name: "US Dollar",              locale: "en-US",          flag: "🇺🇸" },
  { code: "EUR", symbol: "€",     name: "Euro",                   locale: "de-DE",          flag: "🇪🇺" },
  { code: "GBP", symbol: "£",     name: "British Pound",          locale: "en-GB",          flag: "🇬🇧" },
  // Africa
  { code: "NGN", symbol: "₦",     name: "Nigerian Naira",         locale: "en-NG",          flag: "🇳🇬" },
  { code: "GHS", symbol: "₵",     name: "Ghanaian Cedi",          locale: "en-GH",          flag: "🇬🇭" },
  { code: "KES", symbol: "KSh",   name: "Kenyan Shilling",        locale: "en-KE",          flag: "🇰🇪" },
  { code: "ZAR", symbol: "R",     name: "South African Rand",     locale: "en-ZA",          flag: "🇿🇦" },
  { code: "LRD", symbol: "L$",    name: "Liberian Dollar",        locale: "en-LR",          flag: "🇱🇷" },
  { code: "GNF", symbol: "FG",    name: "Guinean Franc",          locale: "fr-GN",          flag: "🇬🇳" },
  { code: "SLL", symbol: "Le",    name: "Sierra Leonean Leone",   locale: "en-SL",          flag: "🇸🇱" },
  { code: "GMD", symbol: "D",     name: "Gambian Dalasi",         locale: "en-GM",          flag: "🇬🇲" },
  { code: "XOF", symbol: "CFA",   name: "West African CFA Franc", locale: "fr-SN",          flag: "🌍" },
  { code: "XAF", symbol: "FCFA",  name: "Central African CFA",    locale: "fr-CM",          flag: "🌍" },
  { code: "ETB", symbol: "Br",    name: "Ethiopian Birr",         locale: "am-ET",          flag: "🇪🇹" },
  { code: "TZS", symbol: "TSh",   name: "Tanzanian Shilling",     locale: "sw-TZ",          flag: "🇹🇿" },
  { code: "UGX", symbol: "USh",   name: "Ugandan Shilling",       locale: "sw-UG",          flag: "🇺🇬" },
  { code: "RWF", symbol: "FRw",   name: "Rwandan Franc",          locale: "rw-RW",          flag: "🇷🇼" },
  { code: "ZMW", symbol: "ZK",    name: "Zambian Kwacha",         locale: "en-ZM",          flag: "🇿🇲" },
  { code: "MWK", symbol: "MK",    name: "Malawian Kwacha",        locale: "en-MW",          flag: "🇲🇼" },
  { code: "MZN", symbol: "MT",    name: "Mozambican Metical",     locale: "pt-MZ",          flag: "🇲🇿" },
  { code: "BWP", symbol: "P",     name: "Botswana Pula",          locale: "en-BW",          flag: "🇧🇼" },
  { code: "NAD", symbol: "N$",    name: "Namibian Dollar",        locale: "en-NA",          flag: "🇳🇦" },
  { code: "SZL", symbol: "L",     name: "Swazi Lilangeni",        locale: "en-SZ",          flag: "🇸🇿" },
  { code: "LSL", symbol: "M",     name: "Lesotho Loti",           locale: "en-LS",          flag: "🇱🇸" },
  { code: "DJF", symbol: "Fdj",   name: "Djiboutian Franc",       locale: "fr-DJ",          flag: "🇩🇯" },
  { code: "SOS", symbol: "Sh",    name: "Somali Shilling",        locale: "so-SO",          flag: "🇸🇴" },
  { code: "MGA", symbol: "Ar",    name: "Malagasy Ariary",        locale: "mg-MG",          flag: "🇲🇬" },
  { code: "SCR", symbol: "₨",     name: "Seychellois Rupee",      locale: "en-SC",          flag: "🇸🇨" },
  { code: "MUR", symbol: "₨",     name: "Mauritian Rupee",        locale: "en-MU",          flag: "🇲🇺" },
  { code: "CVE", symbol: "$",     name: "Cape Verdean Escudo",    locale: "pt-CV",          flag: "🇨🇻" },
  { code: "STN", symbol: "Db",    name: "São Tomé Dobra",         locale: "pt-ST",          flag: "🇸🇹" },
  { code: "EGP", symbol: "E£",    name: "Egyptian Pound",         locale: "ar-EG",          flag: "🇪🇬" },
  { code: "MAD", symbol: "MAD",   name: "Moroccan Dirham",        locale: "ar-MA",          flag: "🇲🇦" },
  { code: "TND", symbol: "DT",    name: "Tunisian Dinar",         locale: "ar-TN",          flag: "🇹🇳" },
  { code: "DZD", symbol: "DA",    name: "Algerian Dinar",         locale: "ar-DZ",          flag: "🇩🇿" },
  { code: "LYD", symbol: "LD",    name: "Libyan Dinar",           locale: "ar-LY",          flag: "🇱🇾" },
  { code: "AOA", symbol: "Kz",    name: "Angolan Kwanza",         locale: "pt-AO",          flag: "🇦🇴" },
  { code: "CDF", symbol: "FC",    name: "Congolese Franc",        locale: "fr-CD",          flag: "🇨🇩" },
  { code: "SDG", symbol: "SDG",   name: "Sudanese Pound",         locale: "ar-SD",          flag: "🇸🇩" },
  // Americas
  { code: "CAD", symbol: "CA$",   name: "Canadian Dollar",        locale: "en-CA",          flag: "🇨🇦" },
  { code: "MXN", symbol: "MX$",   name: "Mexican Peso",           locale: "es-MX",          flag: "🇲🇽" },
  { code: "BRL", symbol: "R$",    name: "Brazilian Real",         locale: "pt-BR",          flag: "🇧🇷" },
  { code: "ARS", symbol: "$",     name: "Argentine Peso",         locale: "es-AR",          flag: "🇦🇷" },
  { code: "COP", symbol: "COL$",  name: "Colombian Peso",         locale: "es-CO",          flag: "🇨🇴" },
  { code: "CLP", symbol: "CLP$",  name: "Chilean Peso",           locale: "es-CL",          flag: "🇨🇱" },
  { code: "PEN", symbol: "S/",    name: "Peruvian Sol",           locale: "es-PE",          flag: "🇵🇪" },
  // Asia/Pacific
  { code: "JPY", symbol: "¥",     name: "Japanese Yen",           locale: "ja-JP",          flag: "🇯🇵" },
  { code: "CNY", symbol: "¥",     name: "Chinese Yuan",           locale: "zh-CN",          flag: "🇨🇳" },
  { code: "INR", symbol: "₹",     name: "Indian Rupee",           locale: "en-IN",          flag: "🇮🇳" },
  { code: "AUD", symbol: "A$",    name: "Australian Dollar",      locale: "en-AU",          flag: "🇦🇺" },
  { code: "SGD", symbol: "S$",    name: "Singapore Dollar",       locale: "en-SG",          flag: "🇸🇬" },
  { code: "HKD", symbol: "HK$",   name: "Hong Kong Dollar",       locale: "zh-HK",          flag: "🇭🇰" },
  { code: "AED", symbol: "AED",   name: "UAE Dirham",             locale: "ar-AE",          flag: "🇦🇪" },
  { code: "SAR", symbol: "SAR",   name: "Saudi Riyal",            locale: "ar-SA",          flag: "🇸🇦" },
  { code: "QAR", symbol: "QR",    name: "Qatari Riyal",           locale: "ar-QA",          flag: "🇶🇦" },
];

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (code: string) => void;
  fmt: (amount: number) => string;
  sym: string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

const STORAGE_KEY = "pos360_currency";
export const DEFAULT_CURRENCY = "USD";

export function getCurrencyByCode(code: string): Currency {
  return CURRENCIES.find(c => c.code === code) ?? CURRENCIES[0];
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return getCurrencyByCode(saved ?? DEFAULT_CURRENCY);
  });

  // Listen to cross-tab / same-tab storage changes from settings
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setCurrencyState(getCurrencyByCode(e.newValue));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setCurrency = (code: string) => {
    const c = getCurrencyByCode(code);
    setCurrencyState(c);
    localStorage.setItem(STORAGE_KEY, code);
    // Dispatch event so same-window listeners update too
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: code }));
  };

  const fmt = (amount: number) => {
    try {
      return new Intl.NumberFormat(currency.locale, {
        style: "currency",
        currency: currency.code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${currency.symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, fmt, sym: currency.symbol }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
