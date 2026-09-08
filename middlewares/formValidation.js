const {body, validationResult} = require('express-validator');

const validateSignupForm = [
    body('username').
    notEmpty().withMessage('username cannot be empty').
    isAlphanumeric().
    isLength({min: 4, max: 100}),
    body('password').
    notEmpty().withMessage('password cannot be empty').
    isAlphanumeric()
];

module.exports = {
    validateLoginForm
}