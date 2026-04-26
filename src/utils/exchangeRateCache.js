// Exchange rate cache management with 1-hour expiration

let rateCache = {
  aedInr: null,
  timestamp: null
};

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
const API_KEY = "b8aa11a78aed165e19767eea";
const API_BASE = "https://v6.exchangerate-api.com/v6";

/**
 * Get AED-INR exchange rate
 * Fetches from API if cache is older than 1 hour
 * @returns {Promise<number>} AED-INR exchange rate
 */
export async function getAEDINRRate() {
  const now = Date.now();

  // Check if cache is still valid (less than 1 hour old)
  if (
    rateCache.aedInr &&
    rateCache.timestamp &&
    now - rateCache.timestamp < CACHE_DURATION
  ) {
    console.log("Using cached AED-INR rate:", rateCache.aedInr);
    return rateCache.aedInr;
  }

  try {
    console.log("Fetching fresh AED-INR rate from API...");
    const response = await fetch(
      `${API_BASE}/${API_KEY}/pair/AED/INR`
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();

    if (data.result !== "success") {
      throw new Error("API returned unsuccessful result");
    }

    const conversionRate = data.conversion_rate;

    // Update cache
    rateCache.aedInr = conversionRate;
    rateCache.timestamp = now;

    // Store in localStorage for persistence across page reloads
    localStorage.setItem(
      "aedInrRateCache",
      JSON.stringify({
        rate: conversionRate,
        timestamp: now
      })
    );

    console.log("Fresh AED-INR rate fetched and cached:", conversionRate);
    return conversionRate;
  } catch (error) {
    console.error("Error fetching AED-INR rate:", error);

    // Try to use localStorage fallback if API fails
    const stored = localStorage.getItem("aedInrRateCache");
    if (stored) {
      try {
        const { rate } = JSON.parse(stored);
        console.log("Using fallback rate from localStorage:", rate);
        rateCache.aedInr = rate;
        return rate;
      } catch (parseError) {
        console.error("Error parsing stored rate:", parseError);
      }
    }

    // Fallback rate if no cache available
    console.warn("Using default fallback rate: 25.3605");
    return 25.3605;
  }
}

/**
 * Clear the rate cache (useful for testing or forcing refresh)
 */
export function clearRateCache() {
  rateCache = { aedInr: null, timestamp: null };
  localStorage.removeItem("aedInrRateCache");
  console.log("Rate cache cleared");
}

/**
 * Get cache status
 */
export function getRateCacheStatus() {
  const now = Date.now();
  const ageMs = rateCache.timestamp ? now - rateCache.timestamp : null;
  const ageMinutes = ageMs ? Math.round(ageMs / 60000) : null;

  return {
    rate: rateCache.aedInr,
    timestamp: rateCache.timestamp,
    ageMinutes,
    isValid: ageMs ? ageMs < CACHE_DURATION : false
  };
}

/**
 * Calculate Balance (AED) based on currency and quantity
 * @param {string} currency - Currency code (AED, USD, INR, etc.)
 * @param {number} qty - Quantity
 * @param {number} aedInrRate - Current AED-INR exchange rate
 * @returns {number} Balance in AED
 */
export function calculateBalanceAED(currency, qty, aedInrRate) {
  const quantity = parseFloat(qty) || 0;

  if (currency === "AED") {
    return quantity;
  } else if (currency === "USD") {
    return quantity * 3.6725;
  } else if (currency === "INR") {
    return quantity * (1 / aedInrRate);
  }
  return 0;
}

/**
 * Calculate Balance (INR) from Balance (AED)
 * @param {number} balanceAED - Balance in AED
 * @param {number} aedInrRate - Current AED-INR exchange rate
 * @returns {number} Balance in INR
 */
export function calculateBalanceINR(balanceAED, aedInrRate) {
  return balanceAED * aedInrRate;
}
