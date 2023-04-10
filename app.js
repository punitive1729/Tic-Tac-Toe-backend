const express = require('express');
const app = express();
const DB = require('./db/db');
const { fork } = require('child_process');
const cors = require('cors');

const {
  ROOM_CREATION_SUCCESS_MESSAGE,
  ROOM_CREATED_FAIL_STATUS,
  ROOM_CREATED_SUCCESS_STATUS,
  ROOM_OPEN,
  INITIAL_GAME_STATE,
} = require('./utils/constants');
//const AppError = require('./utils/AppError');

let timer = process.env.MIN_VALUE;

app.use(cors());
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

    return res.status(201).json({
      status: ROOM_CREATED_SUCCESS_STATUS,
      data,
      message: `${ROOM_CREATION_SUCCESS_MESSAGE}: ${data}`,
    });
  });
  childProcess.unref();
});

module.exports = app;
