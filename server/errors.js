export function validationError(message,status=400){return Object.assign(new Error(message),{status,expose:true});}
export function errorResponse(err){
 if(err.type==='entity.parse.failed')return {status:400,body:{error:'Request body must be valid JSON'}};
 if(err.type==='entity.too.large')return {status:413,body:{error:'Request exceeds the allowed size'}};
 if(err.expose)return {status:err.status||400,body:{error:err.message,...(err.quote?{quote:err.quote}:{})}};
 return {status:500,body:{error:'The request could not be completed. Please try again.'}};
}
