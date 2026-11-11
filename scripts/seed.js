import fs from 'node:fs';
import bcrypt from 'bcryptjs';
import {db,migrate,preview} from '../server/db.js';
import {previewImport,publishImport} from '../server/importer.js';
import {writeSamples} from './samples.js';
import {ReviewSeeder} from '../seeders/ReviewSeeder.js';
export const seedReviews = (k=db) => ReviewSeeder(k);
const base='https://cdnstatic.tencentcs.com/edgeone/pages/product-activities/jewelry/';

export async function seedProductImages(k=db){
  if(await k.schema.hasTable('product_images')&&!(await k('product_images').first())){
    const now=new Date().toISOString();
    const demoImages=[
      // Nocturne Pearl Cuff (Reference Product)
      {product_code:'nocturne-cuff',role:'hero',url:'/assets/products/nocturne-cuff/hero.webp',alt_text:'Nocturne Pearl Cuff Hero Shot',sort_order:1,created_at:now,updated_at:now},
      {product_code:'nocturne-cuff',role:'left',url:'/assets/products/nocturne-cuff/left.webp',alt_text:'Nocturne Pearl Cuff Left Profile',sort_order:2,created_at:now,updated_at:now},
      {product_code:'nocturne-cuff',role:'right',url:'/assets/products/nocturne-cuff/right.webp',alt_text:'Nocturne Pearl Cuff Right Profile',sort_order:3,created_at:now,updated_at:now},
      {product_code:'nocturne-cuff',role:'detail',url:'/assets/products/nocturne-cuff/modal.webp',alt_text:'Nocturne Pearl Cuff Macro Detail',sort_order:6,created_at:now,updated_at:now},

      // Eclipse Ring multi-angle
      {product_code:'eclipse-ring',role:'hero',url:'/assets/products/eclipse-ring/hero.webp',alt_text:'Eclipse Pearl Ring Hero Shot',sort_order:1,created_at:now,updated_at:now},
      {product_code:'eclipse-ring',role:'front',url:'/assets/products/eclipse-ring/hero.webp',alt_text:'Eclipse Pearl Ring Front Angle',sort_order:2,created_at:now,updated_at:now},
      {product_code:'eclipse-ring',role:'left',url:'/assets/products/eclipse-ring/left.webp',alt_text:'Eclipse Pearl Ring Left Profile',sort_order:3,created_at:now,updated_at:now},
      {product_code:'eclipse-ring',role:'right',url:'/assets/products/eclipse-ring/right.webp',alt_text:'Eclipse Pearl Ring Right Profile',sort_order:4,created_at:now,updated_at:now},
      {product_code:'eclipse-ring',role:'detail',url:'/assets/products/eclipse-ring/modal.webp',alt_text:'Eclipse Pearl Ring Macro Detail',sort_order:6,created_at:now,updated_at:now},
      {product_code:'eclipse-ring',role:'model',url:'/assets/products/eclipse-ring/model.webp',alt_text:'Eclipse Pearl Ring Model Shot',sort_order:5,created_at:now,updated_at:now},
      
      // Lune Pearl Drops multi-angle
      {product_code:'lune-pearl-drops',role:'hero',url:'/assets/products/lune-pearl-drops/hero.webp',alt_text:'Lune Pearl Drops Hero Shot',sort_order:1,created_at:now,updated_at:now},
      {product_code:'lune-pearl-drops',role:'front',url:'/assets/products/lune-pearl-drops/hero.webp',alt_text:'Lune Pearl Drops Front Angle',sort_order:2,created_at:now,updated_at:now},
      {product_code:'lune-pearl-drops',role:'left',url:'/assets/products/lune-pearl-drops/left.webp',alt_text:'Lune Pearl Drops Left Angle',sort_order:3,created_at:now,updated_at:now},
      {product_code:'lune-pearl-drops',role:'right',url:'/assets/products/lune-pearl-drops/right.webp',alt_text:'Lune Pearl Drops Right Angle',sort_order:4,created_at:now,updated_at:now},
      {product_code:'lune-pearl-drops',role:'detail',url:'/assets/products/lune-pearl-drops/modal.webp',alt_text:'Lune Pearl Drops Macro Detail',sort_order:6,created_at:now,updated_at:now},
      {product_code:'lune-pearl-drops',role:'model',url:'/assets/products/lune-pearl-drops/model.webp',alt_text:'Lune Pearl Drops Model Shot',sort_order:5,created_at:now,updated_at:now},

      // Atelier Pearl Collar multi-angle
      {product_code:'atelier-pearl-collar',role:'hero',url:'/assets/products/atelier-pearl-collar/hero.webp',alt_text:'Atelier Pearl Collar Hero Shot',sort_order:1,created_at:now,updated_at:now},
      {product_code:'atelier-pearl-collar',role:'front',url:'/assets/products/atelier-pearl-collar/hero.webp',alt_text:'Atelier Pearl Collar Front Angle',sort_order:2,created_at:now,updated_at:now},
      {product_code:'atelier-pearl-collar',role:'left',url:'/assets/products/atelier-pearl-collar/left.webp',alt_text:'Atelier Pearl Collar Left Angle',sort_order:3,created_at:now,updated_at:now},
      {product_code:'atelier-pearl-collar',role:'right',url:'/assets/products/atelier-pearl-collar/right.webp',alt_text:'Atelier Pearl Collar Right Angle',sort_order:4,created_at:now,updated_at:now},
      {product_code:'atelier-pearl-collar',role:'detail',url:'/assets/products/atelier-pearl-collar/modal.webp',alt_text:'Atelier Pearl Collar Macro Detail',sort_order:6,created_at:now,updated_at:now},
      {product_code:'atelier-pearl-collar',role:'model',url:'/assets/products/atelier-pearl-collar/model.webp',alt_text:'Atelier Pearl Collar Model Shot',sort_order:5,created_at:now,updated_at:now},

      // Noir Halo Studs multi-angle
      {product_code:'noir-halo-studs',role:'hero',url:'/assets/products/noir-halo-studs/hero.webp',alt_text:'Noir Halo Studs Hero Shot',sort_order:1,created_at:now,updated_at:now},
      {product_code:'noir-halo-studs',role:'left',url:'/assets/products/noir-halo-studs/left.webp',alt_text:'Noir Halo Studs Left Angle',sort_order:2,created_at:now,updated_at:now},
      {product_code:'noir-halo-studs',role:'right',url:'/assets/products/noir-halo-studs/right.webp',alt_text:'Noir Halo Studs Right Angle',sort_order:3,created_at:now,updated_at:now},
      {product_code:'noir-halo-studs',role:'detail',url:'/assets/products/noir-halo-studs/modal.webp',alt_text:'Noir Halo Studs Macro Detail',sort_order:6,created_at:now,updated_at:now},

      // Velours Pearl Earrings multi-angle
      {product_code:'velours-earrings',role:'hero',url:'/assets/products/velours-earrings/hero.webp',alt_text:'Velours Pearl Earrings Hero Shot',sort_order:1,created_at:now,updated_at:now},
      {product_code:'velours-earrings',role:'left',url:'/assets/products/velours-earrings/left.webp',alt_text:'Velours Pearl Earrings Left Angle',sort_order:2,created_at:now,updated_at:now},
      {product_code:'velours-earrings',role:'right',url:'/assets/products/velours-earrings/right.webp',alt_text:'Velours Pearl Earrings Right Angle',sort_order:3,created_at:now,updated_at:now},
      {product_code:'velours-earrings',role:'detail',url:'/assets/products/velours-earrings/modal.webp',alt_text:'Velours Pearl Earrings Macro Detail',sort_order:6,created_at:now,updated_at:now},

      // Coins multi-angle (hero, left, right, modal)
      {product_code:'coin-au-1g',sku:'COIN-AU-1G',role:'hero',url:'/assets/coins/coin-au-1g/hero.webp',alt_text:'24K Lakshmi Gold Coin 1g Obverse Face',sort_order:1,created_at:now,updated_at:now},
      {product_code:'coin-au-1g',sku:'COIN-AU-1G',role:'left',url:'/assets/coins/coin-au-1g/left.webp',alt_text:'24K Lakshmi Gold Coin 1g Edge View',sort_order:2,created_at:now,updated_at:now},
      {product_code:'coin-au-1g',sku:'COIN-AU-1G',role:'right',url:'/assets/coins/coin-au-1g/right.webp',alt_text:'24K Lakshmi Gold Coin 1g Reverse Design',sort_order:3,created_at:now,updated_at:now},
      {product_code:'coin-au-1g',sku:'COIN-AU-1G',role:'detail',url:'/assets/coins/coin-au-1g/modal.webp',alt_text:'24K Lakshmi Gold Coin 1g Macro Detail',sort_order:6,created_at:now,updated_at:now},

      {product_code:'coin-au-5g',sku:'COIN-AU-5G',role:'hero',url:'/assets/coins/coin-au-5g/hero.webp',alt_text:'24K Lakshmi Ganesh Gold Coin 5g Obverse Face',sort_order:1,created_at:now,updated_at:now},
      {product_code:'coin-au-5g',sku:'COIN-AU-5G',role:'left',url:'/assets/coins/coin-au-5g/left.webp',alt_text:'24K Lakshmi Ganesh Gold Coin 5g Edge View',sort_order:2,created_at:now,updated_at:now},
      {product_code:'coin-au-5g',sku:'COIN-AU-5G',role:'right',url:'/assets/coins/coin-au-5g/right.webp',alt_text:'24K Lakshmi Ganesh Gold Coin 5g Reverse Design',sort_order:3,created_at:now,updated_at:now},
      {product_code:'coin-au-5g',sku:'COIN-AU-5G',role:'detail',url:'/assets/coins/coin-au-5g/modal.webp',alt_text:'24K Lakshmi Ganesh Gold Coin 5g Macro Detail',sort_order:6,created_at:now,updated_at:now},

      {product_code:'coin-au-10g',sku:'COIN-AU-10G',role:'hero',url:'/assets/coins/coin-au-10g/hero.webp',alt_text:'24K Royal Emblem Gold Coin 10g Obverse Face',sort_order:1,created_at:now,updated_at:now},
      {product_code:'coin-au-10g',sku:'COIN-AU-10G',role:'left',url:'/assets/coins/coin-au-10g/left.webp',alt_text:'24K Royal Emblem Gold Coin 10g Edge View',sort_order:2,created_at:now,updated_at:now},
      {product_code:'coin-au-10g',sku:'COIN-AU-10G',role:'right',url:'/assets/coins/coin-au-10g/right.webp',alt_text:'24K Royal Emblem Gold Coin 10g Reverse Design',sort_order:3,created_at:now,updated_at:now},
      {product_code:'coin-au-10g',sku:'COIN-AU-10G',role:'detail',url:'/assets/coins/coin-au-10g/modal.webp',alt_text:'24K Royal Emblem Gold Coin 10g Macro Detail',sort_order:6,created_at:now,updated_at:now},

      {product_code:'coin-ag-10g',sku:'COIN-AG-10G',role:'hero',url:'/assets/coins/coin-ag-10g/hero.webp',alt_text:'999 Fine Silver Floral Coin 10g Obverse Face',sort_order:1,created_at:now,updated_at:now},
      {product_code:'coin-ag-10g',sku:'COIN-AG-10G',role:'left',url:'/assets/coins/coin-ag-10g/left.webp',alt_text:'999 Fine Silver Floral Coin 10g Edge View',sort_order:2,created_at:now,updated_at:now},
      {product_code:'coin-ag-10g',sku:'COIN-AG-10G',role:'right',url:'/assets/coins/coin-ag-10g/right.webp',alt_text:'999 Fine Silver Floral Coin 10g Reverse Design',sort_order:3,created_at:now,updated_at:now},
      {product_code:'coin-ag-10g',sku:'COIN-AG-10G',role:'detail',url:'/assets/coins/coin-ag-10g/modal.webp',alt_text:'999 Fine Silver Floral Coin 10g Macro Detail',sort_order:6,created_at:now,updated_at:now},

      {product_code:'coin-ag-50g',sku:'COIN-AG-50G',role:'hero',url:'/assets/coins/coin-ag-50g/hero.webp',alt_text:'999 Fine Silver Lakshmi Ganesh Coin 50g Obverse Face',sort_order:1,created_at:now,updated_at:now},
      {product_code:'coin-ag-50g',sku:'COIN-AG-50G',role:'left',url:'/assets/coins/coin-ag-50g/left.webp',alt_text:'999 Fine Silver Lakshmi Ganesh Coin 50g Edge View',sort_order:2,created_at:now,updated_at:now},
      {product_code:'coin-ag-50g',sku:'COIN-AG-50G',role:'right',url:'/assets/coins/coin-ag-50g/right.webp',alt_text:'999 Fine Silver Lakshmi Ganesh Coin 50g Reverse Design',sort_order:3,created_at:now,updated_at:now},
      {product_code:'coin-ag-50g',sku:'COIN-AG-50G',role:'detail',url:'/assets/coins/coin-ag-50g/modal.webp',alt_text:'999 Fine Silver Lakshmi Ganesh Coin 50g Macro Detail',sort_order:6,created_at:now,updated_at:now},

      {product_code:'coin-ag-100g',sku:'COIN-AG-100G',role:'hero',url:'/assets/coins/coin-ag-100g/hero.webp',alt_text:'999 Fine Silver Cast Bar 100g Obverse Face',sort_order:1,created_at:now,updated_at:now},
      {product_code:'coin-ag-100g',sku:'COIN-AG-100G',role:'left',url:'/assets/coins/coin-ag-100g/left.webp',alt_text:'999 Fine Silver Cast Bar 100g Edge View',sort_order:2,created_at:now,updated_at:now},
      {product_code:'coin-ag-100g',sku:'COIN-AG-100G',role:'right',url:'/assets/coins/coin-ag-100g/right.webp',alt_text:'999 Fine Silver Cast Bar 100g Reverse Design',sort_order:3,created_at:now,updated_at:now},
      {product_code:'coin-ag-100g',sku:'COIN-AG-100G',role:'detail',url:'/assets/coins/coin-ag-100g/modal.webp',alt_text:'999 Fine Silver Cast Bar 100g Macro Detail',sort_order:6,created_at:now,updated_at:now}
    ];
    await k('product_images').insert(demoImages);
  }
}

