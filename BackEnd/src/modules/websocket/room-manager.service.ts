import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class RoomManagerService {
  /**
   * Add a socket client to a named room.
   */
  joinRoom(server: Server, clientId: string, room: string): void {
    const socket = server.sockets.sockets.get(clientId);
    if (socket) {
      socket.join(room);
    }
  }

  /**
   * Remove a socket client from a named room.
   */
  leaveRoom(server: Server, clientId: string, room: string): void {
    const socket = server.sockets.sockets.get(clientId);
    if (socket) {
      socket.leave(room);
    }
  }

  /**
   * Emit an event with `data` to every socket currently in `room`.
   */
  broadcastToRoom(
    server: Server,
    room: string,
    event: string,
    data: unknown,
  ): void {
    server.to(room).emit(event, data);
  }
}
