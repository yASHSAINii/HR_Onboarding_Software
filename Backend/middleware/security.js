const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const xssClean = require('xss-clean')
const hpp = require('hpp')

// Strict rate limit for auth routes (login, OTP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // max 10 attempts per IP
  message: { error: 'Too many attempts. Try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests.' },
})

module.exports = { helmet, xssClean, hpp, authLimiter, apiLimiter }