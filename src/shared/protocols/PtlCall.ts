import { Member } from "./common/Member";
import { Items } from "./common/Item";

export interface ReqCall {  // 约定命名前缀请求Req
    content: string
}

export interface ResCall {  // 约定命名前缀请求Res
    member: Member,
    items: Items[],
    time: Date
}