import {coinArtwork} from '../server/coin-artwork.js';
export async function up(k){
 await k.schema.alterTable('coins',t=>{t.string('supplier').notNullable().defaultTo('Merchant').index();t.string('source_timestamp').nullable().index();t.string('image_kind').notNullable().defaultTo('photo');});
 await k('coins').update({source_timestamp:k.ref('updated_at')});
 // Replace only the generic placeholders for exact catalogue identities; preserve merchant uploads.
 for(const a of coinArtwork)await k('coins').where({sku:a.sku,name:a.name,metal:a.metal,purity:a.purity,weight_g:a.weight_g}).where('image','like','https://images.unsplash.com/%').update({image:a.image,image_kind:'illustration'});
}
export async function down(k){await k.schema.alterTable('coins',t=>{t.dropColumn('supplier');t.dropColumn('source_timestamp');t.dropColumn('image_kind');});}
