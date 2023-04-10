const {
  ROOM_CREATION_FAILED_MESSAGE,
  ROOM_CREATED_SUCCESS_STATUS,
  ROOM_CREATED_FAIL_STATUS,
} = require('./constants');

process.on('message', (message) => {
  try {
    const result = getUniqueId(message);
    process.send({ status: ROOM_CREATED_SUCCESS_STATUS, data: result });
  } catch (err) {
    process.send({
      status: ROOM_CREATED_FAIL_STATUS,
      data: ROOM_CREATION_FAILED_MESSAGE,
    });
  }
  process.exit();
});

const getUniqueId = ({ currentTime, maxDigits, counter, serverId, str }) => {
  let s = '';
  let number = parseInt(`${currentTime % maxDigits}${serverId}${counter}`);
  while (number > 0) {
    let digit = number % str.length;
    s += str.charAt(digit);
    number = Math.floor(number / str.length);
  }
  return s;
};
