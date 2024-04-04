const fs = require('fs');
const EventEmitter = require('events');
const { Server } = require('ssh2');

const privateKey = fs.readFileSync(`/home/${process.env.USER}/.ssh/id_rsa`, 'utf8');
const events = new EventEmitter();
const server = new Server({
  hostKeys: [{ key: privateKey }],
});

const motd = `
Welcome to my little side project!
Type /help for some helper commands.
Made by satr14.is-a.dev
`;

const help_menu = `\
/help  - displays this.
/exit  - exits the ssh seassion.
/clear - clears the screen.
`;

server.on('connection', (client, info) => {
  let username;

  client.on('authentication', (ctx) => {
    username = Buffer.from(ctx.username).toString();
    username === 'system' ? ctx.reject() : ctx.accept();
    username !== 'system' && events.emit('message', {
      user: 'system',
      message: username + ' has joined the chat!',
    })
  });

  client.on('ready', () => {
    client.on('session', (accept, reject) => {
      const session = accept();
      session.on('shell', (accept, reject) => {
        const prompt = '[' + username + '] '; 
        const stream = accept();
        stream.write(motd + '\n' + prompt);
        events.on('message', ({ user, message }) => {
          if (user === username) return; 
          displayMessage(user, message, stream);
          nl(stream);
          stream.write(prompt);
        });
        stream.on('data', (data) => {
          const message = data.toString().slice(0, -1); 
          if (message.length < 1) return stream.write(prompt);
          
          switch (message) {
            case "/exit":
              stream.exit(0);
              stream.end();
              break;
            case "/clear":
              stream.write('\x1Bc');
              break;
            case "/help":
              stream.write(help_menu);
              break;
            default:
              events.emit('message', {
                user: username,
                message: message,
              });
              break;
          }
          stream.write(prompt);
        });
      });
    });
  });

  client.on('end', () => {
    events.emit('message', {
      user: 'system',
      message: username + ' has left the chat!'
    });
  });
});

function displayMessage(user, message, stream) {
  const prompt = `'\r\u001b[K[${user}] ${message}`;
  stream?.write(prompt);
}

function nl(stream) {
  stream?.write('\n');
}

server.listen(5090, '0.0.0.0', () => {
  console.log('[system] listening on port 5090');
  events.on('message', (data) => {
    console.log(`[${data.user}] ${data.message}`)
  });
});
