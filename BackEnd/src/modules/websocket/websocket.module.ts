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

@Module({
  imports: [
    TypeOrmModule.forFeature([WsSubscription, WsMessage]),
     JwtModule.registerAsync({
       imports: [ConfigModule],
       useFactory: async (configService: ConfigService) => {
         const privateKey = configService.get<string>('JWT_PRIVATE_KEY');
         if (!privateKey) {
           throw new Error('JWT_PRIVATE_KEY is not defined in environment variables');
         }
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
