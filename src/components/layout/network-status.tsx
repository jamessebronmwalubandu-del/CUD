"use client";

import { useOfflineSupport } from "@/hooks/use-offline-support";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Wifi, WifiOff, RefreshCw, CloudOff } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { useState, useEffect } from "react";

export function NetworkStatus() {
  const { online, pendingCount, lastSync, syncNow } = useOfflineSupport();
  const { t } = useI18n();
  const [syncing, setSyncing] = useState(false);

  // Don't render until mounted (avoid hydration mismatch)
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    let active = true;
    requestAnimationFrame(() => { if (active) setMounted(true); });
    return () => { active = false; };
  }, []);
  if (!mounted) return null;

  const handleSync = async () => {
    setSyncing(true);
    await syncNow();
    setTimeout(() => setSyncing(false), 1500);
  };

  if (online && pendingCount === 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
              <Wifi className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("network.online")}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {lastSync
              ? `${t("common.lastSync")}: ${lastSync.toLocaleTimeString()}`
              : t("network.online")}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (!online) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <WifiOff className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("network.offline")}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">{t("network.offlineMode")}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("network.offlineModeDesc")}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Online with pending changes
  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
        <CloudOff className="h-3 w-3 mr-1" />
        {t("network.pendingChanges", { n: pendingCount })}
      </Badge>
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-2 text-[11px]"
        onClick={handleSync}
        disabled={syncing}
      >
        <RefreshCw className={`h-3 w-3 mr-1 ${syncing ? "animate-spin" : ""}`} />
        {t("network.syncNow")}
      </Button>
    </div>
  );
}
