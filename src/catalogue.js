export const money=v=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2,minimumFractionDigits:0}).format(v||0);

export const grouped=products=>[...products.reduce((map,p)=>{
  const old=map.get(p.product_code);
  const curP=p.price!==null&&p.price!==undefined?Number(p.price):null;
  const isGoldLinked=p.pricing_mode==='GOLD_LINKED'||old?.pricing_mode==='GOLD_LINKED';
  const offer=p.offer||old?.offer;
  const originalPrice=p.original_price||old?.original_price;
  const discountAmount=p.discount_amount||old?.discount_amount;
  if(!old){
    map.set(p.product_code,{...p,minPrice:curP,maxPrice:curP,pricing_mode:p.pricing_mode,offer,original_price:originalPrice,discount_amount:discountAmount});
  }else{
    const minP=Math.min(old.minPrice??Infinity,curP??Infinity);
    const maxP=Math.max(old.maxPrice??-Infinity,curP??-Infinity);
    const keepNew=(p.stock>0&&old.stock===0)||(Boolean(p.stock>0)===Boolean(old.stock>0)&&p.price<old.price);
    const rep=keepNew?{...p}:{...old};
    rep.minPrice=minP===Infinity?null:minP;
    rep.maxPrice=maxP===-Infinity?null:maxP;
    if(isGoldLinked)rep.pricing_mode='GOLD_LINKED';
    // Price and discount must come from the same displayed variant.
    rep.offer=rep.offer||null;
    map.set(p.product_code,rep);
  }
  return map;
},new Map()).values()];
