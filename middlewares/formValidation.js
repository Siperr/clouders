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

const validateRenameFolder = [
    body('new-name').
    notEmpty().withMessage('folder name cannot be empty').
    isLength({min: 1, max: 100}).
    isAlphanumeric().withMessage('folder name must be alphanumeric')
];

module.exports = {
    validateSignupForm,
    validateRenameFolder
}