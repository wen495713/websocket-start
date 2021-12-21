
import { Member } from "./common/Member";

export interface MsgMemberJoin {
    member: Member,
    content?: string,
    time: Date
}