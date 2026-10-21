"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Globe } from "lucide-react";

declare global {
  interface Window {
    google?: any;
    googleTranslateElementInit?: () => void;
    __googleTranslatePatched?: boolean;
  }
}

// --------------------------------------------------------------------------
// Robust Monkey-patch for React & Google Translate DOM reconciliation conflicts
// Prevents: "Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node."
// --------------------------------------------------------------------------
if (typeof window !== "undefined" && !window.__googleTranslatePatched) {
  window.__googleTranslatePatched = true;

  if (typeof Node === "function" && Node.prototype) {
    const originalRemoveChild = Node.prototype.removeChild;
    Node.prototype.removeChild = function <T extends Node>(child: T): T {
      if (child.parentNode !== this) {
        // If child was reparented by Google Translate (e.g. into a <font> tag),
        // remove it from its actual parent instead of throwing an unhandled exception.
        if (child.parentNode) {
          return child.parentNode.removeChild(child);
        }
        return child;
      }
      return originalRemoveChild.apply(this, arguments as any) as T;
    };

    const originalInsertBefore = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
      if (referenceNode && referenceNode.parentNode !== this) {
        // If reference node was reparented by Google Translate,
        // insert into its actual parent before the reference node.
        if (referenceNode.parentNode) {
          return referenceNode.parentNode.insertBefore(newNode, referenceNode);
        }
        return newNode;
      }
      return originalInsertBefore.apply(this, arguments as any) as T;
    };
  }
}

type Language = "en" | "km";

interface GoogleTranslateProps {
  variant?: "topbar" | "sidebar" | "standalone";
  className?: string;
}

