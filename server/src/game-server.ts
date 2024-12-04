import { WebSocketServer } from 'ws';
import { World } from './world';
import { Socket } from './socket';
import { Session } from './session';

export class GameServer {
  private ups = 50;
  private server: WebSocketServer;
  private world: World;

  private sessions: { [key: number]: Session } = {};
  private sessionIdCounter = 0;

  constructor(port: number) {
    this.server = new WebSocketServer({ port });
    this.world = new World('world0', 2);

    console.log(`Spellforge game server started on port ${port}`);

    this.server.on('connection', ws => {
      console.log('New connection established');

      const socket = new Socket(ws);
      const session = new Session(this.sessionIdCounter++, socket, this.world);

      session.onHello(name => {
        console.log(`Player ${name} joined the game`);
        this.sessions[session.id] = session;
      });
    });

    this.server.on('error', err => console.error(`Server error: ${err.message}`));

    setInterval(() => {
      this.update(1000 / this.ups);
   }, 1000 / this.ups);
  }

  update(dt: number) {
    for (const [_, session] of Object.entries(this.sessions)) {
      session.update(dt);
    }

    this.world.update(dt);
  }

  shutdown() {
    console.log('Shutting down game server...');
    this.server.close(() => console.log('Server shut down.'));
  }
}