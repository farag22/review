export const APP_COMMISSION_RATE = 0.1;
export const WALLET_INSUFFICIENT_MSG = "رصيد المحفظة غير كافٍ، يرجى الشحن أو الدفع نقداً";

export function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function appCommission(fare) {
  return roundMoney(Number(fare) * APP_COMMISSION_RATE);
}

export function captainNet(fare) {
  return roundMoney(Number(fare) - appCommission(fare));
}

export function availableWalletBalance(balance, held = 0) {
  return roundMoney((Number(balance) || 0) - (Number(held) || 0));
}
