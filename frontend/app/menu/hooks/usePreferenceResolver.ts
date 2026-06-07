import { useState, useEffect } from "react";
import { MenuItem } from "../components/MenuItemCard";

export interface PreferenceProfile {
  vegan: number;
  vegetarian: number;
  glutenFree: number;
  halal: number;
  dairyFree: number;
  seafoodPreference: number;
  sweetTooth: number;
}

export function usePreferenceResolver() {
  const [profile, setProfile] = useState<PreferenceProfile>({
    vegan: 0,
    vegetarian: 0,
    glutenFree: 0,
    halal: 0,
    dairyFree: 0,
    seafoodPreference: 0,
    sweetTooth: 0,
  });

  // Load profile from sessionStorage to survive refreshes
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("tripzy_preference_profile");
      if (stored) {
        try {
          setProfile(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to parse stored preference profile", e);
        }
      }
    }
  }, []);

  const updateProfile = (updater: (prev: PreferenceProfile) => PreferenceProfile) => {
    setProfile((prev) => {
      const next = updater(prev);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("tripzy_preference_profile", JSON.stringify(next));
      }
      return next;
    });
  };

  const registerDietaryFilterClick = (filterKey: string) => {
    updateProfile((prev) => {
      const next = { ...prev };
      if (filterKey === "vegan") {
        next.vegan += 5;
        next.vegetarian += 3;
      } else if (filterKey === "vegetarian") {
        next.vegetarian += 5;
      } else if (filterKey === "gluten-free") {
        next.glutenFree += 5;
      } else if (filterKey === "halal") {
        next.halal += 5;
      }
      return next;
    });
  };

  const registerItemInteraction = (item: MenuItem, eventType: "view" | "expand" | "add_to_cart") => {
    const multiplier = eventType === "view" ? 1 : eventType === "expand" ? 2.5 : 5;
    
    updateProfile((prev) => {
      const next = { ...prev };
      
      // Check dietary labels of item
      if (item.dietaryLabels) {
        item.dietaryLabels.forEach((lbl) => {
          const key = lbl.key.toLowerCase();
          if (key === "vegan") next.vegan += 1 * multiplier;
          if (key === "vegetarian") next.vegetarian += 1 * multiplier;
          if (key === "gluten-free") next.glutenFree += 1 * multiplier;
          if (key === "halal") next.halal += 1 * multiplier;
        });
      }

      // Check item category & name/descriptions for implicit signals
      const itemTitle = (item.nameEn || "").toLowerCase() + " " + (item.nameTr || "").toLowerCase();
      const itemDesc = ((item.descriptionEn || "") + " " + (item.descriptionTr || "")).toLowerCase();
      const fullText = itemTitle + " " + itemDesc;

      // Gluten free signals
      if (fullText.includes("glutensiz") || fullText.includes("gluten free")) {
        next.glutenFree += 0.8 * multiplier;
      }

      // Dairy free signals
      if (fullText.includes("dairy free") || fullText.includes("laktozsuz") || fullText.includes("sütsüz")) {
        next.dairyFree += 1 * multiplier;
      }

      // Seafood signals
      if (fullText.includes("fish") || fullText.includes("balık") || fullText.includes("lobster") || fullText.includes("sea bass") || fullText.includes("istakoz")) {
        next.seafoodPreference += 1 * multiplier;
      }

      // Sweet tooth signals
      if (fullText.includes("dessert") || fullText.includes("tatlı") || fullText.includes("chocolate") || fullText.includes("çikolata") || fullText.includes("pasta") || fullText.includes("sugar")) {
        next.sweetTooth += 0.8 * multiplier;
      }

      return next;
    });
  };

  // Checks if a menu item matches the user's implicit profile, scoring it.
  const getItemMatchingScore = (item: MenuItem): number => {
    let score = 0;

    if (item.dietaryLabels) {
      item.dietaryLabels.forEach((lbl) => {
        const key = lbl.key.toLowerCase();
        if (key === "vegan") score += profile.vegan;
        if (key === "vegetarian") score += profile.vegetarian;
        if (key === "gluten-free") score += profile.glutenFree;
        if (key === "halal") score += profile.halal;
      });
    }

    const itemTitle = (item.nameEn || "").toLowerCase() + " " + (item.nameTr || "").toLowerCase();
    const itemDesc = ((item.descriptionEn || "") + " " + (item.descriptionTr || "")).toLowerCase();
    const fullText = itemTitle + " " + itemDesc;

    if (fullText.includes("glutensiz") || fullText.includes("gluten free")) {
      score += profile.glutenFree * 0.5;
    }
    if (fullText.includes("dairy free") || fullText.includes("laktozsuz") || fullText.includes("sütsüz")) {
      score += profile.dairyFree * 0.5;
    }
    if (fullText.includes("fish") || fullText.includes("balık") || fullText.includes("lobster") || fullText.includes("sea bass") || fullText.includes("istakoz")) {
      score += profile.seafoodPreference * 0.5;
    }
    if (fullText.includes("dessert") || fullText.includes("tatlı") || fullText.includes("chocolate") || fullText.includes("çikolata")) {
      score += profile.sweetTooth * 0.5;
    }

    return score;
  };

  return {
    profile,
    registerDietaryFilterClick,
    registerItemInteraction,
    getItemMatchingScore,
    isHighlyRecommended: (item: MenuItem): boolean => {
      const score = getItemMatchingScore(item);
      return score >= 10.0;
    },
  };
}
