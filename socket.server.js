const socket = require('socket.io');
const DB = require('./db/db');
const shortid = require('shortid');

const {
  FRONT_END_URL,
  ALLOWED_METHODS,
  JOIN_ROOM_REQ_EVENT,
  GET_PLAYERS_IN_ROOM_EVENT,
  JOIN_ROOM_RES_EVENT,
  ROOM_JOIN_FAIL_STATUS,
  ROOM_NOT_FOUND_MESSAGE,
  ROOM_OPEN,
  ROOM_CLOSED,
  GAME_STARTED_EVENT,
  VERIFY_GAME_SUCCESS,
  ROOM_CLOSED_MESSAGE,
  ROOM_JOIN_SUCCESS_STATUS,
  ROOM_JOIN_SUCCESS_MESSAGE,
  NEW_PLAYER_JOIN_EVENT,
  GAME_FINISHED_EVENT,
  VERIFY_TOKEN_REQ_EVENT,
  VERIFY_TOKEN_RES_EVENT,
  VERIFY_TOKEN_SUCCESS,
  VERIFY_GAME_REQ_EVENT,
  VERIFY_GAME_RES_EVENT,
  VERIFY_GAME_FAIL,
  VERIFY_TOKEN_FAIL,
  GET_GAME_STATE_REQ,
  ELEMENTS_TO_COMPARE,
  INITIAL_GAME_STATE,
  CROSS,
  CIRCLE,
  CLICK_EVENT_REQ,
  CLICK_EVENT_RES,
  CHOOSE_NEXT_PLAYER_REQ,
  CHOOSE_NEXT_PLAYER_RES,
  GAME_FINISHED_RES,
  GAME_WON,
  GAME_TIE,
  GAME_TIE_MESSAGE,
  GAME_ABANDONED_EVENT,
} = require('./utils/constants');
const { server } = require('./server');

const io = socket(server, {
  cors: {
    origin: FRONT_END_URL,
    methods: ALLOWED_METHODS,
  },
});

const RoomIdNotFound = (socket, roomId) => {
  if (!DB[roomId]) {
    socket.emit(JOIN_ROOM_RES_EVENT, {
      status: ROOM_JOIN_FAIL_STATUS,
      message: ROOM_NOT_FOUND_MESSAGE,
    });
    return true;
  }
  return false;
};

const checkIfGameIsFinished = (tiles) => {
  for (let i = 0; i < ELEMENTS_TO_COMPARE.length; i++) {
    if (
      tiles[ELEMENTS_TO_COMPARE[i][0]].image === '' ||
      tiles[ELEMENTS_TO_COMPARE[i][1]].image === '' ||
      tiles[ELEMENTS_TO_COMPARE[i][2]].image === ''
    )
      continue;
    if (
      (tiles[ELEMENTS_TO_COMPARE[i][0]].image === CROSS &&
        tiles[ELEMENTS_TO_COMPARE[i][1]].image === CROSS &&
        tiles[ELEMENTS_TO_COMPARE[i][2]].image === CROSS) ||
      (tiles[ELEMENTS_TO_COMPARE[i][0]].image === CIRCLE &&
        tiles[ELEMENTS_TO_COMPARE[i][1]].image === CIRCLE &&
        tiles[ELEMENTS_TO_COMPARE[i][2]].image === CIRCLE)
    )
      return { status: true, verdict: GAME_WON };
  }
  for (let i = 0; i < tiles.length; i++)
    if (tiles[i].image === '') return { status: false };

  return { status: true, verdict: GAME_TIE };
};

const UserNotFoundInRoom = (socket, { userName, token, roomId }) => {
  if (RoomIdNotFound(socket, roomId)) return true;
  const players = DB[roomId].players;
  for (i = 0; i < players.length; i++) {
    if (
      players[i].id === socket.id &&
      players[i].userName === userName &&
      players[i].token === token
    )
      return false;
  }
  return true;
};

const sendVerificationEvent = (socket, eventName, status) => {
  socket.emit(eventName, {
    status,
  });
};

