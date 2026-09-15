const {body} = require('express-validator');

const validateSignupForm = [
    body('username').
    notEmpty().withMessage('Username cannot be empty').
    isAlphanumeric().
    isLength({min: 4, max: 100}),
    body('password').
    notEmpty().withMessage('Password cannot be empty').
    isAlphanumeric()
];

const validateRenameFolder = [
    body('new-name').
    notEmpty().withMessage('Folder name cannot be empty').
    isLength({min: 1, max: 100}).
    isAlphanumeric().withMessage('Folder name must be alphanumeric')
];


const validateRenameFile = [
    body('new-file-name').
    notEmpty().withMessage('File name cannot be empty').
    isLength({min: 1, max: 100}).
    isAlphanumeric().withMessage('File name must be alphanumeric')
];

const validateShareFolder = [
    body('username').
    notEmpty().withMessage('Username cannot be empty').
    isAlphanumeric().withMessage('Username must be alphanumeric').
    isLength({min: 4, max: 100}),
    body('permission').
    notEmpty().withMessage('Permission cannot be empty').
    isIn(['read', 'write']).withMessage('Permission must be either read or write')
];


module.exports = {
    validateSignupForm,
    validateRenameFolder,
    validateRenameFile,
    validateShareFolder
}