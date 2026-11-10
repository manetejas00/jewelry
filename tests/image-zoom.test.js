import {test} from 'node:test';
import assert from 'node:assert/strict';
import {zoomAt,panImage,pinchImage,wheelZoom} from '../src/image-zoom.js';
const box={width:800,height:600,naturalWidth:1000,naturalHeight:1000},start={scale:1,x:0,y:0};
test('wheel zoom is smooth, anchored and constrained from 100 to 500 percent',()=>{
 const next=wheelZoom(start,-100,{x:0,y:100},box);assert.ok(next.scale>1&&next.scale<1.5);assert.ok(next.y<0);assert.equal(zoomAt(next,10,{x:0,y:0},box).scale,5);assert.deepEqual(zoomAt(next,.5,{x:100,y:100},box),start);
});
test('drag respects fitted aspect ratio and cannot pan beyond the image edges',()=>{
 const zoomed=zoomAt(start,2,{x:0,y:0},box);assert.deepEqual(panImage(zoomed,999,999,box),{scale:2,x:200,y:300});assert.deepEqual(panImage(start,100,100,box),start);
});
test('two-pointer pinch scales around the fingers, pans and resets when zoomed out',()=>{
 const from=[{x:-50,y:0},{x:50,y:0}],to=[{x:-100,y:10},{x:100,y:10}];assert.deepEqual(pinchImage(start,from,to,box),{scale:2,x:0,y:10});assert.deepEqual(pinchImage(start,from,[{x:-10,y:0},{x:10,y:0}],box),start);
});
