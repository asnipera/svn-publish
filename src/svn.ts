import path from 'path';
import os from 'os';
import fs from 'fs';
import { spawnSync } from 'child_process';
import { Config, readConfig, zip, readAuth } from './utils';

export function ExecSvnCmd(cmd: string, dir?: string) {
  const fileName = path.join(__dirname, 'svn', 'svn.exe');
  const output = spawnSync(fileName, cmd.split(' '), {
    encoding: 'utf-8',
    cwd: dir,
  });
  if (output.stderr) {
    console.error('SVN命令执行错误: ', 'svn', cmd);
    if (
      output.stderr.includes('credentials') ||
      output.stderr.includes('Authentication') ||
      output.stderr.includes('time')
    ) {
      console.error('\r\n请检查SVN用户名或密码并运行 "svnp login" 重新登陆');
      spawnSync(fileName, ['auth', '--remove'], { cwd: dir });
    }
    throw output.stderr;
  }
  console.log(output.stdout);
}

function tempRepositoryDir() {
  return path.join(os.tmpdir(), 'svn-publish-temp');
}

function rmdir(p: string) {
  if (fs.existsSync(p)) {
    const files = fs.readdirSync(p);
    files.forEach((child) => {
      const childPath = path.join(p, child);
      if (fs.statSync(childPath).isDirectory()) {
        rmdir(childPath);
      } else {
        try {
          fs.unlinkSync(childPath);
        } catch (e) {}
      }
    });
    fs.rmdirSync(p);
  }
}

function runSvnDeleteCmd(p: string) {
  const rep = repository();
  ExecSvnCmd(`delete ${p} --force`, rep);
}

function clearRepository(p: string, conf: Config, level = 0) {
  if (path.basename(p) === '.svn') return;
  if (fs.existsSync(p)) {
    const files = fs.readdirSync(p);
    files.forEach((child) => {
      const childPath = path.join(p, child);
      if (fs.statSync(childPath).isDirectory()) {
        clearRepository(childPath, conf, level + 1);
      } else {
        try {
          runSvnDeleteCmd(childPath);
        } catch (e) {}
      }
    });
    if (level !== 0) {
      runSvnDeleteCmd(p);
    }
  }
}

function createTempRepository(repositoryPath: string) {
  const repoDir = tempRepositoryDir();
  rmdir(repoDir);
  fs.mkdirSync(repoDir);
  try {
    // ExecSvnCmd('checkout ' + repositoryPath, repoDir);
    console.log(repositoryPath, repoDir);

    ExecSvnCmd('import ' + repoDir, repositoryPath);
    return true;
  } catch (error: any) {
    console.log(decodeURIComponent(error));
    return false;
  }
}

function cpFileOrDir(src: string, dst: string) {
  if (!fs.existsSync(src) || !fs.existsSync(dst)) return;
  if (!fs.statSync(dst).isDirectory()) return;
  const srcInfo = fs.statSync(src);
  const dstPath = path.join(dst, path.basename(src));
  if (srcInfo.isFile()) {
    const dstFile = dstPath;
    fs.cpSync(src, dstFile);
    return;
  }
  fs.mkdirSync(dstPath);
  const files = fs.readdirSync(src);
  files.forEach((c) => {
    const s = path.join(src, c);
    cpFileOrDir(s, dstPath);
  });
}

function repository(): string {
  const repoDir = tempRepositoryDir();
  const files = fs.readdirSync(repoDir);
  if (!files.length) return '';
  return path.join(repoDir, files[0]);
}

function addFiles(conf: Config) {
  const repo = repository();
  if (!repo) return;
  clearRepository(repo, conf);
  const localDir = conf.localDirectory;
  if (conf.compress) {
    const zipFile = path.join(localDir, conf.zipFileName);
    if (!fs.existsSync(zipFile)) return;
    fs.cpSync(zipFile, path.join(repo, conf.zipFileName));
    return;
  }
  const localFiles = fs.readdirSync(localDir);
  localFiles.forEach((f) => {
    cpFileOrDir(path.join(localDir, f), repo);
  });
}

function update(conf: Config, msg = 'update') {
  const flag = createTempRepository(conf.remoteDirectory);
  if (!flag) return;
  const repo = repository();
  addFiles(conf);
  ExecSvnCmd('add . --force', repo);
  ExecSvnCmd(`commit -m "${msg}"`, repo);
  console.log('发布成功');
}

export function login() {
  return new Promise<any>((resolve) => {
    readAuth().then((data) => {
      const { repository, username, password } = data;
      const cmd = `checkout ${repository} --username ${username} --password ${password}`;
      const repoDir = tempRepositoryDir();
      rmdir(repoDir);
      fs.mkdirSync(repoDir);
      ExecSvnCmd(cmd, repoDir);
      rmdir(tempRepositoryDir());
      resolve(data);
    });
  });
}

export function Publish(msg: string) {
  const conf = readConfig();
  if (!conf) return;
  if (conf.compress) zip(conf.localDirectory, conf.zipFileName);
  update(conf, msg);
  try {
    rmdir(tempRepositoryDir());
    if (conf.compress)
      fs.unlinkSync(path.join(conf.localDirectory, conf.zipFileName));
  } catch (e) {}
}
