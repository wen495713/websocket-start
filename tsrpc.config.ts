import { TsrpcConfig } from 'tsrpc-cli';

const tsrpcConf: TsrpcConfig = {
  // Generate ServiceProto
  proto: [
    {
      ptlDir: 'src/shared/protocols', // Protocol dir
      output: 'src/shared/protocols/serviceProto.ts', // Path for generated ServiceProto
      // apiDir: 'src/api'   // API dir
    }
  ],
  // Sync shared code 同步到前端或者其他需要使用同一套协议的项目中
  sync: [
    {
      from: 'src/shared',
      to: './../../tsrpc/examples/examples/chatroom/frontend/src/shared',  // 警告!!!,必须使用相对路径,别问我为什么知道T_T
      type: 'symlink'     // Change this to 'copy' if your environment not support symlink
    }
  ],
  // Dev server
  // dev: {
  //   autoProto: true,        // Auto regenerate proto
  //   autoSync: true,         // Auto sync when file changed
  //   autoApi: true,          // Auto create API when ServiceProto updated
  //   watch: 'src',           // Restart dev server when these files changed
  //   entry: 'src/index.ts',  // Dev server command: node -r ts-node/register {entry}
  // },
  // Build config
  // build: {
  //   autoProto: true,        // Auto generate proto before build
  //   autoSync: true,         // Auto sync before build
  //   autoApi: true,          // Auto generate API before build
  //   outDir: 'dist',         // Clean this dir before build
  // }
}
export default tsrpcConf;