const jwt = require('jsonwebtoken')

module.exports = function requireAuth(req, res, next){
    const authHeader = req.headers.authorization

    if (!authHeader){
        return res.status(401).json({error: 'Missing authorization header'})
    }

    const [scheme, token] = authHeader.split(' ')

    if (scheme !=='Bearer' || !token){
        return res.status(401).json({error: 'Invalid authorization header format'})
    }
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET)
        req.user = {id: payload.id}
        next()
    } catch (err) {
        return res.status(401).json({error: 'Invalid or expired token'})
    }}