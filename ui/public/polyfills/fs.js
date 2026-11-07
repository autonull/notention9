// Browser-compatible fs stub - minimal implementation for compatibility
const noop = () => { throw new Error('fs operation not supported in browser'); };

export const readFileSync = noop;
export const writeFileSync = noop;
export const mkdirSync = noop;
export const appendFileSync = noop;
export const existsSync = () => false;
export const readdirSync = noop;
export const statSync = noop;
export const unlinkSync = noop;
export const rmSync = noop;
export const copyFileSync = noop;
export const renameSync = noop;
export const readFile = noop;
export const writeFile = noop;
export const mkdir = noop;
export const appendFile = noop;
export const readdir = noop;
export const stat = noop;
export const unlink = noop;
export const rm = noop;
export const copyFile = noop;
export const rename = noop;
export const watch = noop;
export const watchFile = noop;
export const unwatchFile = noop;

export const constants = {
    F_OK: 0,
    R_OK: 4,
    W_OK: 2,
    X_OK: 1,
    UV_FS_O_CREAT: 1,
    UV_FS_O_EXCL: 2,
    UV_FS_O_TRUNC: 4,
    UV_FS_O_APPEND: 8,
    UV_FS_O_DIRECTORY: 16,
    UV_FS_O_NOATIME: 32,
    UV_FS_O_NOFOLLOW: 64,
    UV_FS_O_SYMLINK: 128,
    UV_FS_O_DSYNC: 256,
    UV_FS_O_SYNC: 512,
    UV_FS_O_RSYNC: 1024,
};

export default {
    readFileSync,
    writeFileSync,
    mkdirSync,
    appendFileSync,
    existsSync,
    readdirSync,
    statSync,
    unlinkSync,
    rmSync,
    copyFileSync,
    renameSync,
    readFile,
    writeFile,
    mkdir,
    appendFile,
    readdir,
    stat,
    unlink,
    rm,
    copyFile,
    rename,
    watch,
    watchFile,
    unwatchFile,
    constants,
};
