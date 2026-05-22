import { create } from "zustand";
import {
  createAppLog,
  createEntityId,
  createReplayHistoryItem,
  defaultFilterState,
  type AppLog,
  type AppLogLevel,
  type CreateAppLogInput,
  type CreateReplayHistoryItemInput,
  type EntityId,
  type FilterState,
  type ReplayHistoryItem,
} from "@/models";
import { useSettingsStore } from "@/store/settings-store";

export type ComposerMode = "json" | "raw";
export type ToastLevel = Exclude<AppLogLevel, "debug">;

export type ToastNotification = {
  createdAt: number;
  details: string | null;
  id: EntityId;
  level: ToastLevel;
  message: string;
  timeoutMs: number;
  title: string;
};

export type CreateToastInput = {
  details?: string | null;
  level?: ToastLevel;
  message: string;
  timeoutMs?: number;
  title: string;
};

type UiStore = {
  addLog: (input: CreateAppLogInput) => AppLog;
  addReplayHistoryItem: (input: CreateReplayHistoryItemInput) => ReplayHistoryItem;
  addToast: (input: CreateToastInput) => ToastNotification;
  clearLogs: () => void;
  clearReplayHistory: () => void;
  composerError: string | null;
  composerDraft: string;
  composerMode: ComposerMode;
  demoMode: DemoModeState;
  dismissToast: (toastId: EntityId) => void;
  filterState: FilterState;
  investorDemo: InvestorDemoState;
  logs: AppLog[];
  replayHistory: ReplayHistoryItem[];
  resetFilters: () => void;
  selectLatestPacket: (packetId: EntityId | null) => void;
  selectPacket: (packetId: EntityId | null) => void;
  selectSession: (sessionId: EntityId | null) => void;
  selectedPacketId: EntityId | null;
  selectedSessionId: EntityId | null;
  setComposerError: (composerError: string | null) => void;
  setComposerDraft: (composerDraft: string) => void;
  setComposerMode: (composerMode: ComposerMode) => void;
  setDemoMode: (demoMode: DemoModeState) => void;
  setInvestorDemo: (investorDemo: InvestorDemoState) => void;
  toasts: ToastNotification[];
  updateFilterState: (filterState: Partial<FilterState>) => void;
};

type DemoModeState = {
  connectionId: EntityId | null;
  isActive: boolean;
  sessionId: EntityId | null;
  startedAt: number | null;
};

export type InvestorDemoState = {
  completedAt: number | null;
  connectionId: EntityId | null;
  currentStepIndex: number;
  isActive: boolean;
  sessionId: EntityId | null;
  startedAt: number | null;
};

const inactiveDemoMode: DemoModeState = {
  connectionId: null,
  isActive: false,
  sessionId: null,
  startedAt: null,
};

export const inactiveInvestorDemo: InvestorDemoState = {
  completedAt: null,
  connectionId: null,
  currentStepIndex: 0,
  isActive: false,
  sessionId: null,
  startedAt: null,
};

let pendingSelectedPacketId: EntityId | null = null;
let selectionBatchTimer: ReturnType<typeof setTimeout> | null = null;
let uiStoreSet: UiStoreSet | null = null;

type UiStoreSet = (
  partial: UiStore | Partial<UiStore> | ((state: UiStore) => UiStore | Partial<UiStore>),
  replace?: false,
) => void;

export const useUiStore = create<UiStore>((set) => {
  uiStoreSet = set;

  return {
  addLog: (input) => {
    const log = createAppLog(input);

    set((state) => {
      const limit = useSettingsStore.getState().settings.logRetentionLimit;

      return {
        logs: [log, ...state.logs].slice(0, limit),
      };
    });

    return log;
  },
  addReplayHistoryItem: (input) => {
    const replayHistoryItem = createReplayHistoryItem(input);

    set((state) => ({
      replayHistory: [replayHistoryItem, ...state.replayHistory].slice(0, 25),
    }));

    return replayHistoryItem;
  },
  addToast: ({ details = null, level = "info", message, timeoutMs, title }) => {
    const toast: ToastNotification = {
      createdAt: Date.now(),
      details,
      id: createEntityId(),
      level,
      message,
      timeoutMs: timeoutMs ?? (level === "error" ? 9_000 : 4_500),
      title,
    };

    set((state) => ({
      toasts: [toast, ...state.toasts].slice(0, 4),
    }));

    return toast;
  },

  clearReplayHistory: () => set({ replayHistory: [] }),
  clearLogs: () => set({ logs: [] }),
  composerError: null,
  composerDraft: "",
  composerMode: "json",
  demoMode: inactiveDemoMode,
  dismissToast: (toastId) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== toastId),
    })),
  filterState: defaultFilterState,
  investorDemo: inactiveInvestorDemo,
  logs: [],
  replayHistory: [],

  resetFilters: () =>
    set((state) => ({
      filterState: {
        ...defaultFilterState,
        sessionId: state.selectedSessionId,
      },
    })),
  selectLatestPacket: (packetId) => {
    pendingSelectedPacketId = packetId;

    if (selectionBatchTimer !== null) {
      return;
    }

    selectionBatchTimer = setTimeout(() => {
      selectionBatchTimer = null;
      uiStoreSet?.({ selectedPacketId: pendingSelectedPacketId });
    }, 16);
  },
  selectPacket: (packetId) => set({ selectedPacketId: packetId }),
  selectSession: (sessionId) =>
    set((state) => ({
      filterState: {
        ...state.filterState,
        sessionId,
      },
      selectedPacketId: null,
      selectedSessionId: sessionId,
    })),
  selectedPacketId: null,
  selectedSessionId: null,
  setComposerError: (composerError) => set({ composerError }),
  setComposerDraft: (composerDraft) => set({ composerDraft }),
  setComposerMode: (composerMode) => set({ composerMode }),
  setDemoMode: (demoMode) => set({ demoMode }),
  setInvestorDemo: (investorDemo) => set({ investorDemo }),
  toasts: [],
  updateFilterState: (filterState) =>
    set((state) => ({
      filterState: {
        ...state.filterState,
        ...filterState,
      },
    })),
  };
});
