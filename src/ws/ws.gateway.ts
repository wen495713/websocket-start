import { 
  ConnectedSocket, 
  MessageBody, 
  OnGatewayConnection, 
  OnGatewayDisconnect, 
  OnGatewayInit, 
  SubscribeMessage, 
  WebSocketGateway, 
  WebSocketServer, 
  WsResponse
} from "@nestjs/websockets";
import { Observable } from "rxjs";
import * as WebSocket from 'ws';
import {ReqSend, ResSend} from './../shared/protocols/PtlSend'

@WebSocketGateway(3002, {transports: ['websocket']}) // √
// @WebSocketGateway(3002)  // √
// @WebSocketGateway()
export class WsStartGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit{

  @WebSocketServer() private server;
  private _wsClients:Array<WebSocket> = [];

  private _sleep(ms: number = 1000): Promise<number> {
    return new Promise(function(resolve, reject) {
      setTimeout(function(){
        return resolve(100);
      }, ms)
    })
  }

  afterInit(server: any) {
    console.log('after init');
  }

  handleDisconnect(client: any) {
    console.log('[gateway] client disconnect');;
  }

  handleConnection(client: WebSocket, ...args: any[]) { // client的类型??
    console.log('[gateway] client connect');;
  }

  @SubscribeMessage('Send')
  async sendmsg(@MessageBody() send: ReqSend): Promise<ResSend> {
    // todo 在这里广播,消息如何进行tsrpc编码?
    console.log('invoke len');
    await this._sleep(1000);
    return {
      time: new Date()
    };
  }

  @SubscribeMessage('Hello')
  hello(@MessageBody() data: ReqSend): ResSend {
    return {
      time: new Date(),
    };
  }

  @SubscribeMessage('hello2')
  hello2(@MessageBody() data: any, @ConnectedSocket() client: WebSocket): any {
    // console.log('收到消息 client:', client);
    client.send(JSON.stringify({ event: 'tmp', data: '这里是个临时信息rustfisher.com' }));
    return { event: 'helloreply', data: data };
  }
}