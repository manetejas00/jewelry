import {validationError} from './errors.js';
import Decimal from 'decimal.js';
export function calculateMargin(baseSubtotal, rule = {}) {
  const type = rule.margin_type || 'PERCENT';
  const value = new Decimal(rule.margin_value || 0);
  if (!['FIXED','PERCENT'].includes(type) || !value.isFinite() || value.isNegative()) throw validationError('Invalid margin rule');
  return (type === 'FIXED' ? value : new Decimal(baseSubtotal).mul(value).div(100)).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}
export function validatePricingRule(input) {
  const tax = Number(input.tax_percent), rounding = Number(input.rounding);
  if (input.tax_percent === '' || !Number.isFinite(tax) || tax < 0 || tax > 100 || ![1,0.01,10,100].includes(rounding) || !['exclusive','inclusive'].includes(input.tax_treatment))
    throw validationError('Enter a tax percentage from 0 to 100 and a supported tax/rounding rule.');
  const margin_type = input.margin_type || 'PERCENT';
  const raw = input.margin_value ?? 0;
  if (!['FIXED','PERCENT'].includes(margin_type) || !/^\d+(\.\d{1,4})?$/.test(String(raw))) throw validationError('Enter a non-negative margin and choose fixed amount or percentage.');
  const value = new Decimal(raw);
  if (value.gt(margin_type === 'PERCENT' ? 1000 : '999999999.99')) throw validationError('Margin exceeds the supported limit.');
  if (margin_type === 'FIXED' && value.decimalPlaces() > 2) throw validationError('Fixed margin allows at most two decimal places.');
  return {tax_percent:tax,rounding,tax_treatment:input.tax_treatment,margin_type,margin_value:value.toNumber()};
}
