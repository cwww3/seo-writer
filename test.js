const { load, generate } = require('./tool');
(async () => {
  await load()
  while (true) {
    console.log(generate().content)

  }
  // user.data
  // console.log(`${JSON.stringify(user1.data)}`)

})();