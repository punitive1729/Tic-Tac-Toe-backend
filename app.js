const express = require('express');
const app = express();
let DB = require('./db/db');
const { fork } = require('child_process');
const cors = require('cors');

const {
  ROOM_CREATION_SUCCESS_MESSAGE,
  ROOM_CREATED_FAIL_STATUS,
  ROOM_CREATED_SUCCESS_STATUS,
  ROOM_OPEN,
} = require('./utils/constants');
//const AppError = require('./utils/AppError');

let timer = process.env.MIN_VALUE;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS.split(',');

app.use(
  cors({
    origin: function (origin, callback) {
      console.log(
        'Whether allowed or not : ',
        ALLOWED_ORIGINS.includes(origin.trim())
      );
      if (ALLOWED_ORIGINS.includes(origin.trim())) {
        callback(null, true);
      } else {
        callback();
      }
    },
  })
);

app.use(express.json());

app.get('/health', (req, res) => {
  return res
    .status(200)
    .json({ status: 'success', message: 'Server working properly!' });
});

app.get('/create', (req, res) => {
  timer++;
  if (timer > process.env.MAX_VALUE) timer = process.env.MIN_VALUE;
  const args = {
    currentTime: Date.now(),
    maxDigits: process.env.MAX_DIGITS,
    counter: timer,
    serverId: process.env.SERVER_ID,
    str: process.env.ALPHABETS,
  };
  const childProcess = fork('./utils/getUniqueId.js');
  childProcess.send(args);
  childProcess.on('message', (message) => {
    const { status, data } = message;
    if (status === ROOM_CREATED_FAIL_STATUS)
      return res.status(500).json({ status, data });

    DB[data] = {
      players: [],
      firstPlayer: Math.floor(Math.random() * 2),
      roomState: ROOM_OPEN,
      registeredPlayers: new Set(),
      gameState: Array(9).fill({ image: '' }),
    };

    setTimeout(
      (data) => {
        if (DB[data] && DB[data].players.length === 0) delete DB[data];
      },
      process.env.EXPIRATION_TIME,
      data
    );

    console.log('Created room');

    return res.status(201).json({
      status: ROOM_CREATED_SUCCESS_STATUS,
      data,
      message: `${ROOM_CREATION_SUCCESS_MESSAGE}: ${data}`,
    });
  });
  childProcess.unref();
});

app.all('*', (req, res) => {
  res.status(404).json({ staus: 'fail', message: 'no such route found' });
});

module.exports = app;
