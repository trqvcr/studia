const express = require('express');
const router = express.Router();
const userRepo = require('../repositories/userRepository')

//GET /profile/classes
router.get('/classes', async (req, res) => {
console.log('GET /profile/classes', req.user.id);
try{
    const classes = await userRepo.getClasses(req.user.id)
    res.json({classes})
} catch (err) {
    console.error(err)
    res.status(500).json({error: 'Database error'})
}
});

// PUT /profile/classes
router.put('/classes', async (req, res) => {
console.log('PUT /profile/classes', req.body);
const {classes}=req.body;

if(!Array.isArray(classes)){
    return res.status(400).json({error: 'classes must be an array'});
}
//strip whitespace, dedupe
const cleaned = [...new Set(classes.map(c=>String(c).trim()).filter(Boolean))]

try{
    const saved = await userRepo.setClasses(req.user.id, cleaned)
    res.json({classes: saved})
} catch (err) {
    console.error(err)
    res.status(500).json({error: 'Database error'})
}
});

module.exports = router;