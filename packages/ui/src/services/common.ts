/**
 * Format a given number to US local, with needed fraction digits
 *
 * @param {int} val  Number to format
 * @param {int} decimals  Max decimals to show
 *
 * @return {string|null} Formated number or null if invalid.
 */
export function numFormat(val: number, dec: number) {
  if (!isNaN(val)) return val.toLocaleString('en-US', { maximumFractionDigits: dec });
  else return null;
}

/**
 * Apply format to an asset amount with its decimals.
 *
 * @param {int} val  Number to format
 * @param {int} decimals  Assets max decimals
 *
 * @return {string|null} Formated number or null if invalid.
 */
export function assetFormat(val: number, dec: number) {
  const decimals = dec || 0;
  const amount = val / Math.pow(10, decimals);
  return numFormat(amount, decimals);
}

/**
 * Fix its decimal to x digits after dot
 *
 * @param {int | null} val  Number to format
 * @param {int} x  max digits after dot
 *
 * @return {string|null} Formated number or null if invalid.
 */
export function roundAmount(val: number | null, x: number) {
  if (val == null || !Number(val)) {
    return val;
  }

  let fixed =  Number(val).toFixed(x);

  var parts = fixed.split(".")
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return parts.join(".")
}

export function thousandSeparator(val: number | String) {
  let fixed =  Number(val).toString();

  var parts = fixed.split(".")
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  return parts.join(".")
}

export function splitUntil(input: string, x: number) {
  var parts = input.split(".");

  if (parts[1]) {
    parts[1] = parts[1].substr(0, x)
  }

  return parts.join(".")
}
