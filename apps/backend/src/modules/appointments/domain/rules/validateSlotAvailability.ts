import { isValidTimeRange } from "@biodentis/shared-validators";

export function validateSlotAvailability(
  startTime: string,
  endTime: string,
  availableSlots: { startTime: string; endTime: string }[]
): boolean {
  if (!isValidTimeRange(startTime, endTime)) {
    return false;
  }

  return availableSlots.some(
    (slot) => slot.startTime === startTime && slot.endTime === endTime
  );
}
