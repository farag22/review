export const APP_COMMISSION_RATE = 0.1;
export const WALLET_INSUFFICIENT_MSG = "رصيد المحفظة غير كافٍ، يرجى الشحن أو الدفع نقداً";
export const CAPTAIN_DEBT_LIMIT = 300;
export const CAPTAIN_LOCKED_MSG = "الحساب مقفول بسبب مديونية تجاوزت 300 ج.م. يرجى السداد عبر فودافون كاش";
export const VODAFONE_CASH = "01003454288";

export function captainDebt(driver) {
  return roundMoney(driver?.debt);
}

export function isCaptainLocked(driver) {
  if (!driver) return false;
  if (driver.locked === true) return true;
  return captainDebt(driver) >= CAPTAIN_DEBT_LIMIT;
}

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
