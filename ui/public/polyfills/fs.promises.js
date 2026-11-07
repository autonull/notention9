// Browser-compatible fs/promises stub - minimal implementation for compatibility
const noop = () => Promise.reject(new Error('fs/promises operation not supported in browser'));

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
export const mkdir = noop;
export const mkdtemp = noop;
export const rmdir = noop;
export const readlink = noop;
export const symlink = noop;
export const lstat = noop;
export const realpath = noop;
export const access = noop;
export const chmod = noop;
export const chown = noop;
export const utimes = noop;
export const lutimes = noop;
export const link = noop;
export const open = noop;
export const close = noop;
export const read = noop;
export const write = noop;
export const writev = noop;
export const fsync = noop;
export const fdatasync = noop;
export const fstat = noop;
export const fchmod = noop;
export const fchown = noop;
export const fdatasync = noop;
export const ftruncate = noop;
export const futimes = noop;
export const lchown = noop;
export const lchmod = noop;
export const lstat = noop;
export const lstat = noop;
export const stat = noop;
export const lstat = noop;
export const fstat = noop;
export const fsync = noop;
export const fdatasync = noop;
export const ftruncate = noop;
export const truncate = noop;
export const chown = noop;
export const fchown = noop;
export const lchown = noop;
export const chmod = noop;
export const fchmod = noop;
export const lchmod = noop;
export const utimes = noop;
export const futimes = noop;
export const lutimes = noop;
export const link = noop;
export const symlink = noop;
export const readlink = noop;
export const realpath = noop;
export const mkdir = noop;
export const rmdir = noop;
export const readdir = noop;
export const readdir = noop;
export const mkdtemp = noop;
export const copymode = noop;
export const copyFile = noop;
export const rename = noop;
export const rename = noop;
export const unlink = noop;
export const unlink = noop;
export const rm = noop;
export const rm = noop;
export const watch = noop;
export const watchFile = noop;
export const unwatchFile = noop;
export const constants = {
    F_OK: 0,
    R_OK: 4,
    W_OK: 2,
    X_OK: 1,
};

export default {
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
    constants,
};