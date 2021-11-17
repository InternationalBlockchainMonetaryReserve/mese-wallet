/**
 * @license
 * Copyright 2020
 * =========================================
 */

///
///
export function assetError(message) {

  if (message.includes('overspend')) {
    return `Can't add Asset, insufficient balance`;
  }

  if (message.includes('below min')) {
    let parsed = JSON.parse(message).message
    let regex = /\d+/g;

    let numbers = parsed.match(regex);

    // Error Handle
    if (numbers.length == 0) {
      return `Can't add the asset. Your balance is below minimum.`;
    }

    let asset = numbers[numbers.length - 1]; // Asset
    let minBalance = numbers[numbers.length - 2]; // Minimal Balance

    return `Can't add the asset. Your balance is below minimum of ${minBalance / 1e6} Algo for ${asset} assets.`

  }

  return 'Something Went Wrong';
}

export function transactionError(message) {

  if (message.includes('overspend') || message.includes('below min')) {
    return `Insufficient balance`;
  }

  // The recipient haven't opted in
  if (message.includes('missing') && message.includes('asset')) {
    return `The recipient haven't opted in the asset`;
  }

  return 'Something Went Wrong';
}

export function optedinError(message) {
  if (message.includes('no assets found')) {
    return 'Asset not found'
  }

  return 'Asset not found';
}

// Capitalize first letter
export function capitalize(message) {
  return message.charAt(0).toUpperCase() + message.slice(1);
}