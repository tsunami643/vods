/**
 * Find the first message whose time is greater than the target.
 * Messages must already be sorted by time.
 */
export function binarySearchByTime(messages, targetTime) {
  let low = 0;
  let high = messages.length;

  while (low < high) {
    const middle = (low + high) >>> 1;
    if (messages[middle].time <= targetTime) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  return low;
}

/**
 * Merge messages into an existing time-sorted array without duplicating IDs.
 */
export function mergeSortedMessages(existing, newMessages) {
  if (newMessages.length === 0) return existing;
  if (existing.length === 0) {
    const sorted = [...newMessages];
    sorted.sort((first, second) => first.time - second.time);
    return sorted;
  }

  const existingIds = new Set(existing.map((message) => message._id));
  const uniqueNew = newMessages.filter((message) => !existingIds.has(message._id));
  if (uniqueNew.length === 0) return existing;

  uniqueNew.sort((first, second) => first.time - second.time);

  const result = [];
  let existingIndex = 0;
  let newIndex = 0;

  while (existingIndex < existing.length && newIndex < uniqueNew.length) {
    if (existing[existingIndex].time <= uniqueNew[newIndex].time) {
      result.push(existing[existingIndex]);
      existingIndex += 1;
    } else {
      result.push(uniqueNew[newIndex]);
      newIndex += 1;
    }
  }

  while (existingIndex < existing.length) {
    result.push(existing[existingIndex]);
    existingIndex += 1;
  }
  while (newIndex < uniqueNew.length) {
    result.push(uniqueNew[newIndex]);
    newIndex += 1;
  }

  return result;
}

export function getMessageWindow(messages, targetTime, limit) {
  const endIndex = binarySearchByTime(messages, targetTime);
  const startIndex = Math.max(0, endIndex - limit);
  return messages.slice(startIndex, endIndex);
}
