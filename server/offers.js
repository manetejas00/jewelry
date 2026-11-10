import {validationError} from './errors.js';
export function validateOffer(input){
 if(!input||typeof input!=='object')throw validationError('Invalid offer');
 for(const [key,max] of [['name',200],['badge_text',100]])if(typeof input[key]!=='string'||!input[key].trim()||input[key].length>max)throw validationError(`Enter a valid ${key}`);
 if(!['making_percent','total_percent','flat_amount','badge_only'].includes(input.discount_type))throw validationError('Invalid discount type');
 const amount=Number(input.discount_value);
 if(!Number.isFinite(amount)||amount<0||amount>10000000||(['making_percent','total_percent'].includes(input.discount_type)&&amount>100))throw validationError('Discount must be nonnegative; percentages cannot exceed 100');
 if(!['all','products','coins','gold','silver','category','sku'].includes(input.applies_to))throw validationError('Invalid offer target');
 if(['category','sku'].includes(input.applies_to)&&!String(input.target_value||'').trim())throw validationError('Offer target is required');
 if(!['active','paused'].includes(input.status))throw validationError('Invalid offer status');
 if(!Number.isInteger(Number(input.priority))||Math.abs(Number(input.priority))>10000)throw validationError('Priority must be an integer between -10000 and 10000');
 for(const field of ['show_in_banner','show_in_grid'])if(![true,false,0,1].includes(input[field]))throw validationError('Offer visibility must be a boolean');
 for(const [field,max] of [['code',50],['target_value',200],['banner_headline',250],['banner_subtext',500]])if(input[field]!=null&&(typeof input[field]!=='string'||input[field].length>max))throw validationError(`Invalid ${field}`);
 return input;
}
