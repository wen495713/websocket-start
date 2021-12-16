import * as WebSocket from 'ws';
import { WebSocketAdapter, INestApplicationContext } from '@nestjs/common';
import { MessageMappingProperties } from '@nestjs/websockets';
import { Observable, fromEvent, EMPTY } from 'rxjs';
import { mergeMap, filter } from 'rxjs/operators';
import { TSBuffer, DecodeOutput} from 'tsbuffer';
import { TransportDataUtil, ServiceMap, ServiceMapUtil, ApiService, } from 'tsrpc-base-client'
import { ServerInputData, ServerOutputData } from 'tsrpc-proto';
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
                    return this._bindTsbufferMessageHandler(client, data, handlers, process)
                }),
                filter(result => {
                    console.log({r: result});   // 上一步处理好的数据(完整编码的tsbuffer)
                    return result;
                }),
            )
            .subscribe(response => {
                // console.log(response);
                client.send(response);  // 发送二进制内容
                // client.send(JSON.stringify(response));
            });
    }

    _bindTsbufferMessageHandler(    // 解码,执行对应方法,编码
        client: WebSocket,
        buffer,
        handlers: MessageMappingProperties[],
        process: (data: any) => Observable<any>,
    ): Observable<any> {
        // tsbuffer解码
        let opServerInputData = TransportDataUtil.tsbuffer.decode(buffer.data, 'ServerInputData'); // 外层协议解码
        if (!opServerInputData.isSucc) {
            console.error('解析TSPRC数据包外层失败');
            return EMPTY;
        }
        let serverInput = opServerInputData.value as ServerInputData;   // 内层二进制内容
        let service = this.serviceMap.id2Service[serverInput.serviceId] as ApiService;
        let onReq;
        if (service.type === 'api') {
            onReq = this.tsbuffer.decode(serverInput.buffer, service.reqSchemaId);  // 根据请求结构ID解码明文内容
        }else {
            // onReq = this.tsbuffer.decode(serverInput.buffer, service.msgSchemaId);   // 消息请求
        }
        console.log(onReq.value);   // 解码后的请求内容
        console.log({servicename: service.name});   // 请求方法名
        const messageHandler = handlers.find(handler => {   // handler 就是我们@SubscribeMessage装饰过的方法
            console.error(handler.message); // 处理方法名
            return handler.message === service.name;
        });
        if (!messageHandler) {
            return EMPTY;
        }
        // 构造Promise
        let next = Promise.resolve(messageHandler.callback(onReq.value)).then(ret => {
            console.log({sn: serverInput.sn});
            console.log({ret});
            let op = this.tsbuffer.encode(ret, service.resSchemaId);    // 根据返回结构ID编码二进制内容
            let serverOutputData: ServerOutputData = {
                sn: serverInput.sn,
                serviceId: serverInput.serviceId,
                buffer: op.buf,
            };
            op = TransportDataUtil.tsbuffer.encode(serverOutputData, 'ServerOutputData');   // 外层协议编码
            return op.buf;
        })
        // 返回异步处理
        return process(next);
    }

    close(server) {
        console.log('ws server close');
        server.close();
    }
}