export async function seedOffers(k=db){
  if(await k.schema.hasTable('offers')&&!(await k('offers').first())){
    const now=new Date().toISOString();
    await k('offers').insert([
      {
        name:'Festive Making Charge Discount',
        code:'FESTIVE50',
        badge_text:'50% OFF ON MC',
        discount_type:'making_percent',
        discount_value:50.00,
        applies_to:'all',
        target_value:null,
        banner_headline:'Festive offer is live | Up to 50% off* on Making Charges',
        banner_subtext:'Celebrate with certified hallmarked heirlooms & pure bullion coins',
        status:'active',
        priority:10,
        show_in_banner:1,
        show_in_grid:1,
        created_at:now,
        updated_at:now
      },
      {
        name:'Silver Bullion Zero Making Charge',
        code:'SILVERFREE',
        badge_text:'100% OFF ON MC',
        discount_type:'making_percent',
        discount_value:100.00,
        applies_to:'silver',
        target_value:null,
        banner_headline:'Zero Making Charge on 999 Fine Silver Coins',
        banner_subtext:'Pure silver minted bullion at transparent raw metal rates',
        status:'active',
        priority:20,
        show_in_banner:0,
        show_in_grid:1,
        created_at:now,
        updated_at:now
      }
    ]);
  }
}

