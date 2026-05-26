"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  SEED_BOOKINGS,
  SEED_MESSAGES,
  SEED_TRIPS,
  SEED_USERS,
} from "./mockData";
import {
  Booking,
  BookingStatus,
  Message,
  Rating,
  Trip,
  User,
} from "./types";

const LS_KEY = "jt:v1";
const ROLE_KEY = "jt:activeUserId";

type Toast = { id: number; tone: "info" | "success" | "warn"; text: string };

interface StoreState {
  users: User[];
  trips: Trip[];
  bookings: Booking[];
  messages: Message[];
}

interface StoreCtx extends StoreState {
  activeUserId: string;
  activeUser: User;
  setActiveUserId: (id: string) => void;
  resetData: () => void;
  addTrip: (t: Omit<Trip, "id" | "status">) => Trip;
  addBooking: (b: Omit<Booking, "id" | "status" | "ratings">) => Booking;
  setBookingStatus: (id: string, status: BookingStatus) => void;
  addMessage: (m: Omit<Message, "id" | "at">) => Message;
  addRating: (bookingId: string, r: Rating) => void;
  flagBooking: (id: string, reason: string) => void;
  approveVerification: (
    userId: string,
    key: keyof User["verification"],
    status: User["verification"]["wwcc"]
  ) => void;
  upsertUser: (u: User) => void;
  toasts: Toast[];
  pushToast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: number) => void;
  dark: boolean;
  toggleDark: () => void;
}

const StoreContext = createContext<StoreCtx | null>(null);