io.on('connection', (socket) => {
  socket.on(JOIN_ROOM_REQ_EVENT, ({ userName, roomId }) => {
    if (RoomIdNotFound(socket, roomId)) return;
    if (DB[roomId].roomState !== ROOM_OPEN || DB[roomId].players.length === 2) {
      socket.emit(JOIN_ROOM_RES_EVENT, {
        status: ROOM_JOIN_FAIL_STATUS,
        message: ROOM_CLOSED_MESSAGE,
      });
      return (DB[roomId].roomState = ROOM_CLOSED);
    }

    const token = shortid.generate();
    const player = {
      userName,
      id: socket.id,
      token,
      symbol: DB[roomId].players.length === 0 ? CROSS : CIRCLE,
    };

    socket.join(roomId);

    if (DB[roomId].players.length < 2) DB[roomId].players.push(player);

    socket.emit(JOIN_ROOM_RES_EVENT, {
      status: ROOM_JOIN_SUCCESS_STATUS,
      message: ROOM_JOIN_SUCCESS_MESSAGE,
      ...player,
    });

    socket.on(GET_PLAYERS_IN_ROOM_EVENT, (data) => {
      const { roomId } = data;
      if (RoomIdNotFound(socket, roomId)) return;
      const players = DB[roomId].players.map((player) => player.userName);
      const message =
        players.length === 2
          ? 'Game starting soon...'
          : 'Waiting for players to join...';
      io.in(roomId).emit(NEW_PLAYER_JOIN_EVENT, { players, message });
    });

    socket.on(VERIFY_TOKEN_REQ_EVENT, (data) => {
      if (UserNotFoundInRoom(socket, data))
        sendVerificationEvent(
          socket,
          VERIFY_TOKEN_RES_EVENT,
          VERIFY_TOKEN_FAIL
        );
      else
        sendVerificationEvent(
          socket,
          VERIFY_TOKEN_RES_EVENT,
          VERIFY_TOKEN_SUCCESS
        );
    });

    socket.on(VERIFY_GAME_REQ_EVENT, (data) => {
      if (UserNotFoundInRoom(socket, data))
        sendVerificationEvent(socket, VERIFY_GAME_RES_EVENT, VERIFY_GAME_FAIL);
      else {
        const { roomId } = data;
        DB[roomId].registeredPlayers.add(socket.id);
        if (DB[roomId].registeredPlayers.size === 2) {
          const firstPlayer = DB[roomId].players[DB[roomId].firstPlayer].id;
          io.in(roomId).emit(GAME_STARTED_EVENT, {
            tiles: INITIAL_GAME_STATE,
            firstPlayer,
          });
        }
        sendVerificationEvent(
          socket,
          VERIFY_GAME_RES_EVENT,
          VERIFY_GAME_SUCCESS
        );
      }
    });

    socket.on(CLICK_EVENT_REQ, ({ roomId, symbol, tileId, socketid }) => {
      DB[roomId].gameState[tileId] = { image: symbol };
      const tiles = [...DB[roomId].gameState];
      const response = { tileId, symbol, socketid };
      const data = checkIfGameIsFinished(tiles);
      if (data.status) {
        delete DB[roomId];
        if (data.verdict === GAME_WON)
          io.in(roomId).emit(GAME_FINISHED_EVENT, response);
        else
          io.in(roomId).emit(GAME_TIE, {
            tileId,
            symbol,
            message: GAME_TIE_MESSAGE,
          });
      } else io.in(roomId).emit(CLICK_EVENT_RES, response);
    });

    socket.on(CHOOSE_NEXT_PLAYER_REQ, ({ socketid, roomId }) => {
      for (let i = 0; i < DB[roomId].players.length; i++) {
        if (DB[roomId].players[i].id !== socketid) {
          return io.in(roomId).emit(CHOOSE_NEXT_PLAYER_RES, {
            socketid: DB[roomId].players[i].id,
          });
        }
      }
    });

    socket.on('disconnect', async () => {
      if (DB[roomId]) {
        io.in(roomId).emit(GAME_ABANDONED_EVENT);
        delete DB[roomId];
      }
    });

    socket.on(GAME_FINISHED_EVENT, ({ socketid, roomId }) => {
      io.in(roomId).emit(GAME_FINISHED_RES, { socketid });
      socket.leave(roomId);
    });
  });
});