export async function seedCoins(k=db){if(await k.schema.hasTable('coins')&&!(await k('coins').first())){const now=new Date().toISOString();await k('coins').insert([{sku:'COIN-AU-1G',name:'24K Lakshmi 999 Pure Gold Coin (1 Gram)',metal:'Gold',coin_type:'Gold Coin',purity:'24K',weight_g:1.000,dimension:'12 mm Round',making_charge:350.00,pricing_mode:'METAL_LINKED',stock:25,description:'Authentic 999 purity 24 Karat gold coin featuring an auspicious Goddess Lakshmi motif, encased in a certified tamper-proof blister pack.',image:'/assets/coins/coin-au-1g/hero.webp',image_kind:'illustration',status:'published',source_timestamp:now,created_at:now,updated_at:now},{sku:'COIN-AU-5G',name:'24K Lakshmi Ganesh 999 Pure Gold Coin (5 Grams)',metal:'Gold',coin_type:'Gold Coin',purity:'24K',weight_g:5.000,dimension:'20 mm Round',making_charge:750.00,pricing_mode:'METAL_LINKED',stock:15,description:'Pure 24K 999 gold investment coin with embossed Lakshmi and Ganesha deities for prosperity and auspicious beginnings.',image:'/assets/coins/coin-au-5g/hero.webp',image_kind:'illustration',status:'published',source_timestamp:now,created_at:now,updated_at:now},{sku:'COIN-AU-10G',name:'24K Royal Emblem 999 Pure Gold Coin (10 Grams)',metal:'Gold',coin_type:'Gold Coin',purity:'24K',weight_g:10.000,dimension:'25 mm Round',making_charge:1200.00,pricing_mode:'METAL_LINKED',stock:10,description:'10 Gram pure 24K investment grade coin with micro-milled security edges and individual serial number certificate.',image:'/assets/coins/coin-au-10g/hero.webp',image_kind:'illustration',status:'published',source_timestamp:now,created_at:now,updated_at:now},{sku:'COIN-AG-10G',name:'999 Fine Silver Floral Coin (10 Grams)',metal:'Silver',coin_type:'Silver Coin',purity:'999',weight_g:10.000,dimension:'28 mm Round',making_charge:150.00,pricing_mode:'METAL_LINKED',stock:50,description:'999 pure fine silver coin featuring traditional floral filigree engraving. Comes with individual protective capsule.',image:'/assets/coins/coin-ag-10g/hero.webp',image_kind:'illustration',status:'published',source_timestamp:now,created_at:now,updated_at:now},{sku:'COIN-AG-50G',name:'999 Fine Silver Lakshmi Ganesh Coin (50 Grams)',metal:'Silver',coin_type:'Silver Coin',purity:'999',weight_g:50.000,dimension:'45 mm Round',making_charge:350.00,pricing_mode:'METAL_LINKED',stock:30,description:'50 Grams of pure 999 fine silver with mirror finish proof relief, perfect for gifting, pooja, and wealth preservation.',image:'/assets/coins/coin-ag-50g/hero.webp',image_kind:'illustration',status:'published',source_timestamp:now,created_at:now,updated_at:now},{sku:'COIN-AG-100G',name:'999 Fine Silver Cast Bar / Coin (100 Grams)',metal:'Silver',coin_type:'Silver Coin',purity:'999',weight_g:100.000,dimension:'55 x 30 mm Rectangular',making_charge:500.00,pricing_mode:'METAL_LINKED',stock:20,description:'100 Grams certified 999 fine silver minted investment piece with serial numbering and assay certificate.',image:'/assets/coins/coin-ag-100g/hero.webp',image_kind:'illustration',status:'published',source_timestamp:now,created_at:now,updated_at:now}]);}}
export async function seed(k=db){if(!preview)throw Error('Fictional seed data is restricted to preview mode');if(!(await k('staff').first()))await k('staff').insert({email:'preview@veyora.local',password_hash:await bcrypt.hash('preview-veyora-2026',12),role:'owner'});if(!(await k('products').first())){writeSamples();for(const [kind,file] of [['gold','gold-rates'],['products','products']]){const batch=await previewImport(k,kind,fs.readFileSync(`samples/${file}-example.csv`,'utf8'));if(batch.errors.length)throw Error(JSON.stringify(batch.errors));await publishImport(k,batch.id);}}await seedCoins(k);await seedProductImages(k);await seedOffers(k);await seedReviews(k);}
if(process.argv[1]?.endsWith('/seed.js')){await migrate();await seed();await db.destroy();}