function loadInitial(): StoreState {
  if (typeof window === "undefined") {
    return {
      users: SEED_USERS,
      trips: SEED_TRIPS,
      bookings: SEED_BOOKINGS,
      messages: SEED_MESSAGES,
    };
  }
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoreState;
      return {
        users: parsed.users ?? SEED_USERS,
        trips: parsed.trips ?? SEED_TRIPS,
        bookings: parsed.bookings ?? SEED_BOOKINGS,
        messages: parsed.messages ?? SEED_MESSAGES,
      };
    }
  } catch {
    /* fall through to seed */
  }
  return {
    users: SEED_USERS,
    trips: SEED_TRIPS,
    bookings: SEED_BOOKINGS,
    messages: SEED_MESSAGES,
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>(() => ({
    users: SEED_USERS,
    trips: SEED_TRIPS,
    bookings: SEED_BOOKINGS,
    messages: SEED_MESSAGES,
  }));
  const [activeUserId, _setActiveUserId] = useState<string>("r1");
  const [hydrated, setHydrated] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dark, setDark] = useState(false);

  // Hydrate from localStorage on the client.
  useEffect(() => {
    setState(loadInitial());
    const id = window.localStorage.getItem(ROLE_KEY);
    if (id) _setActiveUserId(id);
    const themeStored = window.localStorage.getItem("jt:dark");
    if (themeStored === "1") {
      setDark(true);
      document.documentElement.classList.add("dark");
    }
    setHydrated(true);
  }, []);

  // Persist whenever state changes (post-hydration).
  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(LS_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(ROLE_KEY, activeUserId);
  }, [activeUserId, hydrated]);

  const setActiveUserId = useCallback((id: string) => {
    _setActiveUserId(id);
  }, []);

  const pushToast = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 5500);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const resetData = useCallback(() => {
    const fresh: StoreState = {
      users: SEED_USERS,
      trips: SEED_TRIPS,
      bookings: SEED_BOOKINGS,
      messages: SEED_MESSAGES,
    };
    setState(fresh);
    _setActiveUserId("r1");
    pushToast({ tone: "success", text: "Demo data reset to seed." });
  }, [pushToast]);

  const addTrip: StoreCtx["addTrip"] = useCallback((t) => {
    const trip: Trip = { ...t, id: `t_${Date.now()}`, status: "open" };
    setState((s) => ({ ...s, trips: [trip, ...s.trips] }));
    return trip;
  }, []);

  const addBooking: StoreCtx["addBooking"] = useCallback((b) => {
    const booking: Booking = {
      ...b,
      id: `b_${Date.now()}`,
      status: "pending",
      ratings: [],
    };
    setState((s) => ({ ...s, bookings: [booking, ...s.bookings] }));
    return booking;
  }, []);

  const setBookingStatus: StoreCtx["setBookingStatus"] = useCallback(
    (id, status) => {
      setState((s) => ({
        ...s,
        bookings: s.bookings.map((b) =>
          b.id === id
            ? {
                ...b,
                status,
                startedAt:
                  status === "in-progress" && !b.startedAt
                    ? new Date().toISOString()
                    : b.startedAt,
                endedAt:
                  status === "completed" && !b.endedAt
                    ? new Date().toISOString()
                    : b.endedAt,
              }
            : b
        ),
      }));
    },
    []
  );

  const addMessage: StoreCtx["addMessage"] = useCallback((m) => {
    const msg: Message = {
      ...m,
      id: `m_${Date.now()}`,
      at: new Date().toISOString(),
    };
    setState((s) => ({ ...s, messages: [...s.messages, msg] }));
    return msg;
  }, []);

  const addRating: StoreCtx["addRating"] = useCallback((bookingId, r) => {
    setState((s) => {
      const bookings = s.bookings.map((b) => {
        if (b.id !== bookingId) return b;
        const ratings = [...b.ratings, r];
        // If both have rated, advance to "rated"
        const both =
          ratings.some((x) => x.by === b.requesterId) &&
          ratings.some((x) => x.by === b.companionId);
        return { ...b, ratings, status: both ? ("rated" as const) : b.status };
      });
      // Update the rated user's aggregate rating & tags
      const rated = s.bookings.find((b) => b.id === bookingId);
      if (!rated) return { ...s, bookings };
      const ratedUserId = r.by === rated.requesterId ? rated.companionId : rated.requesterId;
      const users = s.users.map((u) => {
        if (u.id !== ratedUserId) return u;
        const newCount = u.ratingCount + 1;
        const newAvg = (u.rating * u.ratingCount + r.stars) / newCount;
        const tagSet = new Set([...(u.reviewTags ?? []), ...r.tags]);
        return {
          ...u,
          rating: Math.round(newAvg * 10) / 10,
          ratingCount: newCount,
          reviewTags: Array.from(tagSet).slice(0, 8),
        };
      });
      return { ...s, bookings, users };
    });
  }, []);

  const flagBooking: StoreCtx["flagBooking"] = useCallback((id, reason) => {
    setState((s) => ({
      ...s,
      bookings: s.bookings.map((b) =>
        b.id === id
          ? {
              ...b,
              flagged: {
                by: activeUserId,
                reason,
                at: new Date().toISOString(),
              },
            }
          : b
      ),
    }));
  }, [activeUserId]);

  const approveVerification: StoreCtx["approveVerification"] = useCallback(
    (userId, key, status) => {
      setState((s) => ({
        ...s,
        users: s.users.map((u) =>
          u.id === userId
            ? { ...u, verification: { ...u.verification, [key]: status } }
            : u
        ),
      }));
    },
    []
  );

  const upsertUser: StoreCtx["upsertUser"] = useCallback((u) => {
    setState((s) => {
      const exists = s.users.some((x) => x.id === u.id);
      return {
        ...s,
        users: exists ? s.users.map((x) => (x.id === u.id ? u : x)) : [u, ...s.users],
      };
    });
  }, []);

  const toggleDark = useCallback(() => {
    setDark((d) => {
      const next = !d;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("jt:dark", next ? "1" : "0");
        document.documentElement.classList.toggle("dark", next);
      }
      return next;
    });
  }, []);

  const activeUser = useMemo(
    () => state.users.find((u) => u.id === activeUserId) ?? state.users[0],
    [state.users, activeUserId]
  );

  const value: StoreCtx = {
    ...state,
    activeUserId,
    activeUser,
    setActiveUserId,
    resetData,
    addTrip,
    addBooking,
    setBookingStatus,
    addMessage,
    addRating,
    flagBooking,
    approveVerification,
    upsertUser,
    toasts,
    pushToast,
    dismissToast,
    dark,
    toggleDark,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
