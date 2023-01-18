import { Publish, login } from "./svn";
import { init } from './utils';

const args = process.argv;

if (args.length === 2 || args[2] === '-m') {
    const msg = args.slice(3).join(' ') || 'update';
    Publish(msg);
}

if (args[2] === 'init') {
    login().then(data => init(data.repository));
}

if (args[2] === 'login') {
    login();
}