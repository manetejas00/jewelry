export const customerAuth=(req,res,next)=>req.session.customer?next():res.status(401).json({error:'Please sign in to your customer account.'});
export const customerCsrf=(req,res,next)=>req.session.customerCsrf&&req.get('x-customer-csrf')===req.session.customerCsrf?next():res.status(403).json({error:'Please reload and try again.'});
