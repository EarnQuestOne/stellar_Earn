# websocket module changelog

All notable changes to the `websocket` backend module are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this module adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- Removed the non-functional manual socket heartbeat (`client.ping()` does not exist on socket.io sockets; engine.io already handles ping/pong heartbeats natively).

### Changed
- Migrated JWT signing to RS256 with key rotation support via `getJwtPrivateKey`
- Added optional Redis adapter for horizontal scaling (dynamic import with in-memory fallback)
