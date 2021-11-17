/**
 * @license
 * Copyright 2020
 * =========================================
 */

///
///
export function parseAmount(number, decimals) {
  if (decimals === 0) {
    return number
  }

  let divider = 10 * decimals;

  return number / divider;
} 