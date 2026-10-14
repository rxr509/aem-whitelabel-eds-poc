/*
 * Overrides shared's empty delayed.js. Entry point for the delayed phase -
 * loads consent-check.js, which gates all consent-dependent scripts.
 */
import './consent-check.js';
