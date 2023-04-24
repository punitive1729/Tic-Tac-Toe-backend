const dotenv = require('dotenv');
const axios = require('axios').create();
dotenv.config({ path: './.env' });
const app = require('./app');
const TIME_INTERVAL = 700000;
const PORT = process.env.PORT || 8000;
const server = app.listen(PORT, () => {
  console.log(`Allowed clients : ${process.env.ALLOWED_ORIGINS.split(',')}`);
  console.log(`Server listening on PORT: ${PORT}`);
  
  // This setInterval is used to keep Render alive at all times

  setInterval(async()=>{
    try{
      await axios.get('https://www.google.com');
      console.log('Positive response from Google.com');
    }catch(err){
      console.log('Unable to connect to google.');
    }
  },TIME_INTERVAL);
});


module.exports = { server };
