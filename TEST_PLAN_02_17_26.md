# Test Plan: DoorKnock v0.8.0 Features
**Date:** 02_17_26
**Objective:** Verify stability of recent "Delete Pin", "Routes", and "Long Press" updates.

## 1. Long Press & Pin Creation
- [x] **Action:** Simulate 2000ms hold on map.
- [x] **Expected:** Pin drops, panel opens.
- [x] **Action:** Save pin with note "Test Pin".
- [x] **Expected:** Pin turns blue/saved color, "Saved" toast appears.

## 2. Delete Pin
- [x] **Action:** Select the "Test Pin" created above.
- [x] **Action:** Scroll to bottom of panel -> Click "DELETE PIN".
- [x] **Action:** Confirm browser dialog.
- [x] **Expected:** Pin marker removed from map immediately.
- [x] **Backend Verification:** Fetch pin list to confirm `status="Deleted"`.

## 3. View Routes (Breadcrumbs)
- [x] **Action:** Menu -> "View Routes".
- [x] **Expected:** Toast "Fetching...", then "Showing X sessions".
- [x] **Expected:** Polylines visible on map.
- [x] **Fallback Test:** If today is empty, ensure it says "showing recent history".

## 4. Session Stats
- [x] **Action:** Menu -> "Session Stats".
- [x] **Expected:** Modal overlay appears with Knocks/Pins/Duration.
- [x] **Action:** Click "Close".

## 5. GPS Force Refresh
- [x] **Action:** Long-press "Locate" button (bottom right).
- [x] **Expected:** Toast "Resetting GPS...".

---
**Status Log:**
*Completed 02_17_26 - All systems GO.*
