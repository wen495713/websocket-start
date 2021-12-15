import * as WebSocket from 'ws';
import { WebSocketAdapter, INestApplicationContext } from '@nestjs/common';
import { MessageMappingProperties } from '@nestjs/websockets';
import { Observable, fromEvent, EMPTY } from 'rxjs';
import { mergeMap, filter } from 'rxjs/operators';
import { TSBuffer, DecodeOutput} from 'tsbuffer';
import { TransportDataUtil, ServiceMap, ServiceMapUtil } from 'tsrpc-base-client'
import {ServerInputData } from 'tsrpc-proto';
import { serviceProto } from '../shared/protocols/serviceProto';
// import {WsServer as TsrpcWsServer} from 'tsrpc';


/**
 * todo 使用WebSocketAdapter构建tsrpcadapter?
 * 怎么接入nestjs的方法
 * 怎么使用tsrpc的映射
 */
export class WsAdapter implements WebSocketAdapter {
    private conn_num = 0;
    private serviceMap: ServiceMap;
    private tsbuffer: TSBuffer;

    constructor(private app: INestApplicationContext) { }

    create(port: number, options: any = {}): any {
        // 注册tsrpc servicemap,方便获取名字
        this.serviceMap = ServiceMapUtil.getServiceMap(serviceProto);  // 映射服务方法
        this.tsbuffer = new TSBuffer({
            ...serviceProto.types,
            // 其他类型
        },
        {
            // strictNullChecks: true,  // 是否严格
        }
        )
        console.log('ws create')
        return new WebSocket.Server({ port, ...options });
    }

    bindClientConnect(server, callback: Function) {
        // server: WebSocketServer?
        console.log('ws bindClientConnect, server:\n');
        server.on('connection', callback);
    }
    // 监听连接断开??,每次连接都会触发
    bindClientDisconnect(client: WebSocket, callback: Function) {
        console.log('[wsAdapter]连接断开');
    }
    bindMessageHandlers(
        client: WebSocket,
        handlers: MessageMappingProperties[],
        process: (data: any) => Observable<any>,
    ) {
        this.conn_num++;
        console.log('[waAdapter]有新的连接进来', this.conn_num);
        fromEvent(client, 'message')
            .pipe(
                mergeMap(data => {
                    return this.bindMessageHandler(client, data, handlers, process)
                }),
                filter(result => {
                    console.log({r: result});
                    return result;
                }),
            )
            .subscribe(response => {
                console.log(response);
                
                client.send(JSON.stringify(response));
            });
    }

    bindMessageHandler(
        client: WebSocket,
        buffer,
        handlers: MessageMappingProperties[],
        process: (data: any) => Observable<any>,
    ): Observable<any> {
        console.log(buffer);
        
        // todo 此处可以直接使用tsbuffer解码
        let opServerInputData = TransportDataUtil.tsbuffer.decode(buffer.data, 'ServerInputData'); // 外层协议解码
        if (!opServerInputData.isSucc) {
            console.error('解析TSPRC数据包外层失败');
            return EMPTY;
        }
        let serverInput = opServerInputData.value as ServerInputData;
        let service = this.serviceMap.id2Service[serverInput.serviceId];
        console.log(service.name);
        let onReq;
        if (service.type === 'api') {
            onReq = this.tsbuffer.decode(serverInput.buffer, service.reqSchemaId);
        }else {
            onReq = this.tsbuffer.decode(serverInput.buffer, service.msgSchemaId);
        }
        console.log(onReq.value);
        console.log({servicename: service.name});
        const messageHandler = handlers.find(handler => {
            // handler 就是我们@SubscribeMessage装饰过的方法
                console.error(handler.message);
                return handler.message === service.name;
        });
        if (!messageHandler) {
            return EMPTY;
        }
        console.log(messageHandler);
        // todo tsbuffer 解码
        
        return process(messageHandler.callback(onReq.value));
    }

    close(server) {
        console.log('ws server close');
        server.close();
    }
}