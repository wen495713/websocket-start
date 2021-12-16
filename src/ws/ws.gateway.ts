import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WsResponse } from "@nestjs/websockets";
import { Observable } from "rxjs";
import * as WebSocket from 'ws';
import {ReqSend, ResSend} from './../shared/protocols/PtlSend'

interface Person {
  name: string,
  age: number,
}

// @WebSocketGateway(3002, {transports: ['websocket']}) // √
@WebSocketGateway(3002)  // √
// @WebSocketGateway()
export class WsStartGateway {

  private _sleep(ms: number = 1000): Promise<number> {
    return new Promise(function(resolve, reject) {
      setTimeout(function(){
        return resolve(100);
      }, ms)
    })
  }

  @SubscribeMessage('Send')
  async sendmsg(@MessageBody() send: ReqSend): Promise<ResSend> {
    console.log('invoke len');
    await this._sleep(1000);
    return {
      time: new Date()
    };
  }

  @SubscribeMessage('hello')
  hello(@MessageBody() data: any): any {
    return {
      "event": "hello",
      "data": data,
      "msg": 'rustfisher.com'
    };
  }

  @SubscribeMessage('hello2')
  hello2(@MessageBody() data: any, @ConnectedSocket() client: WebSocket): any {
    // console.log('收到消息 client:', client);
    client.send(JSON.stringify({ event: 'tmp', data: '这里是个临时信息rustfisher.com' }));
    return { event: 'helloreply', data: data };
  }
}