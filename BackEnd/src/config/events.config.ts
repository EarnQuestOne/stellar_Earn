import { EventEmitterModuleOptions } from '@nestjs/event-emitter/dist/interfaces';

export const eventsConfig: EventEmitterModuleOptions = {
  // set this to `true` to use wildcards
  wildcard: true,
  // the delimiter used to segment namespaces
  delimiter: '.',
  // set this to `true` if you want to emit the newListener event
  newListener: false,
  // set this to `true` if you want to emit the removeListener event
  removeListener: false,
  // the maximum amount of listeners that can be assigned to an event
  maxListeners: 20,
  // show event name in memory leak message when maximum amount of listeners exceeded
  verboseMemoryLeak: false,
  // disable throwing uncaughtException if an error event is emitted and it has no listeners
  ignoreErrors: false,
};
