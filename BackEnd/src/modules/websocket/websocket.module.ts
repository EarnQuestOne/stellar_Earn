import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppWebsocketGateway } from './websocket.gateway';
import { WebsocketService } from './websocket.service';
import { WsSubscription } from './entities/ws-subscription.entity';
import { WsMessage } from './entities/ws-message.entity';
import { WsAuthGuard } from '../../common/guards/ws-auth.guard';
import { WebsocketEventHandler } from '../../events/handlers/websocket-event.handler';
import { getJwtPrivateKey } from '../../common/utils/jwt-keys';

@Module({
  imports: [
    TypeOrmModule.forFeature([WsSubscription, WsMessage]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const privateKey = getJwtPrivateKey(configService);
        return {
          privateKey,
          signOptions: {
            algorithm: 'RS256',
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [
    AppWebsocketGateway,
    WebsocketService,
    WsAuthGuard,
    WebsocketEventHandler,
  ],
  exports: [WebsocketService],
})
export class WebsocketModule {}
