// Browser-compatible fs polyfill - provides all commonly used fs functions
const noop = () => { throw new Error('fs operation not supported in browser'); };
const noopPromise = () => Promise.reject(new Error('fs/promises operation not supported in browser'));

// Sync functions
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
export const readlinkSync = noop;
export const symlinkSync = noop;
export const lstatSync = noop;
export const fstatSync = noop;
export const fsyncSync = noop;
export const fdatasyncSync = noop;
export const ftruncateSync = noop;
export const truncateSync = noop;
export const chmodSync = noop;
export const lchmodSync = noop;
export const fchmodSync = noop;
export const chownSync = noop;
export const lchownSync = noop;
export const fchownSync = noop;
export const utimesSync = noop;
export const futimesSync = noop;
export const lutimesSync = noop;
export const linkSync = noop;
export const realpathSync = noop;
export const mkdtempSync = noop;
export const rmdirSync = noop;

// Async functions
export const readFile = noopPromise;
export const writeFile = noopPromise;
export const mkdir = noopPromise;
export const appendFile = noopPromise;
export const readdir = noopPromise;
export const stat = noopPromise;
export const unlink = noopPromise;
export const rm = noopPromise;
export const copyFile = noopPromise;
export const rename = noopPromise;
export const readlink = noopPromise;
export const symlink = noopPromise;
export const lstat = noopPromise;
export const fstat = noopPromise;
export const fsync = noopPromise;
export const fdatasync = noopPromise;
export const ftruncate = noopPromise;
export const truncate = noopPromise;
export const chmod = noopPromise;
export const lchmod = noopPromise;
export const fchmod = noopPromise;
export const chown = noopPromise;
export const lchown = noopPromise;
export const fchown = noopPromise;
export const utimes = noopPromise;
export const futimes = noopPromise;
export const lutimes = noopPromise;
export const link = noopPromise;
export const realpath = noopPromise;
export const mkdtemp = noopPromise;
export const rmdir = noopPromise;

// File handle functions
export const open = noopPromise;
export const close = noopPromise;
export const read = noopPromise;
export const write = noopPromise;
export const writev = noopPromise;
export const readv = noopPromise;

// Constants
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

// Promises API
export const promises = {
    readFile: noopPromise,
    writeFile: noopPromise,
    mkdir: noopPromise,
    appendFile: noopPromise,
    readdir: noopPromise,
    stat: noopPromise,
    unlink: noopPromise,
    rm: noopPromise,
    copyFile: noopPromise,
    rename: noopPromise,
    readlink: noopPromise,
    symlink: noopPromise,
    lstat: noopPromise,
    fstat: noopPromise,
    fsync: noopPromise,
    fdatasync: noopPromise,
    ftruncate: noopPromise,
    truncate: noopPromise,
    chmod: noopPromise,
    lchmod: noopPromise,
    fchmod: noopPromise,
    chown: noopPromise,
    lchown: noopPromise,
    fchown: noopPromise,
    utimes: noopPromise,
    futimes: noopPromise,
    lutimes: noopPromise,
    link: noopPromise,
    symlink: noopPromise,
    readlink: noopPromise,
    realpath: noopPromise,
    mkdtemp: noopPromise,
    rmdir: noopPromise,
    mkdir: noopPromise,
    open: noopPromise,
    close: noopPromise,
    read: noopPromise,
    write: noopPromise,
    writev: noopPromise,
    readv: noopPromise,
    constants,
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
    readlinkSync,
    symlinkSync,
    lstatSync,
    fstatSync,
    fsyncSync,
    fdatasyncSync,
    ftruncateSync,
    truncateSync,
    chmodSync,
    lchmodSync,
    fchmodSync,
    chownSync,
    lchownSync,
    fchownSync,
    utimesSync,
    futimesSync,
    lutimesSync,
    linkSync,
    realpathSync,
    mkdtempSync,
    rmdirSync,
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
    readlink,
    symlink,
    lstat,
    fstat,
    fsync,
    fdatasync,
    ftruncate,
    truncate,
    chmod,
    lchmod,
    fchmod,
    chown,
    lchown,
    fchown,
    utimes,
    futimes,
    lutimes,
    link,
    realpath,
    mkdtemp,
    rmdir,
    open,
    close,
    read,
    write,
    writev,
    readv,
    constants,
    promises,
};