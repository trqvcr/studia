require('dotenv').config()

const app = require('./app');
const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Studia server running on port ${PORT}`);
});