export default function GoogleTranslate({
  variant = "topbar",
  className = "",
}: GoogleTranslateProps) {
  const [currentLang, setCurrentLang] = useState<Language>("en");

  // Read current language from googtrans cookie
  const getStoredLang = useCallback((): Language => {
    if (typeof document === "undefined") return "en";
    const cookies = document.cookie.split(";");
    for (const c of cookies) {
      const trimmed = c.trim();
      if (trimmed.startsWith("googtrans=")) {
        const val = trimmed.substring("googtrans=".length);
        if (val.includes("/km")) return "km";
        if (val.includes("/en")) return "en";
      }
    }
    return "en";
  }, []);

  // Clean up Google Translate top banner whenever it renders
  const cleanupGoogleBanner = useCallback(() => {
    if (typeof document === "undefined") return;

    // 1. Force body top offset to 0 and remove unwanted Google inline styles
    if (document.body) {
      if (document.body.style.top && document.body.style.top !== "0px") {
        document.body.style.setProperty("top", "0px", "important");
      }
      if (document.body.style.position === "relative") {
        document.body.style.setProperty("position", "static", "important");
      }
    }

    // 2. Hide all banner frames, skiptranslate wrappers, and iframe containers
    const bannerElements = document.querySelectorAll<HTMLElement>(
      ".goog-te-banner-frame, iframe.goog-te-banner-frame, body > .skiptranslate, body > iframe.skiptranslate, iframe[id*=':1.container'], iframe[id*=':2.container'], .goog-te-banner, div[class*='skiptranslate']:not(.notranslate)"
    );
    bannerElements.forEach((el) => {
      if (el.closest && el.closest(".notranslate")) return;
      el.style.setProperty("display", "none", "important");
      el.style.setProperty("visibility", "hidden", "important");
      el.style.setProperty("height", "0", "important");
      el.style.setProperty("opacity", "0", "important");
      el.style.setProperty("pointer-events", "none", "important");
    });
  }, []);

  // Initialize Google Translate Script
  useEffect(() => {
    const initialLang = getStoredLang();
    setCurrentLang(initialLang);

    // Inject highest-priority stylesheet into head to immediately hide the banner iframe
    if (!document.getElementById("google-translate-hide-banner-style")) {
      const styleEl = document.createElement("style");
      styleEl.id = "google-translate-hide-banner-style";
      styleEl.innerHTML = `
        body > .skiptranslate,
        body > iframe.skiptranslate,
        .skiptranslate iframe,
        .goog-te-banner-frame,
        .goog-te-banner-frame.skiptranslate,
        iframe.goog-te-banner-frame,
        iframe[class*="goog-te-banner-frame"],
        iframe[id*=":1.container"],
        iframe[id*=":2.container"],
        .goog-te-banner,
        #goog-gt-tt,
        .goog-te-balloon-frame,
        .goog-tooltip {
          display: none !important;
          visibility: hidden !important;
          height: 0 !important;
          width: 0 !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
        body,
        html.translated-ltr body,
        html.translated-rtl body {
          top: 0px !important;
          position: static !important;
        }
      `;
      document.head.appendChild(styleEl);
    }

    // Ensure single hidden Google Translate container in DOM
    if (!document.getElementById("google_translate_element")) {
      const el = document.createElement("div");
      el.id = "google_translate_element";
      el.style.display = "none";
      document.body.appendChild(el);
    }

    // Define callback before injecting script
    window.googleTranslateElementInit = () => {
      if (window.google?.translate?.TranslateElement) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            includedLanguages: "en,km",
            autoDisplay: false,
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          },
          "google_translate_element"
        );
      }
    };

    // Inject script if not already added
    const existingScript = document.getElementById("google-translate-script");
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "google-translate-script";
      script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    }

    cleanupGoogleBanner();

    // Active observer to suppress banner whenever Google Translate attempts to show it
    const observer = new MutationObserver(() => {
      cleanupGoogleBanner();
    });

    observer.observe(document.body, {
      childList: true,
      attributes: true,
      attributeFilter: ["style", "class"],
    });

    // Listen for cross-component sync
    const handleLangSync = (e: CustomEvent<{ lang: Language }>) => {
      setCurrentLang(e.detail.lang);
      cleanupGoogleBanner();
    };
    window.addEventListener("goldpilot-lang-change" as any, handleLangSync);
    return () => {
      observer.disconnect();
      window.removeEventListener("goldpilot-lang-change" as any, handleLangSync);
    };
  }, [getStoredLang, cleanupGoogleBanner]);

  // Handle switching language
  const switchLanguage = (lang: Language) => {
    const cookieVal = lang === "km" ? "/en/km" : "/en/en";

    // Set cookie across path and current host
    const domain = window.location.hostname;
    document.cookie = `googtrans=${cookieVal}; path=/; max-age=31536000`;
    document.cookie = `googtrans=${cookieVal}; domain=${domain}; path=/; max-age=31536000`;
    if (domain.includes(".")) {
      const rootDomain = "." + domain.split(".").slice(-2).join(".");
      document.cookie = `googtrans=${cookieVal}; domain=${rootDomain}; path=/; max-age=31536000`;
    }

    setCurrentLang(lang);

    // Notify other switcher instances
    window.dispatchEvent(
      new CustomEvent("goldpilot-lang-change", { detail: { lang } })
    );

    // Try finding the native Google Translate select element
    const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo");
    if (combo) {
      combo.value = lang;
      combo.dispatchEvent(new Event("change"));
      setTimeout(cleanupGoogleBanner, 50);
      setTimeout(cleanupGoogleBanner, 200);
      setTimeout(cleanupGoogleBanner, 600);
      setTimeout(cleanupGoogleBanner, 1200);
    } else {
      // Reload page if combo not ready so cookie is processed
      window.location.reload();
    }
  };

  // Toggle between English and Khmer
  const toggleLanguage = () => {
    const next = currentLang === "en" ? "km" : "en";
    switchLanguage(next);
  };


  if (variant === "sidebar") {
    return (
      <div className={`w-full ${className}`}>
        <button
          type="button"
          onClick={toggleLanguage}
          className="nav-item w-full flex items-center justify-between mb-1.5 cursor-pointer border border-transparent hover:border-(--border) transition-all text-left"
          title={currentLang === "en" ? "Switch to Khmer (ប្តូរជាភាសាខ្មែរ)" : "Switch to English"}
        >
          <div className="flex items-center gap-3">
            <Globe size={18} className="text-[#45a7ff]" />
            <span className="notranslate">
              {currentLang === "en" ? "English (EN)" : "ភាសាខ្មែរ (KH)"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 notranslate">
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-all ${
                currentLang === "en"
                  ? "bg-[#2962ff] text-white"
                  : "bg-(--panel-hover) text-(--muted)"
              }`}
            >
              ENG
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-all ${
                currentLang === "km"
                  ? "bg-[#2962ff] text-white"
                  : "bg-(--panel-hover) text-(--muted)"
              }`}
            >
              KH
            </span>
          </div>
        </button>
      </div>
    );
  }

  // Topbar / Standalone variant
  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <div className="flex items-center rounded-lg bg-(--panel) border border-(--card-border) p-0.5 shadow-sm">
        <button
          type="button"
          onClick={() => switchLanguage("en")}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer notranslate ${
            currentLang === "en"
              ? "bg-[#2962ff] text-white shadow-xs"
              : "text-(--muted) hover:text-white hover:bg-(--panel-hover)"
          }`}
          title="Switch to English"
        >
          <span className="text-xs">🇬🇧</span>
          <span>ENG</span>
        </button>

        <button
          type="button"
          onClick={() => switchLanguage("km")}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer notranslate ${
            currentLang === "km"
              ? "bg-[#2962ff] text-white shadow-xs"
              : "text-(--muted) hover:text-white hover:bg-(--panel-hover)"
          }`}
          title="ប្តូរជាភាសាខ្មែរ (Khmer)"
        >
          <span className="text-xs">🇰🇭</span>
          <span>ខ្មែរ (KH)</span>
        </button>
      </div>
    </div>
  );
}
