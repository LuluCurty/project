const express = require('express');
const router = express.Router();

const pool = require('../db');

const { authorize } = require('../middleware/roleBasedAccessControl');
const { authenticateToken } = require('../middleware/auth');

const path = require('path');

router.use(authenticateToken);
