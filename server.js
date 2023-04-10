const dotenv = require('dotenv');
dotenv.config({ path: './.env' });
const app = require('./app');
const PORT = process.env.PORT || 8000;
const server = app.listen(PORT, () => {
  console.log(`Server listening on PORT: ${PORT}`);
});
module.exports = { server };
