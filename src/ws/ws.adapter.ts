import * as WebSocket from 'ws';

import {
    // ERROR_EVENT,
    CLOSE_EVENT,
    CONNECTION_EVENT,
    DISCONNECT_EVENT,
  } from '@nestjs/websockets/constants';
import { WebSocketAdapter, INestApplicationContext } from '@nestjs/common';
import { MessageMappingProperties } from '@nestjs/websockets';
import { Observable, fromEvent, EMPTY } from 'rxjs';
import { mergeMap, filter } from 'rxjs/operators';
import { TSBuffer, DecodeOutput} from 'tsbuffer';
import { 
    TransportDataUtil, 
    ServiceMap, 
    ServiceMapUtil, 
    ApiService, 
    Counter,
} from 'tsrpc-base-client'
import { ServerInputData, ServerOutputData } from 'tsrpc-proto';
import { serviceProto, ServiceType } from '../shared/protocols/serviceProto';
import { type } from 'os';
// import {WsServer as TsrpcWsServer} from 'tsrpc';

const TSRPC_INUSE = false;  // tsrpc编码开关

type myConnection = WebSocket & {id: number};

/**
 * todo 使用WebSocketAdapter构建tsrpcadapter?
 * 怎么接入nestjs的方法
 * 怎么使用tsrpc的映射
 */
export class WsAdapter implements WebSocketAdapter {
    conns: Array<myConnection> = [];
    serviceMap: ServiceMap;
    tsbuffer: TSBuffer;
    _counter: Counter = new Counter(1);
    

    constructor(private app: INestApplicationContext) { }

