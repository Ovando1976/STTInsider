"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  ConciergeDraft,
  RideDraft,
  SearchState,
  SttAppTab,
  UnifiedPlace,
} from "@/types/unified-place";
import type { Business } from "@/types/stt";
import {
  businessToUnifiedPlace,
  unifiedPlaceToRideStop,
} from "@/lib/stt/place-mappers";

type SttFlowContextValue = {
  activeTab: SttAppTab;
  setActiveTab: (tab: SttAppTab) => void;

  selectedPlace: UnifiedPlace | null;
  selectedBusiness: Business | null;

  transitDraft: RideDraft;
  conciergeDraft: ConciergeDraft;

  searchState: SearchState;
  setSearchState: (
    updater: SearchState | ((prev: SearchState) => SearchState)
  ) => void;

  openBusinessFlow: (business: Business) => void;
  openPlace: (place: UnifiedPlace) => void;

  startConciergeForBusiness: (business: Business, prompt?: string) => void;
  startTransitToBusiness: (business: Business) => void;

  startConciergeForPlace: (place: UnifiedPlace, prompt?: string) => void;
  startTransitToPlace: (place: UnifiedPlace) => void;

  setTransitPickupFromPlace: (place: UnifiedPlace) => void;
  clearFlow: () => void;
};

const defaultSearchState: SearchState = {
  query: "",
  island: "All Islands",
  category: "All",
  bookmarkOnly: false,
  distanceSort: false,
};

const emptyRideDraft: RideDraft = {
  pickup: null,
  dropoff: null,
};

const emptyConciergeDraft: ConciergeDraft = {
  prompt: "",
  place: null,
};

const SttFlowContext = createContext<SttFlowContextValue | null>(null);

export function SttFlowProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<SttAppTab>("places");
  const [selectedPlace, setSelectedPlace] = useState<UnifiedPlace | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(
    null
  );

  const [transitDraft, setTransitDraft] = useState<RideDraft>(emptyRideDraft);
  const [conciergeDraft, setConciergeDraft] =
    useState<ConciergeDraft>(emptyConciergeDraft);

  const [searchState, setSearchState] =
    useState<SearchState>(defaultSearchState);

  const openBusinessFlow = useCallback((business: Business) => {
    const place = businessToUnifiedPlace(business);
    setSelectedBusiness(business);
    setSelectedPlace(place);
  }, []);

  const openPlace = useCallback((place: UnifiedPlace) => {
    setSelectedPlace(place);
    setSelectedBusiness(null);
  }, []);

  const startConciergeForBusiness = useCallback(
    (business: Business, prompt?: string) => {
      const place = businessToUnifiedPlace(business);

      setSelectedBusiness(business);
      setSelectedPlace(place);

      setTransitDraft(emptyRideDraft);
      setConciergeDraft({
        place,
        prompt:
          prompt?.trim() ||
          `Help me plan the best experience around ${business.name}.`,
      });

      setActiveTab("concierge");
    },
    []
  );

  const startTransitToBusiness = useCallback((business: Business) => {
    const place = businessToUnifiedPlace(business);

    setSelectedBusiness(business);
    setSelectedPlace(place);

    setConciergeDraft(emptyConciergeDraft);
    setTransitDraft((prev) => ({
      ...prev,
      dropoff: unifiedPlaceToRideStop(place),
    }));

    setActiveTab("transit");
  }, []);

  const startConciergeForPlace = useCallback(
    (place: UnifiedPlace, prompt?: string) => {
      setSelectedPlace(place);
      setSelectedBusiness(null);

      setTransitDraft(emptyRideDraft);
      setConciergeDraft({
        place,
        prompt:
          prompt?.trim() ||
          `Help me plan the best experience around ${place.title}.`,
      });

      setActiveTab("concierge");
    },
    []
  );

  const startTransitToPlace = useCallback((place: UnifiedPlace) => {
    setSelectedPlace(place);
    setSelectedBusiness(null);

    setConciergeDraft(emptyConciergeDraft);
    setTransitDraft((prev) => ({
      ...prev,
      dropoff: unifiedPlaceToRideStop(place),
    }));

    setActiveTab("transit");
  }, []);

  const setTransitPickupFromPlace = useCallback((place: UnifiedPlace) => {
    setTransitDraft((prev) => ({
      ...prev,
      pickup: unifiedPlaceToRideStop(place),
    }));
  }, []);

  const clearFlow = useCallback(() => {
    setSelectedPlace(null);
    setSelectedBusiness(null);
    setTransitDraft(emptyRideDraft);
    setConciergeDraft(emptyConciergeDraft);
  }, []);

  const value = useMemo<SttFlowContextValue>(
    () => ({
      activeTab,
      setActiveTab,
      selectedPlace,
      selectedBusiness,
      transitDraft,
      conciergeDraft,
      searchState,
      setSearchState,
      openBusinessFlow,
      openPlace,
      startConciergeForBusiness,
      startTransitToBusiness,
      startConciergeForPlace,
      startTransitToPlace,
      setTransitPickupFromPlace,
      clearFlow,
    }),
    [
      activeTab,
      selectedPlace,
      selectedBusiness,
      transitDraft,
      conciergeDraft,
      searchState,
      openBusinessFlow,
      openPlace,
      startConciergeForBusiness,
      startTransitToBusiness,
      startConciergeForPlace,
      startTransitToPlace,
      setTransitPickupFromPlace,
      clearFlow,
    ]
  );

  return (
    <SttFlowContext.Provider value={value}>
      {children}
    </SttFlowContext.Provider>
  );
}

export function useSttFlow() {
  const context = useContext(SttFlowContext);

  if (!context) {
    throw new Error("useSttFlow must be used inside SttFlowProvider");
  }

  return context;
}