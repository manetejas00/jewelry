export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function constrain(view,{width,height,naturalWidth=width,naturalHeight=height}){
 const fit=Math.min(width/(naturalWidth||width),height/(naturalHeight||height));
 const x=Math.max(0,((naturalWidth||width)*fit*view.scale-width)/2),y=Math.max(0,((naturalHeight||height)*fit*view.scale-height)/2);
 return {...view,x:clamp(view.x,-x,x),y:clamp(view.y,-y,y)};
}
export function zoomAt(view,scale,point,box){const next=clamp(scale,1,5);if(next===1)return {scale:1,x:0,y:0};const ratio=next/view.scale;return constrain({scale:next,x:point.x+(view.x-point.x)*ratio,y:point.y+(view.y-point.y)*ratio},box)}
export function panImage(view,dx,dy,box){return constrain({...view,x:view.x+dx,y:view.y+dy},box)}
export function pinchImage(start,from,to,box){
 const distance=p=>Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y),mid=p=>({x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2});
 const a=mid(from),b=mid(to),scale=clamp(start.scale*distance(to)/Math.max(distance(from),1),1,5),ratio=scale/start.scale;
 return scale===1?{scale:1,x:0,y:0}:constrain({scale,x:b.x+(start.x-a.x)*ratio,y:b.y+(start.y-a.y)*ratio},box);
}
export const wheelZoom=(view,deltaY,point,box)=>zoomAt(view,view.scale*Math.exp(-clamp(deltaY,-100,100)*.0025),point,box);
