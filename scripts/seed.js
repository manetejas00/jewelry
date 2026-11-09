import fs from 'node:fs';
import bcrypt from 'bcryptjs';
import {db,migrate,preview} from '../server/db.js';
import {previewImport,publishImport} from '../server/importer.js';
import {writeSamples} from './samples.js';
const base='https://cdnstatic.tencentcs.com/edgeone/pages/product-activities/jewelry/';

export async function seedProductImages(k=db){
  if(await k.schema.hasTable('product_images')&&!(await k('product_images').first())){
    const now=new Date().toISOString();
    const demoImages=[
      // Eclipse Ring multi-angle
      {product_code:'eclipse-ring',role:'hero',url:base+'Eclipse%20Ring.png',alt_text:'Eclipse Pearl Ring Hero Shot',sort_order:1,created_at:now,updated_at:now},
      {product_code:'eclipse-ring',role:'front',url:base+'Eclipse%20Ring.png',alt_text:'Eclipse Pearl Ring Front Angle',sort_order:2,created_at:now,updated_at:now},
      {product_code:'eclipse-ring',role:'left',url:base+'Pearls%20Collection.png',alt_text:'Eclipse Pearl Ring Left Profile',sort_order:3,created_at:now,updated_at:now},
      {product_code:'eclipse-ring',role:'right',url:base+'Fine%20Jewelry%20Collection.png',alt_text:'Eclipse Pearl Ring Right Profile',sort_order:4,created_at:now,updated_at:now},
      {product_code:'eclipse-ring',role:'model',url:'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80',alt_text:'Eclipse Pearl Ring Model Wearing',sort_order:5,created_at:now,updated_at:now},
      
      // Lune Pearl Drops multi-angle
      {product_code:'lune-pearl-drops',role:'hero',url:base+'Lune%20Pearl%20Drop.png',alt_text:'Lune Pearl Drops Hero Shot',sort_order:1,created_at:now,updated_at:now},
      {product_code:'lune-pearl-drops',role:'front',url:base+'Lune%20Pearl%20Drop.png',alt_text:'Lune Pearl Drops Front Angle',sort_order:2,created_at:now,updated_at:now},
      {product_code:'lune-pearl-drops',role:'left',url:base+'Pearls%20Collection.png',alt_text:'Lune Pearl Drops Left Angle',sort_order:3,created_at:now,updated_at:now},
      {product_code:'lune-pearl-drops',role:'right',url:base+'Fine%20Jewelry%20Collection.png',alt_text:'Lune Pearl Drops Right Angle',sort_order:4,created_at:now,updated_at:now},
      {product_code:'lune-pearl-drops',role:'model',url:'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80',alt_text:'Lune Pearl Drops Model Wearing',sort_order:5,created_at:now,updated_at:now},

      // Atelier Pearl Collar multi-angle
      {product_code:'atelier-pearl-collar',role:'hero',url:base+'Atelier%20Ribbon%20Collar.png',alt_text:'Atelier Pearl Collar Hero Shot',sort_order:1,created_at:now,updated_at:now},
      {product_code:'atelier-pearl-collar',role:'front',url:base+'Atelier%20Ribbon%20Collar.png',alt_text:'Atelier Pearl Collar Front Angle',sort_order:2,created_at:now,updated_at:now},
      {product_code:'atelier-pearl-collar',role:'left',url:base+'Pearls%20Collection.png',alt_text:'Atelier Pearl Collar Left Angle',sort_order:3,created_at:now,updated_at:now},
      {product_code:'atelier-pearl-collar',role:'right',url:base+'Fine%20Jewelry%20Collection.png',alt_text:'Atelier Pearl Collar Right Angle',sort_order:4,created_at:now,updated_at:now},
      {product_code:'atelier-pearl-collar',role:'model',url:'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80',alt_text:'Atelier Pearl Collar Model Wearing',sort_order:5,created_at:now,updated_at:now}
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

export async function seedCoins(k=db){if(await k.schema.hasTable('coins')&&!(await k('coins').first())){const now=new Date().toISOString();await k('coins').insert([{sku:'COIN-AU-1G',name:'24K Lakshmi 999 Pure Gold Coin (1 Gram)',metal:'Gold',coin_type:'Gold Coin',purity:'24K',weight_g:1.000,dimension:'12 mm Round',making_charge:350.00,pricing_mode:'METAL_LINKED',stock:25,description:'Authentic 999 purity 24 Karat gold coin featuring an auspicious Goddess Lakshmi motif, encased in a certified tamper-proof blister pack.',image:'https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=600&q=80',status:'published',created_at:now,updated_at:now},{sku:'COIN-AU-5G',name:'24K Lakshmi Ganesh 999 Pure Gold Coin (5 Grams)',metal:'Gold',coin_type:'Gold Coin',purity:'24K',weight_g:5.000,dimension:'20 mm Round',making_charge:750.00,pricing_mode:'METAL_LINKED',stock:15,description:'Pure 24K 999 gold investment coin with embossed Lakshmi and Ganesha deities for prosperity and auspicious beginnings.',image:'https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=600&q=80',status:'published',created_at:now,updated_at:now},{sku:'COIN-AU-10G',name:'24K Royal Emblem 999 Pure Gold Coin (10 Grams)',metal:'Gold',coin_type:'Gold Coin',purity:'24K',weight_g:10.000,dimension:'25 mm Round',making_charge:1200.00,pricing_mode:'METAL_LINKED',stock:10,description:'10 Gram pure 24K investment grade coin with micro-milled security edges and individual serial number certificate.',image:'https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=600&q=80',status:'published',created_at:now,updated_at:now},{sku:'COIN-AG-10G',name:'999 Fine Silver Floral Coin (10 Grams)',metal:'Silver',coin_type:'Silver Coin',purity:'999',weight_g:10.000,dimension:'28 mm Round',making_charge:150.00,pricing_mode:'METAL_LINKED',stock:50,description:'999 pure fine silver coin featuring traditional floral filigree engraving. Comes with individual protective capsule.',image:'https://images.unsplash.com/photo-1622398925373-3f91b1e275f5?auto=format&fit=crop&w=600&q=80',status:'published',created_at:now,updated_at:now},{sku:'COIN-AG-50G',name:'999 Fine Silver Lakshmi Ganesh Coin (50 Grams)',metal:'Silver',coin_type:'Silver Coin',purity:'999',weight_g:50.000,dimension:'45 mm Round',making_charge:350.00,pricing_mode:'METAL_LINKED',stock:30,description:'50 Grams of pure 999 fine silver with mirror finish proof relief, perfect for gifting, pooja, and wealth preservation.',image:'https://images.unsplash.com/photo-1622398925373-3f91b1e275f5?auto=format&fit=crop&w=600&q=80',status:'published',created_at:now,updated_at:now},{sku:'COIN-AG-100G',name:'999 Fine Silver Cast Bar / Coin (100 Grams)',metal:'Silver',coin_type:'Silver Coin',purity:'999',weight_g:100.000,dimension:'55 x 30 mm Rectangular',making_charge:500.00,pricing_mode:'METAL_LINKED',stock:20,description:'100 Grams certified 999 fine silver minted investment piece with serial numbering and assay certificate.',image:'https://images.unsplash.com/photo-1622398925373-3f91b1e275f5?auto=format&fit=crop&w=600&q=80',status:'published',created_at:now,updated_at:now}]);}}
export async function seed(k=db){if(!preview)throw Error('Fictional seed data is restricted to preview mode');if(!(await k('staff').first()))await k('staff').insert({email:'preview@veyora.local',password_hash:await bcrypt.hash('preview-veyora-2026',12),role:'owner'});if(!(await k('products').first())){writeSamples();for(const [kind,file] of [['gold','gold-rates'],['products','products']]){const batch=await previewImport(k,kind,fs.readFileSync(`samples/${file}-example.csv`,'utf8'));if(batch.errors.length)throw Error(JSON.stringify(batch.errors));await publishImport(k,batch.id);}}await seedCoins(k);await seedProductImages(k);await seedOffers(k);}
if(process.argv[1]?.endsWith('/seed.js')){await migrate();await seed();await db.destroy();}
