function verifyAuth(req, res, next) {
    if(req.isAuthenticated()){
        return next();
    }

    res.redirect('/login');
}

module.exports = verifyAuth;