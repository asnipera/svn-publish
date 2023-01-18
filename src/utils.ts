import path from 'path';
import fs from 'fs';
import readline from 'readline';
import AdmZip from 'adm-zip';

export class Config {
  constructor(repo = '/') {
    this.remoteDirectory = repo;
  }
  localDirectory: string = path.join(process.cwd(), 'dist');
  remoteDirectory: string = '/';
  compress: boolean = true;
  zipFileName: string = 'dist.zip';
}

const comments: Record<keyof Config, string> = {
  localDirectory: '项目打包后的包目录',
  remoteDirectory: 'SVN仓库地址(SVN上存放包的目录)',
  compress: '是否压缩为zip包',
  zipFileName: '压缩包名称，如果不需要压缩，此字段可为空',
};

export const CONFIG_FILE_NAME = '.svn-pub';

export const CONFIG_FILE_PATH = path.join(process.cwd(), CONFIG_FILE_NAME);

export function readConfig(): Config | null {
  const conf = new Config();
  const keys = Object.keys(conf);
  let configStr = '';
  try {
    configStr = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
  } catch (e) {
    console.error(
      '读取配置文件失败，请尝试运行 "svnp init" 生成配置文件并填写配置项\r\n'
    );
    return null;
  }
  const arr = configStr.split('\r\n');
  arr.forEach((str) => {
    str = str.trim();
    if (str[0] === '#') return;
    const i = str.indexOf('=');
    if (i <= 0 || i >= str.length - 1) return;
    const key = str.slice(0, i).trim();
    const value = str.slice(i + 1).trim();
    if (keys.indexOf(key) === -1) {
      console.error('无效的配置项：', key);
      return;
    }
    if (key === 'compress') {
      conf.compress = value === 'true';
      return;
    }
    (conf[key as keyof Config] as any) = value;
  });
  return conf;
}

export function createConfigFile(repo: string): Config {
  const conf = new Config(repo);
  let confStr = '';
  Object.keys(conf).forEach((k) => {
    confStr += '# ' + comments[k as keyof Config] + '\r\n';
    confStr += k + '=';
    confStr += conf[k as keyof Config];
    confStr += '\r\n\r\n';
  });
  fs.writeFileSync(CONFIG_FILE_PATH, confStr, 'utf-8');
  return conf;
}

export function readAuth() {
  return new Promise<{
    repository: string;
    username: string;
    password: string;
  }>((resolve) => {
    const line = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    line.question(`请输入SVN远程仓库地址: `, (repository) => {
      line.question(`请输入SVN账号: `, (username) => {
        line.question(`请输入SVN密码: `, (password) => {
          resolve({ repository, username, password });
          line.close();
        });
      });
    });
  });
}

export function init(repo: string) {
  if (fs.existsSync(CONFIG_FILE_PATH)) fs.unlinkSync(CONFIG_FILE_PATH);
  createConfigFile(repo);
  console.log('配置文件已生成，请检查并填写配置项：', CONFIG_FILE_PATH, '\r\n');
}

export function zip(dir: string, outputFileName: string): string {
  const admZip = new AdmZip();
  const files = fs.readdirSync(dir);
  files.forEach((f) => {
    const p = path.join(dir, f);
    const stat = fs.statSync(p);
    if (stat.isFile()) {
      admZip.addLocalFile(p);
    } else {
      admZip.addLocalFolder(p);
    }
  });
  const output = path.join(dir, outputFileName);
  admZip.writeZip(output);
  return output;
}
