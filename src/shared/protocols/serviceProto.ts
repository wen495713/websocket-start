import { ServiceProto } from 'tsrpc-proto';
import { MsgChat } from './MsgChat';
import { MsgMemberJoin } from './MsgMemberJoin';
import { ReqCall, ResCall } from './PtlCall';
import { ReqSend, ResSend } from './PtlSend';

export interface ServiceType {
    api: {
        "Call": {
            req: ReqCall,
            res: ResCall
        },
        "Send": {
            req: ReqSend,
            res: ResSend
        }
    },
    msg: {
        "Chat": MsgChat,
        "MemberJoin": MsgMemberJoin
    }
}

export const serviceProto: ServiceProto<ServiceType> = {
    "version": 5,
    "services": [
        {
            "id": 0,
            "name": "Chat",
            "type": "msg"
        },
        {
            "id": 3,
            "name": "MemberJoin",
            "type": "msg"
        },
        {
            "id": 4,
            "name": "Call",
            "type": "api"
        },
        {
            "id": 1,
            "name": "Send",
            "type": "api"
        }
    ],
    "types": {
        "MsgChat/MsgChat": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "content",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "time",
                    "type": {
                        "type": "Date"
                    }
                }
            ]
        },
        "MsgMemberJoin/MsgMemberJoin": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "member",
                    "type": {
                        "type": "Reference",
                        "target": "common/Member/Member"
                    }
                },
                {
                    "id": 1,
                    "name": "content",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "time",
                    "type": {
                        "type": "Date"
                    }
                }
            ]
        },
        "common/Member/Member": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "name",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "age",
                    "type": {
                        "type": "Number"
                    }
                }
            ]
        },
        "PtlCall/ReqCall": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "content",
                    "type": {
                        "type": "String"
                    }
                }
            ]
        },
        "PtlCall/ResCall": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "member",
                    "type": {
                        "type": "Reference",
                        "target": "common/Member/Member"
                    }
                },
                {
                    "id": 1,
                    "name": "items",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Reference",
                            "target": "common/Item/Items"
                        }
                    }
                },
                {
                    "id": 2,
                    "name": "time",
                    "type": {
                        "type": "Date"
                    }
                }
            ]
        },
        "common/Item/Items": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "id",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 1,
                    "name": "name",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 2,
                    "name": "amount",
                    "type": {
                        "type": "Number"
                    }
                }
            ]
        },
        "PtlSend/ReqSend": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "content",
                    "type": {
                        "type": "String"
                    }
                }
            ]
        },
        "PtlSend/ResSend": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "time",
                    "type": {
                        "type": "Date"
                    }
                }
            ]
        }
    }
};