export const coinArtwork = [
 ['COIN-AU-1G','24K Lakshmi 999 Pure Gold Coin (1 Gram)','Gold','24K',1,'lakshmi-gold-1g-v1.png'],
 ['COIN-AU-5G','24K Lakshmi Ganesh 999 Pure Gold Coin (5 Grams)','Gold','24K',5,'lakshmi-ganesh-gold-5g-v1.png'],
 ['COIN-AU-10G','24K Royal Emblem 999 Pure Gold Coin (10 Grams)','Gold','24K',10,'royal-emblem-gold-10g-v1.png'],
 ['COIN-AG-10G','999 Fine Silver Floral Coin (10 Grams)','Silver','999',10,'floral-silver-10g-v1.png'],
 ['COIN-AG-50G','999 Fine Silver Lakshmi Ganesh Coin (50 Grams)','Silver','999',50,'lakshmi-ganesh-silver-50g-v1.png'],
 ['COIN-AG-100G','999 Fine Silver Cast Bar / Coin (100 Grams)','Silver','999',100,'cast-bar-silver-100g-v1.png']
].map(([sku,name,metal,purity,weight_g,file])=>({sku,name,metal,purity,weight_g,image:'/assets/coin-art/'+file}));