    create(port: number, options: any = {}): any {
        // 注册tsrpc servicemap,方便获取名字
        this.serviceMap = ServiceMapUtil.getServiceMap(serviceProto);  // 映射服务方法
        console.log(this.serviceMap);
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
    /**
     * 绑定客户端连接处理方法,当服务器启动时调用
     * @param server WebSocket
     * @param callback gateway 的 handleConnection 方法,如果有重载的话
     */
    bindClientConnect(server, callback: Function) {
        // server: WebSocketServer?
        console.log('ws bindClientConnect, server:\n');
        server.on(CONNECTION_EVENT, (client: myConnection, incomeMsg) => {
            client.id = this._counter.getNext();
            this.conns.push(client);
            console.log('[waAdapter]有新的连接进来', this.conns.length);
            const msg = {
                // 公共属性
                time: new Date(),
                // memberjoin
                name: 'nhaha'+this.conns.length,
                member: {
                    name: 'kelvin',
                    age: 33,
                },
                // chat
                content: 'chaah'+this.conns.length,
                
            }
            this._broadCast('MemberJoin', msg);
            // todo 可以做一些逻辑
            callback(client);
        });
    }
    /**
     * 绑定客户端断开处理方法,当客户端连接是调用
     * @param client WebSocket
     * @param callback gateway 的 handleDisconnect 方法,如果有重载的话
     */
    bindClientDisconnect(client: WebSocket, callback: any) {
        const self = this;
        client.on(CLOSE_EVENT, function(code: number, reason: Buffer){
            const client = this as myConnection;
            self.conns = self.conns.filter(({id}) => client.id !== id);
            console.log('[waAdapter]有连接断开', self.conns.length);
            // todo 客户端断开连接做逻辑
            callback(this, code, reason);
        });
    }
    /**
     * 只是消息绑定方法,仅用于绑定消息下游
     * @param client WebSocket
     * @param handlers 
     * @param process 
     */
    bindMessageHandlers(
        client: WebSocket,
        handlers: MessageMappingProperties[],
        process: (data: any) => Observable<any>,
    ) {
        fromEvent(client, 'message')
            .pipe(
                mergeMap(data => {
                    if (TSRPC_INUSE) {
                        return this._bindTsbufferMessageHandler(client, data, handlers, process);
                    }else {
                        return this._bindMessageHandler(client, data, handlers, process);
                    }
                }),
                filter(result => {
                    console.log({r: result});   // 上一步处理好的数据(完整编码的tsbuffer)
                    return result;
                }),
            )
            .subscribe(response => {
                response = TSRPC_INUSE? response: JSON.stringify(response); // 发送二进制内容
                client.send(response);
            });
    }
    // 明文
    _bindMessageHandler(
        client: WebSocket,
        buffer,
        handlers: MessageMappingProperties[],
        process: (data: any) => Observable<any>,
    ): Observable<any> {
        let message = null;
        try {
            message = JSON.parse(buffer.data);
        } catch (error) {
            console.log('ws解析json出错', error);
            return EMPTY;
        }

        const messageHandler = handlers.find(
            handler => handler.message === message.event,
        );
        if (!messageHandler) {
            return EMPTY;
        }
        return process(messageHandler.callback(message.data));
    }
    // tsrpc解码
    _bindTsbufferMessageHandler(    // 解码,执行对应方法,编码
        client: WebSocket,
        buffer,
        handlers: MessageMappingProperties[],
        process: (data: any) => Observable<any>,
    ): Observable<any> {
        const req = this._bufDecode(buffer.data);
        if (!req) return EMPTY; // decode失败
        const messageHandler = handlers.find(handler => {   // handler 就是我们@SubscribeMessage装饰过的方法
            console.error(handler.message); // 处理方法名
            return handler.message === req.service.name;
        });
        if (!messageHandler) {
            return EMPTY;
        }
        // 构造Promise
        let next = Promise.resolve(messageHandler.callback(req.val)).then(ret => {
            console.log({sn: req.input.sn});
            console.log({ret});
            const _out = this._bufEncode(ret, req.service, req.input);
            if (!_out) return null;
            return _out.buf;
        })
        // 返回异步处理
        return process(next);
    }

    close(server) {
        // server.on(CLOSE_EVENT)
        console.log('ws server close');
        server.close();
    }

    _bufEncode(val: any, service: ApiService, input: ServerInputData): {buf: Uint8Array} | false {
        let op = this.tsbuffer.encode(val, service.resSchemaId);    // 根据返回结构ID编码二进制内容
        let serverOutputData: ServerOutputData = {
            sn: input.sn,
            serviceId: input.serviceId,
            buffer: op.buf,
        };
        op = TransportDataUtil.tsbuffer.encode(serverOutputData, 'ServerOutputData');   // 外层协议编码
        return {
            buf: op.buf
        };
    }

    _bufDecode(buf): {service: ApiService, val: any, input: ServerInputData} | false {
        // tsbuffer解码
        let opServerInputData = TransportDataUtil.tsbuffer.decode(buf, 'ServerInputData'); // 外层协议解码
        if (!opServerInputData.isSucc) {
            console.error('解析TSPRC数据包外层失败');
            return false;
        }
        let serverInput = opServerInputData.value as ServerInputData;   // 内层二进制内容
        let service = this.serviceMap.id2Service[serverInput.serviceId] as ApiService;
        let onReq;
        if (service.type === 'api') {
            onReq = this.tsbuffer.decode(serverInput.buffer, service.reqSchemaId);  // 根据请求结构ID解码明文内容
        }else {
            // onReq = this.tsbuffer.decode(serverInput.buffer, service.msgSchemaId);   // 消息请求(一般只有服务器主动推送,客户端消息还是使用请求吧)
        }
        console.log(onReq.value);   // 解码后的请求内容
        console.log({servicename: service.name});   // 请求方法名
        return {
            input: serverInput,
            service,
            val: onReq.value,
        };
    }

    _broadCast<T extends keyof ServiceType['msg']>(msgName: T, msg: ServiceType['msg'][T], conns?: myConnection[]) {
        let service = this.serviceMap.msgName2Service[msgName as string];
        if (!service) return false;
        let opEncode = TransportDataUtil.encodeServerMsg(this.tsbuffer, service, msg, 'buffer', 'LONG');
        if (!opEncode.isSucc) return false;
        conns = conns? conns : this.conns;
        conns.forEach(conn => conn.send(opEncode.output));
    }
}